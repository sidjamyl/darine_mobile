import { formatDa } from "@/components/catalog/catalog-format";

export function getOrderStatusLabel(language: "fr" | "ar", status: string) {
  const labels = {
    fr: {
      to_call: "A appeler",
      called: "Client appele",
      processing: "En traitement",
      processed: "Commande traitee",
      cancelled: "Annulee",
    },
    ar: {
      to_call: "بانتظار الاتصال",
      called: "تم الاتصال بالعميل",
      processing: "قيد المعالجة",
      processed: "تمت معالجة الطلب",
      cancelled: "ملغاة",
    },
  } as const;

  return labels[language][status as keyof (typeof labels)["fr"]] ?? status;
}

export function formatOrderDate(value: string | Date) {
  return new Intl.DateTimeFormat("fr-DZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function getOrderTotal(value: string) {
  return formatDa(value);
}

export function canClientCancel(status: string) {
  return status === "to_call" || status === "called";
}
