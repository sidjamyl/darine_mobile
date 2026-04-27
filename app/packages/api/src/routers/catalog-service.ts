import { user } from "@app/db/schema/auth";
import { brand, category, favoriteProduct, product, productCategory } from "@app/db/schema/catalog";
import { and, desc, eq, exists, ilike, inArray, or, sql } from "drizzle-orm";

import type { Context } from "../context";
import { calculateLotPrice } from "./catalog-shared";

export const DEFAULT_CATALOG_LIMIT = 48;
export const MAX_CATALOG_LIMIT = 100;

type CatalogAssetRecord = {
  id: string;
  kind: string;
  publicId: string;
  url: string;
  width: number | null;
  height: number | null;
  format: string | null;
  bytes: number | null;
  folder: string | null;
};

type CatalogProductRecord = {
  id: string;
  nameFr: string;
  nameAr: string;
  unitPrice: string;
  lotQuantity: number;
  packagingLabel: string;
  stockLots: number;
  sku: string | null;
  description: string | null;
  badgeLabel: string | null;
  badgeColor: string | null;
  discountLotPrice: string | null;
  sortOrder: number;
  isArchived: boolean;
  createdAt: Date;
  brand: {
    id: string;
    name: string;
    isActive: boolean;
    logoAsset: CatalogAssetRecord | null;
  } | null;
  imageAsset: CatalogAssetRecord | null;
  productCategories: Array<{
    category: {
      id: string;
      nameFr: string;
      nameAr: string;
      isActive: boolean;
    };
  }>;
};

export type CatalogListInput = {
  query?: string | undefined;
  brandIds?: string[] | undefined;
  categoryIds?: string[] | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
};

function mapAsset(assetRecord?: CatalogAssetRecord | null) {
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

function mapCatalogProduct(productRecord: CatalogProductRecord, favoriteProductIds: Set<string>) {
  const activeCategories = productRecord.productCategories
    .map((entry) => entry.category)
    .filter((linkedCategory) => linkedCategory.isActive);

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
    sku: productRecord.sku,
    description: productRecord.description,
    badgeLabel: productRecord.badgeLabel,
    badgeColor: productRecord.badgeColor,
    discountLotPrice: productRecord.discountLotPrice,
    sortOrder: productRecord.sortOrder,
    createdAt: productRecord.createdAt,
    isFavorite: favoriteProductIds.has(productRecord.id),
    image: mapAsset(productRecord.imageAsset),
    brand: productRecord.brand
      ? {
          id: productRecord.brand.id,
          name: productRecord.brand.name,
          logo: mapAsset(productRecord.brand.logoAsset),
        }
      : null,
    categories: activeCategories.map((linkedCategory) => ({
      id: linkedCategory.id,
      nameFr: linkedCategory.nameFr,
      nameAr: linkedCategory.nameAr,
    })),
  };
}

function uniqueIds(values?: string[]) {
  return [...new Set((values ?? []).map((value) => value.trim()).filter((value) => value.length > 0))];
}

function normalizeSearchQuery(query?: string) {
  const value = query?.trim();
  return value && value.length > 0 ? value : undefined;
}

function createActiveCategoryExists(db: Context["db"]) {
  return exists(
    db
      .select({ one: sql`1` })
      .from(productCategory)
      .innerJoin(category, eq(category.id, productCategory.categoryId))
      .where(and(eq(productCategory.productId, product.id), eq(category.isActive, true))),
  );
}

function createCategoryFilterExists(db: Context["db"], categoryIds: string[]) {
  return exists(
    db
      .select({ one: sql`1` })
      .from(productCategory)
      .innerJoin(category, eq(category.id, productCategory.categoryId))
      .where(
        and(
          eq(productCategory.productId, product.id),
          eq(category.isActive, true),
          inArray(category.id, categoryIds),
        ),
      ),
  );
}

function createCategorySearchExists(db: Context["db"], searchPattern: string) {
  return exists(
    db
      .select({ one: sql`1` })
      .from(productCategory)
      .innerJoin(category, eq(category.id, productCategory.categoryId))
      .where(
        and(
          eq(productCategory.productId, product.id),
          eq(category.isActive, true),
          or(ilike(category.nameFr, searchPattern), ilike(category.nameAr, searchPattern)),
        ),
      ),
  );
}

function createVisibleCatalogWhere(db: Context["db"], input: CatalogListInput) {
  const brandIds = uniqueIds(input.brandIds);
  const categoryIds = uniqueIds(input.categoryIds);
  const query = normalizeSearchQuery(input.query);
  const searchPattern = query ? `%${query}%` : undefined;

  return and(
    eq(product.isArchived, false),
    eq(brand.isActive, true),
    createActiveCategoryExists(db),
    brandIds.length > 0 ? inArray(product.brandId, brandIds) : undefined,
    categoryIds.length > 0 ? createCategoryFilterExists(db, categoryIds) : undefined,
    searchPattern
      ? or(
          ilike(product.nameFr, searchPattern),
          ilike(product.nameAr, searchPattern),
          ilike(product.description, searchPattern),
          ilike(brand.name, searchPattern),
          createCategorySearchExists(db, searchPattern),
        )
      : undefined,
  );
}

async function getFavoriteProductIds(ctx: Pick<Context, "db">, userId: string | null, productIds: string[]) {
  if (!userId || productIds.length === 0) {
    return new Set<string>();
  }

  const favoriteRows = await ctx.db.query.favoriteProduct.findMany({
    where: and(eq(favoriteProduct.userId, userId), inArray(favoriteProduct.productId, productIds)),
  });

  return new Set(favoriteRows.map((row) => row.productId));
}

function isPubliclyVisibleProduct(productRecord: CatalogProductRecord) {
  return !productRecord.isArchived && productRecord.brand?.isActive === true && productRecord.productCategories.some((entry) => entry.category.isActive);
}

export async function getOptionalViewerUserId(ctx: Pick<Context, "db" | "session">) {
  if (!ctx.session?.user?.id) {
    return null;
  }

  const currentUser = await ctx.db.query.user.findFirst({
    where: eq(user.id, ctx.session.user.id),
  });

  if (!currentUser || currentUser.isDisabled) {
    return null;
  }

  return currentUser.id;
}

export async function loadVisibleCatalogProductsByIds(
  ctx: Pick<Context, "db">,
  productIds: string[],
  viewerUserId: string | null,
) {
  const uniqueProductIds = [...new Set(productIds)];

  if (uniqueProductIds.length === 0) {
    return [];
  }

  const orderMap = new Map(uniqueProductIds.map((productId, index) => [productId, index]));

  const products = await ctx.db.query.product.findMany({
    where: inArray(product.id, uniqueProductIds),
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
  });

  const visibleProducts = products.filter(isPubliclyVisibleProduct) as CatalogProductRecord[];
  const favoriteProductIds = await getFavoriteProductIds(ctx, viewerUserId, visibleProducts.map((entry) => entry.id));

  return visibleProducts
    .sort((left, right) => (orderMap.get(left.id) ?? Number.MAX_SAFE_INTEGER) - (orderMap.get(right.id) ?? Number.MAX_SAFE_INTEGER))
    .map((productRecord) => mapCatalogProduct(productRecord, favoriteProductIds));
}

export async function searchVisibleCatalogProductIds(ctx: Pick<Context, "db">, input: CatalogListInput) {
  const limit = Math.min(Math.max(input.limit ?? DEFAULT_CATALOG_LIMIT, 1), MAX_CATALOG_LIMIT);
  const offset = Math.max(input.offset ?? 0, 0);
  const where = createVisibleCatalogWhere(ctx.db, input);

  const [totalRow, matchingRows] = await Promise.all([
    ctx.db
      .select({
        total: sql<number>`count(*)`,
      })
      .from(product)
      .innerJoin(brand, eq(brand.id, product.brandId))
      .where(where),
    ctx.db
      .select({
        id: product.id,
      })
      .from(product)
      .innerJoin(brand, eq(brand.id, product.brandId))
      .where(where)
      .orderBy(product.sortOrder, desc(product.createdAt))
      .limit(limit)
      .offset(offset),
  ]);

  return {
    productIds: matchingRows.map((row) => row.id),
    total: Number(totalRow[0]?.total ?? 0),
    limit,
    offset,
  };
}

export async function listCatalogFilterOptions(ctx: Pick<Context, "db">) {
  const [brands, categories] = await Promise.all([
    ctx.db.query.brand.findMany({
      where: and(
        eq(brand.isActive, true),
        exists(
          ctx.db
            .select({ one: sql`1` })
            .from(product)
            .where(and(eq(product.brandId, brand.id), eq(product.isArchived, false), createActiveCategoryExists(ctx.db))),
        ),
      ),
      orderBy: (brandsTable, { asc }) => [asc(brandsTable.sortOrder), asc(brandsTable.name)],
      with: {
        logoAsset: true,
      },
    }),
    ctx.db.query.category.findMany({
      where: and(
        eq(category.isActive, true),
        exists(
          ctx.db
            .select({ one: sql`1` })
            .from(productCategory)
            .innerJoin(product, eq(product.id, productCategory.productId))
            .innerJoin(brand, eq(brand.id, product.brandId))
            .where(
              and(
                eq(productCategory.categoryId, category.id),
                eq(product.isArchived, false),
                eq(brand.isActive, true),
              ),
            ),
        ),
      ),
      orderBy: (categoriesTable, { asc }) => [asc(categoriesTable.sortOrder), asc(categoriesTable.nameFr)],
    }),
  ]);

  return {
    brands: brands.map((brandRecord) => ({
      id: brandRecord.id,
      name: brandRecord.name,
      sortOrder: brandRecord.sortOrder,
      logo: mapAsset(brandRecord.logoAsset),
    })),
    categories: categories.map((categoryRecord) => ({
      id: categoryRecord.id,
      nameFr: categoryRecord.nameFr,
      nameAr: categoryRecord.nameAr,
      sortOrder: categoryRecord.sortOrder,
    })),
  };
}
