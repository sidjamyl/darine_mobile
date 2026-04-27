import { Container } from "@/components/container";
import { ShellEmptyState } from "@/components/shell-empty-state";
import { useAppTheme } from "@/contexts/app-theme-context";

export default function OrdersScreen() {
  const { t } = useAppTheme();

  return (
    <Container className="p-6">
      <ShellEmptyState icon="receipt-outline" title={t("orders")} body={t("orderHistoryEmpty")} />
    </Container>
  );
}
