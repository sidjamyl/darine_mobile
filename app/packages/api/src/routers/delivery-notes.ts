import { adminAuditLog, customerOrder, deliveryNote, deliveryNoteCounter } from "@app/db/schema/order";
import { TRPCError } from "@trpc/server";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

import type { Context } from "../context";
import { adminProcedure, protectedProcedure, router } from "../index";
import { createId, moneyStringSchema, normalizeMoneyString } from "./catalog-shared";

const deliveryNoteInputSchema = z.object({
  orderId: z.string().trim().min(1),
  oldBalance: moneyStringSchema,
  paymentAmount: moneyStringSchema,
  newBalance: moneyStringSchema,
});

type DeliveryNoteOrderRecord = {
  id: string;
  orderNumber: string;
  userId: string;
  status: "to_call" | "called" | "processing" | "processed" | "cancelled";
  customerFullNameSnapshot: string;
  customerPhoneSnapshot: string;
  wilayaNameFrSnapshot: string;
  communeNameFrSnapshot: string;
  streetAddressSnapshot: string;
  totalAmountSnapshot: string;
  createdAt: Date;
  lines: Array<{
    id: string;
    sortOrder: number;
    productNameFrSnapshot: string;
    packagingLabelSnapshot: string;
    unitPriceSnapshot: string;
    lotQuantitySnapshot: number;
    regularLotPriceSnapshot: string;
    discountLotPriceSnapshot: string | null;
    effectiveLotPriceSnapshot: string;
    selectedLots: number;
    lineTotalSnapshot: string;
  }>;
  deliveryNote: {
    orderId: string;
    blNumber: string;
    oldBalance: string;
    paymentAmount: string;
    newBalance: string;
    createdByAdminUserId: string;
    createdAt: Date;
    updatedAt: Date;
  } | null;
};

const DELIVERY_NOTE_ALLOWED_STATUSES = new Set(["processing", "processed"] as const);

function formatDeliveryNoteNumber(year: number, sequence: number) {
  return `BL-${year}-${String(sequence).padStart(6, "0")}`;
}

function escapePdfText(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function formatMoney(value: string) {
  const amount = Number(value);
  return `${amount.toFixed(3)} DA`;
}

function chunkText(value: string, size: number) {
  if (value.length <= size) {
    return [value];
  }

  const chunks: string[] = [];
  const words = value.split(/\s+/);
  let current = "";

  for (const word of words) {
    const next = current.length === 0 ? word : `${current} ${word}`;

    if (next.length > size && current.length > 0) {
      chunks.push(current);
      current = word;
      continue;
    }

    current = next;
  }

  if (current.length > 0) {
    chunks.push(current);
  }

  return chunks;
}

function buildPdfBuffer(pageLines: string[][]) {
  const objects: string[] = [];
  const pageObjectNumbers: number[] = [];
  const contentObjectNumbers: number[] = [];
  const fontObjectNumber = 3;
  const pagesObjectNumber = 2;
  const catalogObjectNumber = 1;

  objects[catalogObjectNumber] = `<< /Type /Catalog /Pages ${pagesObjectNumber} 0 R >>`;
  objects[fontObjectNumber] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`;

  let nextObjectNumber = 4;

  for (const lines of pageLines) {
    const pageObjectNumber = nextObjectNumber++;
    const contentObjectNumber = nextObjectNumber++;
    pageObjectNumbers.push(pageObjectNumber);
    contentObjectNumbers.push(contentObjectNumber);

    const streamLines = ["BT", "/F1 10 Tf"];
    let y = 800;

    for (const line of lines) {
      streamLines.push(`1 0 0 1 40 ${y} Tm (${escapePdfText(line)}) Tj`);
      y -= 14;
    }

    streamLines.push("ET");
    const stream = streamLines.join("\n");

    objects[contentObjectNumber] = `<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`;
    objects[pageObjectNumber] = `<< /Type /Page /Parent ${pagesObjectNumber} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontObjectNumber} 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`;
  }

  objects[pagesObjectNumber] = `<< /Type /Pages /Count ${pageObjectNumbers.length} /Kids [${pageObjectNumbers.map((value) => `${value} 0 R`).join(" ")}] >>`;

  const parts: string[] = ["%PDF-1.4\n"]; 
  const offsets: number[] = [0];

  for (let index = 1; index < objects.length; index += 1) {
    const objectBody = objects[index];
    if (!objectBody) {
      continue;
    }

    offsets[index] = Buffer.byteLength(parts.join(""), "utf8");
    parts.push(`${index} 0 obj\n${objectBody}\nendobj\n`);
  }

  const xrefOffset = Buffer.byteLength(parts.join(""), "utf8");
  const totalObjects = objects.length;
  parts.push(`xref\n0 ${totalObjects}\n`);
  parts.push("0000000000 65535 f \n");

  for (let index = 1; index < totalObjects; index += 1) {
    const offset = offsets[index] ?? 0;
    parts.push(`${String(offset).padStart(10, "0")} 00000 n \n`);
  }

  parts.push(`trailer\n<< /Size ${totalObjects} /Root ${catalogObjectNumber} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  return Buffer.from(parts.join(""), "utf8");
}

function createDeliveryNotePdf(orderRecord: DeliveryNoteOrderRecord) {
  if (!orderRecord.deliveryNote) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Delivery note data is not available" });
  }

  const totalLots = orderRecord.lines.reduce((sum, line) => sum + line.selectedLots, 0);
  const pageLines: string[] = [
    "Joumla Store",
    `Bon de livraison : ${orderRecord.deliveryNote.blNumber}`,
    `Date : ${formatDate(orderRecord.deliveryNote.updatedAt)}`,
    `Commande : ${orderRecord.orderNumber}`,
    "",
    `Client : ${orderRecord.customerFullNameSnapshot}`,
    `Telephone : ${orderRecord.customerPhoneSnapshot}`,
    `Adresse : ${orderRecord.streetAddressSnapshot}, ${orderRecord.communeNameFrSnapshot}, ${orderRecord.wilayaNameFrSnapshot}`,
    "",
    "Produits",
    "Produit | Colisage | Qte lots | PU | Prix lot | Total",
  ];

  for (const line of orderRecord.lines.sort((left, right) => left.sortOrder - right.sortOrder)) {
    const label = `${line.productNameFrSnapshot} | ${line.packagingLabelSnapshot} | ${line.selectedLots} | ${formatMoney(line.unitPriceSnapshot)} | ${formatMoney(line.effectiveLotPriceSnapshot)} | ${formatMoney(line.lineTotalSnapshot)}`;
    pageLines.push(...chunkText(label, 92));
  }

  pageLines.push(
    "",
    `Nombre de colis : ${totalLots}`,
    `Montant commande : ${formatMoney(orderRecord.totalAmountSnapshot)}`,
    `Ancien solde : ${formatMoney(orderRecord.deliveryNote.oldBalance)}`,
    `Versement : ${formatMoney(orderRecord.deliveryNote.paymentAmount)}`,
    `Nouveau solde / Net a payer : ${formatMoney(orderRecord.deliveryNote.newBalance)}`,
  );

  const pages: string[][] = [];
  let currentPage: string[] = [];

  for (const line of pageLines) {
    if (currentPage.length >= 52) {
      pages.push(currentPage);
      currentPage = [];
    }
    currentPage.push(line);
  }

  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  return buildPdfBuffer(pages);
}

async function allocateDeliveryNoteNumber(db: Context["db"], now: Date) {
  const year = now.getFullYear();

  const [counterRow] = await db
    .insert(deliveryNoteCounter)
    .values({
      year,
      lastValue: 1,
    })
    .onConflictDoUpdate({
      target: deliveryNoteCounter.year,
      set: {
        lastValue: sql<number>`${deliveryNoteCounter.lastValue} + 1`,
      },
    })
    .returning({
      lastValue: deliveryNoteCounter.lastValue,
    });

  if (!counterRow) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to allocate delivery note number" });
  }

  return formatDeliveryNoteNumber(year, counterRow.lastValue);
}

async function getOrderForDeliveryNote(db: Context["db"], orderId: string) {
  const orderRecord = await db.query.customerOrder.findFirst({
    where: eq(customerOrder.id, orderId),
    with: {
      lines: true,
      deliveryNote: true,
    },
  });

  if (!orderRecord) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
  }

  return orderRecord as DeliveryNoteOrderRecord;
}

function assertDeliveryNoteEligible(orderRecord: DeliveryNoteOrderRecord) {
  if (!DELIVERY_NOTE_ALLOWED_STATUSES.has(orderRecord.status)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Delivery notes can only be generated after treatment starts",
    });
  }
}

async function upsertDeliveryNoteData(
  db: Context["db"],
  adminUserId: string,
  input: z.infer<typeof deliveryNoteInputSchema>,
) {
  const now = new Date();
  const orderRecord = await getOrderForDeliveryNote(db, input.orderId);
  assertDeliveryNoteEligible(orderRecord);

  const normalizedOldBalance = normalizeMoneyString(input.oldBalance);
  const normalizedPaymentAmount = normalizeMoneyString(input.paymentAmount);
  const normalizedNewBalance = normalizeMoneyString(input.newBalance);
  const blNumber = orderRecord.deliveryNote?.blNumber ?? (await allocateDeliveryNoteNumber(db, now));

  const [savedNote] = await db
    .insert(deliveryNote)
    .values({
      orderId: input.orderId,
      blNumber,
      oldBalance: normalizedOldBalance,
      paymentAmount: normalizedPaymentAmount,
      newBalance: normalizedNewBalance,
      createdByAdminUserId: adminUserId,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: deliveryNote.orderId,
      set: {
        oldBalance: normalizedOldBalance,
        paymentAmount: normalizedPaymentAmount,
        newBalance: normalizedNewBalance,
        updatedAt: now,
      },
    })
    .returning();

  await db.insert(adminAuditLog).values({
    id: createId("audit-log"),
    adminUserId,
    action: "delivery_note_generated",
    targetType: "order",
    targetId: input.orderId,
    summary: `Generated delivery note ${blNumber}`,
    createdAt: now,
  });

  return savedNote;
}

function buildPdfPayload(orderRecord: DeliveryNoteOrderRecord) {
  const pdfBuffer = createDeliveryNotePdf(orderRecord);
  const blNumber = orderRecord.deliveryNote?.blNumber;

  if (!blNumber) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Delivery note data is not available" });
  }

  return {
    blNumber,
    fileName: `${blNumber}.pdf`,
    mimeType: "application/pdf",
    base64: pdfBuffer.toString("base64"),
  };
}

export const deliveryNotesRouter = router({
  adminGet: adminProcedure
    .input(
      z.object({
        orderId: z.string().trim().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const orderRecord = await getOrderForDeliveryNote(ctx.db, input.orderId);
      return {
        orderId: orderRecord.id,
        status: orderRecord.status,
        eligible: DELIVERY_NOTE_ALLOWED_STATUSES.has(orderRecord.status),
        deliveryNote: orderRecord.deliveryNote,
      };
    }),

  adminGeneratePdf: adminProcedure.input(deliveryNoteInputSchema).mutation(async ({ ctx, input }) => {
    await upsertDeliveryNoteData(ctx.db, ctx.user.id, input);
    const orderRecord = await getOrderForDeliveryNote(ctx.db, input.orderId);
    return buildPdfPayload(orderRecord);
  }),

  clientDownloadPdf: protectedProcedure
    .input(
      z.object({
        orderId: z.string().trim().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const orderRecord = await getOrderForDeliveryNote(ctx.db, input.orderId);

      if (orderRecord.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You cannot access this delivery note" });
      }

      assertDeliveryNoteEligible(orderRecord);

      if (!orderRecord.deliveryNote) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Delivery note is not available yet" });
      }

      return buildPdfPayload(orderRecord);
    }),
});
