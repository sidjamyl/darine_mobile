import { homeSectionSettings } from "@app/db/schema/catalog";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import type { Context } from "../context";

export const HOME_SECTION_SETTINGS_ID = "home-section-settings";

export const moneyStringSchema = z.string().trim().regex(/^\d+(\.\d{1,3})?$/, {
  message: "Use a positive amount with up to 3 decimals",
});

export function createId(prefix: string) {
  return `${prefix}-${randomUUID()}`;
}

export function normalizeMoneyString(value: string) {
  return Number(value).toFixed(3);
}

export function calculateLotPrice(unitPrice: string, lotQuantity: number) {
  return (Number(unitPrice) * lotQuantity).toFixed(3);
}

export async function ensureHomeSectionSettings(db: Context["db"]) {
  await db.insert(homeSectionSettings).values({ id: HOME_SECTION_SETTINGS_ID }).onConflictDoNothing();

  const settings = await db.query.homeSectionSettings.findFirst({
    where: eq(homeSectionSettings.id, HOME_SECTION_SETTINGS_ID),
  });

  if (!settings) {
    throw new Error("Failed to initialize home section settings");
  }

  return settings;
}
