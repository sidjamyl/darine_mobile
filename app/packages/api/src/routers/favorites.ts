import { favoriteProduct, product } from "@app/db/schema/catalog";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, router } from "../index";

const favoriteProductInputSchema = z.object({
  productId: z.string().trim().min(1),
});

export const favoritesRouter = router({
  listIds: protectedProcedure.query(async ({ ctx }) => {
    const favorites = await ctx.db.query.favoriteProduct.findMany({
      where: eq(favoriteProduct.userId, ctx.user.id),
      orderBy: (favoritesTable, { desc: descending }) => [descending(favoritesTable.createdAt)],
    });

    return favorites.map((favorite) => favorite.productId);
  }),

  add: protectedProcedure.input(favoriteProductInputSchema).mutation(async ({ ctx, input }) => {
    const existingProduct = await ctx.db.query.product.findFirst({
      where: and(eq(product.id, input.productId), eq(product.isArchived, false)),
    });

    if (!existingProduct) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
    }

    await ctx.db
      .insert(favoriteProduct)
      .values({
        userId: ctx.user.id,
        productId: input.productId,
      })
      .onConflictDoNothing();

    return { productId: input.productId, isFavorite: true };
  }),

  remove: protectedProcedure.input(favoriteProductInputSchema).mutation(async ({ ctx, input }) => {
    await ctx.db
      .delete(favoriteProduct)
      .where(and(eq(favoriteProduct.userId, ctx.user.id), eq(favoriteProduct.productId, input.productId)));

    return { productId: input.productId, isFavorite: false };
  }),

  toggle: protectedProcedure.input(favoriteProductInputSchema).mutation(async ({ ctx, input }) => {
    const existingProduct = await ctx.db.query.product.findFirst({
      where: and(eq(product.id, input.productId), eq(product.isArchived, false)),
    });

    if (!existingProduct) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
    }

    const favorite = await ctx.db.query.favoriteProduct.findFirst({
      where: and(eq(favoriteProduct.userId, ctx.user.id), eq(favoriteProduct.productId, input.productId)),
    });

    if (favorite) {
      await ctx.db
        .delete(favoriteProduct)
        .where(and(eq(favoriteProduct.userId, ctx.user.id), eq(favoriteProduct.productId, input.productId)));

      return { productId: input.productId, isFavorite: false };
    }

    await ctx.db.insert(favoriteProduct).values({
      userId: ctx.user.id,
      productId: input.productId,
    });

    return { productId: input.productId, isFavorite: true };
  }),
});
