import {
  asset,
  banner,
  brand,
  category,
  homeFeaturedProduct,
  homeSectionSettings,
  product,
  productCategory,
} from "@app/db/schema/catalog";
import { TRPCError } from "@trpc/server";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import type { Context } from "../context";
import { adminProcedure, router } from "../index";
import {
  calculateLotPrice,
  createId,
  ensureHomeSectionSettings,
  HOME_SECTION_SETTINGS_ID,
  moneyStringSchema,
  normalizeMoneyString,
} from "./catalog-shared";

const assetIdSchema = z.string().trim().min(1);

const brandInputSchema = z.object({
  name: z.string().trim().min(1),
  logoAssetId: assetIdSchema,
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

const categoryInputSchema = z.object({
  nameFr: z.string().trim().min(1),
  nameAr: z.string().trim().min(1),
  imageAssetId: assetIdSchema,
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

const productBaseInputSchema = z.object({
  nameFr: z.string().trim().min(1),
  nameAr: z.string().trim().min(1),
  unitPrice: moneyStringSchema,
  lotQuantity: z.number().int().positive(),
  packagingLabel: z.string().trim().min(1),
  brandId: z.string().trim().min(1),
  categoryIds: z.array(z.string().trim().min(1)).min(1),
  imageAssetId: assetIdSchema,
  stockLots: z.number().int().min(0),
  lowStockThreshold: z.number().int().min(0).nullable().optional(),
  sku: z.string().trim().max(120).optional(),
  description: z.string().trim().max(5000).optional(),
  badgeLabel: z.string().trim().max(120).optional(),
  badgeColor: z.string().trim().max(32).optional(),
  discountLotPrice: moneyStringSchema.optional(),
  sortOrder: z.number().int().default(0),
});

function withProductValidation<TSchema extends z.ZodTypeAny>(schema: TSchema) {
  return schema.superRefine((value, ctx) => {
    const typedValue = value as z.infer<typeof productBaseInputSchema>;

    const uniqueCategoryIds = new Set(typedValue.categoryIds);

    if (uniqueCategoryIds.size !== typedValue.categoryIds.length) {
      ctx.addIssue({
        code: "custom",
        message: "Category ids must be unique",
        path: ["categoryIds"],
      });
    }

    if (typedValue.discountLotPrice) {
      const lotPrice = Number(typedValue.unitPrice) * typedValue.lotQuantity;
      if (Number(typedValue.discountLotPrice) > lotPrice) {
        ctx.addIssue({
          code: "custom",
          message: "Discount lot price cannot exceed the regular lot price",
          path: ["discountLotPrice"],
        });
      }
    }
  });
}

const productInputSchema = withProductValidation(productBaseInputSchema);

const productUpdateInputSchema = withProductValidation(
  productBaseInputSchema.extend({
    isArchived: z.boolean().default(false),
  }),
);

const bannerInputSchema = z.object({
  imageAssetId: assetIdSchema,
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

const homeSettingsInputSchema = z
  .object({
    showBanners: z.boolean().optional(),
    showFeaturedBrands: z.boolean().optional(),
    showFeaturedCategories: z.boolean().optional(),
    showFeaturedProducts: z.boolean().optional(),
  })
  .refine((value) => Object.values(value).some((entry) => entry !== undefined), {
    message: "At least one setting must be provided",
  });

function normalizeOptionalText(value?: string) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function mapAsset(assetRecord?: {
  id: string;
  kind: string;
  publicId: string;
  url: string;
  width: number | null;
  height: number | null;
  format: string | null;
  bytes: number | null;
  folder: string | null;
} | null) {
  if (!assetRecord) {
    return null;
  }

  return {
    id: assetRecord.id,
    kind: assetRecord.kind,
    publicId: assetRecord.publicId,
    url: assetRecord.url,
    width: assetRecord.width,
    height: assetRecord.height,
    format: assetRecord.format,
    bytes: assetRecord.bytes,
    folder: assetRecord.folder,
  };
}

function mapProductRecord(productRecord: {
  id: string;
  nameFr: string;
  nameAr: string;
  unitPrice: string;
  lotQuantity: number;
  packagingLabel: string;
  stockLots: number;
  lowStockThreshold: number | null;
  sku: string | null;
  description: string | null;
  badgeLabel: string | null;
  badgeColor: string | null;
  discountLotPrice: string | null;
  sortOrder: number;
  isArchived: boolean;
  brand: {
    id: string;
    name: string;
    isActive: boolean;
    isFeatured: boolean;
    sortOrder: number;
    logoAsset: {
      id: string;
      kind: string;
      publicId: string;
      url: string;
      width: number | null;
      height: number | null;
      format: string | null;
      bytes: number | null;
      folder: string | null;
    } | null;
  } | null;
  imageAsset: {
    id: string;
    kind: string;
    publicId: string;
    url: string;
    width: number | null;
    height: number | null;
    format: string | null;
    bytes: number | null;
    folder: string | null;
  } | null;
  productCategories: Array<{
    category: {
      id: string;
      nameFr: string;
      nameAr: string;
      isActive: boolean;
      isFeatured: boolean;
      sortOrder: number;
      imageAsset: {
        id: string;
        kind: string;
        publicId: string;
        url: string;
        width: number | null;
        height: number | null;
        format: string | null;
        bytes: number | null;
        folder: string | null;
      } | null;
    };
  }>;
  homeFeaturedEntries: Array<{
    sortOrder: number;
  }>;
}) {
  return {
    id: productRecord.id,
    nameFr: productRecord.nameFr,
    nameAr: productRecord.nameAr,
    unitPrice: productRecord.unitPrice,
    lotPrice: calculateLotPrice(productRecord.unitPrice, productRecord.lotQuantity),
    lotQuantity: productRecord.lotQuantity,
    packagingLabel: productRecord.packagingLabel,
    stockLots: productRecord.stockLots,
    lowStockThreshold: productRecord.lowStockThreshold,
    sku: productRecord.sku,
    description: productRecord.description,
    badgeLabel: productRecord.badgeLabel,
    badgeColor: productRecord.badgeColor,
    discountLotPrice: productRecord.discountLotPrice,
    sortOrder: productRecord.sortOrder,
    isArchived: productRecord.isArchived,
    isOutOfStock: productRecord.stockLots < 1,
    image: mapAsset(productRecord.imageAsset),
    brand: productRecord.brand
      ? {
          id: productRecord.brand.id,
          name: productRecord.brand.name,
          isActive: productRecord.brand.isActive,
          isFeatured: productRecord.brand.isFeatured,
          sortOrder: productRecord.brand.sortOrder,
          logo: mapAsset(productRecord.brand.logoAsset),
        }
      : null,
    categories: productRecord.productCategories.map(({ category: linkedCategory }) => ({
      id: linkedCategory.id,
      nameFr: linkedCategory.nameFr,
      nameAr: linkedCategory.nameAr,
      isActive: linkedCategory.isActive,
      isFeatured: linkedCategory.isFeatured,
      sortOrder: linkedCategory.sortOrder,
      image: mapAsset(linkedCategory.imageAsset),
    })),
    isFeaturedOnHome: productRecord.homeFeaturedEntries.length > 0,
    homeFeatureSortOrder: productRecord.homeFeaturedEntries[0]?.sortOrder ?? null,
  };
}

async function assertAssetKind(
  ctx: Pick<Context, "db">,
  assetId: string,
  expectedKind: "product" | "brand" | "category" | "banner",
) {
  const existingAsset = await ctx.db.query.asset.findFirst({
    where: and(eq(asset.id, assetId), eq(asset.kind, expectedKind)),
  });

  if (!existingAsset) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Invalid ${expectedKind} asset`,
    });
  }

  return existingAsset;
}

async function assertBrandExists(ctx: Pick<Context, "db">, brandId: string) {
  const existingBrand = await ctx.db.query.brand.findFirst({
    where: eq(brand.id, brandId),
  });

  if (!existingBrand) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid brand" });
  }

  return existingBrand;
}

async function assertCategoriesExist(ctx: Pick<Context, "db">, categoryIds: string[]) {
  const uniqueCategoryIds = [...new Set(categoryIds)];

  const existingCategories = await ctx.db.query.category.findMany({
    where: inArray(category.id, uniqueCategoryIds),
  });

  if (existingCategories.length !== uniqueCategoryIds.length) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "One or more categories are invalid" });
  }

  return existingCategories;
}

export const adminCatalogRouter = router({
  brands: router({
    list: adminProcedure.query(async ({ ctx }) => {
      const brands = await ctx.db.query.brand.findMany({
        orderBy: (brandsTable, { asc: ascending }) => [ascending(brandsTable.sortOrder), ascending(brandsTable.name)],
        with: {
          logoAsset: true,
        },
      });

      return brands.map((brandRecord) => ({
        id: brandRecord.id,
        name: brandRecord.name,
        isActive: brandRecord.isActive,
        isFeatured: brandRecord.isFeatured,
        sortOrder: brandRecord.sortOrder,
        logo: mapAsset(brandRecord.logoAsset),
      }));
    }),

    create: adminProcedure.input(brandInputSchema).mutation(async ({ ctx, input }) => {
      await assertAssetKind(ctx, input.logoAssetId, "brand");

      const brandId = createId("brand");

      await ctx.db.insert(brand).values({
        id: brandId,
        name: input.name,
        logoAssetId: input.logoAssetId,
        isActive: input.isActive,
        isFeatured: input.isFeatured,
        sortOrder: input.sortOrder,
      });

      return { id: brandId };
    }),

    update: adminProcedure
      .input(
        z.object({
          id: z.string().trim().min(1),
          data: brandInputSchema,
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await assertAssetKind(ctx, input.data.logoAssetId, "brand");

        const [updatedBrand] = await ctx.db
          .update(brand)
          .set({
            name: input.data.name,
            logoAssetId: input.data.logoAssetId,
            isActive: input.data.isActive,
            isFeatured: input.data.isFeatured,
            sortOrder: input.data.sortOrder,
          })
          .where(eq(brand.id, input.id))
          .returning({ id: brand.id });

        if (!updatedBrand) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Brand not found" });
        }

        return { id: updatedBrand.id };
      }),
  }),

  categories: router({
    list: adminProcedure.query(async ({ ctx }) => {
      const categories = await ctx.db.query.category.findMany({
        orderBy: (categoriesTable, { asc: ascending }) => [
          ascending(categoriesTable.sortOrder),
          ascending(categoriesTable.nameFr),
        ],
        with: {
          imageAsset: true,
        },
      });

      return categories.map((categoryRecord) => ({
        id: categoryRecord.id,
        nameFr: categoryRecord.nameFr,
        nameAr: categoryRecord.nameAr,
        isActive: categoryRecord.isActive,
        isFeatured: categoryRecord.isFeatured,
        sortOrder: categoryRecord.sortOrder,
        image: mapAsset(categoryRecord.imageAsset),
      }));
    }),

    create: adminProcedure.input(categoryInputSchema).mutation(async ({ ctx, input }) => {
      await assertAssetKind(ctx, input.imageAssetId, "category");

      const categoryId = createId("category");

      await ctx.db.insert(category).values({
        id: categoryId,
        nameFr: input.nameFr,
        nameAr: input.nameAr,
        imageAssetId: input.imageAssetId,
        isActive: input.isActive,
        isFeatured: input.isFeatured,
        sortOrder: input.sortOrder,
      });

      return { id: categoryId };
    }),

    update: adminProcedure
      .input(
        z.object({
          id: z.string().trim().min(1),
          data: categoryInputSchema,
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await assertAssetKind(ctx, input.data.imageAssetId, "category");

        const [updatedCategory] = await ctx.db
          .update(category)
          .set({
            nameFr: input.data.nameFr,
            nameAr: input.data.nameAr,
            imageAssetId: input.data.imageAssetId,
            isActive: input.data.isActive,
            isFeatured: input.data.isFeatured,
            sortOrder: input.data.sortOrder,
          })
          .where(eq(category.id, input.id))
          .returning({ id: category.id });

        if (!updatedCategory) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Category not found" });
        }

        return { id: updatedCategory.id };
      }),
  }),

  products: router({
    list: adminProcedure.query(async ({ ctx }) => {
      const products = await ctx.db.query.product.findMany({
        orderBy: (productsTable, { asc: ascending }) => [ascending(productsTable.sortOrder), ascending(productsTable.nameFr)],
        with: {
          brand: {
            with: {
              logoAsset: true,
            },
          },
          imageAsset: true,
          productCategories: {
            with: {
              category: {
                with: {
                  imageAsset: true,
                },
              },
            },
          },
          homeFeaturedEntries: true,
        },
      });

      return products.map(mapProductRecord);
    }),

    create: adminProcedure.input(productInputSchema).mutation(async ({ ctx, input }) => {
      await assertBrandExists(ctx, input.brandId);
      await assertAssetKind(ctx, input.imageAssetId, "product");
      await assertCategoriesExist(ctx, input.categoryIds);

      const productId = createId("product");

      await ctx.db.transaction(async (tx) => {
        await tx.insert(product).values({
          id: productId,
          nameFr: input.nameFr,
          nameAr: input.nameAr,
          unitPrice: normalizeMoneyString(input.unitPrice),
          lotQuantity: input.lotQuantity,
          packagingLabel: input.packagingLabel,
          brandId: input.brandId,
          imageAssetId: input.imageAssetId,
          stockLots: input.stockLots,
          lowStockThreshold: input.lowStockThreshold ?? null,
          sku: normalizeOptionalText(input.sku),
          description: normalizeOptionalText(input.description),
          badgeLabel: normalizeOptionalText(input.badgeLabel),
          badgeColor: normalizeOptionalText(input.badgeColor),
          discountLotPrice: input.discountLotPrice ? normalizeMoneyString(input.discountLotPrice) : null,
          sortOrder: input.sortOrder,
          isArchived: false,
        });

        await tx.insert(productCategory).values(
          [...new Set(input.categoryIds)].map((categoryId) => ({
            productId,
            categoryId,
          })),
        );
      });

      return { id: productId };
    }),

    update: adminProcedure
      .input(
        z.object({
          id: z.string().trim().min(1),
          data: productUpdateInputSchema,
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await assertBrandExists(ctx, input.data.brandId);
        await assertAssetKind(ctx, input.data.imageAssetId, "product");
        await assertCategoriesExist(ctx, input.data.categoryIds);

        const existingProduct = await ctx.db.query.product.findFirst({
          where: eq(product.id, input.id),
        });

        if (!existingProduct) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
        }

        await ctx.db.transaction(async (tx) => {
          await tx
            .update(product)
            .set({
              nameFr: input.data.nameFr,
              nameAr: input.data.nameAr,
              unitPrice: normalizeMoneyString(input.data.unitPrice),
              lotQuantity: input.data.lotQuantity,
              packagingLabel: input.data.packagingLabel,
              brandId: input.data.brandId,
              imageAssetId: input.data.imageAssetId,
              stockLots: input.data.stockLots,
              lowStockThreshold: input.data.lowStockThreshold ?? null,
              sku: normalizeOptionalText(input.data.sku),
              description: normalizeOptionalText(input.data.description),
              badgeLabel: normalizeOptionalText(input.data.badgeLabel),
              badgeColor: normalizeOptionalText(input.data.badgeColor),
              discountLotPrice: input.data.discountLotPrice ? normalizeMoneyString(input.data.discountLotPrice) : null,
              sortOrder: input.data.sortOrder,
              isArchived: input.data.isArchived,
            })
            .where(eq(product.id, input.id));

          await tx.delete(productCategory).where(eq(productCategory.productId, input.id));

          await tx.insert(productCategory).values(
            [...new Set(input.data.categoryIds)].map((categoryId) => ({
              productId: input.id,
              categoryId,
            })),
          );
        });

        return { id: input.id };
      }),

    archive: adminProcedure
      .input(
        z.object({
          id: z.string().trim().min(1),
          isArchived: z.boolean(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const [updatedProduct] = await ctx.db
          .update(product)
          .set({ isArchived: input.isArchived })
          .where(eq(product.id, input.id))
          .returning({ id: product.id });

        if (!updatedProduct) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
        }

        return { id: updatedProduct.id, isArchived: input.isArchived };
      }),
  }),

  banners: router({
    list: adminProcedure.query(async ({ ctx }) => {
      const banners = await ctx.db.query.banner.findMany({
        orderBy: (bannersTable, { asc: ascending }) => [ascending(bannersTable.sortOrder), ascending(bannersTable.id)],
        with: {
          imageAsset: true,
        },
      });

      return banners.map((bannerRecord) => ({
        id: bannerRecord.id,
        isActive: bannerRecord.isActive,
        sortOrder: bannerRecord.sortOrder,
        image: mapAsset(bannerRecord.imageAsset),
      }));
    }),

    create: adminProcedure.input(bannerInputSchema).mutation(async ({ ctx, input }) => {
      await assertAssetKind(ctx, input.imageAssetId, "banner");

      const bannerId = createId("banner");

      await ctx.db.insert(banner).values({
        id: bannerId,
        imageAssetId: input.imageAssetId,
        isActive: input.isActive,
        sortOrder: input.sortOrder,
      });

      return { id: bannerId };
    }),

    update: adminProcedure
      .input(
        z.object({
          id: z.string().trim().min(1),
          data: bannerInputSchema,
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await assertAssetKind(ctx, input.data.imageAssetId, "banner");

        const [updatedBanner] = await ctx.db
          .update(banner)
          .set({
            imageAssetId: input.data.imageAssetId,
            isActive: input.data.isActive,
            sortOrder: input.data.sortOrder,
          })
          .where(eq(banner.id, input.id))
          .returning({ id: banner.id });

        if (!updatedBanner) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Banner not found" });
        }

        return { id: updatedBanner.id };
      }),
  }),

  home: router({
    settings: adminProcedure.query(async ({ ctx }) => {
      return ensureHomeSectionSettings(ctx.db);
    }),

    updateSettings: adminProcedure.input(homeSettingsInputSchema).mutation(async ({ ctx, input }) => {
      await ensureHomeSectionSettings(ctx.db);

      const [updatedSettings] = await ctx.db
        .update(homeSectionSettings)
        .set({
          ...(input.showBanners === undefined ? {} : { showBanners: input.showBanners }),
          ...(input.showFeaturedBrands === undefined ? {} : { showFeaturedBrands: input.showFeaturedBrands }),
          ...(input.showFeaturedCategories === undefined
            ? {}
            : { showFeaturedCategories: input.showFeaturedCategories }),
          ...(input.showFeaturedProducts === undefined
            ? {}
            : { showFeaturedProducts: input.showFeaturedProducts }),
        })
        .where(eq(homeSectionSettings.id, HOME_SECTION_SETTINGS_ID))
        .returning();

      if (!updatedSettings) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to update home settings" });
      }

      return updatedSettings;
    }),

    featuredProducts: adminProcedure.query(async ({ ctx }) => {
      const featuredProducts = await ctx.db.query.homeFeaturedProduct.findMany({
        orderBy: (featuredTable, { asc: ascending }) => [ascending(featuredTable.sortOrder), ascending(featuredTable.productId)],
        with: {
          product: {
            with: {
              brand: {
                with: {
                  logoAsset: true,
                },
              },
              imageAsset: true,
              productCategories: {
                with: {
                  category: {
                    with: {
                      imageAsset: true,
                    },
                  },
                },
              },
              homeFeaturedEntries: true,
            },
          },
        },
      });

      return featuredProducts
        .filter((entry) => entry.product !== null)
        .map((entry) => ({
          sortOrder: entry.sortOrder,
          product: mapProductRecord(entry.product!),
        }));
    }),

    setFeaturedProducts: adminProcedure
      .input(
        z.object({
          productIds: z.array(z.string().trim().min(1)),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const uniqueProductIds = [...new Set(input.productIds)];

        if (uniqueProductIds.length !== input.productIds.length) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Product ids must be unique" });
        }

        if (uniqueProductIds.length > 0) {
          const existingProducts = await ctx.db.query.product.findMany({
            where: and(inArray(product.id, uniqueProductIds), eq(product.isArchived, false)),
          });

          if (existingProducts.length !== uniqueProductIds.length) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "One or more featured products are invalid" });
          }
        }

        await ctx.db.transaction(async (tx) => {
          await tx.delete(homeFeaturedProduct);

          if (uniqueProductIds.length > 0) {
            await tx.insert(homeFeaturedProduct).values(
              uniqueProductIds.map((productId, index) => ({
                productId,
                sortOrder: index,
              })),
            );
          }
        });

        return { success: true, count: uniqueProductIds.length };
      }),
  }),
});
