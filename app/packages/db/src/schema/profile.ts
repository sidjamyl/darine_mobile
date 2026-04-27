import { relations } from "drizzle-orm";
import { index, integer, numeric, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

import { user } from "./auth";

export const wilaya = pgTable(
  "wilaya",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull().unique(),
    nameFr: text("name_fr").notNull(),
    nameAr: text("name_ar").notNull(),
    sortOrder: integer("sort_order").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [uniqueIndex("wilaya_code_idx").on(table.code)],
);

export const commune = pgTable(
  "commune",
  {
    id: text("id").primaryKey(),
    sourceId: text("source_id").notNull().unique(),
    wilayaId: text("wilaya_id")
      .notNull()
      .references(() => wilaya.id, { onDelete: "restrict" }),
    nameFr: text("name_fr").notNull(),
    nameAr: text("name_ar").notNull(),
    dairaNameFr: text("daira_name_fr"),
    dairaNameAr: text("daira_name_ar"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("commune_wilaya_id_idx").on(table.wilayaId),
    uniqueIndex("commune_source_id_idx").on(table.sourceId),
  ],
);

export const clientProfile = pgTable(
  "client_profile",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    fullName: text("full_name").notNull(),
    wilayaId: text("wilaya_id")
      .notNull()
      .references(() => wilaya.id, { onDelete: "restrict" }),
    communeId: text("commune_id")
      .notNull()
      .references(() => commune.id, { onDelete: "restrict" }),
    streetAddress: text("street_address").notNull(),
    latitude: numeric("latitude", { precision: 10, scale: 7 }),
    longitude: numeric("longitude", { precision: 10, scale: 7 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("client_profile_wilaya_id_idx").on(table.wilayaId)],
);

export const wilayaRelations = relations(wilaya, ({ many }) => ({
  communes: many(commune),
  clientProfiles: many(clientProfile),
}));

export const communeRelations = relations(commune, ({ one, many }) => ({
  wilaya: one(wilaya, {
    fields: [commune.wilayaId],
    references: [wilaya.id],
  }),
  clientProfiles: many(clientProfile),
}));

export const clientProfileRelations = relations(clientProfile, ({ one }) => ({
  user: one(user, {
    fields: [clientProfile.userId],
    references: [user.id],
  }),
  wilaya: one(wilaya, {
    fields: [clientProfile.wilayaId],
    references: [wilaya.id],
  }),
  commune: one(commune, {
    fields: [clientProfile.communeId],
    references: [commune.id],
  }),
}));
