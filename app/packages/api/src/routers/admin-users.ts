import { createClientTechnicalEmail, normalizeAlgerianPhone } from "@app/auth/phone";
import { account, session, user } from "@app/db/schema/auth";
import { customerOrder } from "@app/db/schema/order";
import { clientProfile, commune, wilaya } from "@app/db/schema/profile";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, or } from "drizzle-orm";
import { z } from "zod";

import type { Context } from "../context";
import { adminProcedure, router } from "../index";

const customerProfileSchema = z.object({
  fullName: z.string().trim().min(2),
  phoneNumber: z.string().trim().min(1),
  password: z.string().min(6),
  wilayaId: z.string().trim().min(1),
  communeId: z.string().trim().min(1),
  streetAddress: z.string().trim().min(1),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

const createAdminSchema = z.object({
  name: z.string().trim().min(2),
  email: z.email(),
  password: z.string().min(6),
});

const updateAdminSchema = z.object({
  userId: z.string().trim().min(1),
  name: z.string().trim().min(2),
  email: z.email(),
});

const promoteClientSchema = z.object({
  userId: z.string().min(1),
  adminEmail: z.email(),
});

const updateClientPhoneSchema = z.object({
  userId: z.string().min(1),
  phoneNumber: z.string().trim().min(1),
});

async function assertValidCustomerLocation(ctx: Pick<Context, "db">, input: z.infer<typeof customerProfileSchema>) {
  const selectedWilaya = await ctx.db.query.wilaya.findFirst({
    where: eq(wilaya.id, input.wilayaId),
  });

  if (!selectedWilaya) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid wilaya" });
  }

  const selectedCommune = await ctx.db.query.commune.findFirst({
    where: and(
      eq(commune.id, input.communeId),
      eq(commune.wilayaId, input.wilayaId),
    ),
  });

  if (!selectedCommune) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid commune for selected wilaya" });
  }
}

async function createCustomerAccount(
  ctx: Pick<Context, "db" | "auth">,
  input: z.infer<typeof customerProfileSchema>,
) {
  const normalizedPhone = normalizeAlgerianPhone(input.phoneNumber);

  if (!normalizedPhone) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid Algerian phone number" });
  }

  await assertValidCustomerLocation(ctx, input);

  const existingPhoneUser = await ctx.db.query.user.findFirst({
    where: or(eq(user.phoneNumber, normalizedPhone.international), eq(user.phoneNumberLocal, normalizedPhone.local)),
  });

  if (existingPhoneUser) {
    throw new TRPCError({ code: "CONFLICT", message: "Phone number is already used" });
  }

  const technicalEmail = createClientTechnicalEmail(normalizedPhone.international);
  const existingTechnicalEmailUser = await ctx.db.query.user.findFirst({
    where: eq(user.email, technicalEmail),
  });

  if (existingTechnicalEmailUser) {
    throw new TRPCError({ code: "CONFLICT", message: "Phone number is already used" });
  }

  await ctx.auth.api.signUpEmail({
    body: {
      name: input.fullName,
      email: technicalEmail,
      password: input.password,
    },
  });

  const [createdUser] = await ctx.db
    .update(user)
    .set({
      name: input.fullName,
      phoneNumber: normalizedPhone.international,
      phoneNumberLocal: normalizedPhone.local,
      phoneNumberVerified: false,
      role: "client",
    })
    .where(eq(user.email, technicalEmail))
    .returning({ id: user.id });

  if (!createdUser) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create client account" });
  }

  await ctx.db.insert(clientProfile).values({
    userId: createdUser.id,
    fullName: input.fullName,
    wilayaId: input.wilayaId,
    communeId: input.communeId,
    streetAddress: input.streetAddress,
    latitude: input.latitude === undefined ? null : String(input.latitude),
    longitude: input.longitude === undefined ? null : String(input.longitude),
  });

  return {
    userId: createdUser.id,
    phoneNumber: normalizedPhone.international,
    phoneNumberLocal: normalizedPhone.local,
  };
}

export const adminUsersRouter = router({
  list: adminProcedure.query(({ ctx }) => {
    return ctx.db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        phoneNumberLocal: user.phoneNumberLocal,
        role: user.role,
        isDisabled: user.isDisabled,
        isSeedOwner: user.isSeedOwner,
        profileFullName: clientProfile.fullName,
        createdAt: user.createdAt,
      })
      .from(user)
      .leftJoin(clientProfile, eq(clientProfile.userId, user.id));
  }),

  listCustomers: adminProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        phoneNumberLocal: user.phoneNumberLocal,
        isDisabled: user.isDisabled,
        createdAt: user.createdAt,
        profileFullName: clientProfile.fullName,
        streetAddress: clientProfile.streetAddress,
      })
      .from(user)
      .leftJoin(clientProfile, eq(clientProfile.userId, user.id))
      .where(eq(user.role, "client"));
  }),

  customerDetail: adminProcedure
    .input(
      z.object({
        userId: z.string().trim().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const customer = await ctx.db.query.user.findFirst({
        where: eq(user.id, input.userId),
      });

      if (!customer) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      const profile = await ctx.db.query.clientProfile.findFirst({
        where: eq(clientProfile.userId, input.userId),
        with: {
          wilaya: true,
          commune: true,
        },
      });

      const orders = await ctx.db.query.customerOrder.findMany({
        where: eq(customerOrder.userId, input.userId),
        orderBy: (ordersTable, { desc }) => [desc(ordersTable.createdAt)],
        with: {
          lines: true,
        },
      });

      return {
        user: customer,
        profile,
        orders,
      };
    }),

  createCustomer: adminProcedure.input(customerProfileSchema).mutation(async ({ ctx, input }) => {
    return createCustomerAccount(ctx, input);
  }),

  createAdmin: adminProcedure.input(createAdminSchema).mutation(async ({ ctx, input }) => {
    const existingUser = await ctx.db.query.user.findFirst({
      where: eq(user.email, input.email),
    });

    if (existingUser) {
      throw new TRPCError({ code: "CONFLICT", message: "Email is already used" });
    }

    await ctx.auth.api.signUpEmail({
      body: {
        name: input.name,
        email: input.email,
        password: input.password,
      },
    });

    const [createdAdmin] = await ctx.db
      .update(user)
      .set({
        name: input.name,
        role: "admin",
        emailVerified: true,
      })
      .where(eq(user.email, input.email))
      .returning({ id: user.id });

    if (!createdAdmin) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create admin" });
    }

    return { userId: createdAdmin.id };
  }),

  updateAdmin: adminProcedure.input(updateAdminSchema).mutation(async ({ ctx, input }) => {
    const targetUser = await ctx.db.query.user.findFirst({
      where: eq(user.id, input.userId),
    });

    if (!targetUser) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    if (targetUser.role !== "admin" && targetUser.role !== "owner") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Target user is not an admin account" });
    }

    if (targetUser.isSeedOwner && input.email !== targetUser.email) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Seed owner email cannot be changed" });
    }

    const existingEmailUser = await ctx.db.query.user.findFirst({
      where: eq(user.email, input.email),
    });

    if (existingEmailUser && existingEmailUser.id !== input.userId) {
      throw new TRPCError({ code: "CONFLICT", message: "Email is already used" });
    }

    await ctx.db.transaction(async (tx) => {
      await tx
        .update(user)
        .set({
          name: input.name,
          email: input.email,
          emailVerified: true,
        })
        .where(eq(user.id, input.userId));

      await tx
        .update(account)
        .set({ accountId: input.email })
        .where(and(eq(account.userId, input.userId), eq(account.providerId, "credential")));
    });

    return { userId: input.userId };
  }),

  promoteClientToAdmin: adminProcedure.input(promoteClientSchema).mutation(async ({ ctx, input }) => {
    if (ctx.user.id === input.userId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Admins cannot modify their own role" });
    }

    const targetUser = await ctx.db.query.user.findFirst({
      where: eq(user.id, input.userId),
    });

    if (!targetUser) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    if (targetUser.role === "owner") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Owner role cannot be modified" });
    }

    const emailUser = await ctx.db.query.user.findFirst({
      where: eq(user.email, input.adminEmail),
    });

    if (emailUser && emailUser.id !== input.userId) {
      throw new TRPCError({ code: "CONFLICT", message: "Email is already used" });
    }

    await ctx.db.transaction(async (tx) => {
      await tx
        .update(user)
        .set({
          email: input.adminEmail,
          emailVerified: true,
          role: "admin",
        })
        .where(eq(user.id, input.userId));

      await tx
        .update(account)
        .set({ accountId: input.adminEmail })
        .where(and(eq(account.userId, input.userId), eq(account.providerId, "credential")));
    });

    return { success: true };
  }),

  updateClientPhone: adminProcedure.input(updateClientPhoneSchema).mutation(async ({ ctx, input }) => {
    const normalizedPhone = normalizeAlgerianPhone(input.phoneNumber);

    if (!normalizedPhone) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid Algerian phone number" });
    }

    const targetUser = await ctx.db.query.user.findFirst({
      where: eq(user.id, input.userId),
    });

    if (!targetUser) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    const existingPhoneUser = await ctx.db.query.user.findFirst({
      where: or(
        eq(user.phoneNumber, normalizedPhone.international),
        eq(user.phoneNumberLocal, normalizedPhone.local),
      ),
    });

    if (existingPhoneUser && existingPhoneUser.id !== input.userId) {
      throw new TRPCError({ code: "CONFLICT", message: "Phone number is already used" });
    }

    const nextEmail =
      targetUser.role === "client" ? createClientTechnicalEmail(normalizedPhone.international) : targetUser.email;

    await ctx.db
      .update(user)
      .set({
        email: nextEmail,
        phoneNumber: normalizedPhone.international,
        phoneNumberLocal: normalizedPhone.local,
        phoneNumberVerified: false,
      })
      .where(eq(user.id, input.userId));

    if (targetUser.role === "client") {
      await ctx.db
        .update(account)
        .set({ accountId: nextEmail })
        .where(and(eq(account.userId, input.userId), eq(account.providerId, "credential")));
    }

    return {
      phoneNumber: normalizedPhone.international,
      phoneNumberLocal: normalizedPhone.local,
    };
  }),

  disableUser: adminProcedure.input(z.object({ userId: z.string().min(1) })).mutation(async ({ ctx, input }) => {
    if (ctx.user.id === input.userId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Admins cannot disable their own account" });
    }

    const targetUser = await ctx.db.query.user.findFirst({
      where: eq(user.id, input.userId),
    });

    if (!targetUser) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    if (targetUser.isSeedOwner) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Seed owner cannot be disabled" });
    }

    await ctx.db.transaction(async (tx) => {
      await tx.update(user).set({ isDisabled: true }).where(eq(user.id, input.userId));
      await tx.delete(session).where(eq(session.userId, input.userId));
    });

    return { success: true };
  }),
});
