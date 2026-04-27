import { messageDeliveryLog } from "@app/db/schema/notification";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { adminProcedure, protectedProcedure, router } from "../index";
import {
  adminNotificationPreferenceInputSchema,
  announcementInputSchema,
  createAnnouncementAndNotify,
  invalidatePushDeviceInputSchema,
  invalidatePushDevicesForUser,
  listAdminOrderNotificationPreferences,
  listAnnouncementsForAdmin,
  listMyNotifications,
  pushDeviceInputSchema,
  registerPushDeviceForUser,
  upsertAdminOrderNotificationPreference,
} from "./notifications-shared";

export const notificationsRouter = router({
  registerPushDevice: protectedProcedure.input(pushDeviceInputSchema).mutation(async ({ ctx, input }) => {
    return registerPushDeviceForUser(ctx.db, ctx.user.id, input);
  }),

  invalidatePushDevice: protectedProcedure.input(invalidatePushDeviceInputSchema).mutation(async ({ ctx, input }) => {
    return invalidatePushDevicesForUser(ctx.db, ctx.user.id, input);
  }),

  myCenter: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(100).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      return listMyNotifications(ctx.db, ctx.user.id, input?.limit ?? 50);
    }),

  adminCreateAnnouncement: adminProcedure.input(announcementInputSchema).mutation(async ({ ctx, input }) => {
    return createAnnouncementAndNotify(ctx.db, {
      ...input,
      createdByAdminUserId: ctx.user.id,
    });
  }),

  adminListAnnouncements: adminProcedure.query(async ({ ctx }) => {
    return listAnnouncementsForAdmin(ctx.db);
  }),

  adminListOrderNotificationPreferences: adminProcedure.query(async ({ ctx }) => {
    return listAdminOrderNotificationPreferences(ctx.db);
  }),

  adminUpdateOrderNotificationPreference: adminProcedure
    .input(adminNotificationPreferenceInputSchema)
    .mutation(async ({ ctx, input }) => {
      return upsertAdminOrderNotificationPreference(ctx.db, input);
    }),

  adminDeliveryLogs: adminProcedure
    .input(
      z
        .object({
          targetUserId: z.string().trim().min(1).optional(),
          orderId: z.string().trim().min(1).optional(),
          announcementId: z.string().trim().min(1).optional(),
          channel: z.enum(["email", "expo_push", "whatsapp"]).optional(),
          limit: z.number().int().min(1).max(200).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.query.messageDeliveryLog.findMany({
        where: and(
          input?.targetUserId ? eq(messageDeliveryLog.targetUserId, input.targetUserId) : undefined,
          input?.orderId ? eq(messageDeliveryLog.orderId, input.orderId) : undefined,
          input?.announcementId ? eq(messageDeliveryLog.announcementId, input.announcementId) : undefined,
          input?.channel ? eq(messageDeliveryLog.channel, input.channel) : undefined,
        ),
        orderBy: (logsTable, { desc }) => [desc(logsTable.createdAt)],
        limit: input?.limit ?? 100,
        with: {
          targetUser: true,
          order: true,
          announcement: true,
        },
      });
    }),
});
