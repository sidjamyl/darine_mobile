import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { publicProcedure, router } from "../index";
import {
  DEFAULT_CATALOG_LIMIT,
  getOptionalViewerUserId,
  listCatalogFilterOptions,
  loadVisibleCatalogProductsByIds,
  MAX_CATALOG_LIMIT,
  searchVisibleCatalogProductIds,
} from "./catalog-service";

const catalogListInputSchema = z.object({
  query: z.string().trim().optional(),
  brandIds: z.array(z.string().trim().min(1)).optional(),
  categoryIds: z.array(z.string().trim().min(1)).optional(),
  limit: z.number().int().min(1).max(MAX_CATALOG_LIMIT).optional(),
  offset: z.number().int().min(0).optional(),
});

export const catalogRouter = router({
  list: publicProcedure.input(catalogListInputSchema.optional()).query(async ({ ctx, input }) => {
    const normalizedInput = input ?? {};
    const viewerUserId = await getOptionalViewerUserId(ctx);

    const searchResult = await searchVisibleCatalogProductIds(ctx, normalizedInput);
    const items = await loadVisibleCatalogProductsByIds(ctx, searchResult.productIds, viewerUserId);

    return {
      items,
      total: searchResult.total,
      limit: searchResult.limit,
      offset: searchResult.offset,
      hasMore: searchResult.offset + items.length < searchResult.total,
      appliedQuery: normalizedInput.query?.trim() || null,
      appliedBrandIds: normalizedInput.brandIds ?? [],
      appliedCategoryIds: normalizedInput.categoryIds ?? [],
    };
  }),

  detail: publicProcedure
    .input(
      z.object({
        productId: z.string().trim().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const viewerUserId = await getOptionalViewerUserId(ctx);
      const products = await loadVisibleCatalogProductsByIds(ctx, [input.productId], viewerUserId);
      const product = products[0];

      if (!product) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
      }

      return product;
    }),

  filterOptions: publicProcedure.query(async ({ ctx }) => {
    return listCatalogFilterOptions(ctx);
  }),

  defaults: publicProcedure.query(() => {
    return {
      limit: DEFAULT_CATALOG_LIMIT,
      maxLimit: MAX_CATALOG_LIMIT,
    };
  }),
});
