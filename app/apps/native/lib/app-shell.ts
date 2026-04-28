export const joumlaColors = {
  navy: "#0A1B46",
  navySoft: "#16285E",
  pink: "#E74888",
  pinkSoft: "#F9D7E6",
  cream: "#F6F4F8",
  slate: "#667085",
  line: "#E6E8EC",
  darkSurface: "#121826",
  darkCard: "#1B2234",
} as const;

export type AppLanguage = "fr" | "ar";
export type ThemeMode = "system" | "light" | "dark";

export type TranslationKey =
  | "appName"
  | "appTagline"
  | "home"
  | "products"
  | "search"
  | "cart"
  | "favorites"
  | "brands"
  | "categories"
  | "productDetail"
  | "profile"
  | "orders"
  | "orderDetail"
  | "notifications"
  | "language"
  | "admin"
  | "login"
  | "logout"
  | "theme"
  | "systemTheme"
  | "lightTheme"
  | "darkTheme"
  | "shopWholesale"
  | "restartRtlTitle"
  | "restartRtlBody"
  | "languageSectionTitle"
  | "themeSectionTitle"
  | "adminLockedTitle"
  | "adminLockedBody"
  | "orderHistoryEmpty"
  | "favoritesEmpty"
  | "cartEmpty"
  | "searchHint"
  | "productsHint"
  | "continueBrowsing"
  | "clientArea"
  | "clientAreaBody"
  | "accountConnected"
  | "accountGuest"
  | "shellBadge"
  | "rtlPending";

const translations: Record<AppLanguage, Record<TranslationKey, string>> = {
  fr: {
    appName: "Joumla Store",
    appTagline: "Emballage, epicerie et achat en gros.",
    home: "Accueil",
    products: "Produits",
    search: "Recherche",
    cart: "Panier",
    favorites: "Favoris",
    brands: "Marques",
    categories: "Categories",
    productDetail: "Detail produit",
    profile: "Profil",
    orders: "Commandes",
    orderDetail: "Detail commande",
    notifications: "Notifications",
    language: "Langue",
    admin: "Admin",
    login: "Connexion",
    logout: "Deconnexion",
    theme: "Theme",
    systemTheme: "Systeme",
    lightTheme: "Clair",
    darkTheme: "Sombre",
    shopWholesale: "Catalogue de gros accessible avant connexion.",
    restartRtlTitle: "RTL a appliquer",
    restartRtlBody: "La langue a ete enregistree. Un redemarrage de l'app peut etre necessaire pour appliquer completement le RTL.",
    languageSectionTitle: "Langue de l'application",
    themeSectionTitle: "Apparence",
    adminLockedTitle: "Espace admin protege",
    adminLockedBody: "Cette entree apparait uniquement pour les comptes admin et owner.",
    orderHistoryEmpty: "Vos commandes apparaitront ici apres le premier achat.",
    favoritesEmpty: "Ajoutez des produits a vos favoris pour les retrouver rapidement.",
    cartEmpty: "Le panier local sera branche dans l'etape checkout.",
    searchHint: "La recherche catalogue et les filtres seront relies au backend Joumla.",
    productsHint: "Parcourez les familles, marques et meilleurs lots Joumla.",
    continueBrowsing: "Continuer la navigation",
    clientArea: "Espace client",
    clientAreaBody: "Connectez-vous pour retrouver votre profil, vos favoris et vos futures commandes.",
    accountConnected: "Compte connecte",
    accountGuest: "Compte visiteur",
    shellBadge: "Fondation mobile Joumla",
    rtlPending: "RTL en attente de redemarrage",
  },
  ar: {
    appName: "جملة ستور",
    appTagline: "تغليف، مواد غذائية وشراء بالجملة.",
    home: "الرئيسية",
    products: "المنتجات",
    search: "البحث",
    cart: "السلة",
    favorites: "المفضلة",
    brands: "العلامات",
    categories: "الاصناف",
    productDetail: "تفاصيل المنتج",
    profile: "الملف الشخصي",
    orders: "الطلبات",
    orderDetail: "تفاصيل الطلب",
    notifications: "الاشعارات",
    language: "اللغة",
    admin: "الادارة",
    login: "تسجيل الدخول",
    logout: "تسجيل الخروج",
    theme: "المظهر",
    systemTheme: "النظام",
    lightTheme: "فاتح",
    darkTheme: "داكن",
    shopWholesale: "كتالوج الجملة متاح قبل تسجيل الدخول.",
    restartRtlTitle: "تفعيل اتجاه RTL",
    restartRtlBody: "تم حفظ اللغة. قد تحتاج لاعادة تشغيل التطبيق لتطبيق RTL بالكامل.",
    languageSectionTitle: "لغة التطبيق",
    themeSectionTitle: "المظهر",
    adminLockedTitle: "مساحة الادارة محمية",
    adminLockedBody: "هذا المدخل يظهر فقط لحسابات الادمن والمالك.",
    orderHistoryEmpty: "ستظهر طلباتك هنا بعد اول عملية شراء.",
    favoritesEmpty: "اضف منتجات الى المفضلة للوصول السريع اليها.",
    cartEmpty: "سيتم ربط السلة المحلية في خطوة الدفع.",
    searchHint: "سيتم ربط البحث والفلاتر بباك اند Joumla.",
    productsHint: "تصفح الاصناف، العلامات وافضل عروض Joumla.",
    continueBrowsing: "متابعة التصفح",
    clientArea: "مساحة العميل",
    clientAreaBody: "سجل الدخول للوصول الى ملفك، مفضلتك وطلباتك القادمة.",
    accountConnected: "الحساب متصل",
    accountGuest: "حساب زائر",
    shellBadge: "اساس تطبيق Joumla",
    rtlPending: "RTL بانتظار اعادة التشغيل",
  },
};

export function translate(language: AppLanguage, key: TranslationKey) {
  return translations[language][key];
}

export function isArabicLanguage(language: AppLanguage) {
  return language === "ar";
}

export type DrawerLink = {
  href: string;
  key: Exclude<TranslationKey, "appName" | "appTagline" | "theme" | "systemTheme" | "lightTheme" | "darkTheme" | "shopWholesale" | "restartRtlTitle" | "restartRtlBody" | "languageSectionTitle" | "themeSectionTitle" | "adminLockedTitle" | "adminLockedBody" | "orderHistoryEmpty" | "favoritesEmpty" | "cartEmpty" | "searchHint" | "productsHint" | "continueBrowsing" | "clientArea" | "clientAreaBody" | "accountConnected" | "accountGuest" | "shellBadge" | "rtlPending">;
  icon: string;
};

export const drawerLinks: DrawerLink[] = [
  { href: "/", key: "home", icon: "home-outline" },
  { href: "/products", key: "products", icon: "grid-outline" },
  { href: "/search", key: "search", icon: "search-outline" },
  { href: "/cart", key: "cart", icon: "cart-outline" },
  { href: "/favorites", key: "favorites", icon: "heart-outline" },
  { href: "/profile", key: "profile", icon: "person-outline" },
  { href: "/orders", key: "orders", icon: "receipt-outline" },
  { href: "/language", key: "language", icon: "language-outline" },
];
