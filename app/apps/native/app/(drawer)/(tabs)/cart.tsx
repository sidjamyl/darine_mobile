import { Container } from "@/components/container";
import { ShellEmptyState } from "@/components/shell-empty-state";
import { useAppTheme } from "@/contexts/app-theme-context";

export default function CartScreen() {
  const { t } = useAppTheme();

  return (
    <Container className="p-6">
      <ShellEmptyState icon="cart-outline" title={t("cart")} body={t("cartEmpty")} />
    </Container>
  );
}
