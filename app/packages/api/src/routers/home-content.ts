import { banner, brand, category, product } from "@app/db/schema/catalog";
import { and, eq } from "drizzle-orm";

import { publicProcedure, router } from "../index";
import { calculateLotPrice, ensureHomeSectionSettings } from "./catalog-shared";

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

function mapPublicProduct(productRecord: {
  id: string;
  nameFr: string;
  nameAr: string;
  unitPrice: string;
  lotQuantity: number;
  packagingLabel: string;
  stockLots: number;
  description: string | null;
  badgeLabel: string | null;
  badgeColor: string | null;
  discountLotPrice: string | null;
  brand: {
    id: string;
    name: string;
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
    };
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
    isOutOfStock: productRecord.stockLots < 1,
    description: productRecord.description,
    badgeLabel: productRecord.badgeLabel,
    badgeColor: productRecord.badgeColor,
    discountLotPrice: productRecord.discountLotPrice,
    image: mapAsset(productRecord.imageAsset),
    brand: productRecord.brand
      ? {
          id: productRecord.brand.id,
          name: productRecord.brand.name,
          logo: mapAsset(productRecord.brand.logoAsset),
        }
      : null,
    categories: productRecord.productCategories.map(({ category: linkedCategory }) => ({
      id: linkedCategory.id,
      nameFr: linkedCategory.nameFr,
      nameAr: linkedCategory.nameAr,
    })),
  };
}

export const homeContentRouter = router({
  get: publicProcedure.query(async ({ ctx }) => {
    const settings = await ensureHomeSectionSettings(ctx.db);

    const [activeBanners, featuredBrands, featuredCategories, configuredFeaturedProducts] = await Promise.all([
      ctx.db.query.banner.findMany({
        where: eq(banner.isActive, true),
        orderBy: (bannersTable, { asc: ascending }) => [ascending(bannersTable.sortOrder), ascending(bannersTable.id)],
        with: {
          imageAsset: true,
        },
      }),
      ctx.db.query.brand.findMany({
        where: and(eq(brand.isActive, true), eq(brand.isFeatured, true)),
        orderBy: (brandsTable, { asc: ascending }) => [ascending(brandsTable.sortOrder), ascending(brandsTable.name)],
        with: {
          logoAsset: true,
        },
      }),
      ctx.db.query.category.findMany({
        where: and(eq(category.isActive, true), eq(category.isFeatured, true)),
        orderBy: (categoriesTable, { asc: ascending }) => [
          ascending(categoriesTable.sortOrder),
          ascending(categoriesTable.nameFr),
        ],
        with: {
          imageAsset: true,
        },
      }),
      ctx.db.query.homeFeaturedProduct.findMany({
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
                  category: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const selectedFeaturedProducts = configuredFeaturedProducts
      .filter((entry) => entry.product !== null && entry.product.isArchived === false)
      .map((entry) => mapPublicProduct(entry.product!));

    const featuredProducts =
      selectedFeaturedProducts.length > 0
        ? selectedFeaturedProducts
        : (
            await ctx.db.query.product.findMany({
              where: eq(product.isArchived, false),
              orderBy: (productsTable, { desc: descending }) => [descending(productsTable.createdAt)],
              limit: 12,
              with: {
                brand: {
                  with: {
                    logoAsset: true,
                  },
                },
                imageAsset: true,
                productCategories: {
                  with: {
                    category: true,
                  },
                },
              },
            })
          ).map(mapPublicProduct);

    return {
      settings: {
        showBanners: settings.showBanners,
        showFeaturedBrands: settings.showFeaturedBrands,
        showFeaturedCategories: settings.showFeaturedCategories,
        showFeaturedProducts: settings.showFeaturedProducts,
      },
      banners: activeBanners.map((bannerRecord) => ({
        id: bannerRecord.id,
        sortOrder: bannerRecord.sortOrder,
        image: mapAsset(bannerRecord.imageAsset),
      })),
      featuredBrands: featuredBrands.map((brandRecord) => ({
        id: brandRecord.id,
        name: brandRecord.name,
        sortOrder: brandRecord.sortOrder,
        logo: mapAsset(brandRecord.logoAsset),
      })),
      featuredCategories: featuredCategories.map((categoryRecord) => ({
        id: categoryRecord.id,
        nameFr: categoryRecord.nameFr,
        nameAr: categoryRecord.nameAr,
        sortOrder: categoryRecord.sortOrder,
        image: mapAsset(categoryRecord.imageAsset),
      })),
      featuredProducts,
    };
  }),
});
