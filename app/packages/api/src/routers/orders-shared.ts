import { user as authUser } from "@app/db/schema/auth";
import { product } from "@app/db/schema/catalog";
import { clientProfile } from "@app/db/schema/profile";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";

import type { Context } from "../context";
import { calculateLotPrice, moneyStringSchema, normalizeMoneyString } from "./catalog-shared";

export const ORDER_INITIAL_STATUS = "to_call" as const;

export const checkoutLineInputSchema = z.object({
  productId: z.string().trim().min(1),
  quantityLots: z.number().int().positive(),
  knownUnitPrice: moneyStringSchema,
  knownLotQuantity: z.number().int().positive(),
  knownDiscountLotPrice: moneyStringSchema.nullable().optional(),
});

const validateCartBaseInputSchema = z.object({
  lines: z.array(checkoutLineInputSchema).min(1),
});

function withUniqueProductValidation<TSchema extends z.ZodTypeAny>(schema: TSchema) {
  return schema.superRefine((value, ctx) => {
    const typedValue = value as z.infer<typeof validateCartBaseInputSchema>;
    const productIds = typedValue.lines.map((line) => line.productId);

    if (new Set(productIds).size !== productIds.length) {
      ctx.addIssue({
        code: "custom",
        message: "Cart lines must contain unique product ids",
        path: ["lines"],
      });
    }
  });
}

export const validateCartInputSchema = withUniqueProductValidation(validateCartBaseInputSchema);

export const createOrderInputSchema = withUniqueProductValidation(
  validateCartBaseInputSchema.extend({
    acceptPriceChanges: z.boolean().optional(),
  }),
);

export type ValidateCartInput = z.infer<typeof validateCartInputSchema>;
export type CreateOrderInput = z.infer<typeof createOrderInputSchema>;

type CheckoutContext = Pick<Context, "db"> & {
  user: typeof authUser.$inferSelect;
};

type CustomerSnapshotPreview = {
  fullName: string;
  phoneNumber: string;
  phoneNumberLocal: string | null;
  wilayaId: string;
  wilayaNameFr: string;
  wilayaNameAr: string;
  communeId: string;
  communeNameFr: string;
  communeNameAr: string;
  streetAddress: string;
  latitude: string | null;
  longitude: string | null;
};

export type CheckoutResolvedLine = {
  productId: string;
  productNameFr: string;
  productNameAr: string;
  productImageUrl: string;
  unitPrice: string;
  lotQuantity: number;
  packagingLabel: string;
  regularLotPrice: string;
  discountLotPrice: string | null;
  effectiveLotPrice: string;
  selectedLots: number;
  lineTotal: string;
  availableStockLots: number;
};

type ValidationReadyLike = {
  customerSnapshot: CustomerSnapshotPreview;
  lines: CheckoutResolvedLine[];
  totalAmount: string;
};

export type CheckoutValidationResult =
  | {
      status: "profile_incomplete";
      missingFields: Array<"clientProfile" | "phoneNumber">;
    }
  | {
      status: "unavailable_products";
      items: Array<{
        productId: string;
        reason: "not_found" | "archived" | "brand_inactive" | "category_inactive";
        productNameFr: string | null;
        productNameAr: string | null;
      }>;
    }
  | {
      status: "insufficient_stock";
      items: Array<{
        productId: string;
        productNameFr: string;
        productNameAr: string;
        requestedLots: number;
        availableStockLots: number;
      }>;
    }
  | ({
      status: "price_changed";
      items: Array<{
        productId: string;
        productNameFr: string;
        productNameAr: string;
        knownUnitPrice: string;
        currentUnitPrice: string;
        knownLotQuantity: number;
        currentLotQuantity: number;
        knownDiscountLotPrice: string | null;
        currentDiscountLotPrice: string | null;
        currentRegularLotPrice: string;
        currentEffectiveLotPrice: string;
      }>;
    } & ValidationReadyLike)
  | ({
      status: "ready";
    } & ValidationReadyLike);

function normalizeNullableMoney(value: string | null | undefined) {
  return value == null ? null : normalizeMoneyString(value);
}

function calculateLineTotal(effectiveLotPrice: string, selectedLots: number) {
  return (Number(effectiveLotPrice) * selectedLots).toFixed(3);
}

function calculateTotalAmount(lines: CheckoutResolvedLine[]) {
  return lines.reduce((sum, line) => sum + Number(line.lineTotal), 0).toFixed(3);
}

function isCheckoutVisibleProduct(productRecord: {
  isArchived: boolean;
  brand: { isActive: boolean } | null;
  productCategories: Array<{ category: { isActive: boolean } }>;
}) {
  return !productRecord.isArchived && productRecord.brand?.isActive === true && productRecord.productCategories.some((entry) => entry.category.isActive);
}

function buildCustomerSnapshot(profileRecord: {
  fullName: string;
  streetAddress: string;
  latitude: string | null;
  longitude: string | null;
  wilaya: { id: string; nameFr: string; nameAr: string };
  commune: { id: string; nameFr: string; nameAr: string };
},
userRecord: Pick<typeof authUser.$inferSelect, "phoneNumber" | "phoneNumberLocal">): CustomerSnapshotPreview {
  return {
    fullName: profileRecord.fullName,
    phoneNumber: userRecord.phoneNumber!,
    phoneNumberLocal: userRecord.phoneNumberLocal,
    wilayaId: profileRecord.wilaya.id,
    wilayaNameFr: profileRecord.wilaya.nameFr,
    wilayaNameAr: profileRecord.wilaya.nameAr,
    communeId: profileRecord.commune.id,
    communeNameFr: profileRecord.commune.nameFr,
    communeNameAr: profileRecord.commune.nameAr,
    streetAddress: profileRecord.streetAddress,
    latitude: profileRecord.latitude,
    longitude: profileRecord.longitude,
  };
}

export async function validateCheckout(ctx: CheckoutContext, input: ValidateCartInput): Promise<CheckoutValidationResult> {
  const profileRecord = await ctx.db.query.clientProfile.findFirst({
    where: eq(clientProfile.userId, ctx.user.id),
    with: {
      wilaya: true,
      commune: true,
    },
  });

  const missingFields: Array<"clientProfile" | "phoneNumber"> = [];

  if (!profileRecord) {
    missingFields.push("clientProfile");
  }

  if (!ctx.user.phoneNumber) {
    missingFields.push("phoneNumber");
  }

  if (missingFields.length > 0) {
    return {
      status: "profile_incomplete",
      missingFields,
    };
  }

  const productIds = input.lines.map((line) => line.productId);
  const products = await ctx.db.query.product.findMany({
    where: inArray(product.id, productIds),
    with: {
      brand: true,
      imageAsset: true,
      productCategories: {
        with: {
          category: true,
        },
      },
    },
  });

  const productsById = new Map(products.map((productRecord) => [productRecord.id, productRecord]));
  const unavailableProducts: Array<{
    productId: string;
    reason: "not_found" | "archived" | "brand_inactive" | "category_inactive";
    productNameFr: string | null;
    productNameAr: string | null;
  }> = [];
  const insufficientStock: Array<{
    productId: string;
    productNameFr: string;
    productNameAr: string;
    requestedLots: number;
    availableStockLots: number;
  }> = [];
  const priceChanges: Array<{
    productId: string;
    productNameFr: string;
    productNameAr: string;
    knownUnitPrice: string;
    currentUnitPrice: string;
    knownLotQuantity: number;
    currentLotQuantity: number;
    knownDiscountLotPrice: string | null;
    currentDiscountLotPrice: string | null;
    currentRegularLotPrice: string;
    currentEffectiveLotPrice: string;
  }> = [];
  const resolvedLines: CheckoutResolvedLine[] = [];

  for (const line of input.lines) {
    const productRecord = productsById.get(line.productId);

    if (!productRecord) {
      unavailableProducts.push({
        productId: line.productId,
        reason: "not_found",
        productNameFr: null,
        productNameAr: null,
      });
      continue;
    }

    if (productRecord.isArchived) {
      unavailableProducts.push({
        productId: productRecord.id,
        reason: "archived",
        productNameFr: productRecord.nameFr,
        productNameAr: productRecord.nameAr,
      });
      continue;
    }

    if (!productRecord.brand?.isActive) {
      unavailableProducts.push({
        productId: productRecord.id,
        reason: "brand_inactive",
        productNameFr: productRecord.nameFr,
        productNameAr: productRecord.nameAr,
      });
      continue;
    }

    if (!isCheckoutVisibleProduct(productRecord)) {
      unavailableProducts.push({
        productId: productRecord.id,
        reason: "category_inactive",
        productNameFr: productRecord.nameFr,
        productNameAr: productRecord.nameAr,
      });
      continue;
    }

    const unitPrice = normalizeMoneyString(productRecord.unitPrice);
    const discountLotPrice = normalizeNullableMoney(productRecord.discountLotPrice);
    const regularLotPrice = calculateLotPrice(unitPrice, productRecord.lotQuantity);
    const effectiveLotPrice = discountLotPrice ?? regularLotPrice;
    const productImageUrl = productRecord.imageAsset?.url;

    if (!productImageUrl) {
      unavailableProducts.push({
        productId: productRecord.id,
        reason: "not_found",
        productNameFr: productRecord.nameFr,
        productNameAr: productRecord.nameAr,
      });
      continue;
    }

    const resolvedLine: CheckoutResolvedLine = {
      productId: productRecord.id,
      productNameFr: productRecord.nameFr,
      productNameAr: productRecord.nameAr,
      productImageUrl,
      unitPrice,
      lotQuantity: productRecord.lotQuantity,
      packagingLabel: productRecord.packagingLabel,
      regularLotPrice,
      discountLotPrice,
      effectiveLotPrice,
      selectedLots: line.quantityLots,
      lineTotal: calculateLineTotal(effectiveLotPrice, line.quantityLots),
      availableStockLots: productRecord.stockLots,
    };

    resolvedLines.push(resolvedLine);

    if (productRecord.stockLots < line.quantityLots) {
      insufficientStock.push({
        productId: productRecord.id,
        productNameFr: productRecord.nameFr,
        productNameAr: productRecord.nameAr,
        requestedLots: line.quantityLots,
        availableStockLots: productRecord.stockLots,
      });
      continue;
    }

    const knownUnitPrice = normalizeMoneyString(line.knownUnitPrice);
    const knownDiscountLotPrice = normalizeNullableMoney(line.knownDiscountLotPrice);

    if (
      knownUnitPrice !== unitPrice ||
      line.knownLotQuantity !== productRecord.lotQuantity ||
      knownDiscountLotPrice !== discountLotPrice
    ) {
      priceChanges.push({
        productId: productRecord.id,
        productNameFr: productRecord.nameFr,
        productNameAr: productRecord.nameAr,
        knownUnitPrice,
        currentUnitPrice: unitPrice,
        knownLotQuantity: line.knownLotQuantity,
        currentLotQuantity: productRecord.lotQuantity,
        knownDiscountLotPrice,
        currentDiscountLotPrice: discountLotPrice,
        currentRegularLotPrice: regularLotPrice,
        currentEffectiveLotPrice: effectiveLotPrice,
      });
    }
  }

  if (unavailableProducts.length > 0) {
    return {
      status: "unavailable_products",
      items: unavailableProducts,
    };
  }

  if (insufficientStock.length > 0) {
    return {
      status: "insufficient_stock",
      items: insufficientStock,
    };
  }

  const customerSnapshot = buildCustomerSnapshot(profileRecord!, {
    phoneNumber: ctx.user.phoneNumber,
    phoneNumberLocal: ctx.user.phoneNumberLocal,
  });
  const totalAmount = calculateTotalAmount(resolvedLines);

  if (priceChanges.length > 0) {
    return {
      status: "price_changed",
      items: priceChanges,
      customerSnapshot,
      lines: resolvedLines,
      totalAmount,
    };
  }

  return {
    status: "ready",
    customerSnapshot,
    lines: resolvedLines,
    totalAmount,
  };
}
