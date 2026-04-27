import { createClientTechnicalEmail, normalizeAlgerianPhone } from "@app/auth/phone";
import { account, session, user } from "@app/db/schema/auth";
import { clientProfile } from "@app/db/schema/profile";
import { TRPCError } from "@trpc/server";
import { and, eq, or } from "drizzle-orm";
import { z } from "zod";

import { adminProcedure, router } from "../index";

const createAdminSchema = z.object({
  name: z.string().trim().min(2),
  email: z.email(),
  password: z.string().min(6),
});

const promoteClientSchema = z.object({
  userId: z.string().min(1),
  adminEmail: z.email(),
});

const updateClientPhoneSchema = z.object({
  userId: z.string().min(1),
  phoneNumber: z.string().trim().min(1),
});

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
