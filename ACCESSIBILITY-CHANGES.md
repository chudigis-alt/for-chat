# Readability and phone usability update

The shop and admin now use larger default text, stronger text contrast, larger tap targets, visible Search / Bag / Menu labels, clear keyboard focus, and reduced animation when requested by the device. Primary shop buttons use 18px text and are at least 52px tall. Phone navigation opens in the page flow so links stay reachable.

Admin adds large shortcuts for managing orders, updating stock, and editing products. Product, inventory, order, shipping, reseller, and audit tables reuse a semantic responsive table component: desktop tables become labeled cards on small screens. Forms use single columns on phones, and settings save controls stay in the normal page flow. Editing dialogs have accessible titles and a visible Close control.

## Validation

- Next.js optimized production compilation passed (`npm exec next build`).
- Shop and admin dashboard/products/inventory/shipping/settings checked at 320, 390, 768, and 1366px: no page horizontal overflow.
- Shop add-to-bag and bag display, customer mobile menu, admin login, product edit dialog, and admin mobile menu passed in Chromium.
- Home, cart, checkout, tracking, and contact layouts checked at 320px: no page horizontal overflow.
- Primary add-to-bag buttons measured at 18px text with heights of at least 52px.
- Full `npm test` integration suite could not run because the environment blocks downloads from binaries.prisma.sh, preventing Prisma client generation. Check this suite in your normal development environment after `npx prisma generate`.
- Dependency manifests and lockfile are unchanged.

No deployment was performed. No test passwords, database files, environment files, node_modules, or build output are included in this archive. Existing deployment instructions still apply. These checks do not replace feedback from older users or a full accessibility audit.
