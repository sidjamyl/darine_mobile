import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Chip, Spinner } from "heroui-native";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";

import { CatalogProductCard } from "@/components/catalog/catalog-product-card";
import { getLocalizedName } from "@/components/catalog/catalog-format";
import { Container } from "@/components/container";
import { JoumlaSymbol } from "@/components/joumla-symbol";
import { RestartRtlBanner } from "@/components/restart-rtl-banner";
import { useAppTheme } from "@/contexts/app-theme-context";
import { joumlaColors } from "@/lib/app-shell";
import { trpc, type RouterOutputs } from "@/utils/trpc";

type HomeContent = RouterOutputs["homeContent"]["get"];

const copy = {
  fr: {
    banners: "Offres Joumla",
    brands: "Top marques",
    categories: "Top categories",
    featuredProducts: "Produits en avant",
    showMore: "Afficher plus",
    loading: "Chargement du catalogue...",
    error: "Impossible de charger l'accueil catalogue.",
  },
  ar: {
    banners: "عروض Joumla",
    brands: "ابرز العلامات",
    categories: "ابرز الاصناف",
    featuredProducts: "منتجات مختارة",
    showMore: "عرض المزيد",
    loading: "جاري تحميل الكتالوج...",
    error: "تعذر تحميل واجهة الكتالوج.",
  },
};

function Dots({ count, activeIndex }: { count: number; activeIndex: number }) {
  if (count < 2) return null;

  return (
    <View style={{ flexDirection: "row", justifyContent: "center", gap: 6 }}>
      {Array.from({ length: count }).map((_, index) => (
        <View
          key={index}
          style={{
            width: index === activeIndex ? 18 : 7,
            height: 7,
            borderRadius: 999,
            backgroundColor: index === activeIndex ? joumlaColors.pink : "#CBD5E1",
          }}
        />
      ))}
    </View>
  );
}

function SectionHeader({ title, action }: { title: string; action?: () => void }) {
  const { isRtl, isDark, language } = useAppTheme();
  const labels = copy[language];

  return (
    <View style={{ flexDirection: isRtl ? "row-reverse" : "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <Text selectable style={{ color: isDark ? "#F8FAFC" : joumlaColors.navy, fontSize: 22, fontWeight: "900" }}>
        {title}
      </Text>
      {action ? (
        <Pressable onPress={action} style={{ paddingVertical: 8 }}>
          <Text selectable style={{ color: joumlaColors.pink, fontWeight: "900" }}>
            {labels.showMore}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function BannerCarousel({ banners }: { banners: HomeContent["banners"] }) {
  const { width } = useWindowDimensions();
  const { isDark } = useAppTheme();
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const itemWidth = Math.max(280, width - 48);

  useEffect(() => {
    if (banners.length < 2) return;

    const timer = setInterval(() => {
      setActiveIndex((current) => {
        const next = (current + 1) % banners.length;
        scrollRef.current?.scrollTo({ x: next * itemWidth, animated: true });
        return next;
      });
    }, 4200);

    return () => clearInterval(timer);
  }, [banners.length, itemWidth]);

  if (banners.length === 0) return null;

  return (
    <View style={{ gap: 10 }}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={(event) => setActiveIndex(Math.round(event.nativeEvent.contentOffset.x / itemWidth))}
        scrollEventThrottle={16}
      >
        {banners.map((banner) => (
          <View key={banner.id} style={{ width: itemWidth, paddingRight: 10 }}>
            <View
              style={{
                aspectRatio: 16 / 9,
                borderRadius: 28,
                overflow: "hidden",
                backgroundColor: isDark ? joumlaColors.navySoft : joumlaColors.cream,
              }}
            >
              {banner.image?.url ? (
                <Image source={{ uri: banner.image.url }} contentFit="cover" style={{ width: "100%", height: "100%" }} />
              ) : (
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                  <JoumlaSymbol size={86} />
                </View>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
      <Dots count={banners.length} activeIndex={activeIndex} />
    </View>
  );
}

function HomeTile({
  title,
  imageUrl,
  onPress,
}: {
  title: string;
  imageUrl?: string | null;
  onPress: () => void;
}) {
  const { isDark } = useAppTheme();

  return (
    <Pressable
      onPress={onPress}
      style={{
        width: 126,
        backgroundColor: isDark ? joumlaColors.darkCard : "#FFFFFF",
        borderRadius: 24,
        borderWidth: 1,
        borderColor: isDark ? "#27334A" : joumlaColors.line,
        padding: 12,
        gap: 10,
      }}
    >
      <View
        style={{
          width: "100%",
          aspectRatio: 1,
          borderRadius: 18,
          overflow: "hidden",
          backgroundColor: isDark ? joumlaColors.navySoft : joumlaColors.cream,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {imageUrl ? <Image source={{ uri: imageUrl }} contentFit="cover" style={{ width: "100%", height: "100%" }} /> : <JoumlaSymbol size={46} />}
      </View>
      <Text selectable numberOfLines={2} style={{ color: isDark ? "#F8FAFC" : joumlaColors.navy, fontWeight: "800", textAlign: "center" }}>
        {title}
      </Text>
    </Pressable>
  );
}

function HorizontalTiles({ children, count }: { children: React.ReactNode; count: number }) {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <View style={{ gap: 10 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={138}
        decelerationRate="fast"
        onScroll={(event) => setActiveIndex(Math.min(count - 1, Math.round(event.nativeEvent.contentOffset.x / 138)))}
        scrollEventThrottle={16}
        contentContainerStyle={{ gap: 12, paddingRight: 6 }}
      >
        {children}
      </ScrollView>
      <Dots count={count} activeIndex={activeIndex} />
    </View>
  );
}

export default function Home() {
  const { t, language, isDark, isRtl } = useAppTheme();
  const labels = copy[language];
  const homeContent = useQuery(trpc.homeContent.get.queryOptions());

  return (
    <Container className="p-6">
      <View style={{ gap: 22 }}>
        <RestartRtlBanner />

        <View
          style={{
            backgroundColor: isDark ? joumlaColors.darkCard : joumlaColors.navy,
            borderRadius: 32,
            padding: 24,
            gap: 18,
          }}
        >
          <Chip size="sm" variant="secondary" color="primary">
            <Chip.Label>{t("shellBadge")}</Chip.Label>
          </Chip>
          <View style={{ flexDirection: isRtl ? "row-reverse" : "row", gap: 16, alignItems: "center" }}>
            <View
              style={{
                width: 78,
                height: 78,
                borderRadius: 26,
                backgroundColor: "rgba(255,255,255,0.92)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <JoumlaSymbol size={58} />
            </View>
            <View style={{ flex: 1, alignItems: isRtl ? "flex-end" : "flex-start" }}>
              <Text selectable style={{ color: "#FFFFFF", fontSize: 30, fontWeight: "800" }}>
                {t("appName")}
              </Text>
              <Text selectable style={{ color: "#E2E8F0", fontSize: 14, lineHeight: 20, marginTop: 6, textAlign: isRtl ? "right" : "left" }}>
                {t("appTagline")}
              </Text>
            </View>
          </View>
        </View>

        {homeContent.isLoading ? (
          <View style={{ alignItems: "center", gap: 10, padding: 24 }}>
            <Spinner size="sm" color="default" />
            <Text selectable style={{ color: isDark ? "#CBD5E1" : joumlaColors.slate }}>
              {labels.loading}
            </Text>
          </View>
        ) : null}

        {homeContent.error ? (
          <View style={{ backgroundColor: isDark ? joumlaColors.darkCard : "#FFFFFF", borderRadius: 24, padding: 18 }}>
            <Text selectable style={{ color: joumlaColors.pink, textAlign: isRtl ? "right" : "left" }}>
              {labels.error}
            </Text>
          </View>
        ) : null}

        {homeContent.data?.settings.showBanners && homeContent.data.banners.length > 0 ? (
          <View style={{ gap: 12 }}>
            <SectionHeader title={labels.banners} />
            <BannerCarousel banners={homeContent.data.banners} />
          </View>
        ) : null}

        {homeContent.data?.settings.showFeaturedBrands && homeContent.data.featuredBrands.length > 0 ? (
          <View style={{ gap: 12 }}>
            <SectionHeader title={labels.brands} action={() => router.push("/brands")} />
            <HorizontalTiles count={homeContent.data.featuredBrands.length}>
              {homeContent.data.featuredBrands.map((brand) => (
                <HomeTile
                  key={brand.id}
                  title={brand.name}
                  imageUrl={brand.logo?.url}
                  onPress={() => router.push({ pathname: "/products", params: { brandId: brand.id } })}
                />
              ))}
            </HorizontalTiles>
          </View>
        ) : null}

        {homeContent.data?.settings.showFeaturedCategories && homeContent.data.featuredCategories.length > 0 ? (
          <View style={{ gap: 12 }}>
            <SectionHeader title={labels.categories} action={() => router.push("/categories")} />
            <HorizontalTiles count={homeContent.data.featuredCategories.length}>
              {homeContent.data.featuredCategories.map((category) => (
                <HomeTile
                  key={category.id}
                  title={getLocalizedName(language, category)}
                  imageUrl={category.image?.url}
                  onPress={() => router.push({ pathname: "/products", params: { categoryId: category.id } })}
                />
              ))}
            </HorizontalTiles>
          </View>
        ) : null}

        {homeContent.data?.settings.showFeaturedProducts && homeContent.data.featuredProducts.length > 0 ? (
          <View style={{ gap: 12 }}>
            <SectionHeader title={labels.featuredProducts} action={() => router.push("/products")} />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              {homeContent.data.featuredProducts.map((product) => (
                <View key={product.id} style={{ width: "48%" }}>
                  <CatalogProductCard product={product} />
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View style={{ flexDirection: isRtl ? "row-reverse" : "row", gap: 12 }}>
          {([
            { icon: "grid-outline", label: t("products"), href: "/products" },
            { icon: "search-outline", label: t("search"), href: "/search" },
            { icon: "heart-outline", label: t("favorites"), href: "/favorites" },
          ] as const).map((item) => (
            <Pressable
              key={item.label}
              onPress={() => router.push(item.href)}
              style={{
                flex: 1,
                backgroundColor: isDark ? joumlaColors.darkCard : "#FFFFFF",
                borderRadius: 22,
                borderWidth: 1,
                borderColor: isDark ? "#27334A" : joumlaColors.line,
                padding: 16,
                gap: 10,
              }}
            >
              <Ionicons name={item.icon} size={22} color={joumlaColors.pink} />
              <Text selectable style={{ color: isDark ? "#F8FAFC" : joumlaColors.navy, fontSize: 15, fontWeight: "700" }}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </Container>
  );
}
