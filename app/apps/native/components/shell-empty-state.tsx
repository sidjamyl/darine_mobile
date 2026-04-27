import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { RestartRtlBanner } from "@/components/restart-rtl-banner";
import { useAppTheme } from "@/contexts/app-theme-context";
import { joumlaColors } from "@/lib/app-shell";

type ShellEmptyStateProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
};

export function ShellEmptyState({ icon, title, body }: ShellEmptyStateProps) {
  const { isDark } = useAppTheme();

  return (
    <View style={{ gap: 18 }}>
      <RestartRtlBanner />
      <View
        style={{
          backgroundColor: isDark ? joumlaColors.darkCard : "#FFFFFF",
          borderRadius: 28,
          padding: 24,
          gap: 18,
          borderWidth: 1,
          borderColor: isDark ? "#28324A" : joumlaColors.line,
        }}
      >
        <View
          style={{
            width: 58,
            height: 58,
            borderRadius: 29,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: isDark ? joumlaColors.navySoft : joumlaColors.cream,
          }}
        >
          <Ionicons name={icon} size={28} color={joumlaColors.pink} />
        </View>
        <View style={{ gap: 8 }}>
          <Text selectable style={{ color: isDark ? "#F8FAFC" : joumlaColors.navy, fontSize: 28, fontWeight: "700" }}>
            {title}
          </Text>
          <Text selectable style={{ color: isDark ? "#CBD5E1" : joumlaColors.slate, fontSize: 15, lineHeight: 22 }}>
            {body}
          </Text>
        </View>
      </View>
    </View>
  );
}
