import * as ImagePicker from "expo-image-picker";

import { trpcClient } from "@/utils/trpc";

type AssetKind = "product" | "brand" | "category" | "banner";

export async function pickAndUploadAdminAsset(kind: AssetKind) {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Media library permission denied");
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.86,
  });

  if (result.canceled || !result.assets[0]) {
    return null;
  }

  const image = result.assets[0];
  const signature = await trpcClient.assets.createUploadSignature.mutate({ kind });
  const formData = new FormData();
  formData.append("file", {
    uri: image.uri,
    name: `${signature.publicId}.jpg`,
    type: image.mimeType ?? "image/jpeg",
  } as unknown as Blob);
  formData.append("api_key", signature.apiKey);
  formData.append("timestamp", String(signature.timestamp));
  formData.append("signature", signature.signature);
  formData.append("folder", signature.folder);
  formData.append("public_id", signature.publicId);

  const response = await fetch(signature.uploadUrl, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Cloudinary upload failed");
  }

  const uploaded = (await response.json()) as {
    public_id: string;
    secure_url: string;
    width?: number;
    height?: number;
    format?: string;
    bytes?: number;
    folder?: string;
  };

  return trpcClient.assets.registerUploadedAsset.mutate({
    kind,
    publicId: uploaded.public_id,
    url: uploaded.secure_url,
    width: uploaded.width,
    height: uploaded.height,
    format: uploaded.format,
    bytes: uploaded.bytes,
    folder: uploaded.folder ?? signature.folder,
  });
}
