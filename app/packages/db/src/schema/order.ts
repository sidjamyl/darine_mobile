import { relations } from "drizzle-orm";
import { index, integer, numeric, pgEnum, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

import { user } from "./auth";
import { product } from "./catalog";

export const orderStatus = pgEnum("order_status", ["to_call", "called", "processing", "processed", "cancelled"]);
export const stockMovementReason = pgEnum("stock_movement_reason", ["order_processing", "order_cancellation", "manual_adjustment"]);

export const customerOrder = pgTable(
  "customer_order",
  {
    id: text("id").primaryKey(),
    orderNumber: text("order_number").notNull().unique(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    status: orderStatus("status").default("to_call").notNull(),
    customerFullNameSnapshot: text("customer_full_name_snapshot").notNull(),
    customerPhoneSnapshot: text("customer_phone_snapshot").notNull(),
    customerPhoneLocalSnapshot: text("customer_phone_local_snapshot"),
    wilayaIdSnapshot: text("wilaya_id_snapshot").notNull(),
    wilayaNameFrSnapshot: text("wilaya_name_fr_snapshot").notNull(),
    wilayaNameArSnapshot: text("wilaya_name_ar_snapshot").notNull(),
    communeIdSnapshot: text("commune_id_snapshot").notNull(),
    communeNameFrSnapshot: text("commune_name_fr_snapshot").notNull(),
    communeNameArSnapshot: text("commune_name_ar_snapshot").notNull(),
    streetAddressSnapshot: text("street_address_snapshot").notNull(),
    latitudeSnapshot: numeric("latitude_snapshot", { precision: 10, scale: 7 }),
    longitudeSnapshot: numeric("longitude_snapshot", { precision: 10, scale: 7 }),
    totalAmountSnapshot: numeric("total_amount_snapshot", { precision: 12, scale: 3 }).notNull(),
    internalAdminNotes: text("internal_admin_notes"),
    stockAppliedAt: timestamp("stock_applied_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("customer_order_number_idx").on(table.orderNumber),
    index("customer_order_user_id_idx").on(table.userId),
    index("customer_order_status_idx").on(table.status),
    index("customer_order_created_at_idx").on(table.createdAt),
  ],
);

export const orderLine = pgTable(
  "order_line",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => customerOrder.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "restrict" }),
    sortOrder: integer("sort_order").default(0).notNull(),
    productNameFrSnapshot: text("product_name_fr_snapshot").notNull(),
    productNameArSnapshot: text("product_name_ar_snapshot").notNull(),
    productImageUrlSnapshot: text("product_image_url_snapshot").notNull(),
    unitPriceSnapshot: numeric("unit_price_snapshot", { precision: 12, scale: 3 }).notNull(),
    lotQuantitySnapshot: integer("lot_quantity_snapshot").notNull(),
    packagingLabelSnapshot: text("packaging_label_snapshot").notNull(),
    regularLotPriceSnapshot: numeric("regular_lot_price_snapshot", { precision: 12, scale: 3 }).notNull(),
    discountLotPriceSnapshot: numeric("discount_lot_price_snapshot", { precision: 12, scale: 3 }),
    effectiveLotPriceSnapshot: numeric("effective_lot_price_snapshot", { precision: 12, scale: 3 }).notNull(),
    selectedLots: integer("selected_lots").notNull(),
    lineTotalSnapshot: numeric("line_total_snapshot", { precision: 12, scale: 3 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("order_line_order_id_idx").on(table.orderId), index("order_line_product_id_idx").on(table.productId)],
);

export const orderNumberCounter = pgTable("order_number_counter", {
  year: integer("year").primaryKey(),
  lastValue: integer("last_value").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const deliveryNote = pgTable(
  "delivery_note",
  {
    orderId: text("order_id")
      .primaryKey()
      .references(() => customerOrder.id, { onDelete: "cascade" }),
    blNumber: text("bl_number").notNull().unique(),
    oldBalance: numeric("old_balance", { precision: 12, scale: 3 }).notNull(),
    paymentAmount: numeric("payment_amount", { precision: 12, scale: 3 }).notNull(),
    newBalance: numeric("new_balance", { precision: 12, scale: 3 }).notNull(),
    createdByAdminUserId: text("created_by_admin_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("delivery_note_bl_number_idx").on(table.blNumber),
    index("delivery_note_created_by_admin_user_id_idx").on(table.createdByAdminUserId),
  ],
);

export const deliveryNoteCounter = pgTable("delivery_note_counter", {
  year: integer("year").primaryKey(),
  lastValue: integer("last_value").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const stockMovement = pgTable(
  "stock_movement",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "restrict" }),
    orderId: text("order_id").references(() => customerOrder.id, { onDelete: "set null" }),
    adminUserId: text("admin_user_id").references(() => user.id, { onDelete: "set null" }),
    quantityLotsDelta: integer("quantity_lots_delta").notNull(),
    reason: stockMovementReason("reason").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("stock_movement_product_id_idx").on(table.productId),
    index("stock_movement_order_id_idx").on(table.orderId),
    index("stock_movement_admin_user_id_idx").on(table.adminUserId),
    index("stock_movement_created_at_idx").on(table.createdAt),
  ],
);

export const adminAuditLog = pgTable(
  "admin_audit_log",
  {
    id: text("id").primaryKey(),
    adminUserId: text("admin_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    summary: text("summary").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("admin_audit_log_admin_user_id_idx").on(table.adminUserId),
    index("admin_audit_log_target_idx").on(table.targetType, table.targetId),
    index("admin_audit_log_created_at_idx").on(table.createdAt),
  ],
);

export const customerOrderRelations = relations(customerOrder, ({ one, many }) => ({
  user: one(user, {
    fields: [customerOrder.userId],
    references: [user.id],
  }),
  lines: many(orderLine),
  deliveryNote: one(deliveryNote, {
    fields: [customerOrder.id],
    references: [deliveryNote.orderId],
  }),
  stockMovements: many(stockMovement),
}));

export const orderLineRelations = relations(orderLine, ({ one }) => ({
  order: one(customerOrder, {
    fields: [orderLine.orderId],
    references: [customerOrder.id],
  }),
  product: one(product, {
    fields: [orderLine.productId],
    references: [product.id],
  }),
}));

export const deliveryNoteRelations = relations(deliveryNote, ({ one }) => ({
  order: one(customerOrder, {
    fields: [deliveryNote.orderId],
    references: [customerOrder.id],
  }),
  createdByAdminUser: one(user, {
    fields: [deliveryNote.createdByAdminUserId],
    references: [user.id],
  }),
}));

export const stockMovementRelations = relations(stockMovement, ({ one }) => ({
  product: one(product, {
    fields: [stockMovement.productId],
    references: [product.id],
  }),
  order: one(customerOrder, {
    fields: [stockMovement.orderId],
    references: [customerOrder.id],
  }),
  adminUser: one(user, {
    fields: [stockMovement.adminUserId],
    references: [user.id],
  }),
}));

export const adminAuditLogRelations = relations(adminAuditLog, ({ one }) => ({
  adminUser: one(user, {
    fields: [adminAuditLog.adminUserId],
    references: [user.id],
  }),
}));
