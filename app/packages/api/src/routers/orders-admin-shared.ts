import { user } from "@app/db/schema/auth";
import { product } from "@app/db/schema/catalog";
import { adminAuditLog, customerOrder, orderStatus, stockMovement } from "@app/db/schema/order";
import { TRPCError } from "@trpc/server";
import { and, eq, inArray, sql } from "drizzle-orm";

import type { Context } from "../context";
import { createId } from "./catalog-shared";

type OrderStatus = (typeof orderStatus.enumValues)[number];

const STOCK_APPLY_STATUSES = new Set<OrderStatus>(["processing", "processed"]);

type AdminActor = Pick<typeof user.$inferSelect, "id" | "name" | "email" | "role">;

type OrderLifecycleContext = Pick<Context, "db"> & {
  user: AdminActor;
};

type OrderWithLines = {
  id: string;
  orderNumber: string;
  userId: string;
  status: OrderStatus;
  stockAppliedAt: Date | null;
  lines: Array<{
    productId: string;
    selectedLots: number;
  }>;
};

function shouldApplyStock(status: OrderStatus) {
  return STOCK_APPLY_STATUSES.has(status);
}

export function assertAllowedStatusTransition(currentStatus: OrderStatus, nextStatus: OrderStatus) {
  if (currentStatus === "processed" && nextStatus !== "processed") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Processed orders cannot be moved backward through normal API flows",
    });
  }
}

export async function appendAdminAuditLog(
  db: Context["db"],
  adminUserId: string,
  action: string,
  targetType: string,
  targetId: string,
  summary: string,
) {
  await db.insert(adminAuditLog).values({
    id: createId("audit-log"),
    adminUserId,
    action,
    targetType,
    targetId,
    summary,
  });
}

export async function getLifecycleOrderOrThrow(db: Context["db"], orderId: string): Promise<OrderWithLines> {
  const orderRecord = await db.query.customerOrder.findFirst({
    where: eq(customerOrder.id, orderId),
    with: {
      lines: true,
    },
  });

  if (!orderRecord) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
  }

  return orderRecord;
}

async function applyStockForOrder(ctx: OrderLifecycleContext, orderRecord: OrderWithLines, now: Date) {
  const productIds = orderRecord.lines.map((line) => line.productId);
  const products = await ctx.db.query.product.findMany({
    where: inArray(product.id, productIds),
  });
  const productMap = new Map(products.map((productRecord) => [productRecord.id, productRecord]));

  const insufficientItems: Array<{
    productId: string;
    productNameFr: string;
    productNameAr: string;
    requestedLots: number;
    availableStockLots: number;
  }> = [];

  for (const line of orderRecord.lines) {
    const productRecord = productMap.get(line.productId);

    if (!productRecord || productRecord.stockLots < line.selectedLots) {
      insufficientItems.push({
        productId: line.productId,
        productNameFr: productRecord?.nameFr ?? "Unknown product",
        productNameAr: productRecord?.nameAr ?? "منتج غير معروف",
        requestedLots: line.selectedLots,
        availableStockLots: productRecord?.stockLots ?? 0,
      });
    }
  }

  if (insufficientItems.length > 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Insufficient stock to move order into treatment",
      cause: {
        status: "insufficient_stock",
        items: insufficientItems,
      },
    });
  }

  for (const line of orderRecord.lines) {
    await ctx.db
      .update(product)
      .set({
        stockLots: sql<number>`${product.stockLots} - ${line.selectedLots}`,
      })
      .where(eq(product.id, line.productId));

    await ctx.db.insert(stockMovement).values({
      id: createId("stock-movement"),
      productId: line.productId,
      orderId: orderRecord.id,
      adminUserId: ctx.user.id,
      quantityLotsDelta: -line.selectedLots,
      reason: "order_processing",
      createdAt: now,
    });
  }

  await ctx.db.update(customerOrder).set({ stockAppliedAt: now }).where(eq(customerOrder.id, orderRecord.id));
}

async function restoreStockForOrder(ctx: OrderLifecycleContext, orderRecord: OrderWithLines, now: Date) {
  for (const line of orderRecord.lines) {
    await ctx.db
      .update(product)
      .set({
        stockLots: sql<number>`${product.stockLots} + ${line.selectedLots}`,
      })
      .where(eq(product.id, line.productId));

    await ctx.db.insert(stockMovement).values({
      id: createId("stock-movement"),
      productId: line.productId,
      orderId: orderRecord.id,
      adminUserId: ctx.user.id,
      quantityLotsDelta: line.selectedLots,
      reason: "order_cancellation",
      createdAt: now,
    });
  }

  await ctx.db.update(customerOrder).set({ stockAppliedAt: null }).where(eq(customerOrder.id, orderRecord.id));
}

export async function transitionOrderStatus(ctx: OrderLifecycleContext, orderId: string, nextStatus: OrderStatus) {
  const now = new Date();

  return ctx.db.transaction(async (tx) => {
    const lifecycleCtx = {
      ...ctx,
      db: tx as Context["db"],
    };
    const orderRecord = await getLifecycleOrderOrThrow(lifecycleCtx.db, orderId);

    assertAllowedStatusTransition(orderRecord.status, nextStatus);

    if (orderRecord.status === nextStatus) {
      return {
        changed: false,
        previousStatus: orderRecord.status,
        order: orderRecord,
      };
    }

    const stockAlreadyApplied = orderRecord.stockAppliedAt !== null;

    if (shouldApplyStock(nextStatus) && !stockAlreadyApplied) {
      await applyStockForOrder(lifecycleCtx, orderRecord, now);
    }

    if (nextStatus === "cancelled" && stockAlreadyApplied) {
      await restoreStockForOrder(lifecycleCtx, orderRecord, now);
    }

    await lifecycleCtx.db
      .update(customerOrder)
      .set({
        status: nextStatus,
        updatedAt: now,
      })
      .where(eq(customerOrder.id, orderId));

    await appendAdminAuditLog(
      lifecycleCtx.db,
      lifecycleCtx.user.id,
      "order_status_changed",
      "order",
      orderId,
      `Changed order status from ${orderRecord.status} to ${nextStatus}`,
    );

    return {
      changed: true,
      previousStatus: orderRecord.status,
      order: await getLifecycleOrderOrThrow(lifecycleCtx.db, orderId),
    };
  });
}

export async function listAdminOrdersByStatus(db: Context["db"], status?: OrderStatus) {
  return db.query.customerOrder.findMany({
    where: status ? eq(customerOrder.status, status) : undefined,
    orderBy: (ordersTable, { desc: descending }) => [descending(ordersTable.createdAt)],
    with: {
      lines: true,
    },
  });
}

export async function getAdminOrderDetail(db: Context["db"], orderId: string) {
  const orderRecord = await db.query.customerOrder.findFirst({
    where: eq(customerOrder.id, orderId),
    with: {
      user: true,
      lines: true,
      stockMovements: {
        orderBy: (movementsTable, { desc: descending }) => [descending(movementsTable.createdAt)],
        with: {
          product: true,
          adminUser: true,
        },
      },
    },
  });

  if (!orderRecord) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
  }

  const auditLogs = await db.query.adminAuditLog.findMany({
    where: and(eq(adminAuditLog.targetType, "order"), eq(adminAuditLog.targetId, orderId)),
    orderBy: (auditTable, { desc: descending }) => [descending(auditTable.createdAt)],
    with: {
      adminUser: true,
    },
  });

  return {
    ...orderRecord,
    auditLogs,
  };
}

export async function listStockMovements(
  db: Context["db"],
  filters?: {
    productId?: string;
    orderId?: string;
  },
) {
  return db.query.stockMovement.findMany({
    where: and(
      filters?.productId ? eq(stockMovement.productId, filters.productId) : undefined,
      filters?.orderId ? eq(stockMovement.orderId, filters.orderId) : undefined,
    ),
    orderBy: (movementsTable, { desc: descending }) => [descending(movementsTable.createdAt)],
    with: {
      product: true,
      order: true,
      adminUser: true,
    },
  });
}
