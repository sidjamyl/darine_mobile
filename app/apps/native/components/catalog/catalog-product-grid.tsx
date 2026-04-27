import type React from "react";
import { FlatList, Text, View, type ListRenderItemInfo } from "react-native";

import { CatalogProductCard, type CatalogProductSummary } from "@/components/catalog/catalog-product-card";
import { useAppTheme } from "@/contexts/app-theme-context";
import { joumlaColors } from "@/lib/app-shell";

type CatalogProductGridProps = {
  products: CatalogProductSummary[];
  header?: React.ReactElement;
  emptyTitle: string;
  emptyBody: string;
};

export function CatalogProductGrid({ products, header, emptyTitle, emptyBody }: CatalogProductGridProps) {
  const { isDark, isRtl } = useAppTheme();

  function renderItem({ item, index }: ListRenderItemInfo<CatalogProductSummary>) {
    const isOddTail = products.length % 2 === 1 && index === products.length - 1;

    return (
      <View style={{ flex: 1, maxWidth: isOddTail ? "50%" : undefined }}>
        <CatalogProductCard product={item} />
      </View>
    );
  }

  return (
    <FlatList
      data={products}
      keyExtractor={(item) => item.id}
      numColumns={2}
      renderItem={renderItem}
      ListHeaderComponent={header}
      ListEmptyComponent={
        <View
          style={{
            marginTop: 16,
            backgroundColor: isDark ? joumlaColors.darkCard : "#FFFFFF",
            borderRadius: 24,
            borderWidth: 1,
            borderColor: isDark ? "#27334A" : joumlaColors.line,
            padding: 20,
            gap: 8,
            alignItems: isRtl ? "flex-end" : "flex-start",
          }}
        >
          <Text selectable style={{ color: isDark ? "#F8FAFC" : joumlaColors.navy, fontSize: 20, fontWeight: "800" }}>
            {emptyTitle}
          </Text>
          <Text selectable style={{ color: isDark ? "#CBD5E1" : joumlaColors.slate, lineHeight: 21, textAlign: isRtl ? "right" : "left" }}>
            {emptyBody}
          </Text>
        </View>
      }
      columnWrapperStyle={{ gap: 12 }}
      contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 28 }}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    />
  );
}
