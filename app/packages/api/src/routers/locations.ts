import { commune, wilaya } from "@app/db/schema/profile";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";

import { publicProcedure, router } from "../index";

export const locationsRouter = router({
  wilayas: publicProcedure.query(({ ctx }) => {
    return ctx.db
      .select({
        id: wilaya.id,
        code: wilaya.code,
        nameFr: wilaya.nameFr,
        nameAr: wilaya.nameAr,
      })
      .from(wilaya)
      .orderBy(asc(wilaya.sortOrder));
  }),

  communesByWilaya: publicProcedure
    .input(z.object({ wilayaId: z.string().min(1) }))
    .query(({ ctx, input }) => {
      return ctx.db
        .select({
          id: commune.id,
          nameFr: commune.nameFr,
          nameAr: commune.nameAr,
          dairaNameFr: commune.dairaNameFr,
          dairaNameAr: commune.dairaNameAr,
        })
        .from(commune)
        .where(eq(commune.wilayaId, input.wilayaId))
        .orderBy(asc(commune.nameFr));
    }),
});
