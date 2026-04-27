import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

export const assetKind = pgEnum("asset_kind", ["product", "brand", "category", "banner"]);

export const asset = pgTable(
  "asset",
  {
    id: text("id").primaryKey(),
    kind: assetKind("kind").notNull(),
    publicId: text("public_id").notNull().unique(),
    url: text("url").notNull(),
    width: integer("width"),
    height: integer("height"),
    format: text("format"),
    bytes: integer("bytes"),
    folder: text("folder"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("asset_kind_idx").on(table.kind), uniqueIndex("asset_public_id_idx").on(table.publicId)],
);

export const brand = pgTable(
  "brand",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    logoAssetId: text("logo_asset_id")
      .notNull()
      .references(() => asset.id, { onDelete: "restrict" }),
    isActive: boolean("is_active").default(true).notNull(),
    isFeatured: boolean("is_featured").default(false).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("brand_sort_order_idx").on(table.sortOrder), index("brand_logo_asset_id_idx").on(table.logoAssetId)],
);

export const category = pgTable(
  "category",
  {
    id: text("id").primaryKey(),
    nameFr: text("name_fr").notNull(),
    nameAr: text("name_ar").notNull(),
    imageAssetId: text("image_asset_id")
      .notNull()
      .references(() => asset.id, { onDelete: "restrict" }),
    isActive: boolean("is_active").default(true).notNull(),
    isFeatured: boolean("is_featured").default(false).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("category_sort_order_idx").on(table.sortOrder),
    index("category_image_asset_id_idx").on(table.imageAssetId),
  ],
);

export const product = pgTable(
  "product",
  {
    id: text("id").primaryKey(),
    nameFr: text("name_fr").notNull(),
    nameAr: text("name_ar").notNull(),
    unitPrice: numeric("unit_price", { precision: 12, scale: 3 }).notNull(),
    lotQuantity: integer("lot_quantity").notNull(),
    packagingLabel: text("packaging_label").notNull(),
    brandId: text("brand_id")
      .notNull()
      .references(() => brand.id, { onDelete: "restrict" }),
    imageAssetId: text("image_asset_id")
      .notNull()
      .references(() => asset.id, { onDelete: "restrict" }),
    stockLots: integer("stock_lots").default(0).notNull(),
    lowStockThreshold: integer("low_stock_threshold"),
    sku: text("sku"),
    description: text("description"),
    badgeLabel: text("badge_label"),
    badgeColor: text("badge_color"),
    discountLotPrice: numeric("discount_lot_price", { precision: 12, scale: 3 }),
    sortOrder: integer("sort_order").default(0).notNull(),
    isArchived: boolean("is_archived").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("product_brand_id_idx").on(table.brandId),
    index("product_image_asset_id_idx").on(table.imageAssetId),
    index("product_sort_order_idx").on(table.sortOrder),
    index("product_archived_idx").on(table.isArchived),
    uniqueIndex("product_sku_idx").on(table.sku),
  ],
);

export const productCategory = pgTable(
  "product_category",
  {
    productId: text("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => category.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.productId, table.categoryId] }),
    index("product_category_category_id_idx").on(table.categoryId),
  ],
);

export const banner = pgTable(
  "banner",
  {
    id: text("id").primaryKey(),
    imageAssetId: text("image_asset_id")
      .notNull()
      .references(() => asset.id, { onDelete: "restrict" }),
    isActive: boolean("is_active").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("banner_sort_order_idx").on(table.sortOrder), index("banner_image_asset_id_idx").on(table.imageAssetId)],
);

export const homeSectionSettings = pgTable("home_section_settings", {
  id: text("id").primaryKey(),
  showBanners: boolean("show_banners").default(true).notNull(),
  showFeaturedBrands: boolean("show_featured_brands").default(true).notNull(),
  showFeaturedCategories: boolean("show_featured_categories").default(true).notNull(),
  showFeaturedProducts: boolean("show_featured_products").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const homeFeaturedProduct = pgTable(
  "home_featured_product",
  {
    productId: text("product_id")
      .primaryKey()
      .references(() => product.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("home_featured_product_sort_order_idx").on(table.sortOrder)],
);

export const favoriteProduct = pgTable(
  "favorite_product",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.productId] }),
    index("favorite_product_product_id_idx").on(table.productId),
  ],
);

export const assetRelations = relations(asset, ({ many }) => ({
  brands: many(brand),
  categories: many(category),
  products: many(product),
  banners: many(banner),
}));

export const brandRelations = relations(brand, ({ one, many }) => ({
  logoAsset: one(asset, {
    fields: [brand.logoAssetId],
    references: [asset.id],
  }),
  products: many(product),
}));

export const categoryRelations = relations(category, ({ one, many }) => ({
  imageAsset: one(asset, {
    fields: [category.imageAssetId],
    references: [asset.id],
  }),
  productCategories: many(productCategory),
}));

export const productRelations = relations(product, ({ one, many }) => ({
  brand: one(brand, {
    fields: [product.brandId],
    references: [brand.id],
  }),
  imageAsset: one(asset, {
    fields: [product.imageAssetId],
    references: [asset.id],
  }),
  productCategories: many(productCategory),
  homeFeaturedEntries: many(homeFeaturedProduct),
  favorites: many(favoriteProduct),
}));

export const productCategoryRelations = relations(productCategory, ({ one }) => ({
  product: one(product, {
    fields: [productCategory.productId],
    references: [product.id],
  }),
  category: one(category, {
    fields: [productCategory.categoryId],
    references: [category.id],
  }),
}));

export const bannerRelations = relations(banner, ({ one }) => ({
  imageAsset: one(asset, {
    fields: [banner.imageAssetId],
    references: [asset.id],
  }),
}));

export const homeFeaturedProductRelations = relations(homeFeaturedProduct, ({ one }) => ({
  product: one(product, {
    fields: [homeFeaturedProduct.productId],
    references: [product.id],
  }),
}));

export const favoriteProductRelations = relations(favoriteProduct, ({ one }) => ({
  user: one(user, {
    fields: [favoriteProduct.userId],
    references: [user.id],
  }),
  product: one(product, {
    fields: [favoriteProduct.productId],
    references: [product.id],
  }),
}));
