import { Drawer } from "expo-router/drawer";
import { useThemeColor } from "heroui-native";

import { JoumlaDrawerContent } from "@/components/joumla-drawer-content";
import { ShellHeaderActions } from "@/components/shell-header-actions";
import { useAppTheme } from "@/contexts/app-theme-context";

function DrawerLayout() {
  const themeColorForeground = useThemeColor("foreground");
  const themeColorBackground = useThemeColor("background");
  const { t } = useAppTheme();

  return (
    <Drawer
      drawerContent={(props) => <JoumlaDrawerContent {...props} />}
      screenOptions={{
        headerTintColor: themeColorForeground,
        headerStyle: { backgroundColor: themeColorBackground },
        headerTitleStyle: {
          fontWeight: "600",
          color: themeColorForeground,
        },
        headerRight: () => <ShellHeaderActions />,
        drawerStyle: { backgroundColor: themeColorBackground },
        sceneContainerStyle: { backgroundColor: themeColorBackground },
      }}
    >
      <Drawer.Screen
        name="(tabs)"
        options={{
          headerShown: false,
          title: t("home"),
        }}
      />
      <Drawer.Screen
        name="profile"
        options={{
          title: t("profile"),
          drawerItemStyle: { display: "none" },
        }}
      />
      <Drawer.Screen
        name="orders"
        options={{
          title: t("orders"),
          drawerItemStyle: { display: "none" },
        }}
      />
      <Drawer.Screen
        name="order/[orderId]"
        options={{
          title: t("orderDetail"),
          drawerItemStyle: { display: "none" },
        }}
      />
      <Drawer.Screen
        name="notifications"
        options={{
          title: t("notifications"),
          drawerItemStyle: { display: "none" },
        }}
      />
      <Drawer.Screen
        name="brands"
        options={{
          title: t("brands"),
          drawerItemStyle: { display: "none" },
        }}
      />
      <Drawer.Screen
        name="categories"
        options={{
          title: t("categories"),
          drawerItemStyle: { display: "none" },
        }}
      />
      <Drawer.Screen
        name="product/[productId]"
        options={{
          title: t("productDetail"),
          drawerItemStyle: { display: "none" },
        }}
      />
      <Drawer.Screen
        name="language"
        options={{
          title: t("language"),
          drawerItemStyle: { display: "none" },
        }}
      />
      <Drawer.Screen
        name="admin"
        options={{
          title: t("admin"),
          drawerItemStyle: { display: "none" },
        }}
      />
    </Drawer>
  );
}

export default DrawerLayout;
