import { Text, View } from "react-native";

import { useAppTheme } from "@/contexts/app-theme-context";
import { joumlaColors } from "@/lib/app-shell";

export function RestartRtlBanner() {
  const { rtlNeedsRestart, t, isDark } = useAppTheme();

  if (!rtlNeedsRestart) {
    return null;
  }

  return (
    <View
      style={{
        backgroundColor: isDark ? joumlaColors.darkCard : joumlaColors.pinkSoft,
        borderColor: joumlaColors.pink,
        borderWidth: 1,
        borderRadius: 18,
        paddingHorizontal: 14,
        paddingVertical: 10,
      }}
    >
      <Text selectable style={{ color: joumlaColors.pink, fontSize: 12, fontWeight: "700", marginBottom: 4 }}>
        {t("restartRtlTitle")}
      </Text>
      <Text selectable style={{ color: isDark ? "#F8FAFC" : joumlaColors.navy, fontSize: 13, lineHeight: 18 }}>
        {t("restartRtlBody")}
      </Text>
    </View>
  );
}
