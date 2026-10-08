# Deploy the full shop from GitHub on Render

GitHub stores the source. Render runs the Next.js website and its APIs; PostgreSQL stores orders, products, admin accounts, and sessions. GitHub Pages alone cannot run this application.

The included `render.yaml` defines a paid Starter web service, a paid Basic PostgreSQL database, and a 1 GB persistent upload disk. Review Render's current prices before confirming deployment. No Render account or subscription is created by committing this configuration.

1. Sign in to Render and connect the GitHub account that owns `chudigis-alt/for-chat`. Grant repository access if it is private.
2. Choose **New → Blueprint**, select `chudigis-alt/for-chat`, and use branch **main** with `render.yaml` at the repository root.
3. Review the services and prices, then deploy. Render installs dependencies and builds the website. The server applies database migrations and seeds missing store data before serving requests. A build or migration failure stops startup.
4. Open the web service's generated HTTPS URL after it becomes live. The app uses Render's `RENDER_EXTERNAL_URL` as its origin automatically. `/api/health` must return HTTP 200 with `{"status":"ok"}`; it checks the products table in the database.
5. In the web service's **Environment** settings, securely view the generated `ADMIN_INITIAL_PASSWORD`. Visit `/admin`, use username **bel** and that password, then follow the required password-change step. Do not put the password in GitHub or chat. Changing the seed password later does not reset an existing admin account.
6. Confirm actual stock, payment QR, prices and delivery fees before accepting customer orders. Test checkout, admin payment/status updates, customer tracking, and a product image upload on the deployed URL.

Render generates both database URLs and the initial password. No Vercel account or Blob token is required for this deployment. Uploaded product and branding images are stored on the configured persistent disk. The initial seed preserves existing store settings, orders, and admin accounts on restart.

For a custom domain, set `APP_ORIGIN` to its exact HTTPS origin (no trailing slash) and restart the service. Use that domain consistently when shopping and accessing admin. Keep the database and upload disk when redeploying; deleting them deletes their data.

This configuration has been checked locally. Live Render provisioning, PostgreSQL access, and deployed checkout must be verified after the account owner deploys it. The generated service URL is supplied by Render, not by this repository.

## Checks performed in the preparation workspace

The optimized Next.js compilation, source artifact validation, and three new deployment tests passed. The seed command was run twice against a fresh local database, and the health route returned HTTP 200 against that database. The full existing integration suites could not initialize because Prisma client generation is blocked by this workspace's engine-download network policy. Live managed PostgreSQL, Render startup, and deployed order/payment/image flows are not yet verified.
