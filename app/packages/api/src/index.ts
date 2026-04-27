import { user } from "@app/db/schema/auth";
import { initTRPC, TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import type { Context } from "./context";

export const t = initTRPC.context<Context>().create();

export const router = t.router;

export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Authentication required",
      cause: "No session",
    });
  }

  const currentUser = await ctx.db.query.user.findFirst({
    where: eq(user.id, ctx.session.user.id),
  });

  if (!currentUser || currentUser.isDisabled) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Account is disabled or no longer exists",
    });
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      user: currentUser,
    },
  });
});

export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin" && ctx.user.role !== "owner") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required",
    });
  }

  return next({ ctx });
});

export const ownerProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "owner") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Owner access required",
    });
  }

  return next({ ctx });
});
