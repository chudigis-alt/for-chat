# Verification record

Verified in the cloud workspace with Node.js 24.19.0 and Next.js 15.5.27. Tests use generated disposable passwords; the owner's initial administrator account is not modified.

## Automated checks

| Check                   | Result                                                 | Scope                                                                                                                                |
| ----------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `npm test`              | 36 passed, zero failed                                 | SQLite and PostgreSQL-compatible PGlite integration, plus production configuration guards                                            |
| `npm run validate`      | Passed                                                 | Required artifacts, source scan for embedded credentials, unsafe HTML/code execution, private database fallback and security headers |
| `npm run build`         | Passed                                                 | Optimized Next.js production compilation, page data collection and route generation                                                  |
| Chromium browser script | 10 workflows passed, no unexpected console/page errors | Real HTTP server and persistent isolated SQLite database                                                                             |
| `npm audit`             | Zero reported vulnerabilities                          | Full locked dependency graph, including development dependencies, at verification time                                               |

Integration tests cover idempotent seed preservation; unauthenticated API denial; mutation origin/CSRF checks; mandatory password replacement; confirmation/current-password verification; old-password rejection; session revocation, expiry, logout and Secure cookie flags; failed-login rate limits; catalog CRUD/publishing/reference/version checks; server price and product-note snapshots; duplicate and concurrent inquiry submissions; invalid size/quantity/fabric rejection; receipt/file privacy; image byte validation; valid/corrupt/interactive PDF handling; order-status transition/history conflicts; contact/message/settings persistence; pagination/statistics; and generic database-error responses.

PostgreSQL SQL/migrations are exercised with PGlite through the production database adapter. This is an embedded PostgreSQL-compatible engine with serialized test connections, not a verified live networked PostgreSQL deployment. Production pool behavior, multi-process races, TLS and provider permissions must still be checked against the chosen database.

The browser workflows cover public pages/assets/navigation; catalog search/filter/sort; size quantities and bag updates; customer review/submission/receipt refresh; real contact persistence; first-login password replacement and reveal controls; product CRUD/image upload/modal behavior; inquiry review/status history; mobile dashboard; category/fabric/chart/gallery CRUD and publishing; customer/message/account screens; content editing and logout. Supplied social-profile, mail and telephone link destinations are asserted.

Homepage overflow checks pass at 320, 375, 390, 430, 768, 1024, 1366, 1440 and 1920px widths. Public secondary routes, customization and dashboard also receive mobile checks. These checks do not establish that every browser/device/accessibility combination is perfect.

## Repeat browser checks safely

The script is intentionally bound to an isolated QA database and origin. It clears ONLY that QA database's inquiries, histories and messages and resets its website settings. Never point it at customer or production data.

Terminal 1, from the repository root:

```sh
APP_ORIGIN=http://127.0.0.1:5175 \
TWEEN_DEV_DB=.data/tweentees-qa.sqlite \
TWEEN_UPLOAD_DIR=.data/tweentees-qa-uploads \
TWEEN_BUILD_DIR=.next-qa \
node node_modules/next/dist/bin/next dev -H 127.0.0.1 -p 5175
```

Terminal 2:

```sh
node tests/tweentees/browser.mjs
```

Requires installed Chromium at `/usr/bin/chromium`, or set `TWEEN_BROWSER_EXECUTABLE` to a trusted installed Chromium path. Playwright is installed through npm; downloading another browser is unnecessary in this environment. Screenshots and JSON results are saved in ignored `.qa-results/`. Test fixture accounts are removed afterward. Stop the QA service when finished.

Do not build and run the main dev service concurrently in the same `.next` directory. The isolated QA service uses `.next-qa` to avoid build-artifact races.

## Design verification and limitations

The uploaded `.fig` was decoded after the online URL was unavailable. All 17 top-level frames were inventoried and mapped in DESIGN-AUDIT.md. Typography, original artwork, black/white palette, desktop/mobile navigation, hero, categories, fabrics, customization, forms, receipt and dashboard were compared during implementation; responsive screenshots were inspected and visible discrepancies corrected. Error/empty/loading/password-change and detailed admin subpages extend the existing design language because complete frames are absent. No automatic pixel-difference baseline or claim of pixel-perfect equivalence is made. Original artwork includes rasterized portions from the supplied design; higher-resolution source product photography would improve large-screen exports.

No live production deployment, domain, database credentials, private storage mount, email sender, payment provider or courier credentials were supplied. Production HTTPS/session-cookie behavior, real PostgreSQL concurrency, provider outages, backup restoration, ownership transfer and deployed-domain visual/workflow checks remain unverified. See DEPLOYMENT.md and HANDOVER.md for concrete configuration and acceptance procedures. This verification is not an independent security audit or a guarantee of zero bugs.
