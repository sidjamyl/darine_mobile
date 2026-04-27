import { Ionicons } from "@expo/vector-icons";
import { TextInput, View, Text } from "react-native";

import { Container } from "@/components/container";
import { RestartRtlBanner } from "@/components/restart-rtl-banner";
import { useAppTheme } from "@/contexts/app-theme-context";
import { joumlaColors } from "@/lib/app-shell";

export default function SearchScreen() {
  const { t, isDark, isRtl } = useAppTheme();

  return (
    <Container className="p-6">
      <View style={{ gap: 18 }}>
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
              placeholder={t("search")}
              placeholderTextColor={joumlaColors.slate}
              style={{
                flex: 1,
                color: isDark ? "#F8FAFC" : joumlaColors.navy,
                textAlign: isRtl ? "right" : "left",
              }}
            />
          </View>
          <Text selectable style={{ color: isDark ? "#CBD5E1" : joumlaColors.slate, fontSize: 15, lineHeight: 22 }}>
            {t("searchHint")}
          </Text>
        </View>
      </View>
    </Container>
  );
}
