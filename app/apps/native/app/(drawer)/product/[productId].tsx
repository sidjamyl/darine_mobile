import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { Button, Spinner, useToast } from "heroui-native";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { formatDa, getLocalizedName } from "@/components/catalog/catalog-format";
import { Container } from "@/components/container";
import { JoumlaSymbol } from "@/components/joumla-symbol";
import { RestartRtlBanner } from "@/components/restart-rtl-banner";
import { useAppTheme } from "@/contexts/app-theme-context";
import { authClient } from "@/lib/auth-client";
import { joumlaColors } from "@/lib/app-shell";
import { queryClient, trpc } from "@/utils/trpc";

const copy = {
  fr: {
    loading: "Chargement du produit...",
    error: "Impossible de charger ce produit.",
    addToCart: "Ajouter au panier",
    cartQueued: "Produit selectionne. Le panier sera finalise dans l'etape checkout.",
    loginRequired: "Connectez-vous pour utiliser les favoris.",
    favoriteAdded: "Produit ajoute aux favoris.",
    favoriteRemoved: "Produit retire des favoris.",
    favoriteFailed: "Impossible de mettre a jour les favoris.",
    outOfStock: "Rupture de stock",
    lotPrice: "Prix du lot",
    unitPrice: "Prix unite",
    packaging: "Colisage",
    brand: "Marque",
    categories: "Categories",
    description: "Description",
    noDescription: "Aucune description disponible.",
  },
  ar: {
    loading: "جاري تحميل المنتج...",
    error: "تعذر تحميل هذا المنتج.",
    addToCart: "اضافة الى السلة",
    cartQueued: "تم اختيار المنتج. سيتم اكمال السلة في مرحلة الدفع.",
    loginRequired: "سجل الدخول لاستخدام المفضلة.",
    favoriteAdded: "تمت اضافة المنتج الى المفضلة.",
    favoriteRemoved: "تم حذف المنتج من المفضلة.",
    favoriteFailed: "تعذر تحديث المفضلة.",
    outOfStock: "غير متوفر",
    lotPrice: "سعر الحزمة",
    unitPrice: "سعر الوحدة",
    packaging: "التعبئة",
    brand: "العلامة",
    categories: "الاصناف",
    description: "الوصف",
    noDescription: "لا يوجد وصف متاح.",
  },
};

export default function ProductDetailScreen() {
  const { productId } = useLocalSearchParams<{ productId?: string }>();
  const resolvedProductId = Array.isArray(productId) ? productId[0] : productId;
  const { language, isDark, isRtl } = useAppTheme();
  const labels = copy[language];
  const { toast } = useToast();
  const { data: session } = authClient.useSession();
  const product = useQuery({
    ...trpc.catalog.detail.queryOptions({ productId: resolvedProductId ?? "missing" }),
    enabled: !!resolvedProductId,
  });
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    setIsFavorite(product.data?.isFavorite ?? false);
  }, [product.data?.isFavorite]);

  const toggleFavorite = useMutation(
    trpc.favorites.toggle.mutationOptions({
      async onSuccess(result) {
        setIsFavorite(result.isFavorite);
        toast.show({ variant: "success", label: result.isFavorite ? labels.favoriteAdded : labels.favoriteRemoved });
        await queryClient.invalidateQueries();
      },
      onError() {
        setIsFavorite(product.data?.isFavorite ?? false);
        toast.show({ variant: "danger", label: labels.favoriteFailed });
      },
    }),
  );

  function handleFavoritePress() {
    if (!product.data) return;

    if (!session?.user) {
      toast.show({ variant: "danger", label: labels.loginRequired });
      router.push("/profile");
      return;
    }

    setIsFavorite((current) => !current);
    toggleFavorite.mutate({ productId: product.data.id });
  }

  function handleAddToCartPress() {
    if (!product.data) return;

    if (product.data.isOutOfStock) {
      toast.show({ variant: "danger", label: labels.outOfStock });
      return;
    }

    toast.show({ variant: "success", label: labels.cartQueued });
  }

  return (
    <Container className="p-6">
      <View style={{ gap: 18 }}>
        <RestartRtlBanner />

        {product.isLoading ? (
          <View style={{ alignItems: "center", gap: 10, padding: 24 }}>
            <Spinner size="sm" color="default" />
            <Text selectable style={{ color: isDark ? "#CBD5E1" : joumlaColors.slate }}>
              {labels.loading}
            </Text>
          </View>
        ) : null}

        {product.error ? (
          <Text selectable style={{ color: joumlaColors.pink, textAlign: isRtl ? "right" : "left" }}>
            {labels.error}
          </Text>
        ) : null}

        {product.data ? (
          <View style={{ gap: 18 }}>
            <View
              style={{
                borderRadius: 32,
                overflow: "hidden",
                backgroundColor: isDark ? joumlaColors.navySoft : joumlaColors.cream,
                aspectRatio: 1,
              }}
            >
              {product.data.image?.url ? (
                <Image source={{ uri: product.data.image.url }} contentFit="cover" style={{ width: "100%", height: "100%" }} />
              ) : (
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                  <JoumlaSymbol size={120} />
                </View>
              )}
              {product.data.badgeLabel ? (
                <View
                  style={{
                    position: "absolute",
                    top: 16,
                    left: isRtl ? undefined : 16,
                    right: isRtl ? 16 : undefined,
                    borderRadius: 999,
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    backgroundColor: product.data.badgeColor || joumlaColors.pink,
                  }}
                >
                  <Text selectable style={{ color: "#FFFFFF", fontWeight: "900" }}>
                    {product.data.badgeLabel}
                  </Text>
                </View>
              ) : null}
              <Pressable
                onPress={handleFavoritePress}
                disabled={toggleFavorite.isPending}
                style={{
                  position: "absolute",
                  top: 16,
                  right: isRtl ? undefined : 16,
                  left: isRtl ? 16 : undefined,
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: "rgba(255,255,255,0.94)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name={isFavorite ? "heart" : "heart-outline"} size={24} color={joumlaColors.pink} />
              </Pressable>
            </View>

            <View style={{ gap: 14, alignItems: isRtl ? "flex-end" : "flex-start" }}>
              <Text selectable style={{ color: isDark ? "#F8FAFC" : joumlaColors.navy, fontSize: 30, fontWeight: "900", textAlign: isRtl ? "right" : "left" }}>
                {getLocalizedName(language, product.data)}
              </Text>
              {product.data.brand ? (
                <Text selectable style={{ color: isDark ? "#CBD5E1" : joumlaColors.slate, fontWeight: "800" }}>
                  {labels.brand}: {product.data.brand.name}
                </Text>
              ) : null}
            </View>

            <View
              style={{
                backgroundColor: isDark ? joumlaColors.darkCard : "#FFFFFF",
                borderRadius: 28,
                borderWidth: 1,
                borderColor: isDark ? "#27334A" : joumlaColors.line,
                padding: 18,
                gap: 12,
              }}
            >
              {[
                { label: labels.lotPrice, value: formatDa(product.data.discountLotPrice || product.data.lotPrice), highlight: true },
                { label: labels.unitPrice, value: formatDa(product.data.unitPrice) },
                { label: labels.packaging, value: `${product.data.lotQuantity} ${product.data.packagingLabel}` },
              ].map((row) => (
                <View key={row.label} style={{ flexDirection: isRtl ? "row-reverse" : "row", justifyContent: "space-between", gap: 14 }}>
                  <Text selectable style={{ color: isDark ? "#CBD5E1" : joumlaColors.slate, fontWeight: "700" }}>
                    {row.label}
                  </Text>
                  <Text selectable style={{ color: row.highlight ? joumlaColors.pink : isDark ? "#F8FAFC" : joumlaColors.navy, fontWeight: "900" }}>
                    {row.value}
                  </Text>
                </View>
              ))}
              {product.data.discountLotPrice ? (
                <Text selectable style={{ color: joumlaColors.slate, textDecorationLine: "line-through", textAlign: isRtl ? "right" : "left" }}>
                  {formatDa(product.data.lotPrice)}
                </Text>
              ) : null}
            </View>

            {product.data.categories.length > 0 ? (
              <View style={{ gap: 10, alignItems: isRtl ? "flex-end" : "flex-start" }}>
                <Text selectable style={{ color: isDark ? "#F8FAFC" : joumlaColors.navy, fontSize: 18, fontWeight: "900" }}>
                  {labels.categories}
                </Text>
                <View style={{ flexDirection: isRtl ? "row-reverse" : "row", flexWrap: "wrap", gap: 8 }}>
                  {product.data.categories.map((category) => (
                    <View key={category.id} style={{ borderRadius: 999, backgroundColor: isDark ? joumlaColors.navySoft : joumlaColors.cream, paddingHorizontal: 12, paddingVertical: 7 }}>
                      <Text selectable style={{ color: isDark ? "#F8FAFC" : joumlaColors.navy, fontWeight: "800" }}>
                        {getLocalizedName(language, category)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            <View style={{ gap: 8, alignItems: isRtl ? "flex-end" : "flex-start" }}>
              <Text selectable style={{ color: isDark ? "#F8FAFC" : joumlaColors.navy, fontSize: 18, fontWeight: "900" }}>
                {labels.description}
              </Text>
              <Text selectable style={{ color: isDark ? "#CBD5E1" : joumlaColors.slate, lineHeight: 22, textAlign: isRtl ? "right" : "left" }}>
                {product.data.description || labels.noDescription}
              </Text>
            </View>

            <Button onPress={handleAddToCartPress} isDisabled={product.data.isOutOfStock}>
              <Button.Label>{product.data.isOutOfStock ? labels.outOfStock : labels.addToCart}</Button.Label>
            </Button>
          </View>
        ) : null}
      </View>
    </Container>
  );
}
