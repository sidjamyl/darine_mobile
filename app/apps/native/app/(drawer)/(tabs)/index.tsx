import { Ionicons } from "@expo/vector-icons";
import { Chip } from "heroui-native";
import { Text, View } from "react-native";

import { Container } from "@/components/container";
import { JoumlaSymbol } from "@/components/joumla-symbol";
import { RestartRtlBanner } from "@/components/restart-rtl-banner";
import { useAppTheme } from "@/contexts/app-theme-context";
import { joumlaColors } from "@/lib/app-shell";

export default function Home() {
  const { t, isDark, isRtl } = useAppTheme();

  return (
    <Container className="p-6">
      <View style={{ gap: 18 }}>
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
              <Text selectable style={{ color: "#E2E8F0", fontSize: 14, lineHeight: 20, marginTop: 6 }}>
                {t("appTagline")}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ gap: 14 }}>
          <View
            style={{
              backgroundColor: isDark ? joumlaColors.darkCard : "#FFFFFF",
              borderRadius: 26,
              borderWidth: 1,
              borderColor: isDark ? "#27334A" : joumlaColors.line,
              padding: 20,
              gap: 12,
            }}
          >
            <View style={{ flexDirection: isRtl ? "row-reverse" : "row", alignItems: "center", gap: 12 }}>
              <Ionicons name="storefront-outline" size={24} color={joumlaColors.pink} />
              <Text selectable style={{ color: isDark ? "#F8FAFC" : joumlaColors.navy, fontSize: 22, fontWeight: "700" }}>
                {t("clientArea")}
              </Text>
            </View>
            <Text selectable style={{ color: isDark ? "#CBD5E1" : joumlaColors.slate, fontSize: 15, lineHeight: 22 }}>
              {t("shopWholesale")}
            </Text>
          </View>

          <View style={{ flexDirection: isRtl ? "row-reverse" : "row", gap: 12 }}>
            {[
              { icon: "grid-outline", label: t("products") },
              { icon: "search-outline", label: t("search") },
              { icon: "heart-outline", label: t("favorites") },
            ].map((item) => (
              <View
                key={item.label}
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
                <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={22} color={joumlaColors.pink} />
                <Text selectable style={{ color: isDark ? "#F8FAFC" : joumlaColors.navy, fontSize: 15, fontWeight: "700" }}>
                  {item.label}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </Container>
  );
}
