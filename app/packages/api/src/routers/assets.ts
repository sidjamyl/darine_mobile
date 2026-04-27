import { asset } from "@app/db/schema/catalog";
import { env } from "@app/env/server";
import { TRPCError } from "@trpc/server";
import { createHash } from "node:crypto";
import { z } from "zod";

import { adminProcedure, router } from "../index";
import { createId } from "./catalog-shared";

const assetKindSchema = z.enum(["product", "brand", "category", "banner"]);

const registerUploadedAssetSchema = z.object({
  kind: assetKindSchema,
  publicId: z.string().trim().min(1),
  url: z.url(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  format: z.string().trim().min(1).optional(),
  bytes: z.number().int().nonnegative().optional(),
  folder: z.string().trim().min(1).optional(),
});

function getCloudinaryConfig() {
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Cloudinary is not configured",
    });
  }

  return {
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    apiSecret: env.CLOUDINARY_API_SECRET,
  };
}

function signCloudinaryParams(params: Record<string, string>, secret: string) {
  const payload = Object.entries(params)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return createHash("sha1")
    .update(`${payload}${secret}`)
    .digest("hex");
}

export const assetsRouter = router({
  createUploadSignature: adminProcedure
    .input(
      z.object({
        kind: assetKindSchema,
      }),
    )
    .mutation(({ input }) => {
      const config = getCloudinaryConfig();
      const timestamp = Math.floor(Date.now() / 1000);
      const folder = `joumla/${input.kind}`;
      const publicId = createId(input.kind);

      const signature = signCloudinaryParams(
        {
          folder,
          public_id: publicId,
          timestamp: String(timestamp),
        },
        config.apiSecret,
      );

      return {
        cloudName: config.cloudName,
        apiKey: config.apiKey,
        folder,
        publicId,
        timestamp,
        signature,
        uploadUrl: `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`,
      };
    }),

  registerUploadedAsset: adminProcedure.input(registerUploadedAssetSchema).mutation(async ({ ctx, input }) => {
    const [savedAsset] = await ctx.db
      .insert(asset)
      .values({
        id: createId("asset"),
        kind: input.kind,
        publicId: input.publicId,
        url: input.url,
        width: input.width ?? null,
        height: input.height ?? null,
        format: input.format?.trim() || null,
        bytes: input.bytes ?? null,
        folder: input.folder?.trim() || `joumla/${input.kind}`,
      })
      .onConflictDoUpdate({
        target: asset.publicId,
        set: {
          kind: input.kind,
          url: input.url,
          width: input.width ?? null,
          height: input.height ?? null,
          format: input.format?.trim() || null,
          bytes: input.bytes ?? null,
          folder: input.folder?.trim() || `joumla/${input.kind}`,
        },
      })
      .returning();

    if (!savedAsset) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to register asset" });
    }

    return {
      id: savedAsset.id,
      kind: savedAsset.kind,
      publicId: savedAsset.publicId,
      url: savedAsset.url,
      width: savedAsset.width,
      height: savedAsset.height,
      format: savedAsset.format,
      bytes: savedAsset.bytes,
      folder: savedAsset.folder,
    };
  }),
});
