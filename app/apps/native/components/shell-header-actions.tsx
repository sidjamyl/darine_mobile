import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, View } from "react-native";

import { ThemeToggle } from "@/components/theme-toggle";
import { joumlaColors } from "@/lib/app-shell";

export function ShellHeaderActions() {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <Pressable
        onPress={() => router.push("/notifications")}
        style={{ width: 42, height: 42, alignItems: "center", justifyContent: "center" }}
      >
        <Ionicons name="notifications-outline" size={22} color={joumlaColors.pink} />
      </Pressable>
      <ThemeToggle />
    </View>
  );
}
