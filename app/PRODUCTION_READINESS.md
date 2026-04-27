# Production Readiness

## Scope

This document defines the V1 environment, CI, deployment, provider, and operational expectations for Joumla Store.

## Environments

Two environments are expected:

- `development`
- `production`

The server environment is validated in `packages/env/src/server.ts`.
The native public environment is validated in `packages/env/src/native.ts`.

## Environment Variables

### Server

Required in all environments:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `CORS_ORIGIN`
- `NODE_ENV`

Required when the related feature is enabled:

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

Optional seed bootstrap values:

- `SEED_OWNER_EMAIL`
- `SEED_OWNER_PASSWORD`
- `SEED_OWNER_NAME`

Reference file:

- `apps/server/.env.example`

### Native

Required public native variable:

- `EXPO_PUBLIC_SERVER_URL`

Reference file:

- `apps/native/.env.example`

## Validation Strategy

- Server startup fails if required server variables are missing or invalid.
- Native startup fails if `EXPO_PUBLIC_SERVER_URL` is missing or invalid.
- Optional provider variables remain optional because some features can be staged progressively between development and production.

## CI

GitHub Actions workflow:

- `.github/workflows/typecheck.yml`

Current CI contract:

- install dependencies with Bun using the committed lockfile
- run `bun run check-types` from the monorepo root `app/`

## Docker-First Deployment

Docker remains the preferred deployment shape for production.

Recommended production topology:

1. One container for the API server.
2. One managed or containerized PostgreSQL instance.
3. Reverse proxy and TLS handled by the hosting platform or a front proxy such as Nginx/Caddy.

Current repository support:

- local database Docker workflow already exists in `packages/db/docker-compose.yml`
- server runtime is Bun-based and can be containerized on a VPS Docker host

Practical recommendation for V1:

- prefer a VPS with Docker support
- keep database volumes persistent and backed up daily
- inject production environment variables through the host or deployment platform

## Mutual Hosting Adaptation

If the final hosting choice is Octenium or another mutual/shared host, expect limitations:

- Bun runtime support may be unavailable
- persistent Node/Bun processes may be restricted
- direct PostgreSQL access may be limited or unsupported
- Docker may be unavailable entirely

Fallback guidance:

- keep the mobile app and backend separated by a stable public API URL
- if shared hosting cannot run the backend stack, deploy the API and PostgreSQL on a VPS while keeping public assets or static files on the shared host if needed
- avoid provider-specific coupling in application code so the hosting decision remains reversible

## Providers

### Better Auth

- used for admin email/password and client phone/password-compatible flows

### PostgreSQL

- source of truth for business data

### Cloudinary

- product, brand, category, and banner images
- server generates signed upload parameters

### Resend

- transactional admin email notifications
- admin password reset emails

### Expo Push

- mobile admin push for new orders
- client push for order status changes

### OpenStreetMap / Nominatim Public

- address lookup and map selection in V1

### WhatsApp Provider Abstraction

- reserved for future use
- application code prepares the delivery abstraction but does not send WhatsApp messages in V1

## Daily Database Backups

Daily backups are required in production.

Recommended minimum policy:

1. Run one `pg_dump` per day.
2. Store backups outside the app container.
3. Retain at least 7 daily backups.
4. Test restore on a non-production database before launch and periodically afterward.

Example backup command:

```bash
pg_dump "$DATABASE_URL" > "/backups/joumla-$(date +%F).sql"
```

Recommended automation:

- VPS cron job or platform scheduler
- optional compression and remote copy to object storage

## Open Production Values

The following values are still open and must be confirmed before production launch:

- official "Call us" phone number
- Joumla legal/company information to print on BL documents
- final production domain names
- Resend sender/domain values
- Cloudinary production account values
- exact initial seed admin list
- final hosting decision: VPS Docker vs mutual/shared hosting fallback

## Launch Checklist

- production `DATABASE_URL` created and tested
- `BETTER_AUTH_SECRET` rotated to a strong production value
- `BETTER_AUTH_URL` and `CORS_ORIGIN` set to the final public backend/mobile origins
- Cloudinary credentials configured if catalogue assets are used
- Resend configured if admin order email notifications are enabled
- backup automation enabled and restore tested
- typecheck workflow passing on `main`
