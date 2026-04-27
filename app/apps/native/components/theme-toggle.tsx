import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Platform, Pressable } from "react-native";
import Animated, { FadeOut, ZoomIn } from "react-native-reanimated";
import { withUniwind } from "uniwind";

import { useAppTheme } from "@/contexts/app-theme-context";

const StyledIonicons = withUniwind(Ionicons);

export function ThemeToggle() {
  const { toggleTheme, themeMode } = useAppTheme();
  const iconName =
    (themeMode === "system" ? "contrast-outline" : themeMode === "light" ? "sunny" : "moon") as keyof typeof Ionicons.glyphMap;
  const iconKey = `${themeMode}-${iconName}`;

  return (
    <Pressable
      onPress={() => {
        if (Platform.OS === "ios") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        toggleTheme();
      }}
      className="px-2.5"
    >
      <Animated.View key={iconKey} entering={ZoomIn} exiting={FadeOut}>
        <StyledIonicons name={iconName} size={20} className="text-foreground" />
      </Animated.View>
    </Pressable>
  );
}
