import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Button, Spinner, useToast } from "heroui-native";
import { Pressable, Text, View } from "react-native";

import { formatDa, getLocalizedName } from "@/components/catalog/catalog-format";
import { Container } from "@/components/container";
import { JoumlaSymbol } from "@/components/joumla-symbol";
import { RestartRtlBanner } from "@/components/restart-rtl-banner";
import { useAppTheme } from "@/contexts/app-theme-context";
import { useCart, type CartItem } from "@/contexts/cart-context";
import { authClient } from "@/lib/auth-client";
import { joumlaColors } from "@/lib/app-shell";
import { requestPushPermissionAfterOrder } from "@/lib/push-notifications";
import { queryClient, trpc } from "@/utils/trpc";

const copy = {
  fr: {
    title: "Panier",
    empty: "Votre panier est vide.",
    browse: "Continuer les achats",
    total: "Total",
    checkout: "Valider la commande",
    login: "Connectez-vous pour finaliser le panier.",
    profileIncomplete: "Completez votre profil avant de commander.",
    unavailable: "Certains produits ne sont plus disponibles.",
    stockAdjusted: "Stock insuffisant. Les quantites ont ete ajustees au maximum disponible.",
    priceChanged: "Les prix ont change. Relancez la validation pour confirmer les nouveaux prix.",
    success: "Commande creee. Joumla Store vous appellera pour confirmation.",
    failed: "Impossible de creer la commande.",
    lots: "lots",
  },
  ar: {
    title: "السلة",
    empty: "سلتك فارغة.",
    browse: "متابعة التسوق",
    total: "المجموع",
    checkout: "تاكيد الطلب",
    login: "سجل الدخول لاتمام السلة.",
    profileIncomplete: "اكمل ملفك الشخصي قبل الطلب.",
    unavailable: "بعض المنتجات لم تعد متوفرة.",
    stockAdjusted: "المخزون غير كاف. تم تعديل الكميات الى الحد المتاح.",
    priceChanged: "تغيرت الاسعار. اعد التاكيد لقبول الاسعار الجديدة.",
    success: "تم انشاء الطلب. سيتصل بك Joumla Store للتأكيد.",
    failed: "تعذر انشاء الطلب.",
    lots: "حزم",
  },
};

function buildCheckoutLines(items: CartItem[]) {
  return items.map((item) => ({
    productId: item.product.id,
    quantityLots: item.quantityLots,
    knownUnitPrice: item.product.unitPrice,
    knownLotQuantity: item.product.lotQuantity,
    knownDiscountLotPrice: item.product.discountLotPrice ?? null,
  }));
}

export default function CartScreen() {
  const { language, isDark, isRtl } = useAppTheme();
  const labels = copy[language];
  const cart = useCart();
  const { data: session } = authClient.useSession();
  const { toast } = useToast();

  const createOrder = useMutation(
    trpc.orders.create.mutationOptions({
      async onSuccess(result) {
        if (result.status === "profile_incomplete") {
          toast.show({ variant: "danger", label: labels.profileIncomplete });
          router.push("/profile");
          return;
        }

        if (result.status === "unavailable_products") {
          toast.show({ variant: "danger", label: labels.unavailable });
          return;
        }

        if (result.status === "insufficient_stock") {
          for (const item of result.items) {
            if (item.availableStockLots > 0) {
              cart.setQuantity(item.productId, item.availableStockLots);
            } else {
              cart.remove(item.productId);
            }
          }
          toast.show({ variant: "danger", label: labels.stockAdjusted });
          return;
        }

        if (result.status === "price_changed") {
          toast.show({ variant: "danger", label: labels.priceChanged });
          createOrder.mutate({
            lines: result.lines.map((line) => ({
              productId: line.productId,
              quantityLots: line.selectedLots,
              knownUnitPrice: line.unitPrice,
              knownLotQuantity: line.lotQuantity,
              knownDiscountLotPrice: line.discountLotPrice,
            })),
            acceptPriceChanges: true,
          });
          return;
        }

        cart.clear();
        toast.show({ variant: "success", label: labels.success });
        await queryClient.invalidateQueries();
        try {
          await requestPushPermissionAfterOrder();
        } catch {
          // Push permission must not block order success.
        }
        router.push({ pathname: "/order/[orderId]", params: { orderId: result.orderId } });
      },
      onError() {
        toast.show({ variant: "danger", label: labels.failed });
      },
    }),
  );

  function submitCheckout() {
    if (!session?.user) {
      toast.show({ variant: "danger", label: labels.login });
      router.push("/profile");
      return;
    }

    if (cart.items.length === 0) return;
    createOrder.mutate({ lines: buildCheckoutLines(cart.items) });
  }

  return (
    <Container className="p-6">
      <View style={{ gap: 18 }}>
        <RestartRtlBanner />
        <Text selectable style={{ color: isDark ? "#F8FAFC" : joumlaColors.navy, fontSize: 30, fontWeight: "900", textAlign: isRtl ? "right" : "left" }}>
          {labels.title}
        </Text>

        {cart.items.length === 0 ? (
          <View style={{ backgroundColor: isDark ? joumlaColors.darkCard : "#FFFFFF", borderRadius: 28, padding: 22, gap: 14, borderWidth: 1, borderColor: isDark ? "#27334A" : joumlaColors.line }}>
            <Text selectable style={{ color: isDark ? "#CBD5E1" : joumlaColors.slate, textAlign: isRtl ? "right" : "left" }}>
              {labels.empty}
            </Text>
            <Button onPress={() => router.push("/products")} variant="secondary">
              <Button.Label>{labels.browse}</Button.Label>
            </Button>
          </View>
        ) : null}

        {cart.items.map((item) => (
          <View
            key={item.product.id}
            style={{
              backgroundColor: isDark ? joumlaColors.darkCard : "#FFFFFF",
              borderRadius: 26,
              borderWidth: 1,
              borderColor: isDark ? "#27334A" : joumlaColors.line,
              padding: 14,
              gap: 12,
            }}
          >
            <View style={{ flexDirection: isRtl ? "row-reverse" : "row", gap: 12 }}>
              <View style={{ width: 82, height: 82, borderRadius: 20, overflow: "hidden", backgroundColor: isDark ? joumlaColors.navySoft : joumlaColors.cream, alignItems: "center", justifyContent: "center" }}>
                {item.product.image?.url ? <Image source={{ uri: item.product.image.url }} contentFit="cover" style={{ width: "100%", height: "100%" }} /> : <JoumlaSymbol size={42} />}
              </View>
              <View style={{ flex: 1, gap: 8, alignItems: isRtl ? "flex-end" : "flex-start" }}>
                <Text selectable style={{ color: isDark ? "#F8FAFC" : joumlaColors.navy, fontSize: 16, fontWeight: "900", textAlign: isRtl ? "right" : "left" }}>
                  {getLocalizedName(language, item.product)}
                </Text>
                <Text selectable style={{ color: joumlaColors.pink, fontWeight: "900" }}>
                  {formatDa(Number(item.product.discountLotPrice || item.product.lotPrice) * item.quantityLots)}
                </Text>
                <Text selectable style={{ color: isDark ? "#CBD5E1" : joumlaColors.slate }}>
                  {item.quantityLots} {labels.lots} x {formatDa(item.product.discountLotPrice || item.product.lotPrice)}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: isRtl ? "row-reverse" : "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flexDirection: isRtl ? "row-reverse" : "row", alignItems: "center", gap: 12 }}>
                <Pressable onPress={() => cart.decrement(item.product.id)} style={{ width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: isDark ? joumlaColors.navySoft : joumlaColors.cream }}>
                  <Ionicons name="remove" size={18} color={joumlaColors.pink} />
                </Pressable>
                <Text selectable style={{ color: isDark ? "#F8FAFC" : joumlaColors.navy, fontSize: 20, fontWeight: "900", fontVariant: ["tabular-nums"] }}>
                  {item.quantityLots}
                </Text>
                <Pressable onPress={() => cart.increment(item.product.id)} style={{ width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: isDark ? joumlaColors.navySoft : joumlaColors.cream }}>
                  <Ionicons name="add" size={18} color={joumlaColors.pink} />
                </Pressable>
              </View>
              <Pressable onPress={() => cart.remove(item.product.id)} style={{ width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: "#FEE2E2" }}>
                <Ionicons name="trash-outline" size={18} color="#DC2626" />
              </Pressable>
            </View>
          </View>
        ))}

        {cart.items.length > 0 ? (
          <View style={{ backgroundColor: isDark ? joumlaColors.darkCard : "#FFFFFF", borderRadius: 28, padding: 18, gap: 14, borderWidth: 1, borderColor: isDark ? "#27334A" : joumlaColors.line }}>
            <View style={{ flexDirection: isRtl ? "row-reverse" : "row", justifyContent: "space-between" }}>
              <Text selectable style={{ color: isDark ? "#CBD5E1" : joumlaColors.slate, fontWeight: "800" }}>
                {labels.total}
              </Text>
              <Text selectable style={{ color: joumlaColors.pink, fontSize: 22, fontWeight: "900" }}>
                {formatDa(cart.totalAmount)}
              </Text>
            </View>
            <Button onPress={submitCheckout} isDisabled={createOrder.isPending}>
              {createOrder.isPending ? <Spinner size="sm" color="default" /> : <Button.Label>{labels.checkout}</Button.Label>}
            </Button>
          </View>
        ) : null}
      </View>
    </Container>
  );
}
