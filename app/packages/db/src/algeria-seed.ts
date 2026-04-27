import { sql } from "drizzle-orm";

import { db } from "./index";
import { commune, wilaya } from "./schema/profile";
import communesData from "./seed-data/communes.json";
import wilayasData from "./seed-data/wilayas.json";

type WilayaSeed = {
  code: string;
  name: {
    arabic: string;
    ascii: string;
  };
};

type CommuneSeed = {
  id: number;
  commune_name_ascii: string;
  commune_name: string;
  daira_name_ascii: string;
  daira_name: string;
  wilaya_code: string;
};

const typedWilayas = wilayasData as WilayaSeed[];
const typedCommunes = communesData as CommuneSeed[];

export async function seedAlgeriaLocations() {
  const wilayaRows = typedWilayas.map((item) => ({
    id: `wilaya-${item.code}`,
    code: item.code,
    nameFr: item.name.ascii.trim(),
    nameAr: item.name.arabic.trim(),
    sortOrder: Number.parseInt(item.code, 10),
  }));

  await db
    .insert(wilaya)
    .values(wilayaRows)
    .onConflictDoUpdate({
      target: wilaya.code,
      set: {
        nameFr: sql`excluded.name_fr`,
        nameAr: sql`excluded.name_ar`,
        sortOrder: sql`excluded.sort_order`,
      },
    });

  const communeRows = typedCommunes.map((item) => ({
    id: `commune-${item.id}`,
    sourceId: String(item.id),
    wilayaId: `wilaya-${item.wilaya_code}`,
    nameFr: item.commune_name_ascii.trim(),
    nameAr: item.commune_name.trim(),
    dairaNameFr: item.daira_name_ascii.trim(),
    dairaNameAr: item.daira_name.trim(),
  }));

  for (let index = 0; index < communeRows.length; index += 250) {
    const batch = communeRows.slice(index, index + 250);
    await db
      .insert(commune)
      .values(batch)
      .onConflictDoUpdate({
        target: commune.sourceId,
        set: {
          wilayaId: sql`excluded.wilaya_id`,
          nameFr: sql`excluded.name_fr`,
          nameAr: sql`excluded.name_ar`,
          dairaNameFr: sql`excluded.daira_name_fr`,
          dairaNameAr: sql`excluded.daira_name_ar`,
        },
      });
  }

  return {
    wilayas: wilayaRows.length,
    communes: communeRows.length,
  };
}
