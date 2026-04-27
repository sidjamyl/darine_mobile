import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Spinner } from "heroui-native";
import { Pressable, Text, View } from "react-native";

import { Container } from "@/components/container";
import { JoumlaSymbol } from "@/components/joumla-symbol";
import { RestartRtlBanner } from "@/components/restart-rtl-banner";
import { useAppTheme } from "@/contexts/app-theme-context";
import { joumlaColors } from "@/lib/app-shell";
import { trpc } from "@/utils/trpc";

const copy = {
  fr: {
    title: "Toutes les marques",
    body: "Choisissez une marque pour voir ses lots disponibles.",
    loading: "Chargement des marques...",
    empty: "Aucune marque active pour le moment.",
  },
  ar: {
    title: "كل العلامات",
    body: "اختر علامة لعرض الحزم المتوفرة.",
    loading: "جاري تحميل العلامات...",
    empty: "لا توجد علامات نشطة حاليا.",
  },
};

export default function BrandsScreen() {
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
        {filterOptions.data?.brands.length === 0 ? (
          <Text selectable style={{ color: isDark ? "#CBD5E1" : joumlaColors.slate, textAlign: isRtl ? "right" : "left" }}>
            {labels.empty}
          </Text>
        ) : null}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          {(filterOptions.data?.brands ?? []).map((brand) => (
            <Pressable
              key={brand.id}
              onPress={() => router.push({ pathname: "/products", params: { brandId: brand.id } })}
              style={{
                width: "48%",
                backgroundColor: isDark ? joumlaColors.darkCard : "#FFFFFF",
                borderRadius: 24,
                borderWidth: 1,
                borderColor: isDark ? "#27334A" : joumlaColors.line,
                padding: 14,
                gap: 12,
              }}
            >
              <View
                style={{
                  aspectRatio: 1,
                  borderRadius: 18,
                  overflow: "hidden",
                  backgroundColor: isDark ? joumlaColors.navySoft : joumlaColors.cream,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {brand.logo?.url ? <Image source={{ uri: brand.logo.url }} contentFit="cover" style={{ width: "100%", height: "100%" }} /> : <JoumlaSymbol size={54} />}
              </View>
              <View style={{ flexDirection: isRtl ? "row-reverse" : "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="pricetag-outline" size={16} color={joumlaColors.pink} />
                <Text selectable numberOfLines={2} style={{ flex: 1, color: isDark ? "#F8FAFC" : joumlaColors.navy, fontWeight: "900", textAlign: isRtl ? "right" : "left" }}>
                  {brand.name}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>
    </Container>
  );
}
