# Joumla Store — Contexte Projet (Mise à jour : 22/05/2026)

## Structure du Monorepo

```
C:\Users\ASUS\CODE\darine_mobile\app\
├── apps/
│   ├── native/       # Expo Router (mobile client + admin mobile)
│   ├── admin-web/    # Next.js (admin web)
│   └── server/       # Express + tRPC + Better Auth
├── packages/
│   ├── api/          # tRPC routers
│   ├── auth/         # Better Auth config (email/password + phone)
│   ├── db/           # Drizzle ORM + PostgreSQL schema
│   ├── env/          # Zod env validation (server + native)
│   └── config/       # Shared TypeScript config
```

## Stack

- **Frontend mobile** : Expo SDK 54, Expo Router 6, HeroUI Native, Reanimated, Gesture Handler
- **Admin web** : Next.js 16, Turbopack, HeroUI React (via composants custom)
- **Backend** : Express, tRPC v11, Better Auth 1.5.5, Drizzle ORM, PostgreSQL
- **Infra** : Bun workspaces, Turborepo, Docker (Postgres port 5433)
- **OS** : Windows 11 (dev), PostgreSQL Docker sur `127.0.0.1:5433`

## Dernier Commit

```
021d0c6 update admin catalog and ignore build output
```

## Changements Non Commit — Session Active

**41 fichiers modifiés** (hors `session-ses_2304.md`). Modifications clés :

### Admin web (`app/apps/admin-web/`)
| Fichier | Changement |
|---|---|
| `components/admin-pages.tsx` | Refonte pages : produits (dialogs), catégories/marques/bannières (dialogs), stock (produits + historique + ajout/diminution dialog), clients (dialog fiche + blocage), admins, paramètres |
| `components/admin-ui.tsx` | Ajout Dialog, AssetUploadField, NumberInput, EntitySelect, MultiSelect, TextAreaField, amélioration Button/Chip |
| `app/globals.css` | Styles dialog (scrollable), responsive, settings-grid, settings-card, settings-row |
| `lib/admin-modules.ts` | Navigation traduite en français |
| `components/admin-shell.tsx` | Sidebar/nav refonte |
| `components/login-card.tsx` | Correction |
| `components/module-page.tsx` | Simplification |

### Admin mobile (`app/apps/native/app/(drawer)/admin.tsx`)
- Refonte complète avec **11 onglets** : dashboard, orders, products, categories, brands, banners, stock, customers, admins, announcements, settings
- Formulaires en modales (`AdminModal`)
- Sélection marque/catégories par chips plutôt que champs texte ID
- Upload image via `pickAndUploadAdminAsset`
- Stock : ajout/diminution + historique
- Clients : édition profil/adresse + blocage
- Admins : création + blocage
- BL : génération PDF et partage
- Traductions FR/AR complètes

### Backend API (`app/packages/api/src/routers/admin-users.ts`)
- Ajout : `updateCustomerProfile`, `enableUser`, `customerDetail` (avec profile + wilaya + commune + orders)
- `onConflictDoUpdate` pour `clientProfile`

### Backend server (`app/apps/server/src/index.ts`)
- Route `/` avant middlewares (renvoie OK)
- `express.json()` replacé après Better Auth/tRPC

### DB (`app/packages/db/docker-compose.yml`)
- Port PostgreSQL changé à `5433` (évite conflit avec Postgres local)

### Env (`app/packages/env/src/server.ts`)
- `dotenv.config({ override: true })`

## Web Admin — Connexion

- **URL** : `http://localhost:3001`
- **Email** : `nj_sid@esi.dz`
- **Password** : `Jamyl23032006`

## Mobile — Connexion

- **Dernière IP configurée** : `172.20.10.4` (partage 4G)
- `EXPO_PUBLIC_SERVER_URL=http://172.20.10.4:3000` dans `apps/native/.env`
- QR code Expo ne fonctionne pas avec le même téléphone qui partage la 4G (host ne peut pas joindre ses clients)
- Solutions : utiliser un vrai routeur Wi-Fi, Expo tunnel (`bunx expo start --tunnel`), ou un deuxième téléphone

## XR — Problèmes Connus

1. **QR code Expo inaccessible** sur téléphone hôte du partage 4G. Solutions ci-dessus.
2. **Admin web responsive** en cours d'affinage (sidebar, dialogs mobiles)
3. **Factures/BL** pas encore implémenté (numérotation BL, PDF)
4. **Notifications push Expo** pas encore branchées (Expo Push Token à stocker)
5. **Admin mobile** pas encore testé en conditions réelles (manque Windows LAN)
6. **Traductions** manquent pour certains labels dans le client mobile (onglet Paramètres, aide admin)

## Admin Web — Pages Disponibles

| Route | Composant | Description |
|---|---|---|
| `/` | DashboardPageClient | KPIs, commandes à appeler, stock faible |
| `/orders` | OrdersPageClient | Filtre par statut, table commandes |
| `/products` | ProductsPageClient | Dialogs création/modification, archive |
| `/categories` | CategoriesPageClient | Dialogs création/modification, active/accueil |
| `/brands` | BrandsPageClient | Dialogs création/modification, active/accueil |
| `/banners` | BannersPageClient | Dialogs création/modification, active |
| `/stock` | StockPageClient | Produits + stock, dialog ajout/diminution, historique mouvements |
| `/customers` | CustomersPageClient | Dialog fiche client (édition + blocage) |
| `/admins` | AdminsPageClient | Formulaire création + liste |
| `/announcements` | AnnouncementsPageClient | Formulaire publication + liste |
| `/settings` | SettingsPageClient | Conditionnements, notifications, aide réseau |
| `/delivery-notes` | → OrdersPageClient (alias temporaire) |
| `/sections` | → CategoriesPageClient (alias temporaire) |
| `/users` | (non utilisé) |

## Admin Mobile — 11 Onglets

Dashboard, Commandes, Produits, Catégories, Marques, Bannières, Stock, Clients, Admins, Annonces, Paramètres.

Tous les formulaires passent par des modales. La sélection des catégories et des marques se fait par chips.

## Architecture Technique

### API (tRPC)
- `adminProcedure` : vérifie rôle admin/owner
- `protectedProcedure` : utilisateur authentifié
- Routers : `adminCatalog`, `adminUsers`, `orders`, `notifications`, `deliveryNotes`, `assets`, `locations`

### Auth (Better Auth)
- Clients : login par téléphone + mot de passe (plugin phoneNumber, OTP désactivé)
- Admins : login par email + mot de passe
- `BETTER_AUTH_URL=http://localhost:3000/api/auth`
- `trustedOrigins` inclut les IP locales et `app://`, `exp://`

### DB (PostgreSQL + Drizzle)
- Port : `5433` (Docker)
- Schémas : `auth` (users, sessions, accounts), `catalog` (products, brands, categories, banners), `order` (orders, lines, stock_movements, audit_logs), `profile` (client_profiles, wilayas, communes)
- Migrations : via `bun run db:generate` / `bun run db:migrate` / `bun run db:push`

### Assets (Cloudinary)
- Upload via signature serveur
- Kinds : product, brand, category, banner
- `createUploadSignature` → upload → `registerUploadedAsset`

## Commandes Essentielles

```bash
# Démarrer la DB
cd app && bun run db:start

# Lancer le serveur API
cd app && bun run dev:server

# Lancer l'admin web
cd app && bun run dev:admin-web

# Lancer l'app mobile
cd app && bun run dev:native

# Typecheck monorepo
cd app && bun run check-types

# Typecheck mobile uniquement
cd app/apps/native && bunx tsc --noEmit

# Build production
cd app && bun run build

# Seed DB
cd app && bun run db:seed
cd app && bun run db:seed:catalog
cd app && bun run auth:seed-owner
```

## Frontend Mobile — Modules Clients

- Auth : sign-in (email ou téléphone), sign-up
- 5 tabs : Accueil, Produits, Recherche, Panier, Favoris
- Drawer : profil, commandes, notifications, langue, admin (si admin/owner)
- Catalogue : produits, marques, catégories (via API)
- Panier : local (isolé par utilisateur)
- Favoris : côté serveur
- Commandes : historique + détail
- Profil : édition (sauf téléphone), changement mot de passe
- Notifications : centre de notifications (ordre + annonces)

## Palette Couleurs

- Navy (primaire) : `#0A1B46`
- Pink (accent) : `#E74888`
- White : `#FFFFFF`
- Variantes dans `lib/app-shell.ts`

## Notes Environnement

- Le .env du serveur contient les vraies clés Cloudinary/Resend (ne pas commit)
- Le .env natif contient l'IP locale qui change avec le réseau
- CORS_ORIGIN dans server/.env doit inclure l'IP du réseau actif
