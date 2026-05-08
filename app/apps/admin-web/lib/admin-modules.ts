export const adminModules = [
  { href: "/", label: "Dashboard", description: "Operational alerts and shortcuts." },
  { href: "/orders", label: "Orders", description: "Call, process, cancel, and prepare customer orders." },
  { href: "/products", label: "Products", description: "Create and maintain products, pricing, lots, and visibility." },
  { href: "/categories", label: "Categories", description: "Manage active catalogue families." },
  { href: "/brands", label: "Brands", description: "Manage supplier and private-label brands." },
  { href: "/banners", label: "Banners", description: "Control Home banner artwork." },
  { href: "/stock", label: "Stock", description: "Audit lots and adjust stock with reasons." },
  { href: "/customers", label: "Customers", description: "Create clients and update phone/profile data." },
  { href: "/admins", label: "Admins", description: "Create and disable back-office users." },
  { href: "/announcements", label: "Announcements", description: "Publish client announcements and push messages." },
  { href: "/settings", label: "Settings", description: "Notification and production configuration." },
] as const;

export type AdminModuleHref = (typeof adminModules)[number]["href"];
