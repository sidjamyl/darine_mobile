import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { Spinner } from "heroui-native";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { CatalogFilterChips } from "@/components/catalog/catalog-filter-chips";
import { CatalogProductGrid } from "@/components/catalog/catalog-product-grid";
import { Container } from "@/components/container";
import { RestartRtlBanner } from "@/components/restart-rtl-banner";
import { useAppTheme } from "@/contexts/app-theme-context";
import { joumlaColors } from "@/lib/app-shell";
import { trpc } from "@/utils/trpc";

const copy = {
  fr: {
    title: "Catalogue Joumla",
    body: "Parcourez les lots disponibles par marque et categorie.",
    emptyTitle: "Aucun produit trouve",
    emptyBody: "Essayez une autre marque ou categorie.",
    loading: "Chargement des produits...",
    error: "Impossible de charger les produits.",
  },
  ar: {
    title: "كتالوج Joumla",
    body: "تصفح الحزم المتوفرة حسب العلامة والصنف.",
    emptyTitle: "لا توجد منتجات",
    emptyBody: "جرب علامة او صنفا اخر.",
    loading: "جاري تحميل المنتجات...",
    error: "تعذر تحميل المنتجات.",
  },
};

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function ProductsScreen() {
  const { language, isDark, isRtl } = useAppTheme();
  const labels = copy[language];
  const params = useLocalSearchParams<{ brandId?: string; categoryId?: string }>();
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(getParam(params.brandId) ?? null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(getParam(params.categoryId) ?? null);

  useEffect(() => {
    setSelectedBrandId(getParam(params.brandId) ?? null);
    setSelectedCategoryId(getParam(params.categoryId) ?? null);
  }, [params.brandId, params.categoryId]);

  const filterOptions = useQuery(trpc.catalog.filterOptions.queryOptions());
  const products = useQuery(
    trpc.catalog.list.queryOptions({
      brandIds: selectedBrandId ? [selectedBrandId] : undefined,
      categoryIds: selectedCategoryId ? [selectedCategoryId] : undefined,
      limit: 100,
    }),
  );

  const header = (
    <View style={{ gap: 16, marginBottom: 4 }}>
      <RestartRtlBanner />
      <View
        style={{
          backgroundColor: isDark ? joumlaColors.darkCard : "#FFFFFF",
          borderRadius: 28,
          borderWidth: 1,
          borderColor: isDark ? "#27334A" : joumlaColors.line,
          padding: 20,
          gap: 8,
          alignItems: isRtl ? "flex-end" : "flex-start",
        }}
      >
        <Text selectable style={{ color: isDark ? "#F8FAFC" : joumlaColors.navy, fontSize: 26, fontWeight: "900" }}>
          {labels.title}
        </Text>
        <Text selectable style={{ color: isDark ? "#CBD5E1" : joumlaColors.slate, lineHeight: 21, textAlign: isRtl ? "right" : "left" }}>
          {labels.body}
        </Text>
      </View>
      <CatalogFilterChips
        options={filterOptions.data}
        selectedBrandId={selectedBrandId}
        selectedCategoryId={selectedCategoryId}
        onBrandChange={setSelectedBrandId}
        onCategoryChange={setSelectedCategoryId}
      />
      {products.isLoading ? (
        <View style={{ flexDirection: isRtl ? "row-reverse" : "row", alignItems: "center", gap: 10 }}>
          <Spinner size="sm" color="default" />
          <Text selectable style={{ color: isDark ? "#CBD5E1" : joumlaColors.slate }}>
            {labels.loading}
          </Text>
        </View>
      ) : null}
      {products.error ? (
        <Text selectable style={{ color: joumlaColors.pink, textAlign: isRtl ? "right" : "left" }}>
          {labels.error}
        </Text>
      ) : null}
    </View>
  );

  return (
    <Container isScrollable={false}>
      <CatalogProductGrid products={products.data?.items ?? []} header={header} emptyTitle={labels.emptyTitle} emptyBody={labels.emptyBody} />
    </Container>
  );
}
