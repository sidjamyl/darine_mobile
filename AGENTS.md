# Joumla Store Project Context

This file preserves the product, technical, and workflow context for future agent sessions.

## Communication Rules

- The user usually discusses requirements in French.
- Talk to the user in French when clarifying or reporting progress.
- Write durable outputs in English: code, documentation, GitHub issues, PRDs, templates, commit messages, and this file.
- Do not re-interview the user on decisions already captured here unless a new requirement conflicts with them.

## Repository State

- GitHub repo: `sidjamyl/darine_mobile`
- Workspace root: `/home/jamyl/darine_mobile`
- App root: `/home/jamyl/darine_mobile/app`
- The project is a Better-T-Stack monorepo starter.
- Current stack already present:
  - Expo Router / React Native app in `app/apps/native`
  - Express server in `app/apps/server`
  - tRPC in `app/packages/api`
  - Better Auth in `app/packages/auth`
  - Drizzle + PostgreSQL in `app/packages/db`
  - Uniwind + HeroUI Native in the mobile app
  - Bun workspaces and Turborepo
- Current app is still starter-level: placeholder tabs, email/password auth forms, no Joumla business domain yet.
- Existing native assets are Expo placeholders.
- Joumla logo is available at `/home/jamyl/darine_mobile/images/logo.jpeg`.
- Esmmar reference screenshots are available in `/home/jamyl/darine_mobile/images/IMG_*.PNG`.
- HeroUI Native LLM reference URL: `https://heroui.com/native/llms-full.txt`.

## Parent PRD And Issues

Parent PRD:

- #1 https://github.com/sidjamyl/darine_mobile/issues/1

Backend issues:

- #2 Backend: Domain auth, roles, profiles, and seed data
- #3 Backend: Catalog, content sections, assets, and favorites
- #4 Backend: Product search and catalogue retrieval
- #5 Backend: Cart validation and order creation
- #6 Backend: Order lifecycle, stock movements, and audit logs
- #7 Backend: Notifications, announcements, and WhatsApp-ready messaging
- #8 Backend: Delivery note PDF generation from order snapshots
- #9 Backend: Admin user and account management
- #10 Backend: Environment, CI, and production readiness

Frontend/admin issues:

- #11 Mobile: App shell, branding, navigation, theme, and localization
- #12 Mobile: Client authentication, profile, and location flows
- #13 Mobile: Catalogue browsing, product detail, search, and favorites
- #14 Mobile: Local cart, checkout, and order success flow
- #15 Mobile: Client orders, notifications center, and BL download
- #16 Admin Web: Next.js foundation, auth guard, and layout
- #17 Admin Web: Catalogue, assets, sections, and stock management
- #18 Admin Web: Order operations, status workflow, and BL actions
- #19 Admin Web: Users, admins, announcements, and settings
- #20 Admin Mobile: Operations modules for orders, stock, and BL
- #21 Admin Mobile: Management modules for catalogue, users, sections, and announcements

When starting implementation, work from these issues. Before coding an issue, discuss its implementation details with the user as required by the PRD-to-issues workflow.

## Product Summary

Joumla Store is a wholesale seller of packaging and food products. The mobile app lets customers browse public prices, add wholesale lots to a cart, place orders, and follow order status. Admins manage catalogue, stock, orders, users, sections, notifications, and delivery-note PDFs from both web and mobile.

The app should be a very faithful functional and visual copy of the Algerian Esmmar app patterns, but with Joumla branding and colors.

## Users And Roles

- Client: browses catalogue, favorites products, adds lots to cart, places orders, follows order status.
- Admin: manages operational back office and can also use the client app after completing a client profile.
- Owner: seeded protected admin role. The seed owner cannot be disabled through normal UI/API flows.

Admin management rules:

- All admins can create and modify admin accounts.
- Admins cannot create owner accounts.
- Admins cannot modify their own role.
- Disabling a user revokes active sessions.
- Clients can be disabled, not hard-deleted.
- Products with history are archived, not hard-deleted.
- Orders are never deleted; they are cancelled.

## Authentication Decisions

- Clients log in with phone number + password.
- Admins log in with email + password.
- Use Better Auth and appropriate plugin strategy for phone-based client auth.
- Client email is never part of the client profile.
- Admin emails do not require verification in V1.
- If a client becomes admin, add an admin email to the same account.
- Admins can use the app as clients only after completing required client profile fields.
- Client password minimum is 6 characters.
- Client forgot-password is manual admin reset in V1.
- Admin password reset uses Resend email.
- Multiple sessions are allowed.

## Client Profile And Address

Signup/profile fields:

- Full name
- Phone number
- Password and confirmation
- Wilaya
- Commune
- Street/address text
- Optional latitude/longitude location

Address/location rules:

- Seed static Algeria wilayas and communes.
- One address per client in V1.
- Snapshot address into each order at checkout.
- Phone number changes are admin-only.
- Client can edit profile except phone.
- Client can change password from profile.
- Location permission is requested only when pressing the location button.
- If location permission is denied, manual address is enough.
- Use OpenStreetMap/Nominatim public search and map pin selection.
- If Nominatim public becomes limiting in production, the user chose to continue public for now.

## Client App UX Decisions

- Authentication appears at first add-to-cart, not at app launch.
- After login/signup triggered by add-to-cart, automatically add the originally selected product.
- Prices are public before login.
- Mobile app uses 5 Esmmar-style bottom tabs:
  - Home
  - Products/Categories
  - Search
  - Cart
  - Favorites
- Drawer contains complete client menu: profile, Home, products, cart, favorites, orders, language, login/logout, and admin entry for admins.
- Search tab auto-focuses the search field and opens the keyboard.
- Notification icon opens a notification center.
- Notification center is a simple list without unread badges.
- Language choice is stored locally only.
- French and Arabic are supported.
- Arabic should use RTL. Instant RTL is desired, but restart fallback is acceptable if needed.
- Theme: light/dark complete, system default plus manual override.
- Platform priority: Android and iOS equally.
- Phone-first layout; tablet only needs to remain usable.

## Branding And UI

- Use Joumla colors:
  - Navy primary: `#0A1B46`
  - Pink/accent: `#E74888`
  - White
- User chose navy as the primary UI color.
- Copy Esmmar visual patterns very closely, but apply Joumla branding.
- Use system font.
- No automatic product watermark in V1.
- Extract the cart/symbol from the rectangular logo for the app icon; do not use the full rectangular logo as the small icon.
- Use HeroUI Native for mobile components.
- Use HeroUI React for the Next.js admin web app.

## Catalogue Decisions

- Products have:
  - French name, required
  - Arabic name, required
  - Unit price, source of truth
  - Lot quantity, integer only
  - Packaging label, free text with default suggestions
  - One brand
  - Multiple flat categories
  - One image in V1
  - Stock quantity in lots
  - Optional SKU
  - Optional description
  - Optional badge text and badge color
  - Optional lot-level discount price
- Money uses 3 decimal precision.
- UI displays `DA` and hides trailing zeros.
- Quantity in cart means number of lots, not individual units.
- Product stock is number of sellable lots.
- Product is always published at creation; no draft state in V1.
- Out-of-stock products remain visible but disabled for cart actions.
- Product changes affect future orders only; existing orders use snapshots.
- No product import CSV/Excel in V1.
- Prepare barcode-related fields for V2 without exposing scan UI.

Brands:

- Name
- Logo
- Active state
- Featured state
- Sort order

Categories:

- Flat, no hierarchy
- French and Arabic names
- Image
- Active state
- Featured state
- Sort order

Home sections:

- Admin-managed banners, 16:9, ordered, active/inactive, no redirect target.
- Banner carousel autoplays and supports manual swipe with dots.
- Top brands and categories are admin-selected and manually swiped, no autoplay.
- Featured Home products are admin-selected, fallback can be latest products.
- Admin can hide all Home sections, but dedicated pages remain accessible.
- No dedicated promo section in V1.

Search:

- V1 uses Postgres search.
- Search across product names FR/AR, description, brand, and categories.
- Filters: brand and category.
- Default product ordering is admin-defined, fallback recent products.
- Meilisearch is planned later and should be prepared by boundaries, not active in V1.
- Catalogue expected at launch: under 500 products.
- Mobile can load full catalogue in V1, with lazy images. Prepare eventual pagination if catalogue grows.

## Cart And Checkout Decisions

- Cart is local only, isolated by user account.
- Favorites are server-side per authenticated user.
- Add-to-cart from list or detail opens a bottom sheet quantity selector.
- Quantity max is stock available.
- Cart minus button is blocked at 1; trash icon removes item.
- Checkout requires a complete client profile.
- No minimum order.
- No client note in V1.
- Checkout revalidates price and stock server-side.
- If price changed, block validation and show the new price for confirmation.
- If stock is insufficient, block and propose max available quantity.
- Order lines snapshot product name, image, unit price, lot quantity, packaging, lot price, discount, and selected quantity.
- Successful order empties local cart.
- Success message says Joumla Store will call the client, then links to order detail.

## Order Workflow Decisions

- Initial order status: meaning admin must call the client (`À appeler`).
- Statuses are operational and flexible:
  - À appeler
  - Client appelé
  - En traitement
  - Commande traitée
  - Annulée
- Admin can change statuses freely until final treated status.
- Treated/final orders cannot be moved backward through normal UI/API flows.
- Client can cancel before treatment.
- Admin cannot modify order lines after order creation.
- Stock decreases only when order enters treatment/processing.
- Treatment is blocked if stock is insufficient.
- If an order is cancelled after stock was decremented, stock is restored automatically.
- Orders can have optional internal admin notes.
- Customer order history shows list plus detail.

## Notifications And Announcements

- Admin receives Resend email on new order.
- Mobile admins receive Expo Push on new order.
- Clients receive Expo Push on each visible order status change.
- Push permission is requested after the first successful order.
- No in-app push opt-out in V1.
- Notification center stores order status notifications and announcements.
- Notification retention: 90 days.
- No unread badge requirement.
- Admins can create global announcements.
- Announcements target all clients in V1.
- Admin chooses whether an announcement sends push.
- Email/push send success/failure logs are required.
- Prepare WhatsApp provider/template abstraction for future migration, but no WhatsApp sending in V1.

## Admin Web Decisions

- Admin web is a separate Next.js app in the monorepo.
- Admin web uses HeroUI React.
- Admin web shares the same tRPC backend.
- Non-admin access receives 403/access denied and redirect behavior.
- Admin web modules:
  - Dashboard
  - Orders
  - Products
  - Stock
  - Users
  - Sections
  - Delivery notes / invoices
  - Announcements
  - Settings
- Admin web should be complete and more comfortable for heavy back-office work.

## Admin Mobile Decisions

- Admin mobile is inside the same Expo app.
- Admin entry appears in drawer for admin/owner accounts.
- Admin mobile uses drawer module navigation.
- Admin mobile is complete, not read-only.
- Admin mobile UI should copy the client visual language, not use a separate dark dashboard.
- Admin mobile supports:
  - Orders
  - Products
  - Stock
  - Users/admins
  - Sections/banners/brands/categories
  - Announcements
  - BL/PDF generation and sharing
  - Settings as needed

## Delivery Note / BL Decisions

- Generate BL/PDF after treatment/processing.
- BL number format: `BL-YYYY-000001`.
- BL language: French.
- PDF is generated on demand, not permanently stored.
- PDF must be stable because it is generated from order/customer/product snapshots.
- Admin enters old balance, versement, and new balance fields.
- No global order discount in V1.
- Mobile admin can generate/share PDF via system share sheet.
- Web admin can generate/download/print PDF.
- Client can download BL after treatment when available.

## Stock And Audit

- Keep stock movement history forever.
- Keep minimal admin audit logs forever.
- Stock log includes product, quantity, reason, linked order if any, admin, timestamp.
- Low-stock alert uses per-product threshold.
- Sensitive admin actions should be logged minimally.

## External Providers

- Resend for email notifications and admin password reset.
- Expo Push for mobile push notifications.
- Cloudinary for product/banner/brand/category images.
- Cloudinary upload should use server-generated signatures.
- OpenStreetMap/Nominatim public for map search in V1.
- Future WhatsApp Business provider should be abstracted but inactive in V1.

## Deployment And Operations

- Environments: dev and prod.
- Preferred deployment approach is Docker, but user may choose VPS Docker or Octenium/mutual hosting.
- If mutual hosting conflicts with Bun/Postgres/Docker, adapt to mutual hosting where possible.
- Typecheck CI is required via GitHub Actions.
- Daily DB backup expectations should be documented for production.
- Sentry is deferred until after V1.
- No analytics in V1.

## Out Of Scope For V1

- Online payment
- Delivery tracking/management
- V1 command tickets
- Barcode scan UI
- Product CSV/Excel import
- Active Meilisearch integration
- Automatic WhatsApp sending
- Dedicated promo section
- Client order notes
- Product analytics/funnels
- Sentry integration
- Global order discounts

## Known Open Values

- Official “Call us” phone number.
- Joumla legal/company information for BL.
- Resend domain/email details.
- Cloudinary account details.
- Final production hosting choice: VPS Docker vs Octenium/mutual hosting.
- Exact initial seed admin list.

## Recommended Delivery Order

Use the GitHub issues as the source of truth. The intended delivery strategy is foundation first, then vertical slices:

1. Foundation/auth/profile/roles/seeds.
2. Catalogue backend and admin catalogue management.
3. Client shell and catalogue browsing.
4. Checkout/order creation.
5. Order lifecycle, stock, notifications.
6. Client order history and notification center.
7. Delivery note PDF.
8. Complete admin web.
9. Complete admin mobile.
10. CI/production readiness.

Before implementing any issue, discuss technologies, endpoints/schema, UI layout, interactions, and trade-offs with the user. Do not skip this discussion unless the user explicitly asks to proceed directly.
