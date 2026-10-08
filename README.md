# BEL Home Made Chili Garlic

For deployment from GitHub without Vercel, follow [DEPLOY-RENDER.md](DEPLOY-RENDER.md). The included Render Blueprint prepares the full shop, PostgreSQL, persistent uploads, and initial admin setup. Review hosting charges before deployment.

For the current launch package, follow [DEPLOY-VERCEL.md](DEPLOY-VERCEL.md). It includes the exported business settings, uploaded QR, and shipping configuration. Credentials are supplied separately in a private environment file.

A responsive small-business shop built with Next.js 15, React 19, Prisma, PostgreSQL, and Vercel Blob. The original supplied photographs are retained; smaller WebP derivatives are used on the storefront.

## What works

- Home, shop search/filter/sort, product pages, persistent shopping bag, guest checkout, private order ticket, tracking, about/contact/FAQs, and reseller inquiries.
- The five supplied testimonials appear as text cards: three columns on desktop, two on tablet, one on mobile. Admin → Settings → Customer testimonials supports adding, editing, hiding, sorting, and removing feedback. No invented ratings or verification labels are used.
- Database shipping rules match city → province → region/zone → island group → nationwide default. Admin → Shipping configures fees, activation, and COD availability. There are no live courier APIs. BEL selects J&T Express or LBC and adds tracking after confirmation.
- GCash and COD, with manual payment review. GCash is enabled and uses the business QR; payment remains subject to manual verification. Checkout does not upload receipts. Customers save/print their ticket as PDF, copy order details or a Facebook message, and contact BEL with the ticket and receipt.
- Admin products, galleries, inventory movement history, orders/payment status/courier tracking, shipping rules, reseller inquiries, messages, store settings, and audit history. Order tables paginate in groups of 20. The mobile admin navigation uses a drawer.

## Local setup

Use Node.js 24 and npm. From this folder:

```powershell
npm ci
npx prisma generate
Copy-Item .env.example .env
```

For a local preview, leave DATABASE_URL and DIRECT_URL unset. An SQLite database is used only in development. Production refuses to run without PostgreSQL. Create the initial admin hash by securely providing the chosen initial password to the script through standard input:

```powershell
$initialSecret = Read-Host 'Initial admin password' -AsSecureString
$initialText = [System.Net.NetworkCredential]::new('', $initialSecret).Password
$initialText | node scripts/set-admin-password.mjs
Remove-Variable initialText, initialSecret
npm run db:seed
npm run dev
```

Open http://127.0.0.1:5173. The admin username is **bel** and the password is the one supplied at seeding. The hash stays in ignored .env; no initial password is embedded in the source. First login normally requires a change at /admin/change-password. The launch package uses ADMIN_REQUIRE_PASSWORD_CHANGE=false to honor the chosen admin password; the default remains true. The new password must have 12–72 characters, uppercase and lowercase letters, and a number. Changing it revokes existing sessions and issues a fresh cookie and CSRF token.

Seeding is an explicit command, never an API endpoint or per-request operation. It inserts missing starter settings/products and preserves existing values. Starter prices are ₱65 for 100g and ₱125 for 200g, with 20 jars each. Confirm real stock in Inventory before opening the shop. On a fresh database the launch configuration imports the current 13 editable shipping rules and business settings automatically. Existing settings and accounts are preserved when the seed is repeated. Set the free-delivery threshold to zero to disable it.

The included local workspace may already have a development database and initial seed. Do not overwrite an existing .env or database to repeat setup.

## PostgreSQL and Vercel deployment

Create a managed PostgreSQL database in Neon or Supabase and a Vercel Blob store. Configure encrypted environment variables in the Vercel project and in the authorized migration environment:

| Variable | Purpose |
| --- | --- |
| DATABASE_URL | PostgreSQL connection URL, using the provider’s pooling configuration for serverless requests |
| DIRECT_URL | Direct PostgreSQL URL for Prisma migrations |
| APP_ORIGIN | Exact HTTPS origin of the storefront, without a trailing slash |
| BLOB_READ_WRITE_TOKEN | Server-only Vercel Blob token for admin image uploads |
| ADMIN_SEED_HASH | Server-only bcrypt hash, used only for deliberate initial seeding |

Use separate databases and origins for preview and production. No secret should have a NEXT_PUBLIC prefix. Do not paste database URLs, tokens, or passwords into source files or chat. Vercel uses the standard Next.js framework preset; keep the project root at this folder. Use Node 24 and the build command npm run build.

Run these commands from an authorized environment with the database URLs configured:

```powershell
npm run db:migrate
npm run db:seed
npm test
npm run validate
npm run build
```

Then deploy the repository through the business’s Vercel account. DATABASE_URL/DIRECT_URL/APP_ORIGIN/Blob must be configured before accepting real orders. The code and migration were checked locally; an actual managed PostgreSQL connection, Vercel upload, and deployed HTTPS checkout still need to be verified after those services are connected. No public deployment has been created by this delivery.

The PostgreSQL adapter uses Prisma’s parameterized raw-query APIs. SQL structure comes from fixed application code and allowlisted column names; values are bound separately. Database constraints and stock triggers guard against negative inventory, reserve stock atomically, and restore cancelled orders once. The shipped migration includes foreign keys, uniqueness constraints, and query indexes.

## Business settings and daily workflow

1. Confirm real product stock/prices and review the imported shipping rules.
2. Verify the included GCash QR. Account name and number are optional with QR-only checkout; replacements can be uploaded through Settings.
3. Customers place orders and get a private ticket. GCash starts Awaiting Payment Verification; COD starts Pending Confirmation.
4. Review the customer’s ticket/receipt on Facebook. Verify GCash in Orders, or confirm COD. Update preparation and delivery status as the order progresses.
5. Select J&T Express or LBC, enter tracking, and mark Shipped. Tracking information becomes visible on the customer status page.
6. Mark COD Paid before completing an order. Cancelling restores reserved inventory once. Completed and cancelled statuses are final.

The private ticket requires a long, random access token retained in sessionStorage in the checkout browser. A copied order number alone cannot open the ticket. Phone-based tracking returns a first name, order status/totals/items, and courier information; it excludes the full address, mobile, email, and private token. Customers should save the ticket before closing that browser session.

## Security and verification

- bcrypt cost 12; hashed random session tokens; eight-hour HttpOnly/SameSite=Strict cookies, Secure on HTTPS; password-change session revocation; server-side admin page/API checks.
- Same-origin checks on mutations, CSRF checks on admin mutations, database rate limits, form honeypots, bounded quantities/money, and server-authoritative snapshots/totals.
- Admin-only PNG/JPEG/WebP uploads, max 4 MB, random object names, MIME/signature/extension checks and full image decoding. Production uploads use Vercel Blob, not a serverless local filesystem. Only product/branding images are uploaded; GCash receipts travel directly to BEL on Facebook.
- Nonce-based CSP, frame protection, nosniff, restrictive browser permissions, private API caching, and noindex on admin/checkout/ticket/tracking pages. Unexpected API errors have friendly messages and do not send SQL, stack traces, or environment secrets to customers.
- Administrative activity is logged without passwords, session tokens, or customer message content. React renders user text without raw HTML injection.

npm test runs the same customer/admin security scenarios against local SQLite and the real PostgreSQL engine embedded by PGlite. It validates the PostgreSQL migration, SQL adapter, triggers, rollback, and order integrity; it is not a substitute for checking a live managed PostgreSQL/Prisma connection. The latest complete run passed 36 checks. npm audit reported zero vulnerabilities after unused Drizzle tooling was removed and vulnerable PostCSS/deepmerge dependencies were updated. Prisma schema validation and the optimized Next.js build passed.

Browser QA covered all requested widths: 320, 375, 390, 430, 768, 1024, 1366, 1440, and 1920 pixels. Homepage, checkout, and ticket had no horizontal overflow. A separate QA database was used for test orders; its files and all .env/.data/node_modules/build output are excluded from the source archive.

## Address data and sources

The bundled cascading address list is from the Philippine Statistics Authority’s PSGC publication dated 31 July 2025: 18 regions, 82 provinces plus the Metro Manila grouping, 1,642 cities/municipalities, and 42,011 barangays. It is static and should be refreshed when administrative boundaries change. Metro Manila is presented as a province selection for checkout convenience; Manila submunicipalities remain under the city for shipping.

- [PSA PSGC](https://psa.gov.ph/classifications/philippine-standard-geographic-code)
- [Publication mirror used for the bundled worksheet](https://github.com/jeffreybernadas/psgc-api/tree/main/src/data/july-2025)
- [Vercel request headers](https://vercel.com/docs/headers/request-headers)

The map uses the supplied public business address. No customer geolocation is requested, and maps are not used for shipping calculations.

Local preview origin defaults to http://127.0.0.1:5173 (or PORT). If opening through localhost or a different host, set APP_ORIGIN to that exact browser origin. Production always requires an explicit APP_ORIGIN.


To apply the supplied 0-500g delivery revision on a new database, run node scripts/configure-base-shipping.mjs followed by node scripts/apply-delivery-revision.mjs. Existing unrelated shipping rules remain editable. Use the latest delivery revision described below.

Latest delivery revision overrides earlier LBC estimates: run node scripts/apply-delivery-revision.mjs after initial shipping configuration. User-provided J&T 0-500g card: NCR PHP95, Luzon PHP85, Visayas PHP100, Mindanao PHP105, island provinces PHP115. Fees remain flat and admin editable, as requested; no weight tier calculation or courier API. Lubao COD uses a city rule (initial local fee PHP0; editable), other seeded zones are prepaid. GCash may be enabled as a draft; QR-only checkout works after uploading the business QR in Admin > Store settings > Payments and saving. No QR has been fabricated. Lalamove is a manual option with prepaid jars and a separately confirmed rider fee; it is not automatically booked or priced using J&T fees.

GCash checkout now validates customer/delivery details, then opens a dedicated QR payment step through Proceed to QR Code. The business QR renders up to 420px wide on desktop and fits mobile screens. Back to checkout preserves the form fields. Customers confirm payment before submitting; the resulting order still awaits manual payment verification.

Selecting Lalamove — Same-day delivery at checkout opens /contact?delivery=lalamove, with BEL Facebook/call buttons and a delivery inquiry subject. Booking, availability, payment, and rider fees are arranged directly with BEL; the bag is retained.
