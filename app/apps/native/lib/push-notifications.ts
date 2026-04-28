import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { trpcClient } from "@/utils/trpc";

const DEVICE_ID_KEY = "joumla-push-device-id";

async function getDeviceId() {
  const stored = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (stored) return stored;

  const generated = `device-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await SecureStore.setItemAsync(DEVICE_ID_KEY, generated);
  return generated;
}

export async function requestPushPermissionAfterOrder() {
  const current = await Notifications.getPermissionsAsync();
  const permission = current.granted ? current : await Notifications.requestPermissionsAsync();

  if (!permission.granted) {
    return { registered: false, reason: "permission_denied" as const };
  }

  const projectId = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
  const token = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);

  await trpcClient.notifications.registerPushDevice.mutate({
    deviceId: await getDeviceId(),
    platform: Platform.OS === "ios" ? "ios" : "android",
    expoPushToken: token.data,
  });

  return { registered: true as const };
}
