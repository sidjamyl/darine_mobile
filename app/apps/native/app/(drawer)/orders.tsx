import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Button, Spinner } from "heroui-native";
import { Pressable, Text, View } from "react-native";

import { Container } from "@/components/container";
import { getOrderStatusLabel, formatOrderDate, getOrderTotal } from "@/components/order/order-format";
import { RestartRtlBanner } from "@/components/restart-rtl-banner";
import { useAppTheme } from "@/contexts/app-theme-context";
import { authClient } from "@/lib/auth-client";
import { joumlaColors } from "@/lib/app-shell";
import { trpc } from "@/utils/trpc";

const copy = {
  fr: {
    title: "Mes commandes",
    guestTitle: "Connectez-vous pour voir vos commandes",
    login: "Connexion / creation de compte",
    empty: "Vos commandes apparaitront ici apres le premier achat.",
    loading: "Chargement des commandes...",
    error: "Impossible de charger les commandes.",
    lines: "lignes",
    open: "Voir le detail",
  },
  ar: {
    title: "طلباتي",
    guestTitle: "سجل الدخول لعرض طلباتك",
    login: "دخول / انشاء حساب",
    empty: "ستظهر طلباتك هنا بعد اول عملية شراء.",
    loading: "جاري تحميل الطلبات...",
    error: "تعذر تحميل الطلبات.",
    lines: "اسطر",
    open: "عرض التفاصيل",
  },
};

export default function OrdersScreen() {
  const { language, isDark, isRtl } = useAppTheme();
  const labels = copy[language];
  const { data: session } = authClient.useSession();
  const orders = useQuery({
    ...trpc.orders.clientList.queryOptions(),
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

        {orders.isLoading ? (
          <View style={{ alignItems: "center", gap: 10, padding: 18 }}>
            <Spinner size="sm" color="default" />
            <Text selectable style={{ color: isDark ? "#CBD5E1" : joumlaColors.slate }}>
              {labels.loading}
            </Text>
          </View>
        ) : null}

        {orders.error ? (
          <Text selectable style={{ color: joumlaColors.pink, textAlign: isRtl ? "right" : "left" }}>
            {labels.error}
          </Text>
        ) : null}

        {session?.user && orders.data?.length === 0 ? (
          <Text selectable style={{ color: isDark ? "#CBD5E1" : joumlaColors.slate, textAlign: isRtl ? "right" : "left" }}>
            {labels.empty}
          </Text>
        ) : null}

        {(orders.data ?? []).map((order) => (
          <Pressable
            key={order.id}
            onPress={() => router.push({ pathname: "/order/[orderId]", params: { orderId: order.id } })}
            style={{
              backgroundColor: isDark ? joumlaColors.darkCard : "#FFFFFF",
              borderRadius: 26,
              borderWidth: 1,
              borderColor: isDark ? "#27334A" : joumlaColors.line,
              padding: 18,
              gap: 12,
            }}
          >
            <View style={{ flexDirection: isRtl ? "row-reverse" : "row", justifyContent: "space-between", gap: 12 }}>
              <View style={{ flex: 1, alignItems: isRtl ? "flex-end" : "flex-start", gap: 4 }}>
                <Text selectable style={{ color: isDark ? "#F8FAFC" : joumlaColors.navy, fontSize: 18, fontWeight: "900" }}>
                  {order.orderNumber}
                </Text>
                <Text selectable style={{ color: isDark ? "#CBD5E1" : joumlaColors.slate }}>
                  {formatOrderDate(order.createdAt)}
                </Text>
              </View>
              <Text selectable style={{ color: joumlaColors.pink, fontWeight: "900" }}>
                {getOrderTotal(order.totalAmountSnapshot)}
              </Text>
            </View>
            <View style={{ flexDirection: isRtl ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text selectable style={{ color: isDark ? "#CBD5E1" : joumlaColors.slate, fontWeight: "800" }}>
                {getOrderStatusLabel(language, order.status)}
              </Text>
              <Text selectable style={{ color: isDark ? "#CBD5E1" : joumlaColors.slate }}>
                {order.lines.length} {labels.lines}
              </Text>
            </View>
            <Text selectable style={{ color: joumlaColors.pink, fontWeight: "900", textAlign: isRtl ? "right" : "left" }}>
              {labels.open}
            </Text>
          </Pressable>
        ))}
      </View>
    </Container>
  );
}
