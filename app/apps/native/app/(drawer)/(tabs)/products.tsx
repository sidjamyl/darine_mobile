import { Container } from "@/components/container";
import { ShellEmptyState } from "@/components/shell-empty-state";
import { useAppTheme } from "@/contexts/app-theme-context";

export default function ProductsScreen() {
  const { t } = useAppTheme();

  return (
    <Container className="p-6">
      <ShellEmptyState icon="grid-outline" title={t("products")} body={t("productsHint")} />
    </Container>
  );
}
