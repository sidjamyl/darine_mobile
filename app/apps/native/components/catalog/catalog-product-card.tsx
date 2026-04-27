import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useToast } from "heroui-native";
import { useEffect, useState } from "react";
import { Pressable, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { getLocalizedName, formatDa } from "@/components/catalog/catalog-format";
import { JoumlaSymbol } from "@/components/joumla-symbol";
import { useAppTheme } from "@/contexts/app-theme-context";
import { authClient } from "@/lib/auth-client";
import { joumlaColors } from "@/lib/app-shell";
import { queryClient, trpc } from "@/utils/trpc";

export type CatalogProductSummary = {
  id: string;
  nameFr: string;
  nameAr: string;
  unitPrice: string;
  lotPrice: string;
  lotQuantity: number;
  packagingLabel: string;
  stockLots: number;
  isOutOfStock: boolean;
  description?: string | null;
  badgeLabel?: string | null;
  badgeColor?: string | null;
  discountLotPrice?: string | null;
  isFavorite?: boolean;
  image?: { url: string } | null;
  brand?: { id: string; name: string; logo?: { url: string } | null } | null;
  categories?: Array<{ id: string; nameFr: string; nameAr: string }>;
};

type CatalogProductCardProps = {
  product: CatalogProductSummary;
  style?: StyleProp<ViewStyle>;
};

const copy = {
  fr: {
    addToCart: "Ajouter au panier",
    cartQueued: "Produit selectionne. Le panier sera finalise dans l'etape checkout.",
    favoriteAdded: "Produit ajoute aux favoris.",
    favoriteRemoved: "Produit retire des favoris.",
    favoriteFailed: "Impossible de mettre a jour les favoris.",
    loginRequired: "Connectez-vous pour utiliser les favoris.",
    lot: "Lot",
    unit: "Unite",
    stockOut: "Rupture",
    stockLots: "lots",
  },
  ar: {
    addToCart: "اضافة الى السلة",
    cartQueued: "تم اختيار المنتج. سيتم اكمال السلة في مرحلة الدفع.",
    favoriteAdded: "تمت اضافة المنتج الى المفضلة.",
    favoriteRemoved: "تم حذف المنتج من المفضلة.",
    favoriteFailed: "تعذر تحديث المفضلة.",
    loginRequired: "سجل الدخول لاستخدام المفضلة.",
    lot: "الحزمة",
    unit: "الوحدة",
    stockOut: "غير متوفر",
    stockLots: "حزم",
  },
};

export function CatalogProductCard({ product, style }: CatalogProductCardProps) {
  const { language, isDark, isRtl } = useAppTheme();
  const labels = copy[language];
  const { toast } = useToast();
  const { data: session } = authClient.useSession();
  const [isFavorite, setIsFavorite] = useState(product.isFavorite ?? false);
  const displayLotPrice = product.discountLotPrice || product.lotPrice;

  useEffect(() => {
    setIsFavorite(product.isFavorite ?? false);
  }, [product.isFavorite]);

  const toggleFavorite = useMutation(
    trpc.favorites.toggle.mutationOptions({
      async onSuccess(result) {
        setIsFavorite(result.isFavorite);
        toast.show({ variant: "success", label: result.isFavorite ? labels.favoriteAdded : labels.favoriteRemoved });
        await queryClient.invalidateQueries();
      },
      onError() {
        setIsFavorite(product.isFavorite ?? false);
        toast.show({ variant: "danger", label: labels.favoriteFailed });
      },
    }),
  );

  function openDetail() {
    router.push({ pathname: "/product/[productId]", params: { productId: product.id } });
  }

  function handleFavoritePress() {
    if (!session?.user) {
      toast.show({ variant: "danger", label: labels.loginRequired });
      router.push("/profile");
      return;
    }

    setIsFavorite((current) => !current);
    toggleFavorite.mutate({ productId: product.id });
  }

  function handleAddToCartPress() {
    if (product.isOutOfStock) {
      toast.show({ variant: "danger", label: labels.stockOut });
      return;
    }

    toast.show({ variant: "success", label: labels.cartQueued });
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={openDetail}
      style={[
        {
          flex: 1,
          opacity: product.isOutOfStock ? 0.62 : 1,
          backgroundColor: isDark ? joumlaColors.darkCard : "#FFFFFF",
          borderRadius: 24,
          borderWidth: 1,
          borderColor: isDark ? "#27334A" : joumlaColors.line,
          overflow: "hidden",
        },
        style,
      ]}
    >
      <View style={{ backgroundColor: isDark ? joumlaColors.navySoft : joumlaColors.cream, aspectRatio: 1.05 }}>
        {product.image?.url ? (
          <Image source={{ uri: product.image.url }} contentFit="cover" style={{ width: "100%", height: "100%" }} />
        ) : (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <JoumlaSymbol size={58} />
          </View>
        )}

        {product.badgeLabel ? (
          <View
            style={{
              position: "absolute",
              top: 10,
              left: isRtl ? undefined : 10,
              right: isRtl ? 10 : undefined,
              borderRadius: 999,
              paddingHorizontal: 10,
              paddingVertical: 5,
              backgroundColor: product.badgeColor || joumlaColors.pink,
            }}
          >
            <Text selectable style={{ color: "#FFFFFF", fontSize: 11, fontWeight: "800" }}>
              {product.badgeLabel}
            </Text>
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Toggle favorite"
          onPress={handleFavoritePress}
          disabled={toggleFavorite.isPending}
          style={{
            position: "absolute",
            top: 10,
            right: isRtl ? undefined : 10,
            left: isRtl ? 10 : undefined,
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: "rgba(255,255,255,0.94)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name={isFavorite ? "heart" : "heart-outline"} size={19} color={joumlaColors.pink} />
        </Pressable>
      </View>

      <View style={{ padding: 12, gap: 8, alignItems: isRtl ? "flex-end" : "flex-start" }}>
        <Text
          selectable
          numberOfLines={2}
          style={{
            minHeight: 38,
            color: isDark ? "#F8FAFC" : joumlaColors.navy,
            fontSize: 14,
            fontWeight: "800",
            lineHeight: 19,
            textAlign: isRtl ? "right" : "left",
          }}
        >
          {getLocalizedName(language, product)}
        </Text>

        <View style={{ width: "100%", gap: 3, alignItems: isRtl ? "flex-end" : "flex-start" }}>
          <Text selectable style={{ color: joumlaColors.pink, fontSize: 16, fontWeight: "900" }}>
            {formatDa(displayLotPrice)}
          </Text>
          {product.discountLotPrice ? (
            <Text selectable style={{ color: joumlaColors.slate, fontSize: 12, textDecorationLine: "line-through" }}>
              {formatDa(product.lotPrice)}
            </Text>
          ) : null}
          <Text selectable style={{ color: isDark ? "#CBD5E1" : joumlaColors.slate, fontSize: 12 }}>
            {labels.unit}: {formatDa(product.unitPrice)}
          </Text>
        </View>

        <View style={{ width: "100%", flexDirection: isRtl ? "row-reverse" : "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <Text selectable numberOfLines={2} style={{ flex: 1, color: isDark ? "#CBD5E1" : joumlaColors.slate, fontSize: 12, textAlign: isRtl ? "right" : "left" }}>
            {labels.lot}: {product.lotQuantity} {product.packagingLabel}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={labels.addToCart}
            disabled={product.isOutOfStock}
            onPress={handleAddToCartPress}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: product.isOutOfStock ? joumlaColors.line : joumlaColors.navy,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name={product.isOutOfStock ? "ban-outline" : "cart-outline"} size={18} color="#FFFFFF" />
          </Pressable>
        </View>

        <Text selectable style={{ color: product.isOutOfStock ? joumlaColors.pink : isDark ? "#94A3B8" : joumlaColors.slate, fontSize: 11 }}>
          {product.isOutOfStock ? labels.stockOut : `${product.stockLots} ${labels.stockLots}`}
        </Text>
      </View>
    </Pressable>
  );
}
