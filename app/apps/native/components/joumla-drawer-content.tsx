import { Ionicons } from "@expo/vector-icons";
import { DrawerContentScrollView, DrawerItem, type DrawerContentComponentProps } from "@react-navigation/drawer";
import { useQuery } from "@tanstack/react-query";
import { useRouter, usePathname } from "expo-router";
import { Card, Chip } from "heroui-native";
import { Pressable, Text, View } from "react-native";

import { JoumlaSymbol } from "@/components/joumla-symbol";
import { useAppTheme } from "@/contexts/app-theme-context";
import { authClient } from "@/lib/auth-client";
import { drawerLinks, joumlaColors } from "@/lib/app-shell";
import { queryClient, trpc } from "@/utils/trpc";

const CLIENT_EMAIL_DOMAIN = "@clients.joumla.local";

export function JoumlaDrawerContent(props: DrawerContentComponentProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = authClient.useSession();
  const { t, isDark, isRtl } = useAppTheme();

  const adminProbe = useQuery({
    ...trpc.adminUsers.list.queryOptions(),
    enabled: !!session?.user,
    retry: false,
  });

  const isAdminAccount =
    adminProbe.isSuccess || (!!session?.user?.email && !session.user.email.endsWith(CLIENT_EMAIL_DOMAIN));

  const cardBackground = isDark ? joumlaColors.darkCard : "#FFFFFF";
  const textPrimary = isDark ? "#F8FAFC" : joumlaColors.navy;
  const textSecondary = isDark ? "#CBD5E1" : joumlaColors.slate;

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 20,
        gap: 18,
      }}
    >
      <Card
        style={{
          backgroundColor: cardBackground,
          borderRadius: 28,
          padding: 18,
          borderWidth: 1,
          borderColor: isDark ? "#25304A" : joumlaColors.line,
        }}
      >
        <View style={{ gap: 14 }}>
          <View style={{ flexDirection: isRtl ? "row-reverse" : "row", alignItems: "center", gap: 14 }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 22,
                backgroundColor: isDark ? joumlaColors.navySoft : joumlaColors.cream,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <JoumlaSymbol size={48} />
            </View>
            <View style={{ flex: 1, alignItems: isRtl ? "flex-end" : "flex-start" }}>
              <Chip size="sm" variant="secondary" color="primary">
                <Chip.Label>{t("shellBadge")}</Chip.Label>
              </Chip>
              <Text selectable style={{ color: textPrimary, fontSize: 22, fontWeight: "800", marginTop: 10 }}>
                {t("appName")}
              </Text>
              <Text selectable style={{ color: textSecondary, fontSize: 13, lineHeight: 18, marginTop: 4 }}>
                {t("appTagline")}
              </Text>
            </View>
          </View>

          <View
            style={{
              backgroundColor: isDark ? joumlaColors.navy : joumlaColors.cream,
              borderRadius: 20,
              padding: 14,
              gap: 6,
            }}
          >
            <Text selectable style={{ color: isDark ? "#FFFFFF" : joumlaColors.navy, fontSize: 13, fontWeight: "700" }}>
              {session?.user ? t("accountConnected") : t("accountGuest")}
            </Text>
            <Text selectable style={{ color: isDark ? "#E2E8F0" : textSecondary, fontSize: 13, lineHeight: 18 }}>
              {session?.user?.name ?? t("clientAreaBody")}
            </Text>
          </View>
        </View>
      </Card>

      <View style={{ gap: 4 }}>
        {drawerLinks.map((link) => {
          const isActive = pathname === link.href;

          return (
            <DrawerItem
              key={link.href}
              label={t(link.key)}
              focused={isActive}
              activeTintColor={joumlaColors.pink}
              inactiveTintColor={textPrimary}
              activeBackgroundColor={isDark ? joumlaColors.navySoft : joumlaColors.pinkSoft}
              onPress={() => {
                router.push(link.href);
                props.navigation.closeDrawer();
              }}
              icon={({ color, size }) => <Ionicons name={link.icon as keyof typeof Ionicons.glyphMap} size={size} color={color} />}
            />
          );
        })}

        {isAdminAccount ? (
          <DrawerItem
            label={t("admin")}
            focused={pathname === "/admin"}
            activeTintColor={joumlaColors.pink}
            inactiveTintColor={textPrimary}
            activeBackgroundColor={isDark ? joumlaColors.navySoft : joumlaColors.pinkSoft}
            onPress={() => {
              router.push("/admin");
              props.navigation.closeDrawer();
            }}
            icon={({ color, size }) => <Ionicons name="shield-checkmark-outline" size={size} color={color} />}
          />
        ) : null}
      </View>

      <View style={{ gap: 12, marginTop: 12 }}>
        {session?.user ? (
          <Pressable
            onPress={() => {
              authClient.signOut();
              queryClient.invalidateQueries();
              props.navigation.closeDrawer();
            }}
            style={{
              borderRadius: 18,
              paddingHorizontal: 16,
              paddingVertical: 14,
              backgroundColor: isDark ? "#311A27" : joumlaColors.pinkSoft,
            }}
          >
            <Text selectable style={{ color: joumlaColors.pink, fontWeight: "700", textAlign: isRtl ? "right" : "left" }}>
              {t("logout")}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => {
              router.push("/profile");
              props.navigation.closeDrawer();
            }}
            style={{
              borderRadius: 18,
              paddingHorizontal: 16,
              paddingVertical: 14,
              backgroundColor: joumlaColors.navy,
            }}
          >
            <Text selectable style={{ color: "#FFFFFF", fontWeight: "700", textAlign: isRtl ? "right" : "left" }}>
              {t("login")}
            </Text>
          </Pressable>
        )}
      </View>
    </DrawerContentScrollView>
  );
}
