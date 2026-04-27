import { useQuery } from "@tanstack/react-query";
import { Text, View } from "react-native";

import { Container } from "@/components/container";
import { ShellEmptyState } from "@/components/shell-empty-state";
import { useAppTheme } from "@/contexts/app-theme-context";
import { trpc } from "@/utils/trpc";

export default function AdminScreen() {
  const { t, isRtl } = useAppTheme();
  const adminProbe = useQuery({
    ...trpc.adminUsers.list.queryOptions(),
    retry: false,
  });

  if (adminProbe.isError) {
    return (
      <Container className="p-6">
        <ShellEmptyState icon="shield-outline" title={t("adminLockedTitle")} body={t("adminLockedBody")} />
      </Container>
    );
  }

  return (
    <Container className="p-6">
      <View style={{ gap: 18 }}>
        <ShellEmptyState icon="shield-checkmark-outline" title={t("admin")} body={t("continueBrowsing")} />
        <Text selectable style={{ textAlign: isRtl ? "right" : "left" }}>
          Modules admin mobile a brancher dans les prochaines issues.
        </Text>
      </View>
    </Container>
  );
}
