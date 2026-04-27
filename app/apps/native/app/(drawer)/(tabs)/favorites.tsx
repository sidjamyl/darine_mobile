import { Container } from "@/components/container";
import { ShellEmptyState } from "@/components/shell-empty-state";
import { useAppTheme } from "@/contexts/app-theme-context";

export default function FavoritesScreen() {
  const { t } = useAppTheme();

  return (
    <Container className="p-6">
      <ShellEmptyState icon="heart-outline" title={t("favorites")} body={t("favoritesEmpty")} />
    </Container>
  );
}
