export const adminModules = [
  { href: "/", label: "Tableau de bord", description: "Alertes et raccourcis operationnels." },
  { href: "/orders", label: "Commandes", description: "Appeler, traiter et preparer les commandes." },
  { href: "/products", label: "Produits", description: "Creer et modifier le catalogue." },
  { href: "/categories", label: "Categories", description: "Gerer les familles du catalogue." },
  { href: "/brands", label: "Marques", description: "Gerer les marques." },
  { href: "/banners", label: "Bannieres", description: "Gerer les bannieres d'accueil." },
  { href: "/stock", label: "Stock", description: "Suivre les mouvements et ajuster les lots." },
  { href: "/customers", label: "Clients", description: "Gerer les clients." },
  { href: "/admins", label: "Admins", description: "Creer et bloquer les comptes back-office." },
  { href: "/announcements", label: "Annonces", description: "Publier des annonces clients." },
  { href: "/settings", label: "Parametres", description: "Reglages rarement modifies." },
] as const;

export type AdminModuleHref = (typeof adminModules)[number]["href"];
