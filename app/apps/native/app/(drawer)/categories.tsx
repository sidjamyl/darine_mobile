import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Spinner } from "heroui-native";
import { Pressable, Text, View } from "react-native";

import { getLocalizedName } from "@/components/catalog/catalog-format";
import { Container } from "@/components/container";
import { RestartRtlBanner } from "@/components/restart-rtl-banner";
import { useAppTheme } from "@/contexts/app-theme-context";
import { joumlaColors } from "@/lib/app-shell";
import { trpc } from "@/utils/trpc";

const copy = {
  fr: {
    title: "Toutes les categories",
    body: "Filtrez rapidement le catalogue par famille de produits.",
    loading: "Chargement des categories...",
    empty: "Aucune categorie active pour le moment.",
  },
  ar: {
    title: "كل الاصناف",
    body: "صف الكتالوج بسرعة حسب عائلة المنتجات.",
    loading: "جاري تحميل الاصناف...",
    empty: "لا توجد اصناف نشطة حاليا.",
  },
};

export default function CategoriesScreen() {
  const { language, isDark, isRtl } = useAppTheme();
  const labels = copy[language];
  const filterOptions = useQuery(trpc.catalog.filterOptions.queryOptions());

  return (
    <Container className="p-6">
      <View style={{ gap: 18 }}>
        <RestartRtlBanner />
        <View style={{ gap: 8, alignItems: isRtl ? "flex-end" : "flex-start" }}>
          <Text selectable style={{ color: isDark ? "#F8FAFC" : joumlaColors.navy, fontSize: 28, fontWeight: "900" }}>
            {labels.title}
          </Text>
          <Text selectable style={{ color: isDark ? "#CBD5E1" : joumlaColors.slate, lineHeight: 21, textAlign: isRtl ? "right" : "left" }}>
            {labels.body}
          </Text>
        </View>
        {filterOptions.isLoading ? (
          <View style={{ flexDirection: isRtl ? "row-reverse" : "row", gap: 10, alignItems: "center" }}>
            <Spinner size="sm" color="default" />
            <Text selectable style={{ color: isDark ? "#CBD5E1" : joumlaColors.slate }}>
              {labels.loading}
            </Text>
          </View>
        ) : null}
        {filterOptions.data?.categories.length === 0 ? (
          <Text selectable style={{ color: isDark ? "#CBD5E1" : joumlaColors.slate, textAlign: isRtl ? "right" : "left" }}>
            {labels.empty}
          </Text>
        ) : null}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          {(filterOptions.data?.categories ?? []).map((category) => (
            <Pressable
              key={category.id}
              onPress={() => router.push({ pathname: "/products", params: { categoryId: category.id } })}
              style={{
                width: "48%",
                minHeight: 122,
                backgroundColor: isDark ? joumlaColors.darkCard : "#FFFFFF",
                borderRadius: 24,
                borderWidth: 1,
                borderColor: isDark ? "#27334A" : joumlaColors.line,
                padding: 16,
                justifyContent: "space-between",
                gap: 14,
              }}
            >
              <View
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 18,
                  backgroundColor: isDark ? joumlaColors.navySoft : joumlaColors.cream,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="layers-outline" size={22} color={joumlaColors.pink} />
              </View>
              <Text selectable numberOfLines={2} style={{ color: isDark ? "#F8FAFC" : joumlaColors.navy, fontSize: 16, fontWeight: "900", textAlign: isRtl ? "right" : "left" }}>
                {getLocalizedName(language, category)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </Container>
  );
}
