import { useMutation, useQuery } from "@tanstack/react-query";
import * as FileSystem from "expo-file-system";
import * as Linking from "expo-linking";
import * as Sharing from "expo-sharing";
import { Button, Spinner, useToast } from "heroui-native";
import type React from "react";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { formatDa } from "@/components/catalog/catalog-format";
import { Container } from "@/components/container";
import { getOrderStatusLabel } from "@/components/order/order-format";
import { RestartRtlBanner } from "@/components/restart-rtl-banner";
import { ShellEmptyState } from "@/components/shell-empty-state";
import { useAppTheme } from "@/contexts/app-theme-context";
import { pickAndUploadAdminAsset } from "@/lib/admin-asset-upload";
import { joumlaColors } from "@/lib/app-shell";
import { queryClient, trpc, trpcClient } from "@/utils/trpc";

const tabs = ["dashboard", "orders", "products", "categories", "brands", "banners", "stock", "customers", "admins", "announcements", "settings"] as const;
const statuses = ["to_call", "called", "processing", "processed", "cancelled"] as const;

const labels = {
  fr: {
    dashboard: "Synthese",
    orders: "Commandes",
    products: "Produits",
    categories: "Categories",
    brands: "Marques",
    banners: "Bannieres",
    stock: "Stock",
    customers: "Clients",
    admins: "Admins",
    announcements: "Annonces",
    settings: "Parametres",
    all: "Tous",
    call: "Appeler",
    save: "Enregistrer",
    create: "Creer",
    edit: "Modifier",
    close: "Fermer",
    archive: "Archiver",
    restore: "Restaurer",
    block: "Bloquer",
    unblock: "Reactiver",
    disabled: "Bloque",
    active: "Actif",
    hidden: "Masque",
    featured: "Accueil",
    oldBalance: "Ancien solde",
    payment: "Versement",
    newBalance: "Nouveau solde",
    generateBl: "Generer / partager BL",
    createProduct: "Nouveau produit",
    editProduct: "Modifier le produit",
    createBrand: "Nouvelle marque",
    editBrand: "Modifier la marque",
    createCategory: "Nouvelle categorie",
    editCategory: "Modifier la categorie",
    createBanner: "Nouvelle banniere",
    editBanner: "Modifier la banniere",
    createAdmin: "Nouvel admin",
    nameFr: "Nom francais",
    nameAr: "Nom arabe",
    name: "Nom",
    email: "Email",
    password: "Mot de passe",
    phone: "Telephone",
    address: "Adresse",
    wilaya: "Wilaya",
    commune: "Commune",
    unitPrice: "Prix unitaire",
    lotQuantity: "Pieces par lot",
    packaging: "Conditionnement",
    brand: "Marque",
    category: "Categorie",
    stockLots: "Stock en lots",
    lowStock: "Alerte stock minimum",
    reference: "Reference interne",
    description: "Description",
    badge: "Badge produit",
    discount: "Prix lot promotionnel",
    sortOrder: "Ordre d'affichage",
    image: "Image",
    uploadImage: "Choisir une image",
    uploadLogo: "Choisir un logo",
    imageReady: "Image prete",
    logoReady: "Logo pret",
    addStock: "Ajouter du stock",
    removeStock: "Diminuer le stock",
    quantity: "Nombre de lots",
    reason: "Raison",
    title: "Titre",
    body: "Message",
    pushOn: "Push active",
    pushOff: "Push desactive",
    publish: "Publier",
    uploadSuccess: "Image envoyee.",
    uploadFailed: "Echec de l'envoi.",
    blFailed: "Generation BL impossible.",
    lots: "lots",
    noAlert: "aucune alerte",
    noData: "Aucun element.",
    ordersToCall: "Commandes a appeler",
    lowStockProducts: "Stock faible",
    incompleteProducts: "Produits incomplets",
    stockHistory: "Historique du stock",
    manualAdjustment: "Ajustement manuel",
    orderProcessing: "Commande traitee",
    orderCancellation: "Annulation commande",
    notificationPrefs: "Notifications commandes",
    emailActive: "Email actif",
    emailInactive: "Email inactif",
    pushActive: "Push actif",
    pushInactive: "Push inactif",
    toggleActive: "Actif",
    toggleInactive: "Inactif",
    selectBrand: "Choisir une marque",
    selectCategories: "Choisir les categories",
    selectWilaya: "Choisir une wilaya",
    selectCommune: "Choisir une commune",
    settingsOverview: "Reglages disponibles",
    settingsOverviewBody: "Cette page regroupe les reglages transverses et les controles rapides. Les valeurs produits avancees restent dans les formulaires produit.",
    mobileConnection: "Connexion mobile",
    mobileConnectionBody: "Si l'app ne voit pas le backend, verifiez que l'URL mobile utilise l'IP actuelle du PC sur le meme reseau.",
  },
  ar: {
    dashboard: "الملخص",
    orders: "الطلبات",
    products: "المنتجات",
    categories: "الاصناف",
    brands: "العلامات",
    banners: "البنرات",
    stock: "المخزون",
    customers: "العملاء",
    admins: "الادمن",
    announcements: "الاعلانات",
    settings: "الاعدادات",
    all: "الكل",
    call: "اتصال",
    save: "حفظ",
    create: "انشاء",
    edit: "تعديل",
    close: "اغلاق",
    archive: "ارشفة",
    restore: "استرجاع",
    block: "حظر",
    unblock: "تفعيل",
    disabled: "محظور",
    active: "نشط",
    hidden: "مخفي",
    featured: "الرئيسية",
    oldBalance: "الرصيد القديم",
    payment: "الدفع",
    newBalance: "الرصيد الجديد",
    generateBl: "انشاء ومشاركة BL",
    createProduct: "منتج جديد",
    editProduct: "تعديل المنتج",
    createBrand: "علامة جديدة",
    editBrand: "تعديل العلامة",
    createCategory: "صنف جديد",
    editCategory: "تعديل الصنف",
    createBanner: "بنر جديد",
    editBanner: "تعديل البنر",
    createAdmin: "ادمن جديد",
    nameFr: "الاسم بالفرنسية",
    nameAr: "الاسم بالعربية",
    name: "الاسم",
    email: "البريد الالكتروني",
    password: "كلمة المرور",
    phone: "الهاتف",
    address: "العنوان",
    wilaya: "الولاية",
    commune: "البلدية",
    unitPrice: "سعر الوحدة",
    lotQuantity: "عدد القطع في الحزمة",
    packaging: "التغليف",
    brand: "العلامة",
    category: "الصنف",
    stockLots: "المخزون بالحزم",
    lowStock: "تنبيه المخزون الادنى",
    reference: "مرجع داخلي",
    description: "الوصف",
    badge: "شارة المنتج",
    discount: "سعر الحزمة المخفض",
    sortOrder: "ترتيب العرض",
    image: "الصورة",
    uploadImage: "اختيار صورة",
    uploadLogo: "اختيار شعار",
    imageReady: "الصورة جاهزة",
    logoReady: "الشعار جاهز",
    addStock: "اضافة مخزون",
    removeStock: "انقاص المخزون",
    quantity: "عدد الحزم",
    reason: "السبب",
    title: "العنوان",
    body: "الرسالة",
    pushOn: "Push مفعل",
    pushOff: "Push غير مفعل",
    publish: "نشر",
    uploadSuccess: "تم ارسال الصورة.",
    uploadFailed: "فشل الارسال.",
    blFailed: "تعذر انشاء BL.",
    lots: "حزم",
    noAlert: "بدون تنبيه",
    noData: "لا توجد عناصر.",
    ordersToCall: "طلبات للاتصال",
    lowStockProducts: "مخزون منخفض",
    incompleteProducts: "منتجات ناقصة",
    stockHistory: "سجل المخزون",
    manualAdjustment: "تعديل يدوي",
    orderProcessing: "طلب معالج",
    orderCancellation: "الغاء طلب",
    notificationPrefs: "اشعارات الطلبات",
    emailActive: "البريد مفعل",
    emailInactive: "البريد غير مفعل",
    pushActive: "Push مفعل",
    pushInactive: "Push غير مفعل",
    toggleActive: "مفعل",
    toggleInactive: "غير مفعل",
    selectBrand: "اختر علامة",
    selectCategories: "اختر الاصناف",
    selectWilaya: "اختر ولاية",
    selectCommune: "اختر بلدية",
    settingsOverview: "الاعدادات المتاحة",
    settingsOverviewBody: "هذه الصفحة تجمع الاعدادات العامة والفحوصات السريعة. القيم المتقدمة للمنتج تبقى داخل نماذج المنتج.",
    mobileConnection: "اتصال الهاتف",
    mobileConnectionBody: "اذا لم يتصل التطبيق بالباك اند، تحقق ان رابط الهاتف يستعمل IP الحالي للحاسوب على نفس الشبكة.",
  },
};

type ProductFormState = {
  nameFr: string;
  nameAr: string;
  unitPrice: string;
  lotQuantity: string;
  packagingLabel: string;
  brandId: string;
  categoryIds: string[];
  imageAssetId: string;
  stockLots: string;
  lowStockThreshold: string;
  sku: string;
  description: string;
  badgeLabel: string;
  badgeColor: string;
  discountLotPrice: string;
  sortOrder: string;
  isArchived: boolean;
};

type CategoryFormState = { nameFr: string; nameAr: string; imageAssetId: string; isActive: boolean; isFeatured: boolean; sortOrder: string };
type BrandFormState = { name: string; logoAssetId: string; isActive: boolean; isFeatured: boolean; sortOrder: string };
type BannerFormState = { imageAssetId: string; isActive: boolean; sortOrder: string };
type CustomerFormState = { fullName: string; phoneNumber: string; wilayaId: string; communeId: string; streetAddress: string };
type AdminFormState = { name: string; email: string; password: string };
type StockFormState = { productId: string; productName: string; direction: "add" | "remove"; quantity: string; note: string };

function emptyProductForm(): ProductFormState {
  return {
    nameFr: "",
    nameAr: "",
    unitPrice: "0",
    lotQuantity: "1",
    packagingLabel: "Carton",
    brandId: "",
    categoryIds: [],
    imageAssetId: "",
    stockLots: "0",
    lowStockThreshold: "0",
    sku: "",
    description: "",
    badgeLabel: "",
    badgeColor: "#E74888",
    discountLotPrice: "",
    sortOrder: "0",
    isArchived: false,
  };
}

function emptyCategoryForm(): CategoryFormState {
  return { nameFr: "", nameAr: "", imageAssetId: "", isActive: true, isFeatured: true, sortOrder: "0" };
}

function emptyBrandForm(): BrandFormState {
  return { name: "", logoAssetId: "", isActive: true, isFeatured: true, sortOrder: "0" };
}

function emptyBannerForm(): BannerFormState {
  return { imageAssetId: "", isActive: true, sortOrder: "0" };
}

function emptyCustomerForm(): CustomerFormState {
  return { fullName: "", phoneNumber: "", wilayaId: "", communeId: "", streetAddress: "" };
}

function emptyAdminForm(): AdminFormState {
  return { name: "", email: "", password: "" };
}

function toInteger(value: string, fallback = 0) {
  const next = Number.parseInt(value, 10);
  return Number.isFinite(next) ? next : fallback;
}

function AdminCard({ children }: { children: React.ReactNode }) {
  const { isDark } = useAppTheme();
  return (
    <View style={{ backgroundColor: isDark ? joumlaColors.darkCard : "#FFFFFF", borderRadius: 24, borderWidth: 1, borderColor: isDark ? "#27334A" : joumlaColors.line, padding: 16, gap: 12 }}>
      {children}
    </View>
  );
}

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  const { isDark, isRtl } = useAppTheme();
  return (
    <View style={{ flexDirection: isRtl ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
      <Text selectable style={{ color: isDark ? "#F8FAFC" : joumlaColors.navy, fontSize: 21, fontWeight: "700", textAlign: isRtl ? "right" : "left" }}>{title}</Text>
      {action}
    </View>
  );
}

function Field({ label, value, onChangeText, keyboardType = "default", multiline = false, secureTextEntry = false }: { label: string; value: string; onChangeText: (value: string) => void; keyboardType?: "default" | "numeric" | "email-address" | "phone-pad"; multiline?: boolean; secureTextEntry?: boolean }) {
  const { isDark, isRtl } = useAppTheme();
  return (
    <View style={{ gap: 7 }}>
      <Text selectable style={{ color: isDark ? "#CBD5E1" : joumlaColors.slate, fontSize: 12, fontWeight: "700", textAlign: isRtl ? "right" : "left" }}>{label}</Text>
      <TextInput
        keyboardType={keyboardType}
        multiline={multiline}
        placeholder={label}
        placeholderTextColor={joumlaColors.slate}
        secureTextEntry={secureTextEntry}
        value={value}
        onChangeText={onChangeText}
        style={{ color: isDark ? "#F8FAFC" : joumlaColors.navy, textAlign: isRtl ? "right" : "left", minHeight: multiline ? 88 : 44, borderRadius: 16, borderWidth: 1, borderColor: isDark ? "#27334A" : joumlaColors.line, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: isDark ? "#141B2A" : "#FFFFFF" }}
      />
    </View>
  );
}

function Pill({ label, active, danger, onPress }: { label: string; active?: boolean; danger?: boolean; onPress?: () => void }) {
  const { isDark } = useAppTheme();
  const backgroundColor = danger ? "#FEE4E2" : active ? joumlaColors.pink : isDark ? "#141B2A" : "#FFFFFF";
  const color = danger ? "#B42318" : active ? "#FFFFFF" : isDark ? "#F8FAFC" : joumlaColors.navy;
  return (
    <Pressable disabled={!onPress} onPress={onPress} style={{ borderRadius: 999, paddingHorizontal: 13, paddingVertical: 9, backgroundColor, borderWidth: 1, borderColor: active ? joumlaColors.pink : isDark ? "#27334A" : joumlaColors.line }}>
      <Text selectable style={{ color, fontSize: 13, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}

function ToggleLine({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  const { isDark, isRtl, language } = useAppTheme();
  const stateLabel = value ? labels[language].toggleActive : labels[language].toggleInactive;
  return (
    <Pressable onPress={() => onChange(!value)} style={{ flexDirection: isRtl ? "row-reverse" : "row", alignItems: "center", justifyContent: "space-between", gap: 12, borderWidth: 1, borderColor: isDark ? "#27334A" : joumlaColors.line, borderRadius: 16, padding: 12 }}>
      <Text selectable style={{ color: isDark ? "#F8FAFC" : joumlaColors.navy, fontWeight: "700", textAlign: isRtl ? "right" : "left" }}>{label}</Text>
      <Pill label={stateLabel} active={value} />
    </Pressable>
  );
}

function SelectChips({ label, emptyLabel, value, items, onChange }: { label: string; emptyLabel: string; value: string; items: Array<{ id: string; label: string }>; onChange: (value: string) => void }) {
  const { isDark, isRtl } = useAppTheme();
  return (
    <View style={{ gap: 8 }}>
      <Text selectable style={{ color: isDark ? "#CBD5E1" : joumlaColors.slate, fontSize: 12, fontWeight: "700", textAlign: isRtl ? "right" : "left" }}>{label}</Text>
      <View style={{ flexDirection: isRtl ? "row-reverse" : "row", flexWrap: "wrap", gap: 8 }}>
        {items.length === 0 ? <Text selectable style={{ color: joumlaColors.slate }}>{emptyLabel}</Text> : null}
        {items.map((item) => <Pill key={item.id} label={item.label} active={item.id === value} onPress={() => onChange(item.id)} />)}
      </View>
    </View>
  );
}

function MultiSelectChips({ label, emptyLabel, values, items, onChange }: { label: string; emptyLabel: string; values: string[]; items: Array<{ id: string; label: string }>; onChange: (value: string[]) => void }) {
  const { isDark, isRtl } = useAppTheme();
  function toggle(id: string) {
    onChange(values.includes(id) ? values.filter((value) => value !== id) : [...values, id]);
  }

  return (
    <View style={{ gap: 8 }}>
      <Text selectable style={{ color: isDark ? "#CBD5E1" : joumlaColors.slate, fontSize: 12, fontWeight: "700", textAlign: isRtl ? "right" : "left" }}>{label}</Text>
      <View style={{ flexDirection: isRtl ? "row-reverse" : "row", flexWrap: "wrap", gap: 8 }}>
        {items.length === 0 ? <Text selectable style={{ color: joumlaColors.slate }}>{emptyLabel}</Text> : null}
        {items.map((item) => <Pill key={item.id} label={item.label} active={values.includes(item.id)} onPress={() => toggle(item.id)} />)}
      </View>
    </View>
  );
}

function AdminModal({ title, visible, onClose, children }: { title: string; visible: boolean; onClose: () => void; children: React.ReactNode }) {
  const { isDark, isRtl } = useAppTheme();
  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(10, 27, 70, 0.48)" }}>
        <Pressable onPress={onClose} style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }} />
        <View style={{ maxHeight: "92%", borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: isDark ? joumlaColors.darkSurface : joumlaColors.cream, overflow: "hidden" }}>
          <View style={{ flexDirection: isRtl ? "row-reverse" : "row", alignItems: "center", justifyContent: "space-between", gap: 12, padding: 18, borderBottomWidth: 1, borderBottomColor: isDark ? "#27334A" : joumlaColors.line }}>
            <Text selectable style={{ color: isDark ? "#F8FAFC" : joumlaColors.navy, fontSize: 20, fontWeight: "700", textAlign: isRtl ? "right" : "left" }}>{title}</Text>
            <Pressable onPress={onClose} style={{ borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: isDark ? "#27334A" : "#FFFFFF" }}>
              <Text selectable style={{ color: isDark ? "#F8FAFC" : joumlaColors.navy, fontWeight: "700" }}>X</Text>
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 18, gap: 14 }}>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function UploadButton({ label, readyLabel, ready, onPress }: { label: string; readyLabel: string; ready: boolean; onPress: () => void }) {
  const { isRtl } = useAppTheme();
  return (
    <View style={{ gap: 8 }}>
      <Button variant="secondary" onPress={onPress}><Button.Label>{label}</Button.Label></Button>
      {ready ? <Text selectable style={{ color: joumlaColors.pink, fontWeight: "700", textAlign: isRtl ? "right" : "left" }}>{readyLabel}</Text> : null}
    </View>
  );
}

export default function AdminScreen() {
  const { t, language, isDark, isRtl } = useAppTheme();
  const adminLabels = labels[language];
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("dashboard");
  const [orderStatus, setOrderStatus] = useState<(typeof statuses)[number] | undefined>();
  const [blOrderId, setBlOrderId] = useState<string | null>(null);
  const [bl, setBl] = useState({ oldBalance: "0", paymentAmount: "0", newBalance: "0" });
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState<ProductFormState>(() => emptyProductForm());
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(() => emptyCategoryForm());
  const [brandDialogOpen, setBrandDialogOpen] = useState(false);
  const [editingBrandId, setEditingBrandId] = useState<string | null>(null);
  const [brandForm, setBrandForm] = useState<BrandFormState>(() => emptyBrandForm());
  const [bannerDialogOpen, setBannerDialogOpen] = useState(false);
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [bannerForm, setBannerForm] = useState<BannerFormState>(() => emptyBannerForm());
  const [stockForm, setStockForm] = useState<StockFormState | null>(null);
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [customerForm, setCustomerForm] = useState<CustomerFormState>(() => emptyCustomerForm());
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [adminForm, setAdminForm] = useState<AdminFormState>(() => emptyAdminForm());
  const [announcement, setAnnouncement] = useState({ title: "", body: "", sendPush: false });

  const adminProbe = useQuery({ ...trpc.adminUsers.list.queryOptions(), retry: false });
  const enabled = adminProbe.isSuccess;
  const toCallOrders = useQuery({ ...trpc.orders.adminList.queryOptions({ status: "to_call" }), enabled });
  const orders = useQuery({ ...trpc.orders.adminList.queryOptions(orderStatus ? { status: orderStatus } : undefined), enabled });
  const products = useQuery({ ...trpc.adminCatalog.products.list.queryOptions(), enabled });
  const brands = useQuery({ ...trpc.adminCatalog.brands.list.queryOptions(), enabled });
  const categories = useQuery({ ...trpc.adminCatalog.categories.list.queryOptions(), enabled });
  const banners = useQuery({ ...trpc.adminCatalog.banners.list.queryOptions(), enabled });
  const stockMovements = useQuery({ ...trpc.orders.adminStockMovements.queryOptions(), enabled });
  const customers = useQuery({ ...trpc.adminUsers.listCustomers.queryOptions(), enabled });
  const customerDetail = useQuery({ ...trpc.adminUsers.customerDetail.queryOptions({ userId: editingCustomerId ?? "missing" }), enabled: enabled && !!editingCustomerId && customerDialogOpen });
  const wilayas = useQuery({ ...trpc.locations.wilayas.queryOptions(), enabled });
  const communes = useQuery({ ...trpc.locations.communesByWilaya.queryOptions({ wilayaId: customerForm.wilayaId || "missing" }), enabled: enabled && customerDialogOpen && !!customerForm.wilayaId });
  const announcements = useQuery({ ...trpc.notifications.adminListAnnouncements.queryOptions(), enabled });
  const notificationPrefs = useQuery({ ...trpc.notifications.adminListOrderNotificationPreferences.queryOptions(), enabled });

  type ProductItem = NonNullable<typeof products.data>[number];
  type BrandItem = NonNullable<typeof brands.data>[number];
  type CategoryItem = NonNullable<typeof categories.data>[number];
  type BannerItem = NonNullable<typeof banners.data>[number];
  type CustomerItem = NonNullable<typeof customers.data>[number];

  function showError(error: unknown, fallback: string) {
    toast.show({ variant: "danger", label: error instanceof Error ? error.message : fallback });
  }

  const updateStatus = useMutation(trpc.orders.adminUpdateStatus.mutationOptions({ onSuccess: () => queryClient.invalidateQueries(), onError: (error) => showError(error, "Erreur") }));
  const createProduct = useMutation(trpc.adminCatalog.products.create.mutationOptions({ async onSuccess() { await queryClient.invalidateQueries(); setProductDialogOpen(false); }, onError: (error) => showError(error, "Erreur") }));
  const updateProduct = useMutation(trpc.adminCatalog.products.update.mutationOptions({ async onSuccess() { await queryClient.invalidateQueries(); setProductDialogOpen(false); }, onError: (error) => showError(error, "Erreur") }));
  const archiveProduct = useMutation(trpc.adminCatalog.products.archive.mutationOptions({ onSuccess: () => queryClient.invalidateQueries(), onError: (error) => showError(error, "Erreur") }));
  const createBrand = useMutation(trpc.adminCatalog.brands.create.mutationOptions({ async onSuccess() { await queryClient.invalidateQueries(); setBrandDialogOpen(false); }, onError: (error) => showError(error, "Erreur") }));
  const updateBrand = useMutation(trpc.adminCatalog.brands.update.mutationOptions({ async onSuccess() { await queryClient.invalidateQueries(); setBrandDialogOpen(false); }, onError: (error) => showError(error, "Erreur") }));
  const createCategory = useMutation(trpc.adminCatalog.categories.create.mutationOptions({ async onSuccess() { await queryClient.invalidateQueries(); setCategoryDialogOpen(false); }, onError: (error) => showError(error, "Erreur") }));
  const updateCategory = useMutation(trpc.adminCatalog.categories.update.mutationOptions({ async onSuccess() { await queryClient.invalidateQueries(); setCategoryDialogOpen(false); }, onError: (error) => showError(error, "Erreur") }));
  const createBanner = useMutation(trpc.adminCatalog.banners.create.mutationOptions({ async onSuccess() { await queryClient.invalidateQueries(); setBannerDialogOpen(false); }, onError: (error) => showError(error, "Erreur") }));
  const updateBanner = useMutation(trpc.adminCatalog.banners.update.mutationOptions({ async onSuccess() { await queryClient.invalidateQueries(); setBannerDialogOpen(false); }, onError: (error) => showError(error, "Erreur") }));
  const adjustStock = useMutation(trpc.adminCatalog.products.adjustStock.mutationOptions({ async onSuccess() { await queryClient.invalidateQueries(); setStockForm(null); }, onError: (error) => showError(error, "Erreur") }));
  const disableUser = useMutation(trpc.adminUsers.disableUser.mutationOptions({ onSuccess: () => queryClient.invalidateQueries(), onError: (error) => showError(error, "Erreur") }));
  const enableUser = useMutation(trpc.adminUsers.enableUser.mutationOptions({ onSuccess: () => queryClient.invalidateQueries(), onError: (error) => showError(error, "Erreur") }));
  const updatePhone = useMutation(trpc.adminUsers.updateClientPhone.mutationOptions());
  const updateCustomerProfile = useMutation(trpc.adminUsers.updateCustomerProfile.mutationOptions());
  const createAdmin = useMutation(trpc.adminUsers.createAdmin.mutationOptions({ async onSuccess() { await queryClient.invalidateQueries(); setAdminForm(emptyAdminForm()); setAdminDialogOpen(false); }, onError: (error) => showError(error, "Erreur") }));
  const createAnnouncement = useMutation(trpc.notifications.adminCreateAnnouncement.mutationOptions({ async onSuccess() { await queryClient.invalidateQueries(); setAnnouncement({ title: "", body: "", sendPush: false }); }, onError: (error) => showError(error, "Erreur") }));

  useEffect(() => {
    if (!customerDetail.data) return;
    const detail = customerDetail.data;
    setCustomerForm({
      fullName: detail.profile?.fullName ?? detail.user.name,
      phoneNumber: detail.user.phoneNumberLocal ?? detail.user.phoneNumber ?? "",
      wilayaId: detail.profile?.wilayaId ?? "",
      communeId: detail.profile?.communeId ?? "",
      streetAddress: detail.profile?.streetAddress ?? "",
    });
  }, [customerDetail.data]);

  async function upload(kind: "product" | "brand" | "category" | "banner", apply: (assetId: string) => void) {
    try {
      const asset = await pickAndUploadAdminAsset(kind);
      if (asset) {
        apply(asset.id);
        toast.show({ variant: "success", label: adminLabels.uploadSuccess });
      }
    } catch (error) {
      showError(error, adminLabels.uploadFailed);
    }
  }

  async function shareBl(orderId: string) {
    try {
      const payload = await trpcClient.deliveryNotes.adminGeneratePdf.mutate({ orderId, ...bl });
      const legacyFileSystem = FileSystem as unknown as { cacheDirectory: string; writeAsStringAsync: typeof FileSystem.writeAsStringAsync };
      const fileUri = `${legacyFileSystem.cacheDirectory}${payload.fileName}`;
      await legacyFileSystem.writeAsStringAsync(fileUri, payload.base64, { encoding: "base64" });
      await Sharing.shareAsync(fileUri, { mimeType: payload.mimeType, dialogTitle: payload.fileName });
      setBlOrderId(null);
    } catch (error) {
      showError(error, adminLabels.blFailed);
    }
  }

  function openProduct(product?: ProductItem) {
    setEditingProductId(product?.id ?? null);
    setProductForm(product ? {
      nameFr: product.nameFr,
      nameAr: product.nameAr,
      unitPrice: product.unitPrice,
      lotQuantity: String(product.lotQuantity),
      packagingLabel: product.packagingLabel,
      brandId: product.brand?.id ?? "",
      categoryIds: product.categories.map((category) => category.id),
      imageAssetId: product.image?.id ?? "",
      stockLots: String(product.stockLots),
      lowStockThreshold: String(product.lowStockThreshold ?? 0),
      sku: product.sku ?? "",
      description: product.description ?? "",
      badgeLabel: product.badgeLabel ?? "",
      badgeColor: product.badgeColor ?? "#E74888",
      discountLotPrice: product.discountLotPrice ?? "",
      sortOrder: String(product.sortOrder),
      isArchived: product.isArchived,
    } : emptyProductForm());
    setProductDialogOpen(true);
  }

  function saveProduct() {
    const payload = {
      nameFr: productForm.nameFr,
      nameAr: productForm.nameAr,
      unitPrice: productForm.unitPrice,
      lotQuantity: toInteger(productForm.lotQuantity, 1),
      packagingLabel: productForm.packagingLabel,
      brandId: productForm.brandId,
      categoryIds: productForm.categoryIds,
      imageAssetId: productForm.imageAssetId || undefined,
      stockLots: Math.max(0, toInteger(productForm.stockLots, 0)),
      lowStockThreshold: Math.max(0, toInteger(productForm.lowStockThreshold, 0)),
      sku: productForm.sku || undefined,
      description: productForm.description || undefined,
      badgeLabel: productForm.badgeLabel || undefined,
      badgeColor: productForm.badgeColor || undefined,
      discountLotPrice: productForm.discountLotPrice || undefined,
      sortOrder: toInteger(productForm.sortOrder, 0),
    };
    if (editingProductId) updateProduct.mutate({ id: editingProductId, data: { ...payload, isArchived: productForm.isArchived } });
    else createProduct.mutate(payload);
  }

  function openCategory(category?: CategoryItem) {
    setEditingCategoryId(category?.id ?? null);
    setCategoryForm(category ? { nameFr: category.nameFr, nameAr: category.nameAr, imageAssetId: category.image?.id ?? "", isActive: category.isActive, isFeatured: category.isFeatured, sortOrder: String(category.sortOrder) } : emptyCategoryForm());
    setCategoryDialogOpen(true);
  }

  function saveCategory() {
    const data = { ...categoryForm, imageAssetId: categoryForm.imageAssetId || undefined, sortOrder: toInteger(categoryForm.sortOrder, 0) };
    if (editingCategoryId) updateCategory.mutate({ id: editingCategoryId, data });
    else createCategory.mutate(data);
  }

  function openBrand(brand?: BrandItem) {
    setEditingBrandId(brand?.id ?? null);
    setBrandForm(brand ? { name: brand.name, logoAssetId: brand.logo?.id ?? "", isActive: brand.isActive, isFeatured: brand.isFeatured, sortOrder: String(brand.sortOrder) } : emptyBrandForm());
    setBrandDialogOpen(true);
  }

  function saveBrand() {
    const data = { ...brandForm, logoAssetId: brandForm.logoAssetId || undefined, sortOrder: toInteger(brandForm.sortOrder, 0) };
    if (editingBrandId) updateBrand.mutate({ id: editingBrandId, data });
    else createBrand.mutate(data);
  }

  function openBanner(banner?: BannerItem) {
    setEditingBannerId(banner?.id ?? null);
    setBannerForm(banner ? { imageAssetId: banner.image?.id ?? "", isActive: banner.isActive, sortOrder: String(banner.sortOrder) } : emptyBannerForm());
    setBannerDialogOpen(true);
  }

  function saveBanner() {
    const data = { imageAssetId: bannerForm.imageAssetId, isActive: bannerForm.isActive, sortOrder: toInteger(bannerForm.sortOrder, 0) };
    if (editingBannerId) updateBanner.mutate({ id: editingBannerId, data });
    else createBanner.mutate(data);
  }

  function submitStock() {
    if (!stockForm) return;
    const quantity = Math.max(1, toInteger(stockForm.quantity, 1));
    const quantityLotsDelta = stockForm.direction === "add" ? quantity : -quantity;
    adjustStock.mutate({ productId: stockForm.productId, quantityLotsDelta, note: stockForm.note || (stockForm.direction === "add" ? adminLabels.addStock : adminLabels.removeStock) });
  }

  function openCustomer(customer: CustomerItem) {
    setEditingCustomerId(customer.id);
    setCustomerForm({ fullName: customer.profileFullName ?? customer.name, phoneNumber: customer.phoneNumberLocal ?? customer.phoneNumber ?? "", wilayaId: "", communeId: "", streetAddress: customer.streetAddress ?? "" });
    setCustomerDialogOpen(true);
  }

  async function saveCustomer() {
    if (!editingCustomerId) return;
    try {
      await updateCustomerProfile.mutateAsync({ userId: editingCustomerId, fullName: customerForm.fullName, wilayaId: customerForm.wilayaId, communeId: customerForm.communeId, streetAddress: customerForm.streetAddress });
      await updatePhone.mutateAsync({ userId: editingCustomerId, phoneNumber: customerForm.phoneNumber });
      await queryClient.invalidateQueries();
      setCustomerDialogOpen(false);
    } catch (error) {
      showError(error, "Erreur");
    }
  }

  function toggleUserDisabled(userId: string, isDisabled: boolean) {
    if (isDisabled) enableUser.mutate({ userId });
    else disableUser.mutate({ userId });
  }

  function movementLabel(reason: string) {
    if (reason === "order_processing") return adminLabels.orderProcessing;
    if (reason === "order_cancellation") return adminLabels.orderCancellation;
    return adminLabels.manualAdjustment;
  }

  if (adminProbe.isError) {
    return (
      <Container className="p-6">
        <ShellEmptyState icon="shield-outline" title={t("adminLockedTitle")} body={t("adminLockedBody")} />
      </Container>
    );
  }

  const productRows = products.data ?? [];
  const orderRows = orders.data ?? [];
  const toCallOrderRows = toCallOrders.data ?? [];
  const lowStockProducts = productRows.filter((product) => product.lowStockThreshold !== null && product.stockLots <= product.lowStockThreshold);
  const incompleteProducts = productRows.filter((product) => !product.image || product.stockLots === 0 || !product.description || product.categories.length === 0 || product.brand?.isActive === false);
  const adminUsers = (adminProbe.data ?? []).filter((user) => user.role === "admin" || user.role === "owner");
  const brandOptions = (brands.data ?? []).map((brand) => ({ id: brand.id, label: brand.name }));
  const categoryOptions = (categories.data ?? []).map((category) => ({ id: category.id, label: category.nameFr }));
  const wilayaOptions = (wilayas.data ?? []).map((wilaya) => ({ id: wilaya.id, label: `${wilaya.code} - ${wilaya.nameFr}` }));
  const communeOptions = (communes.data ?? []).map((commune) => ({ id: commune.id, label: commune.nameFr }));

  return (
    <Container className="p-6">
      <View style={{ gap: 18 }}>
        <RestartRtlBanner />
        <View style={{ gap: 6 }}>
          <Text selectable style={{ color: isDark ? "#F8FAFC" : joumlaColors.navy, fontSize: 30, fontWeight: "700", textAlign: isRtl ? "right" : "left" }}>{t("admin")}</Text>
          <Text selectable style={{ color: joumlaColors.slate, textAlign: isRtl ? "right" : "left" }}>Joumla Store</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, flexDirection: isRtl ? "row-reverse" : "row" }}>
          {tabs.map((tab) => <Pill key={tab} label={adminLabels[tab]} active={activeTab === tab} onPress={() => setActiveTab(tab)} />)}
        </ScrollView>

        {adminProbe.isLoading ? <Spinner size="sm" color="default" /> : null}

        {activeTab === "dashboard" ? (
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: isRtl ? "row-reverse" : "row", flexWrap: "wrap", gap: 10 }}>
              <AdminCard><Text selectable style={{ color: joumlaColors.slate }}>{adminLabels.ordersToCall}</Text><Text selectable style={{ color: isDark ? "#F8FAFC" : joumlaColors.navy, fontSize: 26, fontWeight: "700" }}>{toCallOrderRows.length}</Text></AdminCard>
              <AdminCard><Text selectable style={{ color: joumlaColors.slate }}>{adminLabels.lowStockProducts}</Text><Text selectable style={{ color: isDark ? "#F8FAFC" : joumlaColors.navy, fontSize: 26, fontWeight: "700" }}>{lowStockProducts.length}</Text></AdminCard>
              <AdminCard><Text selectable style={{ color: joumlaColors.slate }}>{adminLabels.incompleteProducts}</Text><Text selectable style={{ color: isDark ? "#F8FAFC" : joumlaColors.navy, fontSize: 26, fontWeight: "700" }}>{incompleteProducts.length}</Text></AdminCard>
            </View>
            <SectionHeader title={adminLabels.ordersToCall} />
            {toCallOrderRows.slice(0, 5).map((order) => <AdminCard key={order.id}><Text selectable style={{ color: isDark ? "#F8FAFC" : joumlaColors.navy, fontWeight: "700" }}>{order.orderNumber}</Text><Text selectable style={{ color: joumlaColors.slate }}>{order.customerFullNameSnapshot} · {formatDa(order.totalAmountSnapshot)}</Text></AdminCard>)}
            <SectionHeader title={adminLabels.lowStockProducts} />
            {lowStockProducts.length === 0 ? <Text selectable style={{ color: joumlaColors.slate }}>{adminLabels.noData}</Text> : null}
            {lowStockProducts.slice(0, 8).map((product) => <AdminCard key={product.id}><Text selectable style={{ color: isDark ? "#F8FAFC" : joumlaColors.navy, fontWeight: "700" }}>{product.nameFr}</Text><Text selectable style={{ color: joumlaColors.pink }}>{product.stockLots} {adminLabels.lots} · {adminLabels.lowStock} {product.lowStockThreshold}</Text></AdminCard>)}
          </View>
        ) : null}

        {activeTab === "orders" ? (
          <View style={{ gap: 12 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, flexDirection: isRtl ? "row-reverse" : "row" }}>
              <Pill label={adminLabels.all} active={!orderStatus} onPress={() => setOrderStatus(undefined)} />
              {statuses.map((status) => <Pill key={status} label={getOrderStatusLabel(language, status)} active={orderStatus === status} onPress={() => setOrderStatus(status)} />)}
            </ScrollView>
            {orderRows.length === 0 ? <Text selectable style={{ color: joumlaColors.slate }}>{adminLabels.noData}</Text> : null}
            {orderRows.map((order) => (
              <AdminCard key={order.id}>
                <Text selectable style={{ color: isDark ? "#F8FAFC" : joumlaColors.navy, fontSize: 18, fontWeight: "700", textAlign: isRtl ? "right" : "left" }}>{order.orderNumber}</Text>
                <Text selectable style={{ color: isDark ? "#CBD5E1" : joumlaColors.slate, textAlign: isRtl ? "right" : "left" }}>{order.customerFullNameSnapshot} · {order.customerPhoneLocalSnapshot ?? order.customerPhoneSnapshot}</Text>
                <Text selectable style={{ color: joumlaColors.pink, fontWeight: "700", textAlign: isRtl ? "right" : "left" }}>{formatDa(order.totalAmountSnapshot)}</Text>
                <View style={{ flexDirection: isRtl ? "row-reverse" : "row", flexWrap: "wrap", gap: 8 }}>
                  <Button size="sm" variant="secondary" onPress={() => Linking.openURL(`tel:${order.customerPhoneSnapshot}`)}><Button.Label>{adminLabels.call}</Button.Label></Button>
                  {statuses.map((status) => <Button key={status} size="sm" variant={order.status === status ? "secondary" : "outline"} onPress={() => updateStatus.mutate({ orderId: order.id, status })}><Button.Label>{getOrderStatusLabel(language, status)}</Button.Label></Button>)}
                  <Button size="sm" onPress={() => setBlOrderId(order.id)}><Button.Label>{adminLabels.generateBl}</Button.Label></Button>
                </View>
              </AdminCard>
            ))}
          </View>
        ) : null}

        {activeTab === "products" ? (
          <View style={{ gap: 12 }}>
            <SectionHeader title={adminLabels.products} action={<Button size="sm" onPress={() => openProduct()}><Button.Label>{adminLabels.createProduct}</Button.Label></Button>} />
            {productRows.map((product) => <AdminCard key={product.id}><Text selectable style={{ color: isDark ? "#F8FAFC" : joumlaColors.navy, fontSize: 17, fontWeight: "700", textAlign: isRtl ? "right" : "left" }}>{product.nameFr}</Text><Text selectable style={{ color: joumlaColors.slate, textAlign: isRtl ? "right" : "left" }}>{product.brand?.name ?? "-"} · {product.categories.map((category) => category.nameFr).join(", ") || "-"}</Text><Text selectable style={{ color: joumlaColors.pink, fontWeight: "700", textAlign: isRtl ? "right" : "left" }}>{product.stockLots} {adminLabels.lots} · {formatDa(product.lotPrice)}</Text><View style={{ flexDirection: isRtl ? "row-reverse" : "row", gap: 8, flexWrap: "wrap" }}><Button size="sm" variant="secondary" onPress={() => openProduct(product)}><Button.Label>{adminLabels.edit}</Button.Label></Button><Button size="sm" variant="outline" onPress={() => archiveProduct.mutate({ id: product.id, isArchived: !product.isArchived })}><Button.Label>{product.isArchived ? adminLabels.restore : adminLabels.archive}</Button.Label></Button></View></AdminCard>)}
          </View>
        ) : null}

        {activeTab === "categories" ? (
          <View style={{ gap: 12 }}>
            <SectionHeader title={adminLabels.categories} action={<Button size="sm" onPress={() => openCategory()}><Button.Label>{adminLabels.createCategory}</Button.Label></Button>} />
            {(categories.data ?? []).map((category) => <AdminCard key={category.id}><Text selectable style={{ color: isDark ? "#F8FAFC" : joumlaColors.navy, fontWeight: "700", textAlign: isRtl ? "right" : "left" }}>{category.nameFr}</Text><Text selectable style={{ color: joumlaColors.slate, textAlign: isRtl ? "right" : "left" }}>{category.nameAr}</Text><View style={{ flexDirection: isRtl ? "row-reverse" : "row", gap: 8, flexWrap: "wrap" }}><Pill label={category.isActive ? adminLabels.active : adminLabels.hidden} active={category.isActive} /><Pill label={adminLabels.featured} active={category.isFeatured} /><Button size="sm" variant="secondary" onPress={() => openCategory(category)}><Button.Label>{adminLabels.edit}</Button.Label></Button></View></AdminCard>)}
          </View>
        ) : null}

        {activeTab === "brands" ? (
          <View style={{ gap: 12 }}>
            <SectionHeader title={adminLabels.brands} action={<Button size="sm" onPress={() => openBrand()}><Button.Label>{adminLabels.createBrand}</Button.Label></Button>} />
            {(brands.data ?? []).map((brand) => <AdminCard key={brand.id}><Text selectable style={{ color: isDark ? "#F8FAFC" : joumlaColors.navy, fontWeight: "700", textAlign: isRtl ? "right" : "left" }}>{brand.name}</Text><View style={{ flexDirection: isRtl ? "row-reverse" : "row", gap: 8, flexWrap: "wrap" }}><Pill label={brand.isActive ? adminLabels.active : adminLabels.hidden} active={brand.isActive} /><Pill label={adminLabels.featured} active={brand.isFeatured} /><Button size="sm" variant="secondary" onPress={() => openBrand(brand)}><Button.Label>{adminLabels.edit}</Button.Label></Button></View></AdminCard>)}
          </View>
        ) : null}

        {activeTab === "banners" ? (
          <View style={{ gap: 12 }}>
            <SectionHeader title={adminLabels.banners} action={<Button size="sm" onPress={() => openBanner()}><Button.Label>{adminLabels.createBanner}</Button.Label></Button>} />
            {(banners.data ?? []).map((banner) => <AdminCard key={banner.id}><Text selectable style={{ color: isDark ? "#F8FAFC" : joumlaColors.navy, fontWeight: "700", textAlign: isRtl ? "right" : "left" }}>#{banner.sortOrder}</Text><View style={{ flexDirection: isRtl ? "row-reverse" : "row", gap: 8, flexWrap: "wrap" }}><Pill label={banner.isActive ? adminLabels.active : adminLabels.hidden} active={banner.isActive} /><Button size="sm" variant="secondary" onPress={() => openBanner(banner)}><Button.Label>{adminLabels.edit}</Button.Label></Button></View></AdminCard>)}
          </View>
        ) : null}

        {activeTab === "stock" ? (
          <View style={{ gap: 12 }}>
            <SectionHeader title={adminLabels.stock} />
            {productRows.map((product) => <AdminCard key={product.id}><Text selectable style={{ color: isDark ? "#F8FAFC" : joumlaColors.navy, fontWeight: "700", textAlign: isRtl ? "right" : "left" }}>{product.nameFr}</Text><Text selectable style={{ color: product.lowStockThreshold !== null && product.stockLots <= product.lowStockThreshold ? joumlaColors.pink : joumlaColors.slate, textAlign: isRtl ? "right" : "left" }}>{product.stockLots} {adminLabels.lots} · {adminLabels.lowStock} {product.lowStockThreshold ?? adminLabels.noAlert}</Text><View style={{ flexDirection: isRtl ? "row-reverse" : "row", gap: 8 }}><Button size="sm" onPress={() => setStockForm({ productId: product.id, productName: product.nameFr, direction: "add", quantity: "1", note: "" })}><Button.Label>{adminLabels.addStock}</Button.Label></Button><Button size="sm" variant="secondary" onPress={() => setStockForm({ productId: product.id, productName: product.nameFr, direction: "remove", quantity: "1", note: "" })}><Button.Label>{adminLabels.removeStock}</Button.Label></Button></View></AdminCard>)}
            <SectionHeader title={adminLabels.stockHistory} />
            {(stockMovements.data ?? []).slice(0, 40).map((movement) => <AdminCard key={movement.id}><Text selectable style={{ color: isDark ? "#F8FAFC" : joumlaColors.navy, fontWeight: "700", textAlign: isRtl ? "right" : "left" }}>{movement.product?.nameFr}</Text><Text selectable style={{ color: movement.quantityLotsDelta < 0 ? joumlaColors.pink : "#067647", fontWeight: "700", textAlign: isRtl ? "right" : "left" }}>{movement.quantityLotsDelta > 0 ? "+" : ""}{movement.quantityLotsDelta} {adminLabels.lots}</Text><Text selectable style={{ color: joumlaColors.slate, textAlign: isRtl ? "right" : "left" }}>{movementLabel(movement.reason)} · {movement.order?.orderNumber ?? movement.adminUser?.name ?? "Systeme"}</Text><Text selectable style={{ color: joumlaColors.slate, textAlign: isRtl ? "right" : "left" }}>{new Date(movement.createdAt).toLocaleString(language === "ar" ? "ar-DZ" : "fr-FR")}</Text></AdminCard>)}
          </View>
        ) : null}

        {activeTab === "customers" ? (
          <View style={{ gap: 12 }}>
            <SectionHeader title={adminLabels.customers} />
            {(customers.data ?? []).map((customer) => <AdminCard key={customer.id}><Text selectable style={{ color: isDark ? "#F8FAFC" : joumlaColors.navy, fontWeight: "700", textAlign: isRtl ? "right" : "left" }}>{customer.profileFullName ?? customer.name}</Text><Text selectable style={{ color: joumlaColors.slate, textAlign: isRtl ? "right" : "left" }}>{customer.phoneNumberLocal ?? customer.phoneNumber} · {customer.streetAddress ?? "-"}</Text><View style={{ flexDirection: isRtl ? "row-reverse" : "row", gap: 8, flexWrap: "wrap" }}><Pill label={customer.isDisabled ? adminLabels.disabled : adminLabels.active} active={!customer.isDisabled} danger={customer.isDisabled} /><Button size="sm" variant="secondary" onPress={() => openCustomer(customer)}><Button.Label>{adminLabels.edit}</Button.Label></Button><Button size="sm" variant="outline" onPress={() => toggleUserDisabled(customer.id, customer.isDisabled)}><Button.Label>{customer.isDisabled ? adminLabels.unblock : adminLabels.block}</Button.Label></Button></View></AdminCard>)}
          </View>
        ) : null}

        {activeTab === "admins" ? (
          <View style={{ gap: 12 }}>
            <SectionHeader title={adminLabels.admins} action={<Button size="sm" onPress={() => setAdminDialogOpen(true)}><Button.Label>{adminLabels.createAdmin}</Button.Label></Button>} />
            {adminUsers.map((adminUser) => <AdminCard key={adminUser.id}><Text selectable style={{ color: isDark ? "#F8FAFC" : joumlaColors.navy, fontWeight: "700", textAlign: isRtl ? "right" : "left" }}>{adminUser.name}</Text><Text selectable style={{ color: joumlaColors.slate, textAlign: isRtl ? "right" : "left" }}>{adminUser.email} · {adminUser.role}</Text><View style={{ flexDirection: isRtl ? "row-reverse" : "row", gap: 8, flexWrap: "wrap" }}><Pill label={adminUser.isDisabled ? adminLabels.disabled : adminLabels.active} active={!adminUser.isDisabled} danger={adminUser.isDisabled} /><Button size="sm" variant="outline" isDisabled={adminUser.isSeedOwner} onPress={() => toggleUserDisabled(adminUser.id, adminUser.isDisabled)}><Button.Label>{adminUser.isDisabled ? adminLabels.unblock : adminLabels.block}</Button.Label></Button></View></AdminCard>)}
          </View>
        ) : null}

        {activeTab === "announcements" ? (
          <View style={{ gap: 12 }}>
            <AdminCard><Field label={adminLabels.title} value={announcement.title} onChangeText={(title) => setAnnouncement({ ...announcement, title })} /><Field label={adminLabels.body} value={announcement.body} multiline onChangeText={(body) => setAnnouncement({ ...announcement, body })} /><ToggleLine label={announcement.sendPush ? adminLabels.pushOn : adminLabels.pushOff} value={announcement.sendPush} onChange={(sendPush) => setAnnouncement({ ...announcement, sendPush })} /><Button isDisabled={createAnnouncement.isPending} onPress={() => createAnnouncement.mutate(announcement)}><Button.Label>{adminLabels.publish}</Button.Label></Button></AdminCard>
            {(announcements.data ?? []).map((item) => <AdminCard key={item.id}><Text selectable style={{ color: isDark ? "#F8FAFC" : joumlaColors.navy, fontWeight: "700", textAlign: isRtl ? "right" : "left" }}>{item.title}</Text><Text selectable style={{ color: joumlaColors.slate, textAlign: isRtl ? "right" : "left" }}>{item.body}</Text></AdminCard>)}
          </View>
        ) : null}

        {activeTab === "settings" ? (
          <View style={{ gap: 12 }}>
            <AdminCard>
              <Text selectable style={{ color: isDark ? "#F8FAFC" : joumlaColors.navy, fontWeight: "700", textAlign: isRtl ? "right" : "left" }}>{adminLabels.settingsOverview}</Text>
              <Text selectable style={{ color: joumlaColors.slate, textAlign: isRtl ? "right" : "left" }}>{adminLabels.settingsOverviewBody}</Text>
            </AdminCard>
            <AdminCard>
              <Text selectable style={{ color: isDark ? "#F8FAFC" : joumlaColors.navy, fontWeight: "700", textAlign: isRtl ? "right" : "left" }}>{adminLabels.mobileConnection}</Text>
              <Text selectable style={{ color: joumlaColors.slate, textAlign: isRtl ? "right" : "left" }}>{adminLabels.mobileConnectionBody}</Text>
            </AdminCard>
            <SectionHeader title={adminLabels.notificationPrefs} />
            {(notificationPrefs.data ?? []).map((pref) => <AdminCard key={pref.userId}><Text selectable style={{ color: isDark ? "#F8FAFC" : joumlaColors.navy, fontWeight: "700", textAlign: isRtl ? "right" : "left" }}>{pref.name}</Text><Text selectable style={{ color: joumlaColors.slate, textAlign: isRtl ? "right" : "left" }}>{pref.email}</Text><Text selectable style={{ color: joumlaColors.slate, textAlign: isRtl ? "right" : "left" }}>{pref.receivesNewOrderEmail ? adminLabels.emailActive : adminLabels.emailInactive} · {pref.receivesNewOrderPush ? adminLabels.pushActive : adminLabels.pushInactive}</Text></AdminCard>)}
          </View>
        ) : null}

        <AdminModal title={editingProductId ? adminLabels.editProduct : adminLabels.createProduct} visible={productDialogOpen} onClose={() => setProductDialogOpen(false)}>
          <Field label={adminLabels.nameFr} value={productForm.nameFr} onChangeText={(nameFr) => setProductForm({ ...productForm, nameFr })} />
          <Field label={adminLabels.nameAr} value={productForm.nameAr} onChangeText={(nameAr) => setProductForm({ ...productForm, nameAr })} />
          <Field label={adminLabels.unitPrice} value={productForm.unitPrice} keyboardType="numeric" onChangeText={(unitPrice) => setProductForm({ ...productForm, unitPrice })} />
          <Field label={adminLabels.lotQuantity} value={productForm.lotQuantity} keyboardType="numeric" onChangeText={(lotQuantity) => setProductForm({ ...productForm, lotQuantity })} />
          <Field label={adminLabels.packaging} value={productForm.packagingLabel} onChangeText={(packagingLabel) => setProductForm({ ...productForm, packagingLabel })} />
          <Field label={adminLabels.stockLots} value={productForm.stockLots} keyboardType="numeric" onChangeText={(stockLots) => setProductForm({ ...productForm, stockLots })} />
          <SelectChips label={adminLabels.brand} emptyLabel={adminLabels.selectBrand} value={productForm.brandId} items={brandOptions} onChange={(brandId) => setProductForm({ ...productForm, brandId })} />
          <MultiSelectChips label={adminLabels.category} emptyLabel={adminLabels.selectCategories} values={productForm.categoryIds} items={categoryOptions} onChange={(categoryIds) => setProductForm({ ...productForm, categoryIds })} />
          <UploadButton label={adminLabels.uploadImage} readyLabel={adminLabels.imageReady} ready={!!productForm.imageAssetId} onPress={() => upload("product", (imageAssetId) => setProductForm({ ...productForm, imageAssetId }))} />
          <Field label={adminLabels.description} value={productForm.description} multiline onChangeText={(description) => setProductForm({ ...productForm, description })} />
          <Field label={adminLabels.reference} value={productForm.sku} onChangeText={(sku) => setProductForm({ ...productForm, sku })} />
          <Field label={adminLabels.lowStock} value={productForm.lowStockThreshold} keyboardType="numeric" onChangeText={(lowStockThreshold) => setProductForm({ ...productForm, lowStockThreshold })} />
          <Field label={adminLabels.badge} value={productForm.badgeLabel} onChangeText={(badgeLabel) => setProductForm({ ...productForm, badgeLabel })} />
          <Field label={adminLabels.discount} value={productForm.discountLotPrice} keyboardType="numeric" onChangeText={(discountLotPrice) => setProductForm({ ...productForm, discountLotPrice })} />
          <Field label={adminLabels.sortOrder} value={productForm.sortOrder} keyboardType="numeric" onChangeText={(sortOrder) => setProductForm({ ...productForm, sortOrder })} />
          <Button isDisabled={createProduct.isPending || updateProduct.isPending} onPress={saveProduct}><Button.Label>{adminLabels.save}</Button.Label></Button>
        </AdminModal>

        <AdminModal title={editingCategoryId ? adminLabels.editCategory : adminLabels.createCategory} visible={categoryDialogOpen} onClose={() => setCategoryDialogOpen(false)}>
          <Field label={adminLabels.nameFr} value={categoryForm.nameFr} onChangeText={(nameFr) => setCategoryForm({ ...categoryForm, nameFr })} />
          <Field label={adminLabels.nameAr} value={categoryForm.nameAr} onChangeText={(nameAr) => setCategoryForm({ ...categoryForm, nameAr })} />
          <UploadButton label={adminLabels.uploadImage} readyLabel={adminLabels.imageReady} ready={!!categoryForm.imageAssetId} onPress={() => upload("category", (imageAssetId) => setCategoryForm({ ...categoryForm, imageAssetId }))} />
          <ToggleLine label={adminLabels.active} value={categoryForm.isActive} onChange={(isActive) => setCategoryForm({ ...categoryForm, isActive })} />
          <ToggleLine label={adminLabels.featured} value={categoryForm.isFeatured} onChange={(isFeatured) => setCategoryForm({ ...categoryForm, isFeatured })} />
          <Field label={adminLabels.sortOrder} value={categoryForm.sortOrder} keyboardType="numeric" onChangeText={(sortOrder) => setCategoryForm({ ...categoryForm, sortOrder })} />
          <Button isDisabled={createCategory.isPending || updateCategory.isPending} onPress={saveCategory}><Button.Label>{adminLabels.save}</Button.Label></Button>
        </AdminModal>

        <AdminModal title={editingBrandId ? adminLabels.editBrand : adminLabels.createBrand} visible={brandDialogOpen} onClose={() => setBrandDialogOpen(false)}>
          <Field label={adminLabels.name} value={brandForm.name} onChangeText={(name) => setBrandForm({ ...brandForm, name })} />
          <UploadButton label={adminLabels.uploadLogo} readyLabel={adminLabels.logoReady} ready={!!brandForm.logoAssetId} onPress={() => upload("brand", (logoAssetId) => setBrandForm({ ...brandForm, logoAssetId }))} />
          <ToggleLine label={adminLabels.active} value={brandForm.isActive} onChange={(isActive) => setBrandForm({ ...brandForm, isActive })} />
          <ToggleLine label={adminLabels.featured} value={brandForm.isFeatured} onChange={(isFeatured) => setBrandForm({ ...brandForm, isFeatured })} />
          <Field label={adminLabels.sortOrder} value={brandForm.sortOrder} keyboardType="numeric" onChangeText={(sortOrder) => setBrandForm({ ...brandForm, sortOrder })} />
          <Button isDisabled={createBrand.isPending || updateBrand.isPending} onPress={saveBrand}><Button.Label>{adminLabels.save}</Button.Label></Button>
        </AdminModal>

        <AdminModal title={editingBannerId ? adminLabels.editBanner : adminLabels.createBanner} visible={bannerDialogOpen} onClose={() => setBannerDialogOpen(false)}>
          <UploadButton label={adminLabels.uploadImage} readyLabel={adminLabels.imageReady} ready={!!bannerForm.imageAssetId} onPress={() => upload("banner", (imageAssetId) => setBannerForm({ ...bannerForm, imageAssetId }))} />
          <ToggleLine label={adminLabels.active} value={bannerForm.isActive} onChange={(isActive) => setBannerForm({ ...bannerForm, isActive })} />
          <Field label={adminLabels.sortOrder} value={bannerForm.sortOrder} keyboardType="numeric" onChangeText={(sortOrder) => setBannerForm({ ...bannerForm, sortOrder })} />
          <Button isDisabled={createBanner.isPending || updateBanner.isPending} onPress={saveBanner}><Button.Label>{adminLabels.save}</Button.Label></Button>
        </AdminModal>

        <AdminModal title={stockForm?.direction === "add" ? adminLabels.addStock : adminLabels.removeStock} visible={!!stockForm} onClose={() => setStockForm(null)}>
          {stockForm ? <><Text selectable style={{ color: isDark ? "#F8FAFC" : joumlaColors.navy, fontWeight: "700", textAlign: isRtl ? "right" : "left" }}>{stockForm.productName}</Text><Field label={adminLabels.quantity} value={stockForm.quantity} keyboardType="numeric" onChangeText={(quantity) => setStockForm({ ...stockForm, quantity })} /><Field label={adminLabels.reason} value={stockForm.note} onChangeText={(note) => setStockForm({ ...stockForm, note })} /><Button isDisabled={adjustStock.isPending} onPress={submitStock}><Button.Label>{adminLabels.save}</Button.Label></Button></> : null}
        </AdminModal>

        <AdminModal title={adminLabels.customers} visible={customerDialogOpen} onClose={() => setCustomerDialogOpen(false)}>
          <Field label={adminLabels.name} value={customerForm.fullName} onChangeText={(fullName) => setCustomerForm({ ...customerForm, fullName })} />
          <Field label={adminLabels.phone} value={customerForm.phoneNumber} keyboardType="phone-pad" onChangeText={(phoneNumber) => setCustomerForm({ ...customerForm, phoneNumber })} />
          <SelectChips label={adminLabels.wilaya} emptyLabel={adminLabels.selectWilaya} value={customerForm.wilayaId} items={wilayaOptions} onChange={(wilayaId) => setCustomerForm({ ...customerForm, wilayaId, communeId: "" })} />
          <SelectChips label={adminLabels.commune} emptyLabel={adminLabels.selectCommune} value={customerForm.communeId} items={communeOptions} onChange={(communeId) => setCustomerForm({ ...customerForm, communeId })} />
          <Field label={adminLabels.address} value={customerForm.streetAddress} multiline onChangeText={(streetAddress) => setCustomerForm({ ...customerForm, streetAddress })} />
          <Button isDisabled={updateCustomerProfile.isPending || updatePhone.isPending} onPress={saveCustomer}><Button.Label>{adminLabels.save}</Button.Label></Button>
        </AdminModal>

        <AdminModal title={adminLabels.createAdmin} visible={adminDialogOpen} onClose={() => setAdminDialogOpen(false)}>
          <Field label={adminLabels.name} value={adminForm.name} onChangeText={(name) => setAdminForm({ ...adminForm, name })} />
          <Field label={adminLabels.email} value={adminForm.email} keyboardType="email-address" onChangeText={(email) => setAdminForm({ ...adminForm, email })} />
          <Field label={adminLabels.password} value={adminForm.password} secureTextEntry onChangeText={(password) => setAdminForm({ ...adminForm, password })} />
          <Button isDisabled={createAdmin.isPending} onPress={() => createAdmin.mutate(adminForm)}><Button.Label>{adminLabels.create}</Button.Label></Button>
        </AdminModal>

        <AdminModal title={adminLabels.generateBl} visible={!!blOrderId} onClose={() => setBlOrderId(null)}>
          <Field label={adminLabels.oldBalance} value={bl.oldBalance} keyboardType="numeric" onChangeText={(oldBalance) => setBl({ ...bl, oldBalance })} />
          <Field label={adminLabels.payment} value={bl.paymentAmount} keyboardType="numeric" onChangeText={(paymentAmount) => setBl({ ...bl, paymentAmount })} />
          <Field label={adminLabels.newBalance} value={bl.newBalance} keyboardType="numeric" onChangeText={(newBalance) => setBl({ ...bl, newBalance })} />
          <Button onPress={() => blOrderId ? shareBl(blOrderId) : undefined}><Button.Label>{adminLabels.generateBl}</Button.Label></Button>
        </AdminModal>
      </View>
    </Container>
  );
}
