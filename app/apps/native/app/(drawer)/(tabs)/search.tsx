import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Spinner } from "heroui-native";
import { useDeferredValue, useState } from "react";
import { Text, TextInput, View } from "react-native";

import { CatalogFilterChips } from "@/components/catalog/catalog-filter-chips";
import { CatalogProductGrid } from "@/components/catalog/catalog-product-grid";
import { Container } from "@/components/container";
import { RestartRtlBanner } from "@/components/restart-rtl-banner";
import { useAppTheme } from "@/contexts/app-theme-context";
import { joumlaColors } from "@/lib/app-shell";
import { trpc } from "@/utils/trpc";

const copy = {
  fr: {
    placeholder: "Rechercher un produit, marque ou categorie",
    emptyTitle: "Aucun resultat",
    emptyBody: "Essayez un autre mot-cle ou retirez un filtre.",
    loading: "Recherche en cours...",
    error: "Impossible d'effectuer la recherche.",
  },
  ar: {
    placeholder: "ابحث عن منتج، علامة او صنف",
    emptyTitle: "لا توجد نتائج",
    emptyBody: "جرب كلمة اخرى او احذف احد الفلاتر.",
    loading: "جاري البحث...",
    error: "تعذر تنفيذ البحث.",
  },
};

export default function SearchScreen() {
  const { language, isDark, isRtl } = useAppTheme();
  const labels = copy[language];
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim());
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const filterOptions = useQuery(trpc.catalog.filterOptions.queryOptions());
  const products = useQuery(
    trpc.catalog.list.queryOptions({
      query: deferredQuery.length > 0 ? deferredQuery : undefined,
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
          borderRadius: 26,
          padding: 18,
          borderWidth: 1,
          borderColor: isDark ? "#27334A" : joumlaColors.line,
          gap: 14,
        }}
      >
        <View
          style={{
            flexDirection: isRtl ? "row-reverse" : "row",
            alignItems: "center",
            gap: 10,
            borderRadius: 18,
            backgroundColor: isDark ? joumlaColors.navySoft : joumlaColors.cream,
            paddingHorizontal: 14,
            paddingVertical: 12,
          }}
        >
          <Ionicons name="search-outline" size={20} color={joumlaColors.pink} />
          <TextInput
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder={labels.placeholder}
            placeholderTextColor={joumlaColors.slate}
            returnKeyType="search"
            style={{
              flex: 1,
              color: isDark ? "#F8FAFC" : joumlaColors.navy,
              textAlign: isRtl ? "right" : "left",
            }}
          />
        </View>
        <Text selectable style={{ color: isDark ? "#CBD5E1" : joumlaColors.slate, fontSize: 15, lineHeight: 22, textAlign: isRtl ? "right" : "left" }}>
          {labels.placeholder}
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
