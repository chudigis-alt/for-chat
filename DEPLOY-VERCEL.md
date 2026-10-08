# Launch BEL on Vercel

The ZIP includes the site source, product photos, uploaded GCash QR, latest Facebook link, testimonials, and 13 editable shipping rules. Local orders, customers, sessions, and passwords are excluded.

1. Extract the ZIP. Upload the **contents** of `bel-chili-garlic` to a private Git repository, with `package.json` at the repository root.
2. Import that repository in Vercel. Choose **Next.js**, root directory `./`, Node.js **24.x**, install command `npm ci`, and build command `npm run build`. Leave the output directory at the framework default.
3. Connect a managed PostgreSQL database and a **public Vercel Blob** store. Add the server environment variables below in Vercel Project Settings. Reserve your production domain first so APP_ORIGIN matches the actual website.

| Variable | Value |
| --- | --- |
| DATABASE_URL | Provider's pooled PostgreSQL connection string |
| DIRECT_URL | Provider's direct PostgreSQL connection string for migrations |
| APP_ORIGIN | Actual HTTPS production origin, no trailing slash |
| BLOB_READ_WRITE_TOKEN | Blob store's server token for future admin image uploads |
| ADMIN_SEED_HASH | Copy the value from the separate VERCEL-ADMIN-PRIVATE.env file |
| ADMIN_REQUIRE_PASSWORD_CHANGE | false, as provided in that private file |

The private admin file retains the currently chosen admin password as a bcrypt hash. Username: **bel**. Keep that file private and do not upload it to Git. The source ZIP contains only a blank `.env.example`.

4. On your computer, open a terminal in the extracted project folder. Install dependencies, copy `.env.example` to `.env`, and fill in the database URLs, APP_ORIGIN, Blob token, and the two private admin variables. Then run:

```powershell
npm ci
npx prisma generate
npm run db:migrate
npm run db:seed
```

On a fresh database, seeding imports `data/store-launch.json` automatically, including the GCash QR path and shipping rules. Re-running the seed preserves existing business settings and accounts. Do not use the old shipping revision commands after this import; the exported configuration is already current.

5. Deploy in Vercel. If you add or change Vercel environment variables after a deployment, redeploy to apply them. Production will show a friendly unavailable message if its database is missing.
6. Open `/admin`, log in, and set actual available inventory before accepting customers. The fresh seed starts with 20 jars of each size; local testing stock and orders are not imported. Confirm your GCash QR, Facebook link, local COD area, and editable fees. Test an order, payment verification, tracking, and one admin image upload on the deployed URL before sharing it.

The default parcel fees use the supplied 0–500g row: NCR ₱95, Luzon ₱85, Visayas ₱100, Mindanao ₱105, selected islands ₱115. Lubao local delivery starts at ₱0 with COD enabled; edit it if needed. Lalamove selection opens BEL's contact page for same-day arrangements. Rider availability and fees are confirmed manually.

This package was verified locally; a live PostgreSQL connection, Vercel Blob upload, and production HTTPS checkout still need to be verified after your services are connected.

Official references: [Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs), [Vercel environment variables](https://vercel.com/docs/environment-variables).

For Vercel Drop uploads, use BEL-Chili-Garlic-Drop-Ready.zip. It places package.json, app/, and vercel.json directly at the ZIP root and explicitly selects Next.js. Upload at https://vercel.com/drop, wait for the deployment to finish, and use its Visit button for the actual generated URL. Each Drop creates a new project, so an old URL may not point to the new deployment. If keeping an existing project, set Framework Preset to Next.js, Root Directory to the folder containing package.json, and leave Output Directory at its framework default. Configure the database/Blob environment and seed as described above. Source: https://vercel.com/kb/guide/vercel-drop-vs-netlify-drop
