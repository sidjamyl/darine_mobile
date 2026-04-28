export const adminModules = [
  { href: "/", label: "Dashboard", description: "Operational overview and shortcuts." },
  { href: "/orders", label: "Orders", description: "Call, process, cancel, and prepare customer orders." },
  { href: "/products", label: "Products", description: "Manage catalogue, images, prices, and stock visibility." },
  { href: "/stock", label: "Stock", description: "Review lots, low-stock items, and stock movements." },
  { href: "/users", label: "Users", description: "Manage clients, admins, roles, and disabled accounts." },
  { href: "/sections", label: "Sections", description: "Control banners, brands, categories, and featured products." },
  { href: "/delivery-notes", label: "BL / Factures", description: "Generate, download, and print delivery notes." },
  { href: "/announcements", label: "Announcements", description: "Publish client announcements and push messages." },
  { href: "/settings", label: "Settings", description: "Notification preferences and production configuration." },
] as const;

export type AdminModuleHref = (typeof adminModules)[number]["href"];
