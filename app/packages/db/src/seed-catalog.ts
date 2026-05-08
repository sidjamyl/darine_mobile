import { eq } from "drizzle-orm";

import { db } from ".";
import { brand, category, homeSectionSettings, product, productCategory } from "./schema/catalog";

const brands = [
  { id: "brand-joumla", name: "Joumla Selection", isFeatured: true, sortOrder: 1 },
  { id: "brand-safir", name: "Safir Pack", isFeatured: true, sortOrder: 2 },
];

const categories = [
  { id: "category-barquettes", nameFr: "Barquettes", nameAr: "علب غذائية", isFeatured: true, sortOrder: 1 },
  { id: "category-gobelets", nameFr: "Gobelets", nameAr: "اكواب", isFeatured: true, sortOrder: 2 },
  { id: "category-sacs", nameFr: "Sacs", nameAr: "اكياس", isFeatured: true, sortOrder: 3 },
  { id: "category-film", nameFr: "Film et aluminium", nameAr: "فيلم والمنيوم", isFeatured: false, sortOrder: 4 },
];

const products = [
  { id: "product-barquette-750", nameFr: "Barquette aluminium 750ml", nameAr: "علبة المنيوم 750مل", unitPrice: "18.000", lotQuantity: 100, packagingLabel: "Carton de 100", brandId: "brand-joumla", categoryIds: ["category-barquettes"], stockLots: 24, sortOrder: 1 },
  { id: "product-barquette-1000", nameFr: "Barquette aluminium 1000ml", nameAr: "علبة المنيوم 1000مل", unitPrice: "24.000", lotQuantity: 100, packagingLabel: "Carton de 100", brandId: "brand-joumla", categoryIds: ["category-barquettes"], stockLots: 18, sortOrder: 2 },
  { id: "product-gobelet-180", nameFr: "Gobelet carton 180ml", nameAr: "كوب كرتون 180مل", unitPrice: "7.500", lotQuantity: 1000, packagingLabel: "Carton de 1000", brandId: "brand-safir", categoryIds: ["category-gobelets"], stockLots: 12, sortOrder: 3 },
  { id: "product-gobelet-250", nameFr: "Gobelet carton 250ml", nameAr: "كوب كرتون 250مل", unitPrice: "9.000", lotQuantity: 1000, packagingLabel: "Carton de 1000", brandId: "brand-safir", categoryIds: ["category-gobelets"], stockLots: 15, sortOrder: 4 },
  { id: "product-sac-bretelle", nameFr: "Sac bretelle blanc moyen", nameAr: "كيس ابيض متوسط", unitPrice: "3.200", lotQuantity: 1000, packagingLabel: "Paquet de 1000", brandId: "brand-joumla", categoryIds: ["category-sacs"], stockLots: 30, sortOrder: 5 },
  { id: "product-sac-kraft", nameFr: "Sac kraft alimentaire", nameAr: "كيس كرافت غذائي", unitPrice: "14.000", lotQuantity: 250, packagingLabel: "Paquet de 250", brandId: "brand-safir", categoryIds: ["category-sacs"], stockLots: 9, sortOrder: 6 },
  { id: "product-film", nameFr: "Film alimentaire professionnel", nameAr: "فيلم غذائي مهني", unitPrice: "390.000", lotQuantity: 6, packagingLabel: "Lot de 6 rouleaux", brandId: "brand-joumla", categoryIds: ["category-film"], stockLots: 7, sortOrder: 7 },
  { id: "product-aluminium", nameFr: "Rouleau aluminium 200m", nameAr: "رولو المنيوم 200م", unitPrice: "620.000", lotQuantity: 6, packagingLabel: "Lot de 6 rouleaux", brandId: "brand-safir", categoryIds: ["category-film"], stockLots: 5, sortOrder: 8 },
];

await db.insert(homeSectionSettings).values({ id: "home-section-settings" }).onConflictDoNothing();

for (const entry of brands) {
  await db.insert(brand).values({ ...entry, isActive: true, logoAssetId: null }).onConflictDoUpdate({
    target: brand.id,
    set: { name: entry.name, isActive: true, isFeatured: entry.isFeatured, sortOrder: entry.sortOrder },
  });
}

for (const entry of categories) {
  await db.insert(category).values({ ...entry, isActive: true, imageAssetId: null }).onConflictDoUpdate({
    target: category.id,
    set: { nameFr: entry.nameFr, nameAr: entry.nameAr, isActive: true, isFeatured: entry.isFeatured, sortOrder: entry.sortOrder },
  });
}

for (const entry of products) {
  await db.insert(product).values({
    id: entry.id,
    nameFr: entry.nameFr,
    nameAr: entry.nameAr,
    unitPrice: entry.unitPrice,
    lotQuantity: entry.lotQuantity,
    packagingLabel: entry.packagingLabel,
    brandId: entry.brandId,
    imageAssetId: null,
    stockLots: entry.stockLots,
    lowStockThreshold: 5,
    description: "Produit de demonstration Joumla pour valider le catalogue mobile et admin.",
    sortOrder: entry.sortOrder,
    isArchived: false,
  }).onConflictDoUpdate({
    target: product.id,
    set: { stockLots: entry.stockLots, isArchived: false, sortOrder: entry.sortOrder },
  });

  await db.delete(productCategory).where(eq(productCategory.productId, entry.id));
  await db.insert(productCategory).values(entry.categoryIds.map((categoryId) => ({ productId: entry.id, categoryId })));
}

console.log(`Seeded ${brands.length} brands, ${categories.length} categories, and ${products.length} products.`);
