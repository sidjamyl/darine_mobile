import { createClientTechnicalEmail, normalizeAlgerianPhone } from "@app/auth/phone";
import { clientProfile, commune, wilaya } from "@app/db/schema/profile";
import { user } from "@app/db/schema/auth";
import { TRPCError } from "@trpc/server";
import { and, eq, or } from "drizzle-orm";
import { z } from "zod";

import { publicProcedure, router } from "../index";

const clientSignupSchema = z
  .object({
    fullName: z.string().trim().min(2),
    phoneNumber: z.string().trim().min(1),
    password: z.string().min(6),
    confirmPassword: z.string().min(6),
    wilayaId: z.string().min(1),
    communeId: z.string().min(1),
    streetAddress: z.string().trim().min(1),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export const authRouter = router({
  registerClient: publicProcedure.input(clientSignupSchema).mutation(async ({ ctx, input }) => {
    const normalizedPhone = normalizeAlgerianPhone(input.phoneNumber);

    if (!normalizedPhone) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid Algerian phone number",
      });
    }

    const selectedWilaya = await ctx.db.query.wilaya.findFirst({
      where: eq(wilaya.id, input.wilayaId),
    });

    if (!selectedWilaya) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid wilaya",
      });
    }

    const selectedCommune = await ctx.db.query.commune.findFirst({
      where: and(eq(commune.id, input.communeId), eq(commune.wilayaId, input.wilayaId)),
    });

    if (!selectedCommune) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid commune for selected wilaya",
      });
    }

    const existingPhoneUser = await ctx.db.query.user.findFirst({
      where: or(
        eq(user.phoneNumber, normalizedPhone.international),
        eq(user.phoneNumberLocal, normalizedPhone.local),
      ),
    });

    if (existingPhoneUser) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Phone number is already used",
      });
    }

    const technicalEmail = createClientTechnicalEmail(normalizedPhone.international);

    const existingTechnicalEmailUser = await ctx.db.query.user.findFirst({
      where: eq(user.email, technicalEmail),
    });

    if (existingTechnicalEmailUser) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Phone number is already used",
      });
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
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create client account",
      });
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
  }),
});
