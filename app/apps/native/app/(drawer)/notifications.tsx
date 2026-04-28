import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Button, Spinner } from "heroui-native";
import { Pressable, Text, View } from "react-native";

import { Container } from "@/components/container";
import { formatOrderDate } from "@/components/order/order-format";
import { RestartRtlBanner } from "@/components/restart-rtl-banner";
import { useAppTheme } from "@/contexts/app-theme-context";
import { authClient } from "@/lib/auth-client";
import { joumlaColors } from "@/lib/app-shell";
import { trpc } from "@/utils/trpc";

const copy = {
  fr: {
    title: "Notifications",
    guestTitle: "Connectez-vous pour voir vos notifications",
    login: "Connexion / creation de compte",
    empty: "Aucune notification pour le moment.",
    loading: "Chargement des notifications...",
    error: "Impossible de charger les notifications.",
    order: "Commande",
    announcement: "Annonce",
  },
  ar: {
    title: "الاشعارات",
    guestTitle: "سجل الدخول لعرض الاشعارات",
    login: "دخول / انشاء حساب",
    empty: "لا توجد اشعارات حاليا.",
    loading: "جاري تحميل الاشعارات...",
    error: "تعذر تحميل الاشعارات.",
    order: "طلب",
    announcement: "اعلان",
  },
};

export default function NotificationsScreen() {
  const { language, isDark, isRtl } = useAppTheme();
  const labels = copy[language];
  const { data: session } = authClient.useSession();
  const notifications = useQuery({
    ...trpc.notifications.myCenter.queryOptions({ limit: 80 }),
    enabled: !!session?.user,
  });

  return (
    <Container className="p-6">
      <View style={{ gap: 18 }}>
        <RestartRtlBanner />
        <Text selectable style={{ color: isDark ? "#F8FAFC" : joumlaColors.navy, fontSize: 30, fontWeight: "900", textAlign: isRtl ? "right" : "left" }}>
          {labels.title}
        </Text>

        {!session?.user ? (
          <View style={{ backgroundColor: isDark ? joumlaColors.darkCard : "#FFFFFF", borderRadius: 28, borderWidth: 1, borderColor: isDark ? "#27334A" : joumlaColors.line, padding: 20, gap: 14 }}>
            <Text selectable style={{ color: isDark ? "#F8FAFC" : joumlaColors.navy, fontSize: 22, fontWeight: "900", textAlign: isRtl ? "right" : "left" }}>
              {labels.guestTitle}
            </Text>
            <Button onPress={() => router.push("/profile")}>
              <Button.Label>{labels.login}</Button.Label>
            </Button>
          </View>
        ) : null}

        {notifications.isLoading ? (
          <View style={{ alignItems: "center", gap: 10, padding: 18 }}>
            <Spinner size="sm" color="default" />
            <Text selectable style={{ color: isDark ? "#CBD5E1" : joumlaColors.slate }}>
              {labels.loading}
            </Text>
          </View>
        ) : null}

        {notifications.error ? (
          <Text selectable style={{ color: joumlaColors.pink, textAlign: isRtl ? "right" : "left" }}>
            {labels.error}
          </Text>
        ) : null}

        {session?.user && notifications.data?.length === 0 ? (
          <Text selectable style={{ color: isDark ? "#CBD5E1" : joumlaColors.slate, textAlign: isRtl ? "right" : "left" }}>
            {labels.empty}
          </Text>
        ) : null}

        {(notifications.data ?? []).map((notification) => (
          <Pressable
            key={notification.id}
            onPress={() => {
              if (notification.orderId) {
                router.push({ pathname: "/order/[orderId]", params: { orderId: notification.orderId } });
              }
            }}
            style={{
              backgroundColor: isDark ? joumlaColors.darkCard : "#FFFFFF",
              borderRadius: 24,
              borderWidth: 1,
              borderColor: isDark ? "#27334A" : joumlaColors.line,
              padding: 16,
              gap: 10,
            }}
          >
            <View style={{ flexDirection: isRtl ? "row-reverse" : "row", alignItems: "center", gap: 10 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: isDark ? joumlaColors.navySoft : joumlaColors.cream }}>
                <Ionicons name={notification.kind === "order_status" ? "receipt-outline" : "megaphone-outline"} size={20} color={joumlaColors.pink} />
              </View>
              <View style={{ flex: 1, alignItems: isRtl ? "flex-end" : "flex-start" }}>
                <Text selectable style={{ color: isDark ? "#F8FAFC" : joumlaColors.navy, fontSize: 16, fontWeight: "900", textAlign: isRtl ? "right" : "left" }}>
                  {notification.title}
                </Text>
                <Text selectable style={{ color: isDark ? "#CBD5E1" : joumlaColors.slate }}>
                  {notification.kind === "order_status" ? labels.order : labels.announcement} · {formatOrderDate(notification.createdAt)}
                </Text>
              </View>
            </View>
            <Text selectable style={{ color: isDark ? "#CBD5E1" : joumlaColors.slate, lineHeight: 21, textAlign: isRtl ? "right" : "left" }}>
              {notification.body}
            </Text>
          </Pressable>
        ))}
      </View>
    </Container>
  );
}
