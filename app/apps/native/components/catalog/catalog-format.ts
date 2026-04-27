export function formatDa(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }

  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount)) {
    return `${value} DA`;
  }

  return `${amount.toLocaleString("fr-DZ", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  })} DA`;
}

export function getLocalizedName(
  language: "fr" | "ar",
  item: { nameFr?: string | null; nameAr?: string | null; name?: string | null },
) {
  if (language === "ar") {
    return item.nameAr || item.name || item.nameFr || "";
  }

  return item.nameFr || item.name || item.nameAr || "";
}
