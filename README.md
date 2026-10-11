# TweenTees

A working custom sportswear inquiry website built from the supplied TweenTees Figma file. The design describes a made-to-order quotation workflow: customize apparel, collect quantities and customer details, submit an inquiry, and review it in the protected admin dashboard. Estimates are not payment confirmations. No payment gateway, email delivery, or courier integration is configured.

The implementation preserves the existing Next.js/React stack. It uses original extracted Figma artwork, locally hosted Arimo/Inter fonts, responsive public pages, and real server-backed administration. See [DESIGN-AUDIT.md](DESIGN-AUDIT.md) for the 17-frame route map and interpretation of missing states.

## Run locally

Use Node.js 24 and npm. From the repository root:

```sh
npm ci
cp .env.example .env
npm run db:migrate
npm run dev
```

Setup creates the schema and seeds the Figma catalog/settings only when absent. Repeating it preserves owner edits and administrator credentials. Development data persists in `.data/tweentees.sqlite`; uploads persist in `.data/tweentees-uploads`. Neither directory is committed. Production refuses SQLite and requires PostgreSQL with verified TLS.

Initialize the administrator from a private terminal. The password is read through standard input, hashed with bcrypt, and never passed as a command argument. Use the initial password supplied separately by the project owner; it is intentionally absent from source and documentation.

```sh
read -r -s -p 'Initial administrator password: ' tween_initial_password
printf '\n'
printf '%s' "$tween_initial_password" | npm run admin:init -- rodel
unset tween_initial_password
```

Open `/admin`. On first login the only available administrative action is password replacement; current password verification and confirmation are required. The replacement must contain upper/lowercase letters and a number, be at least 12 characters and at most 72 UTF-8 bytes, and differ from the old password. Successful replacement revokes all sessions and requires login again. Subsequent changes are available in Account Settings. Initialization refuses to overwrite an existing account.

The current cloud development database already has the requested initial `rodel` account. It has not been changed by the automated tests. Fresh deployments require the initialization command above.

## Pages and working features

- Homepage, searchable/filterable/sortable catalog, product customization, fabrics, size charts, about, contact, process explanation, and gallery.
- Inquiry bag with quantity editing, removal, refresh persistence, fabric/size selection, design assistance or validated private PNG/JPG/PDF uploads, customer details, server-calculated estimates, review, and a private confirmation/history view.
- Protected admin dashboard with accurate saved-record statistics, product/category/fabric/size-chart/gallery CRUD and publishing, website text/artwork/contact/social settings, inquiries and status history, customer records, messages, account settings, logout, and password changes.
- Search, filters, pagination and sorting on inquiry/customer tables. Message search/status pagination; small catalog tables support client-side search, sorting and pagination.
- Optimistic record versions prevent stale admin edits. Inquiry idempotency keys prevent duplicate submissions, and saved product/price/notes snapshots survive later catalog changes.

Products are made to order: there is no invented warehouse stock or online checkout. Publishing controls catalog availability. Quote, payment arrangements, production and shipping happen manually after review; no endpoint marks an inquiry as paid. Submission status starts Pending. The admin tracks In Review, Quoted, Confirmed, In Production, Shipped, Completed or Cancelled; transitions are validated and recorded. Marking a message Replied records an administrator's action after a manual reply; it does not send email.

The supplied email, telephone and Facebook/Instagram/TikTok profiles are stored in editable site settings. Starter products, prices and the one supplied size chart are taken from the design and must be confirmed by the owner before launch. Other apparel measurement tables are not fabricated.

## Architecture

| Location                    | Responsibility                                                               |
| --------------------------- | ---------------------------------------------------------------------------- |
| `app/`                      | Next.js shell, server-side protected-page redirects, metadata and API routes |
| `src/tweentees/`            | React public/admin pages, reusable controls and responsive styles            |
| `server/tweentees/api.mjs`  | Server validation, authentication/authorization, uploads, inquiries and CRUD |
| `server/tweentees/db.mjs`   | PostgreSQL/SQLite adapters and transactions                                  |
| `server/tweentees/seed.mjs` | Idempotent initial design catalog/settings                                   |
| `migrations/tweentees.sql`  | Persistent relational schema, constraints and indexes                        |
| `scripts/tween-setup.mjs`   | Schema/seed setup                                                            |
| `scripts/tween-admin.mjs`   | Owner-only account initialization/recovery                                   |
| `public/tweentees/`         | Original extracted/cropped design assets                                     |
| `tests/tweentees/`          | API integration and Chromium workflow checks                                 |

All public/admin application APIs use `/api/tt/*`. `/api/health` reports database/catalog readiness without returning internal information. The inherited BEL API is retired with HTTP 410. Earlier BEL source, Prisma schema/dependencies and tests remain for historical reference; they are not used by the TweenTees application, migrations, authentication or build. `test:legacy` is not an acceptance check for this implementation. Prisma generation is unnecessary.

Sessions use random tokens stored as hashes, HttpOnly/SameSite=Strict cookies, Secure cookies in production, eight-hour expiry and revocation. Every private API checks the session, first-password-change restriction and authorization independently. Mutations validate the configured origin; admin mutations additionally require CSRF tokens. Passwords are bcrypt hashes, never returned by APIs. Database queries are parameterized; private inquiry receipts require opaque access tokens. Image uploads are decoded/re-encoded with pixel/byte limits; PDFs are validated and interactive content rejected. Admin conflicts and database failures produce actionable or generic safe errors.

Local browser draft/customer data and receipt access keys use session storage for refresh continuity on the same device/tab. Do not use shared browsers for private inquiries. Lost receipt access requires contacting the business; there is no insecure public lookup by reference/email. Uploaded artwork is private and served only with its upload access key or an authenticated administrator session. No automatic email/password-reset service is claimed.

## Configuration and verification

[.env.example](.env.example) lists placeholders only. Configure secrets through the hosting provider, not public environment variables. Next.js and setup scripts read `.env`; scripts also honor explicitly exported process variables. Never commit `.env`, uploads, database snapshots or customer records.

```sh
npm test
npm run validate
npm run build
```

See [TESTING.md](TESTING.md) for tested workflows, isolated browser execution and remaining verification requirements; [DEPLOYMENT.md](DEPLOYMENT.md) for production hosting/storage/TLS/backups; and [HANDOVER.md](HANDOVER.md) for client ownership and credential rotation. A successful local build is not evidence that a live deployment has been verified.
