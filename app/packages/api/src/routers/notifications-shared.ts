import { isClientTechnicalEmail } from "@app/auth/phone";
import { user } from "@app/db/schema/auth";
import {
  adminNotificationPreference,
  announcement,
  messageDeliveryLog,
  userNotification,
  userPushDevice,
} from "@app/db/schema/notification";
import { clientProfile } from "@app/db/schema/profile";
import { and, eq, gt, inArray, lt, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { Context } from "../context";
import { createId } from "./catalog-shared";
import { sendExpoPushMessage, sendResendEmail } from "./messaging";

export const NOTIFICATION_RETENTION_DAYS = 90;

export const pushDeviceInputSchema = z.object({
  deviceId: z.string().trim().min(1),
  platform: z.enum(["ios", "android"]),
  expoPushToken: z.string().trim().min(1),
});

export const invalidatePushDeviceInputSchema = z
  .object({
    deviceId: z.string().trim().min(1).optional(),
    expoPushToken: z.string().trim().min(1).optional(),
  })
  .refine((value) => value.deviceId || value.expoPushToken, {
    message: "Provide a deviceId or expoPushToken",
  });

export const announcementInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(5000),
  sendPush: z.boolean().default(false),
});

export const adminNotificationPreferenceInputSchema = z.object({
  userId: z.string().trim().min(1),
  receivesNewOrderEmail: z.boolean(),
  receivesNewOrderPush: z.boolean(),
});

type DeliveryLogInput = {
  channel: "email" | "expo_push" | "whatsapp";
  status: "success" | "failure";
  templateKey: "new_order_admin" | "order_status_client" | "announcement_global";
  recipient: string;
  provider: string;
  targetUserId?: string | null;
  orderId?: string | null;
  announcementId?: string | null;
  deviceId?: string | null;
  errorMessage?: string | null;
};

function notificationExpiryFrom(now: Date) {
  return new Date(now.getTime() + NOTIFICATION_RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

function orderStatusLabel(status: "to_call" | "called" | "processing" | "processed" | "cancelled") {
  switch (status) {
    case "to_call":
      return "À appeler";
    case "called":
      return "Client appelé";
    case "processing":
      return "En traitement";
    case "processed":
      return "Commande traitée";
    case "cancelled":
      return "Annulée";
  }
}

async function logDelivery(db: Context["db"], input: DeliveryLogInput) {
  await db.insert(messageDeliveryLog).values({
    id: createId("delivery-log"),
    channel: input.channel,
    status: input.status,
    templateKey: input.templateKey,
    targetUserId: input.targetUserId ?? null,
    orderId: input.orderId ?? null,
    announcementId: input.announcementId ?? null,
    deviceId: input.deviceId ?? null,
    recipient: input.recipient,
    provider: input.provider,
    errorMessage: input.errorMessage ?? null,
  });
}

export async function pruneExpiredNotifications(db: Context["db"]) {
  await db.delete(userNotification).where(lt(userNotification.expiresAt, new Date()));
}

export async function registerPushDeviceForUser(
  db: Context["db"],
  userId: string,
  input: z.infer<typeof pushDeviceInputSchema>,
) {
  const now = new Date();

  const existingDevice = await db.query.userPushDevice.findFirst({
    where: and(eq(userPushDevice.userId, userId), eq(userPushDevice.deviceId, input.deviceId)),
  });

  if (existingDevice) {
    const [updatedDevice] = await db
      .update(userPushDevice)
      .set({
        platform: input.platform,
        expoPushToken: input.expoPushToken,
        isActive: true,
        invalidatedAt: null,
        lastSeenAt: now,
      })
      .where(eq(userPushDevice.id, existingDevice.id))
      .returning();

    return updatedDevice;
  }

  const existingToken = await db.query.userPushDevice.findFirst({
    where: eq(userPushDevice.expoPushToken, input.expoPushToken),
  });

  if (existingToken) {
    const [updatedToken] = await db
      .update(userPushDevice)
      .set({
        userId,
        deviceId: input.deviceId,
        platform: input.platform,
        isActive: true,
        invalidatedAt: null,
        lastSeenAt: now,
      })
      .where(eq(userPushDevice.id, existingToken.id))
      .returning();

    return updatedToken;
  }

  const [createdDevice] = await db
    .insert(userPushDevice)
    .values({
      id: createId("push-device"),
      userId,
      deviceId: input.deviceId,
      platform: input.platform,
      expoPushToken: input.expoPushToken,
      isActive: true,
      invalidatedAt: null,
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return createdDevice;
}

export async function invalidatePushDevicesForUser(
  db: Context["db"],
  userId: string,
  input: z.infer<typeof invalidatePushDeviceInputSchema>,
) {
  const now = new Date();
  const devices = await db.query.userPushDevice.findMany({
    where: and(
      eq(userPushDevice.userId, userId),
      input.deviceId ? eq(userPushDevice.deviceId, input.deviceId) : undefined,
      input.expoPushToken ? eq(userPushDevice.expoPushToken, input.expoPushToken) : undefined,
    ),
  });

  if (devices.length === 0) {
    return { count: 0 };
  }

  await db
    .update(userPushDevice)
    .set({
      isActive: false,
      invalidatedAt: now,
    })
    .where(inArray(userPushDevice.id, devices.map((device) => device.id)));

  return { count: devices.length };
}

export async function listMyNotifications(db: Context["db"], userId: string, limit = 50) {
  await pruneExpiredNotifications(db);

  return db.query.userNotification.findMany({
    where: and(eq(userNotification.userId, userId), gt(userNotification.expiresAt, new Date())),
    orderBy: (notificationsTable, { desc }) => [desc(notificationsTable.createdAt)],
    limit,
    with: {
      announcement: true,
      order: true,
    },
  });
}

async function insertUserNotifications(
  db: Context["db"],
  rows: Array<{
    userId: string;
    kind: "order_status" | "announcement";
    title: string;
    body: string;
    orderId?: string | null;
    announcementId?: string | null;
  }>,
) {
  if (rows.length === 0) {
    return;
  }

  const now = new Date();
  const expiresAt = notificationExpiryFrom(now);

  await db.insert(userNotification).values(
    rows.map((row) => ({
      id: createId("notification"),
      userId: row.userId,
      kind: row.kind,
      title: row.title,
      body: row.body,
      orderId: row.orderId ?? null,
      announcementId: row.announcementId ?? null,
      expiresAt,
      createdAt: now,
    })),
  );
}

async function activeDevicesForUsers(db: Context["db"], userIds: string[]) {
  if (userIds.length === 0) {
    return [];
  }

  return db.query.userPushDevice.findMany({
    where: and(inArray(userPushDevice.userId, userIds), eq(userPushDevice.isActive, true)),
  });
}

async function invalidateDeviceById(db: Context["db"], deviceId: string) {
  await db
    .update(userPushDevice)
    .set({
      isActive: false,
      invalidatedAt: new Date(),
    })
    .where(eq(userPushDevice.id, deviceId));
}

export async function notifyAdminsAboutNewOrder(
  db: Context["db"],
  input: {
    orderId: string;
    orderNumber: string;
    customerFullName: string;
  },
) {
  const adminUsers = await db.query.user.findMany({
    where: and(eq(user.isDisabled, false), or(eq(user.role, "admin"), eq(user.role, "owner"))),
  });

  if (adminUsers.length === 0) {
    return;
  }

  const adminIds = adminUsers.map((adminUser) => adminUser.id);
  const preferences = await db.query.adminNotificationPreference.findMany({
    where: inArray(adminNotificationPreference.userId, adminIds),
  });
  const preferenceByUserId = new Map(preferences.map((preference) => [preference.userId, preference]));
  const activeDevices = await activeDevicesForUsers(db, adminIds);
  const devicesByUserId = new Map<string, typeof activeDevices>();

  for (const device of activeDevices) {
    const userDevices = devicesByUserId.get(device.userId) ?? [];
    userDevices.push(device);
    devicesByUserId.set(device.userId, userDevices);
  }

  const subject = `Nouvelle commande ${input.orderNumber}`;
  const body = `Une nouvelle commande ${input.orderNumber} a été créée par ${input.customerFullName}.`;

  for (const adminUser of adminUsers) {
    const preference = preferenceByUserId.get(adminUser.id);
    const receivesEmail = preference?.receivesNewOrderEmail ?? true;
    const receivesPush = preference?.receivesNewOrderPush ?? true;

    if (receivesEmail && adminUser.email && !isClientTechnicalEmail(adminUser.email)) {
      const result = await sendResendEmail({
        to: adminUser.email,
        subject,
        text: body,
      });

      await logDelivery(db, {
        channel: "email",
        status: result.success ? "success" : "failure",
        templateKey: "new_order_admin",
        recipient: result.recipient,
        provider: result.provider,
        targetUserId: adminUser.id,
        orderId: input.orderId,
        errorMessage: result.errorMessage,
      });
    }

    if (receivesPush) {
      const userDevices = devicesByUserId.get(adminUser.id) ?? [];

      for (const device of userDevices) {
        const result = await sendExpoPushMessage({
          token: device.expoPushToken,
          title: subject,
          body,
          data: {
            type: "new_order",
            orderId: input.orderId,
            orderNumber: input.orderNumber,
          },
        });

        await logDelivery(db, {
          channel: "expo_push",
          status: result.success ? "success" : "failure",
          templateKey: "new_order_admin",
          recipient: result.recipient,
          provider: result.provider,
          targetUserId: adminUser.id,
          orderId: input.orderId,
          deviceId: device.id,
          errorMessage: result.errorMessage,
        });

        if (result.shouldInvalidateToken) {
          await invalidateDeviceById(db, device.id);
        }
      }
    }
  }
}

export async function notifyClientAboutOrderStatus(
  db: Context["db"],
  input: {
    userId: string;
    orderId: string;
    orderNumber: string;
    status: "to_call" | "called" | "processing" | "processed" | "cancelled";
  },
) {
  const title = `Commande ${input.orderNumber}`;
  const body = `Le statut de votre commande est maintenant: ${orderStatusLabel(input.status)}.`;

  await insertUserNotifications(db, [
    {
      userId: input.userId,
      kind: "order_status",
      title,
      body,
      orderId: input.orderId,
    },
  ]);

  const devices = await activeDevicesForUsers(db, [input.userId]);

  for (const device of devices) {
    const result = await sendExpoPushMessage({
      token: device.expoPushToken,
      title,
      body,
      data: {
        type: "order_status",
        orderId: input.orderId,
        orderNumber: input.orderNumber,
        status: input.status,
      },
    });

    await logDelivery(db, {
      channel: "expo_push",
      status: result.success ? "success" : "failure",
      templateKey: "order_status_client",
      recipient: result.recipient,
      provider: result.provider,
      targetUserId: input.userId,
      orderId: input.orderId,
      deviceId: device.id,
      errorMessage: result.errorMessage,
    });

    if (result.shouldInvalidateToken) {
      await invalidateDeviceById(db, device.id);
    }
  }
}

export async function createAnnouncementAndNotify(
  db: Context["db"],
  input: z.infer<typeof announcementInputSchema> & { createdByAdminUserId: string },
) {
  await pruneExpiredNotifications(db);

  const now = new Date();
  const [createdAnnouncement] = await db
    .insert(announcement)
    .values({
      id: createId("announcement"),
      title: input.title,
      body: input.body,
      sendPush: input.sendPush,
      createdByAdminUserId: input.createdByAdminUserId,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  if (!createdAnnouncement) {
    throw new Error("Failed to create announcement");
  }

  const audience = await db
    .select({
      userId: clientProfile.userId,
    })
    .from(clientProfile)
    .innerJoin(user, eq(user.id, clientProfile.userId))
    .where(eq(user.isDisabled, false));

  const audienceUserIds = [...new Set(audience.map((entry) => entry.userId))];

  await insertUserNotifications(
    db,
    audienceUserIds.map((userId) => ({
      userId,
      kind: "announcement",
      title: createdAnnouncement.title,
      body: createdAnnouncement.body,
      announcementId: createdAnnouncement.id,
    })),
  );

  if (createdAnnouncement.sendPush && audienceUserIds.length > 0) {
    const devices = await activeDevicesForUsers(db, audienceUserIds);

    for (const device of devices) {
      const result = await sendExpoPushMessage({
        token: device.expoPushToken,
        title: createdAnnouncement.title,
        body: createdAnnouncement.body,
        data: {
          type: "announcement",
          announcementId: createdAnnouncement.id,
        },
      });

      await logDelivery(db, {
        channel: "expo_push",
        status: result.success ? "success" : "failure",
        templateKey: "announcement_global",
        recipient: result.recipient,
        provider: result.provider,
        targetUserId: device.userId,
        announcementId: createdAnnouncement.id,
        deviceId: device.id,
        errorMessage: result.errorMessage,
      });

      if (result.shouldInvalidateToken) {
        await invalidateDeviceById(db, device.id);
      }
    }
  }

  return createdAnnouncement;
}

export async function listAnnouncementsForAdmin(db: Context["db"]) {
  return db.query.announcement.findMany({
    orderBy: (announcementsTable, { desc }) => [desc(announcementsTable.createdAt)],
    with: {
      createdByAdminUser: true,
    },
  });
}

export async function listAdminOrderNotificationPreferences(db: Context["db"]) {
  const admins = await db.query.user.findMany({
    where: and(eq(user.isDisabled, false), or(eq(user.role, "admin"), eq(user.role, "owner"))),
  });

  if (admins.length === 0) {
    return [];
  }

  const preferences = await db.query.adminNotificationPreference.findMany({
    where: inArray(adminNotificationPreference.userId, admins.map((adminUser) => adminUser.id)),
  });
  const preferenceByUserId = new Map(preferences.map((preference) => [preference.userId, preference]));

  return admins.map((adminUser) => {
    const preference = preferenceByUserId.get(adminUser.id);
    return {
      userId: adminUser.id,
      name: adminUser.name,
      email: adminUser.email,
      role: adminUser.role,
      receivesNewOrderEmail: preference?.receivesNewOrderEmail ?? true,
      receivesNewOrderPush: preference?.receivesNewOrderPush ?? true,
    };
  });
}

export async function upsertAdminOrderNotificationPreference(
  db: Context["db"],
  input: z.infer<typeof adminNotificationPreferenceInputSchema>,
) {
  const targetUser = await db.query.user.findFirst({
    where: eq(user.id, input.userId),
  });

  if (!targetUser || (targetUser.role !== "admin" && targetUser.role !== "owner")) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification preferences can only target admin or owner accounts",
    });
  }

  const [savedPreference] = await db
    .insert(adminNotificationPreference)
    .values({
      userId: input.userId,
      receivesNewOrderEmail: input.receivesNewOrderEmail,
      receivesNewOrderPush: input.receivesNewOrderPush,
    })
    .onConflictDoUpdate({
      target: adminNotificationPreference.userId,
      set: {
        receivesNewOrderEmail: input.receivesNewOrderEmail,
        receivesNewOrderPush: input.receivesNewOrderPush,
      },
    })
    .returning();

  return savedPreference;
}

export { orderStatusLabel };
