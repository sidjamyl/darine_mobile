import { adminAuditLog, customerOrder, orderLine, orderNumberCounter } from "@app/db/schema/order";
import { TRPCError } from "@trpc/server";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

import type { Context } from "../context";
import { adminProcedure, protectedProcedure, router } from "../index";
import { createId } from "./catalog-shared";
import { notifyAdminsAboutNewOrder, notifyClientAboutOrderStatus } from "./notifications-shared";
import { getAdminOrderDetail, listAdminOrdersByStatus, listStockMovements, transitionOrderStatus } from "./orders-admin-shared";
import { createOrderInputSchema, ORDER_INITIAL_STATUS, validateCartInputSchema, validateCheckout } from "./orders-shared";

function formatOrderNumber(year: number, sequence: number) {
  return `CMD-${year}-${String(sequence).padStart(6, "0")}`;
}

async function allocateOrderNumber(db: Context["db"], now: Date) {
  const year = now.getFullYear();

  const [counterRow] = await db
    .insert(orderNumberCounter)
    .values({
      year,
      lastValue: 1,
    })
    .onConflictDoUpdate({
      target: orderNumberCounter.year,
      set: {
        lastValue: sql<number>`${orderNumberCounter.lastValue} + 1`,
      },
    })
    .returning({
      lastValue: orderNumberCounter.lastValue,
    });

  if (!counterRow) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to allocate order number" });
  }

  return {
    year,
    sequence: counterRow.lastValue,
    orderNumber: formatOrderNumber(year, counterRow.lastValue),
  };
}

export const ordersRouter = router({
  adminList: adminProcedure
    .input(
      z
        .object({
          status: z.enum(["to_call", "called", "processing", "processed", "cancelled"]).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      return listAdminOrdersByStatus(ctx.db, input?.status);
    }),

  adminDetail: adminProcedure
    .input(
      z.object({
        orderId: z.string().trim().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      return getAdminOrderDetail(ctx.db, input.orderId);
    }),

  adminUpdateStatus: adminProcedure
    .input(
      z.object({
        orderId: z.string().trim().min(1),
        status: z.enum(["to_call", "called", "processing", "processed", "cancelled"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const transitionResult = await transitionOrderStatus(ctx, input.orderId, input.status);

      if (transitionResult.changed) {
        try {
          await notifyClientAboutOrderStatus(ctx.db, {
            userId: transitionResult.order.userId,
            orderId: transitionResult.order.id,
            orderNumber: transitionResult.order.orderNumber,
            status: transitionResult.order.status,
          });
        } catch {
          // Notification delivery must not block lifecycle transitions.
        }
      }

      return {
        orderId: transitionResult.order.id,
        status: transitionResult.order.status,
        stockAppliedAt: transitionResult.order.stockAppliedAt,
        changed: transitionResult.changed,
      };
    }),

  adminUpdateNotes: adminProcedure
    .input(
      z.object({
        orderId: z.string().trim().min(1),
        internalAdminNotes: z.string().trim().max(5000).nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existingOrder = await ctx.db.query.customerOrder.findFirst({
        where: eq(customerOrder.id, input.orderId),
      });

      if (!existingOrder) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      }

      const sanitizedNotes = input.internalAdminNotes && input.internalAdminNotes.length > 0 ? input.internalAdminNotes : null;

      await ctx.db
        .update(customerOrder)
        .set({
          internalAdminNotes: sanitizedNotes,
        })
        .where(eq(customerOrder.id, input.orderId));

      await ctx.db.insert(adminAuditLog).values({
        id: createId("audit-log"),
        adminUserId: ctx.user.id,
        action: "order_notes_updated",
        targetType: "order",
        targetId: input.orderId,
        summary: sanitizedNotes ? "Updated internal admin notes" : "Cleared internal admin notes",
      });

      return {
        orderId: input.orderId,
        internalAdminNotes: sanitizedNotes,
      };
    }),

  adminStockMovements: adminProcedure
    .input(
      z
        .object({
          productId: z.string().trim().min(1).optional(),
          orderId: z.string().trim().min(1).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      return listStockMovements(ctx.db, input);
    }),

  validateCart: protectedProcedure.input(validateCartInputSchema).mutation(async ({ ctx, input }) => {
    return validateCheckout(ctx, input);
  }),

  create: protectedProcedure.input(createOrderInputSchema).mutation(async ({ ctx, input }) => {
    const validation = await validateCheckout(ctx, input);

    if (
      validation.status === "profile_incomplete" ||
      validation.status === "unavailable_products" ||
      validation.status === "insufficient_stock"
    ) {
      return validation;
    }

    if (validation.status === "price_changed" && input.acceptPriceChanges !== true) {
      return validation;
    }

    const checkoutData = validation;
    const now = new Date();

    const createdOrder = await ctx.db.transaction(async (tx) => {
      const orderId = createId("order");
      const numbering = await allocateOrderNumber(tx as Context["db"], now);

      await tx.insert(customerOrder).values({
        id: orderId,
        orderNumber: numbering.orderNumber,
        userId: ctx.user.id,
        status: ORDER_INITIAL_STATUS,
        customerFullNameSnapshot: checkoutData.customerSnapshot.fullName,
        customerPhoneSnapshot: checkoutData.customerSnapshot.phoneNumber,
        customerPhoneLocalSnapshot: checkoutData.customerSnapshot.phoneNumberLocal,
        wilayaIdSnapshot: checkoutData.customerSnapshot.wilayaId,
        wilayaNameFrSnapshot: checkoutData.customerSnapshot.wilayaNameFr,
        wilayaNameArSnapshot: checkoutData.customerSnapshot.wilayaNameAr,
        communeIdSnapshot: checkoutData.customerSnapshot.communeId,
        communeNameFrSnapshot: checkoutData.customerSnapshot.communeNameFr,
        communeNameArSnapshot: checkoutData.customerSnapshot.communeNameAr,
        streetAddressSnapshot: checkoutData.customerSnapshot.streetAddress,
        latitudeSnapshot: checkoutData.customerSnapshot.latitude,
        longitudeSnapshot: checkoutData.customerSnapshot.longitude,
        totalAmountSnapshot: checkoutData.totalAmount,
        createdAt: now,
        updatedAt: now,
      });

      await tx.insert(orderLine).values(
        checkoutData.lines.map((line, index) => ({
          id: createId("order-line"),
          orderId,
          productId: line.productId,
          sortOrder: index,
          productNameFrSnapshot: line.productNameFr,
          productNameArSnapshot: line.productNameAr,
          productImageUrlSnapshot: line.productImageUrl,
          unitPriceSnapshot: line.unitPrice,
          lotQuantitySnapshot: line.lotQuantity,
          packagingLabelSnapshot: line.packagingLabel,
          regularLotPriceSnapshot: line.regularLotPrice,
          discountLotPriceSnapshot: line.discountLotPrice,
          effectiveLotPriceSnapshot: line.effectiveLotPrice,
          selectedLots: line.selectedLots,
          lineTotalSnapshot: line.lineTotal,
          createdAt: now,
        })),
      );

      return {
        orderId,
        orderNumber: numbering.orderNumber,
        customerFullName: checkoutData.customerSnapshot.fullName,
      };
    });

    try {
      await notifyAdminsAboutNewOrder(ctx.db, {
        orderId: createdOrder.orderId,
        orderNumber: createdOrder.orderNumber,
        customerFullName: createdOrder.customerFullName,
      });
    } catch {
      // Notification delivery must not block order creation.
    }

    return {
      status: "created" as const,
      orderId: createdOrder.orderId,
      orderNumber: createdOrder.orderNumber,
      orderStatus: ORDER_INITIAL_STATUS,
      totalAmount: checkoutData.totalAmount,
      lines: checkoutData.lines,
    };
  }),
});
