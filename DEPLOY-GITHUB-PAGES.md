# Free website design preview on GitHub Pages

The public `chudigis-alt/for-chat` repository includes a GitHub Actions workflow that builds and publishes a static design preview at:

https://chudigis-alt.github.io/for-chat/

This is a preview for reviewing the shop and admin design. It is not a live business shop: checkout, payment collection, tracking, messages, uploads and admin changes do not run here. Admin screens show sample data without authentication and contain no customer records or passwords. A visible preview notice appears on every screen. The full server-backed app remains in the repository for a future deployment.

## One-time GitHub setting

1. Open the repository's **Settings → Pages**.
2. Under **Build and deployment → Source**, select **GitHub Actions**.
3. Open **Actions → Publish free GitHub Pages preview → Run workflow**, select **main**, then run it. Future pushes to main deploy automatically.
4. After the workflow succeeds, use the deployment link displayed in that run or in Settings → Pages. The URL above becomes usable after deployment completes.

GitHub Pages is free for this public repository. No Render service, database, or subscription is needed for this design preview. The paid Render Blueprint has been removed.

## Local preview

Use Node 24 and run `npm ci --include=dev`, then `npm run build:pages`. Publish the contents of `pages-dist/`. The script uses a fresh in-memory sample database rather than copying local or production data. Hash routes allow every shop/admin screen to reload on static hosting, and asset URLs include the repository path.

GitHub Pages is not a replacement for the application's server, database, or secure admin authentication. It is intended here for design review before launching the full shop.

## Local validation

The static build and existing Next.js compilation passed. Chromium checks passed for the shop at 320, 390, 768, and 1366px and for admin at 320, 390, and 1366px. Product images loaded; hash-route reloads and bag actions worked. Checkout and admin saves were blocked, with no backend API requests or browser errors. Publication is confirmed only when the GitHub Actions deployment succeeds.
