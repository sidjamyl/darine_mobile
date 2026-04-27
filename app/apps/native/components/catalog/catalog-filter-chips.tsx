import { Pressable, ScrollView, Text, View } from "react-native";

import { getLocalizedName } from "@/components/catalog/catalog-format";
import { useAppTheme } from "@/contexts/app-theme-context";
import { joumlaColors } from "@/lib/app-shell";
import type { RouterOutputs } from "@/utils/trpc";

type FilterOptions = RouterOutputs["catalog"]["filterOptions"];

type CatalogFilterChipsProps = {
  options?: FilterOptions;
  selectedBrandId: string | null;
  selectedCategoryId: string | null;
  onBrandChange: (brandId: string | null) => void;
  onCategoryChange: (categoryId: string | null) => void;
};

const copy = {
  fr: {
    allBrands: "Toutes les marques",
    allCategories: "Toutes les categories",
  },
  ar: {
    allBrands: "كل العلامات",
    allCategories: "كل الاصناف",
  },
};

function FilterChip({ label, isActive, onPress }: { label: string; isActive: boolean; onPress: () => void }) {
  const { isDark } = useAppTheme();

  return (
    <Pressable
      onPress={onPress}
      style={{
        borderRadius: 999,
        paddingHorizontal: 14,
        paddingVertical: 9,
        backgroundColor: isActive ? joumlaColors.pink : isDark ? joumlaColors.darkCard : "#FFFFFF",
        borderWidth: 1,
        borderColor: isActive ? joumlaColors.pink : isDark ? "#27334A" : joumlaColors.line,
      }}
    >
      <Text selectable style={{ color: isActive ? "#FFFFFF" : isDark ? "#F8FAFC" : joumlaColors.navy, fontWeight: "800" }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function CatalogFilterChips({
  options,
  selectedBrandId,
  selectedCategoryId,
  onBrandChange,
  onCategoryChange,
}: CatalogFilterChipsProps) {
  const { language } = useAppTheme();
  const labels = copy[language];

  return (
    <View style={{ gap: 10 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <FilterChip label={labels.allBrands} isActive={!selectedBrandId} onPress={() => onBrandChange(null)} />
        {(options?.brands ?? []).map((brand) => (
          <FilterChip key={brand.id} label={brand.name} isActive={selectedBrandId === brand.id} onPress={() => onBrandChange(brand.id)} />
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <FilterChip label={labels.allCategories} isActive={!selectedCategoryId} onPress={() => onCategoryChange(null)} />
        {(options?.categories ?? []).map((category) => (
          <FilterChip
            key={category.id}
            label={getLocalizedName(language, category)}
            isActive={selectedCategoryId === category.id}
            onPress={() => onCategoryChange(category.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
}
