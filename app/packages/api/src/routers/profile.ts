import { clientProfile, commune, wilaya } from "@app/db/schema/profile";
import { user } from "@app/db/schema/auth";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import type { Context } from "../context";
import { protectedProcedure, router } from "../index";

const profileInputSchema = z.object({
  fullName: z.string().trim().min(2),
  wilayaId: z.string().min(1),
  communeId: z.string().min(1),
  streetAddress: z.string().trim().min(1),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

async function assertValidLocation(ctx: Pick<Context, "db">, input: ProfileInput) {
  const selectedWilaya = await ctx.db.query.wilaya.findFirst({
    where: eq(wilaya.id, input.wilayaId),
  });

  if (!selectedWilaya) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid wilaya" });
  }

  const selectedCommune = await ctx.db.query.commune.findFirst({
    where: and(eq(commune.id, input.communeId), eq(commune.wilayaId, input.wilayaId)),
  });

  if (!selectedCommune) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid commune for selected wilaya" });
  }
}

type ProfileInput = z.infer<typeof profileInputSchema>;

export const profileRouter = router({
  me: protectedProcedure.query(async ({ ctx }) => {
    const profile = await ctx.db.query.clientProfile.findFirst({
      where: eq(clientProfile.userId, ctx.user.id),
      with: {
        wilaya: true,
        commune: true,
      },
    });

    return {
      user: {
        id: ctx.user.id,
        name: ctx.user.name,
        email: ctx.user.email,
        phoneNumber: ctx.user.phoneNumber,
        phoneNumberLocal: ctx.user.phoneNumberLocal,
        role: ctx.user.role,
      },
      profile,
    };
  }),

  upsert: protectedProcedure.input(profileInputSchema).mutation(async ({ ctx, input }) => {
    await assertValidLocation(ctx, input);

    const profileValues = {
      userId: ctx.user.id,
      fullName: input.fullName,
      wilayaId: input.wilayaId,
      communeId: input.communeId,
      streetAddress: input.streetAddress,
      latitude: input.latitude === undefined ? null : String(input.latitude),
      longitude: input.longitude === undefined ? null : String(input.longitude),
    };

    await ctx.db.transaction(async (tx) => {
      await tx.update(user).set({ name: input.fullName }).where(eq(user.id, ctx.user.id));

      await tx
        .insert(clientProfile)
        .values(profileValues)
        .onConflictDoUpdate({
          target: clientProfile.userId,
          set: {
            fullName: profileValues.fullName,
            wilayaId: profileValues.wilayaId,
            communeId: profileValues.communeId,
            streetAddress: profileValues.streetAddress,
            latitude: profileValues.latitude,
            longitude: profileValues.longitude,
          },
        });
    });

    return { success: true };
  }),
});
