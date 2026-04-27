import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Button, Spinner } from "heroui-native";
import { Text, View } from "react-native";

import { CatalogProductGrid } from "@/components/catalog/catalog-product-grid";
import { Container } from "@/components/container";
import { RestartRtlBanner } from "@/components/restart-rtl-banner";
import { useAppTheme } from "@/contexts/app-theme-context";
import { authClient } from "@/lib/auth-client";
import { joumlaColors } from "@/lib/app-shell";
import { trpc } from "@/utils/trpc";

const copy = {
  fr: {
    title: "Vos favoris",
    guestTitle: "Connectez-vous pour vos favoris",
    guestBody: "Les favoris sont synchronises avec votre compte Joumla.",
    login: "Connexion / creation de compte",
    emptyTitle: "Aucun favori",
    emptyBody: "Ajoutez des produits avec le coeur pour les retrouver ici.",
    loading: "Chargement des favoris...",
    error: "Impossible de charger les favoris.",
  },
  ar: {
    title: "المفضلة",
    guestTitle: "سجل الدخول للمفضلة",
    guestBody: "تتم مزامنة المفضلة مع حسابك في Joumla.",
    login: "دخول / انشاء حساب",
    emptyTitle: "لا توجد مفضلة",
    emptyBody: "اضف المنتجات بالقلب لتجدها هنا.",
    loading: "جاري تحميل المفضلة...",
    error: "تعذر تحميل المفضلة.",
  },
};

export default function FavoritesScreen() {
  const { language, isDark, isRtl } = useAppTheme();
  const labels = copy[language];
  const { data: session } = authClient.useSession();
  const favorites = useQuery({
    ...trpc.favorites.listProducts.queryOptions(),
    enabled: !!session?.user,
  });

  if (!session?.user) {
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
              gap: 14,
              alignItems: isRtl ? "flex-end" : "flex-start",
            }}
          >
            <Text selectable style={{ color: isDark ? "#F8FAFC" : joumlaColors.navy, fontSize: 24, fontWeight: "900" }}>
              {labels.guestTitle}
            </Text>
            <Text selectable style={{ color: isDark ? "#CBD5E1" : joumlaColors.slate, lineHeight: 21, textAlign: isRtl ? "right" : "left" }}>
              {labels.guestBody}
            </Text>
            <Button onPress={() => router.push("/profile")}>
              <Button.Label>{labels.login}</Button.Label>
            </Button>
          </View>
        </View>
      </Container>
    );
  }

  const header = (
    <View style={{ gap: 14, marginBottom: 4 }}>
      <RestartRtlBanner />
      <Text selectable style={{ color: isDark ? "#F8FAFC" : joumlaColors.navy, fontSize: 28, fontWeight: "900", textAlign: isRtl ? "right" : "left" }}>
        {labels.title}
      </Text>
      {favorites.isLoading ? (
        <View style={{ flexDirection: isRtl ? "row-reverse" : "row", alignItems: "center", gap: 10 }}>
          <Spinner size="sm" color="default" />
          <Text selectable style={{ color: isDark ? "#CBD5E1" : joumlaColors.slate }}>
            {labels.loading}
          </Text>
        </View>
      ) : null}
      {favorites.error ? (
        <Text selectable style={{ color: joumlaColors.pink, textAlign: isRtl ? "right" : "left" }}>
          {labels.error}
        </Text>
      ) : null}
    </View>
  );

  return (
    <Container isScrollable={false}>
      <CatalogProductGrid products={favorites.data ?? []} header={header} emptyTitle={labels.emptyTitle} emptyBody={labels.emptyBody} />
    </Container>
  );
}
