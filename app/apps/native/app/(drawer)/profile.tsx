import { useQuery } from "@tanstack/react-query";
import { Button, Card, Chip, FieldError, Spinner } from "heroui-native";
import { Text, View } from "react-native";

import { ChangePasswordCard } from "@/components/change-password-card";
import { Container } from "@/components/container";
import { ProfileEditor } from "@/components/profile-editor";
import { RestartRtlBanner } from "@/components/restart-rtl-banner";
import { SignIn } from "@/components/sign-in";
import { SignUp } from "@/components/sign-up";
import { useAppTheme } from "@/contexts/app-theme-context";
import { authClient } from "@/lib/auth-client";
import { joumlaColors } from "@/lib/app-shell";
import { queryClient, trpc } from "@/utils/trpc";

const copy = {
  fr: {
    connectedBody: "Gerez votre profil client, votre adresse et votre mot de passe.",
    phoneMissing: "Telephone non renseigne",
    loading: "Chargement du profil...",
    profileError: "Impossible de charger votre profil.",
  },
  ar: {
    connectedBody: "ادِر ملف العميل والعنوان وكلمة المرور.",
    phoneMissing: "رقم الهاتف غير مسجل",
    loading: "جاري تحميل الملف...",
    profileError: "تعذر تحميل الملف الشخصي.",
  },
};

export default function ProfileScreen() {
  const { t, language, isDark, isRtl } = useAppTheme();
  const { data: session } = authClient.useSession();
  const labels = copy[language];
  const profile = useQuery({
    ...trpc.profile.me.queryOptions(),
    enabled: !!session?.user,
  });

  return (
    <Container className="p-6">
      <View style={{ gap: 18 }}>
        <RestartRtlBanner />

        <Card
          style={{
            backgroundColor: isDark ? joumlaColors.darkCard : "#FFFFFF",
            borderRadius: 28,
            borderWidth: 1,
            borderColor: isDark ? "#27334A" : joumlaColors.line,
            padding: 20,
          }}
        >
          <View style={{ gap: 12, alignItems: isRtl ? "flex-end" : "flex-start" }}>
            <Chip size="sm" variant="secondary" color="primary">
              <Chip.Label>{session?.user ? t("accountConnected") : t("accountGuest")}</Chip.Label>
            </Chip>
            <Text selectable style={{ color: isDark ? "#F8FAFC" : joumlaColors.navy, fontSize: 26, fontWeight: "700" }}>
              {session?.user?.name ?? t("clientArea")}
            </Text>
            <Text selectable style={{ color: isDark ? "#CBD5E1" : joumlaColors.slate, fontSize: 15, lineHeight: 22 }}>
              {session?.user ? labels.connectedBody : t("clientAreaBody")}
            </Text>
            {profile.data?.user ? (
              <Text selectable style={{ color: isDark ? "#CBD5E1" : joumlaColors.slate, fontSize: 15, lineHeight: 22 }}>
                {profile.data.user.phoneNumberLocal ?? profile.data.user.phoneNumber ?? labels.phoneMissing}
              </Text>
            ) : null}
            {session?.user ? (
              <Button
                variant="danger-soft"
                onPress={() => {
                  authClient.signOut();
                  queryClient.invalidateQueries();
                }}
              >
                <Button.Label>{t("logout")}</Button.Label>
              </Button>
            ) : null}
          </View>
        </Card>

        {!session?.user ? (
          <View style={{ gap: 16 }}>
            <SignIn />
            <SignUp />
          </View>
        ) : null}

        {session?.user && profile.isLoading ? (
          <Card
            style={{
              backgroundColor: isDark ? joumlaColors.darkCard : "#FFFFFF",
              borderRadius: 28,
              borderWidth: 1,
              borderColor: isDark ? "#27334A" : joumlaColors.line,
              padding: 20,
            }}
          >
            <View style={{ gap: 12, alignItems: "center" }}>
              <Spinner size="sm" color="default" />
              <Text selectable style={{ color: isDark ? "#CBD5E1" : joumlaColors.slate }}>
                {labels.loading}
              </Text>
            </View>
          </Card>
        ) : null}

        {session?.user && profile.error ? <FieldError isInvalid>{labels.profileError}</FieldError> : null}

        {session?.user && profile.data ? (
          <View style={{ gap: 16 }}>
            <ProfileEditor data={profile.data} />
            <ChangePasswordCard />
          </View>
        ) : null}
      </View>
    </Container>
  );
}
