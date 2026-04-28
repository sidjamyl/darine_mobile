import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import * as FileSystem from "expo-file-system";
import { useLocalSearchParams } from "expo-router";
import * as Sharing from "expo-sharing";
import { Button, Spinner, useToast } from "heroui-native";
import { Text, View } from "react-native";

import { formatDa, getLocalizedName } from "@/components/catalog/catalog-format";
import { Container } from "@/components/container";
import { canClientCancel, formatOrderDate, getOrderStatusLabel } from "@/components/order/order-format";
import { RestartRtlBanner } from "@/components/restart-rtl-banner";
import { useAppTheme } from "@/contexts/app-theme-context";
import { joumlaColors } from "@/lib/app-shell";
import { queryClient, trpc, trpcClient } from "@/utils/trpc";

const copy = {
  fr: {
    loading: "Chargement de la commande...",
    error: "Impossible de charger cette commande.",
    customer: "Client",
    address: "Adresse",
    lines: "Produits",
    total: "Total",
    cancel: "Annuler la commande",
    cancelled: "Commande annulee.",
    cancelFailed: "Impossible d'annuler cette commande.",
    downloadBl: "Telecharger / partager le BL",
    blUnavailable: "BL indisponible pour cette commande.",
    blFailed: "Impossible de telecharger le BL.",
  },
  ar: {
    loading: "جاري تحميل الطلب...",
    error: "تعذر تحميل هذا الطلب.",
    customer: "العميل",
    address: "العنوان",
    lines: "المنتجات",
    total: "المجموع",
    cancel: "الغاء الطلب",
    cancelled: "تم الغاء الطلب.",
    cancelFailed: "تعذر الغاء هذا الطلب.",
    downloadBl: "تحميل / مشاركة BL",
    blUnavailable: "BL غير متاح لهذا الطلب.",
    blFailed: "تعذر تحميل BL.",
  },
};

export default function OrderDetailScreen() {
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();
  const resolvedOrderId = Array.isArray(orderId) ? orderId[0] : orderId;
  const { language, isDark, isRtl } = useAppTheme();
  const labels = copy[language];
  const { toast } = useToast();

  const order = useQuery({
    ...trpc.orders.clientDetail.queryOptions({ orderId: resolvedOrderId ?? "missing" }),
    enabled: !!resolvedOrderId,
  });

  const cancelOrder = useMutation(
    trpc.orders.clientCancel.mutationOptions({
      async onSuccess() {
        toast.show({ variant: "success", label: labels.cancelled });
        await queryClient.invalidateQueries();
      },
      onError() {
        toast.show({ variant: "danger", label: labels.cancelFailed });
      },
    }),
  );

  async function shareDeliveryNote() {
    if (!resolvedOrderId) return;

    try {
      const payload = await trpcClient.deliveryNotes.clientDownloadPdf.query({ orderId: resolvedOrderId });
      const fileUri = `${FileSystem.cacheDirectory}${payload.fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, payload.base64, { encoding: FileSystem.EncodingType.Base64 });

      if (!(await Sharing.isAvailableAsync())) {
        toast.show({ variant: "danger", label: labels.blUnavailable });
        return;
      }

      await Sharing.shareAsync(fileUri, { mimeType: payload.mimeType, dialogTitle: payload.fileName });
    } catch {
      toast.show({ variant: "danger", label: labels.blFailed });
    }
  }

  return (
    <Container className="p-6">
      <View style={{ gap: 18 }}>
        <RestartRtlBanner />
        {order.isLoading ? (
          <View style={{ alignItems: "center", gap: 10, padding: 24 }}>
            <Spinner size="sm" color="default" />
            <Text selectable style={{ color: isDark ? "#CBD5E1" : joumlaColors.slate }}>
              {labels.loading}
            </Text>
          </View>
        ) : null}
        {order.error ? (
          <Text selectable style={{ color: joumlaColors.pink, textAlign: isRtl ? "right" : "left" }}>
            {labels.error}
          </Text>
        ) : null}
        {order.data ? (
          <View style={{ gap: 18 }}>
            <View style={{ backgroundColor: isDark ? joumlaColors.darkCard : "#FFFFFF", borderRadius: 28, borderWidth: 1, borderColor: isDark ? "#27334A" : joumlaColors.line, padding: 20, gap: 12 }}>
              <View style={{ flexDirection: isRtl ? "row-reverse" : "row", justifyContent: "space-between", gap: 12 }}>
                <View style={{ flex: 1, alignItems: isRtl ? "flex-end" : "flex-start", gap: 6 }}>
                  <Text selectable style={{ color: isDark ? "#F8FAFC" : joumlaColors.navy, fontSize: 26, fontWeight: "900" }}>
                    {order.data.orderNumber}
                  </Text>
                  <Text selectable style={{ color: isDark ? "#CBD5E1" : joumlaColors.slate }}>
                    {formatOrderDate(order.data.createdAt)}
                  </Text>
                </View>
                <Text selectable style={{ color: joumlaColors.pink, fontWeight: "900" }}>
                  {getOrderStatusLabel(language, order.data.status)}
                </Text>
              </View>
              <Text selectable style={{ color: isDark ? "#CBD5E1" : joumlaColors.slate, textAlign: isRtl ? "right" : "left" }}>
                {labels.customer}: {order.data.customerFullNameSnapshot} · {order.data.customerPhoneLocalSnapshot ?? order.data.customerPhoneSnapshot}
              </Text>
              <Text selectable style={{ color: isDark ? "#CBD5E1" : joumlaColors.slate, textAlign: isRtl ? "right" : "left", lineHeight: 21 }}>
                {labels.address}: {order.data.streetAddressSnapshot}, {language === "ar" ? order.data.communeNameArSnapshot : order.data.communeNameFrSnapshot}, {language === "ar" ? order.data.wilayaNameArSnapshot : order.data.wilayaNameFrSnapshot}
              </Text>
            </View>

            <View style={{ gap: 12 }}>
              <Text selectable style={{ color: isDark ? "#F8FAFC" : joumlaColors.navy, fontSize: 22, fontWeight: "900", textAlign: isRtl ? "right" : "left" }}>
                {labels.lines}
              </Text>
              {order.data.lines.map((line) => (
                <View key={line.id} style={{ flexDirection: isRtl ? "row-reverse" : "row", gap: 12, backgroundColor: isDark ? joumlaColors.darkCard : "#FFFFFF", borderRadius: 24, borderWidth: 1, borderColor: isDark ? "#27334A" : joumlaColors.line, padding: 12 }}>
                  <View style={{ width: 70, height: 70, borderRadius: 18, overflow: "hidden", backgroundColor: isDark ? joumlaColors.navySoft : joumlaColors.cream, alignItems: "center", justifyContent: "center" }}>
                    {line.productImageUrlSnapshot ? <Image source={{ uri: line.productImageUrlSnapshot }} contentFit="cover" style={{ width: "100%", height: "100%" }} /> : <Ionicons name="cube-outline" size={28} color={joumlaColors.pink} />}
                  </View>
                  <View style={{ flex: 1, gap: 6, alignItems: isRtl ? "flex-end" : "flex-start" }}>
                    <Text selectable style={{ color: isDark ? "#F8FAFC" : joumlaColors.navy, fontWeight: "900", textAlign: isRtl ? "right" : "left" }}>
                      {getLocalizedName(language, { nameFr: line.productNameFrSnapshot, nameAr: line.productNameArSnapshot })}
                    </Text>
                    <Text selectable style={{ color: isDark ? "#CBD5E1" : joumlaColors.slate }}>
                      {line.selectedLots} x {line.lotQuantitySnapshot} {line.packagingLabelSnapshot}
                    </Text>
                    <Text selectable style={{ color: joumlaColors.pink, fontWeight: "900" }}>
                      {formatDa(line.lineTotalSnapshot)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            <View style={{ backgroundColor: isDark ? joumlaColors.darkCard : "#FFFFFF", borderRadius: 28, borderWidth: 1, borderColor: isDark ? "#27334A" : joumlaColors.line, padding: 18, gap: 14 }}>
              <View style={{ flexDirection: isRtl ? "row-reverse" : "row", justifyContent: "space-between" }}>
                <Text selectable style={{ color: isDark ? "#CBD5E1" : joumlaColors.slate, fontWeight: "800" }}>
                  {labels.total}
                </Text>
                <Text selectable style={{ color: joumlaColors.pink, fontSize: 22, fontWeight: "900" }}>
                  {formatDa(order.data.totalAmountSnapshot)}
                </Text>
              </View>
              {order.data.deliveryNote ? (
                <Button onPress={shareDeliveryNote} variant="secondary">
                  <Button.Label>{labels.downloadBl}</Button.Label>
                </Button>
              ) : null}
              {canClientCancel(order.data.status) ? (
                <Button onPress={() => cancelOrder.mutate({ orderId: order.data.id })} isDisabled={cancelOrder.isPending} variant="danger-soft">
                  {cancelOrder.isPending ? <Spinner size="sm" color="default" /> : <Button.Label>{labels.cancel}</Button.Label>}
                </Button>
              ) : null}
            </View>
          </View>
        ) : null}
      </View>
    </Container>
  );
}
