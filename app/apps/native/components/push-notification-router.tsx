import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect } from "react";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function PushNotificationRouter() {
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      const orderId = typeof data.orderId === "string" ? data.orderId : null;

      if (orderId) {
        router.push({ pathname: "/order/[orderId]", params: { orderId } });
        return;
      }

      router.push("/notifications");
    });

    return () => subscription.remove();
  }, []);

  return null;
}
