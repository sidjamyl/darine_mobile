import { relations } from "drizzle-orm";
import { boolean, index, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "./auth";
import { customerOrder } from "./order";

export const mobilePlatform = pgEnum("mobile_platform", ["ios", "android"]);
export const notificationKind = pgEnum("notification_kind", ["order_status", "announcement"]);
export const messageChannel = pgEnum("message_channel", ["email", "expo_push", "whatsapp"]);
export const messageDeliveryStatus = pgEnum("message_delivery_status", ["success", "failure"]);
export const messageTemplateKey = pgEnum("message_template_key", [
  "new_order_admin",
  "order_status_client",
  "announcement_global",
]);

export const userPushDevice = pgTable(
  "user_push_device",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    deviceId: text("device_id").notNull(),
    platform: mobilePlatform("platform").notNull(),
    expoPushToken: text("expo_push_token").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    invalidatedAt: timestamp("invalidated_at"),
    lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("user_push_device_user_id_idx").on(table.userId),
    index("user_push_device_device_id_idx").on(table.deviceId),
    index("user_push_device_token_idx").on(table.expoPushToken),
  ],
);

export const adminNotificationPreference = pgTable("admin_notification_preference", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  receivesNewOrderEmail: boolean("receives_new_order_email").default(true).notNull(),
  receivesNewOrderPush: boolean("receives_new_order_push").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const announcement = pgTable(
  "announcement",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    sendPush: boolean("send_push").default(false).notNull(),
    createdByAdminUserId: text("created_by_admin_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("announcement_created_at_idx").on(table.createdAt)],
);

export const userNotification = pgTable(
  "user_notification",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: notificationKind("kind").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    orderId: text("order_id").references(() => customerOrder.id, { onDelete: "set null" }),
    announcementId: text("announcement_id").references(() => announcement.id, { onDelete: "set null" }),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("user_notification_user_id_idx").on(table.userId),
    index("user_notification_created_at_idx").on(table.createdAt),
    index("user_notification_expires_at_idx").on(table.expiresAt),
  ],
);

export const messageDeliveryLog = pgTable(
  "message_delivery_log",
  {
    id: text("id").primaryKey(),
    channel: messageChannel("channel").notNull(),
    status: messageDeliveryStatus("status").notNull(),
    templateKey: messageTemplateKey("template_key").notNull(),
    targetUserId: text("target_user_id").references(() => user.id, { onDelete: "set null" }),
    orderId: text("order_id").references(() => customerOrder.id, { onDelete: "set null" }),
    announcementId: text("announcement_id").references(() => announcement.id, { onDelete: "set null" }),
    deviceId: text("device_id"),
    recipient: text("recipient").notNull(),
    provider: text("provider").notNull(),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("message_delivery_log_target_user_id_idx").on(table.targetUserId),
    index("message_delivery_log_order_id_idx").on(table.orderId),
    index("message_delivery_log_announcement_id_idx").on(table.announcementId),
    index("message_delivery_log_created_at_idx").on(table.createdAt),
  ],
);

export const userPushDeviceRelations = relations(userPushDevice, ({ one }) => ({
  user: one(user, {
    fields: [userPushDevice.userId],
    references: [user.id],
  }),
}));

export const adminNotificationPreferenceRelations = relations(adminNotificationPreference, ({ one }) => ({
  user: one(user, {
    fields: [adminNotificationPreference.userId],
    references: [user.id],
  }),
}));

export const announcementRelations = relations(announcement, ({ one, many }) => ({
  createdByAdminUser: one(user, {
    fields: [announcement.createdByAdminUserId],
    references: [user.id],
  }),
  notifications: many(userNotification),
  deliveryLogs: many(messageDeliveryLog),
}));

export const userNotificationRelations = relations(userNotification, ({ one }) => ({
  user: one(user, {
    fields: [userNotification.userId],
    references: [user.id],
  }),
  order: one(customerOrder, {
    fields: [userNotification.orderId],
    references: [customerOrder.id],
  }),
  announcement: one(announcement, {
    fields: [userNotification.announcementId],
    references: [announcement.id],
  }),
}));

export const messageDeliveryLogRelations = relations(messageDeliveryLog, ({ one }) => ({
  targetUser: one(user, {
    fields: [messageDeliveryLog.targetUserId],
    references: [user.id],
  }),
  order: one(customerOrder, {
    fields: [messageDeliveryLog.orderId],
    references: [customerOrder.id],
  }),
  announcement: one(announcement, {
    fields: [messageDeliveryLog.announcementId],
    references: [announcement.id],
  }),
}));
