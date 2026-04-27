import { Pressable, Text, View } from "react-native";

import { Container } from "@/components/container";
import { RestartRtlBanner } from "@/components/restart-rtl-banner";
import { useAppTheme } from "@/contexts/app-theme-context";
import { joumlaColors, type AppLanguage, type ThemeMode } from "@/lib/app-shell";

function PreferenceOption({
  active,
  label,
  onPress,
  dark,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
  dark: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        borderRadius: 18,
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: active ? joumlaColors.pink : dark ? joumlaColors.darkSurface : joumlaColors.cream,
      }}
    >
      <Text selectable style={{ color: active ? "#FFFFFF" : dark ? "#F8FAFC" : joumlaColors.navy, fontWeight: "700" }}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function LanguageScreen() {
  const { t, language, setLanguage, themeMode, setTheme, isDark, isRtl } = useAppTheme();

  return (
    <Container className="p-6">
      <View style={{ gap: 18 }}>
        <RestartRtlBanner />

        <View
          style={{
            backgroundColor: isDark ? joumlaColors.darkCard : "#FFFFFF",
            borderRadius: 28,
            borderWidth: 1,
            borderColor: isDark ? "#27334A" : joumlaColors.line,
            padding: 20,
            gap: 16,
          }}
        >
          <Text selectable style={{ color: isDark ? "#F8FAFC" : joumlaColors.navy, fontSize: 22, fontWeight: "700", textAlign: isRtl ? "right" : "left" }}>
            {t("languageSectionTitle")}
          </Text>
          <View style={{ flexDirection: isRtl ? "row-reverse" : "row", gap: 12 }}>
            {([
              ["fr", "Francais"],
              ["ar", "العربية"],
            ] as Array<[AppLanguage, string]>).map(([value, label]) => (
              <View key={value} style={{ flex: 1 }}>
                <PreferenceOption active={language === value} label={label} onPress={() => setLanguage(value)} dark={isDark} />
              </View>
            ))}
          </View>
        </View>

        <View
          style={{
            backgroundColor: isDark ? joumlaColors.darkCard : "#FFFFFF",
            borderRadius: 28,
            borderWidth: 1,
            borderColor: isDark ? "#27334A" : joumlaColors.line,
            padding: 20,
            gap: 16,
          }}
        >
          <Text selectable style={{ color: isDark ? "#F8FAFC" : joumlaColors.navy, fontSize: 22, fontWeight: "700", textAlign: isRtl ? "right" : "left" }}>
            {t("themeSectionTitle")}
          </Text>
          <View style={{ gap: 12 }}>
            {([
              ["system", t("systemTheme")],
              ["light", t("lightTheme")],
              ["dark", t("darkTheme")],
            ] as Array<[ThemeMode, string]>).map(([value, label]) => (
              <PreferenceOption key={value} active={themeMode === value} label={label} onPress={() => setTheme(value)} dark={isDark} />
            ))}
          </View>
        </View>
      </View>
    </Container>
  );
}
