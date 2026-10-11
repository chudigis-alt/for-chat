# Deploy TweenTees on Netlify

This source ZIP is configured for Netlify's Next.js runtime, including server APIs and authentication. It cannot be deployed by dropping the ZIP into Netlify Drop: that service hosts already-built static files and cannot run this application's backend. Import the GitHub repository, or upload the extracted source into your own Git repository and connect it to Netlify.

## First deployment

1. In Netlify choose **Add new project → Import an existing project → GitHub**. Select `chudigis-alt/for-chat`, branch `tweentees-ready` (or your copy of the extracted source).
2. Keep the base directory at the repository root. `netlify.toml` sets build command `npm run build`, publish directory `.next`, and Node.js 24. Let Netlify detect Next.js and install its supported Next.js runtime. Do not enable static export or add a blanket rewrite to `/index.html`.
3. Create a persistent managed PostgreSQL database with verified TLS. Configure the following variables using Netlify's environment settings with runtime/functions scope. Keep database credentials secret.

| Variable                | Value                                                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------------------------------ |
| `DATABASE_URL`          | Your private PostgreSQL connection URL, preferably the provider's serverless-compatible connection pooler    |
| `APP_ORIGIN`            | Your exact production HTTPS origin, for example `https://your-project.netlify.app`, without a trailing slash |
| `TWEEN_UPLOAD_STORAGE`  | `database`                                                                                                   |
| `TWEEN_MAX_UPLOAD_MB`   | `4`                                                                                                          |
| `TWEEN_UPLOAD_DIR`      | Leave unset/empty; never use the function's temporary filesystem for persistent files                        |
| `BLOB_READ_WRITE_TOKEN` | Unset for database storage                                                                                   |

Use Node.js 24 for the function runtime as well as the build. If Netlify offers a separate runtime override, set `AWS_LAMBDA_JS_RUNTIME=nodejs24.x` in the site's environment settings before redeploying. Node 22 does not satisfy this application's runtime requirement. Environment values in `netlify.toml` are build settings; set application secrets/runtime values explicitly in Netlify's UI.

4. From a trusted local terminal running Node.js 24, install dependencies with `npm ci`, securely load the production `DATABASE_URL` and `NODE_ENV=production`, and run `npm run db:migrate`. This creates the schema, including durable upload storage, and inserts the initial catalog only when absent. Do not initialize the database during every Netlify build; deploy previews must not seed customer databases or reset credentials.
5. Initialize `rodel` once using README's secure password-on-stdin procedure. Use the owner-supplied initial password privately. No password is embedded in the ZIP, frontend or build settings. First login forces replacement. Initialization refuses to overwrite existing users; use the documented owner-only recovery procedure if required.
6. Deploy and confirm `/api/health` returns `{ "ok": true }`, the catalog loads, contact/inquiry submissions persist, private uploads survive another deploy, and admin login/password replacement/logout work on the deployed HTTPS domain. Do not reuse test/customer data from the cloud `.data` directory.

## Uploads and persistence

Database storage keeps validated upload bytes in `tt_file_objects` and metadata/access hashes in `tt_uploads`. Customer artwork is served only after the existing private-token or admin-session checks; database bytes are never exposed by the catalog or dashboard statistics. Website imagery is served through the same API with public-image metadata. No publicly accessible object bucket or persistent function disk is required.

Inputs and processed outputs are capped at 4 MB in database mode. The public catalog reports the configured limit; upload controls show/enforce it and the server validates it independently. This leaves room for multipart/base64 transport overhead within typical buffered function payload limits. If your Netlify plan/runtime imposes a lower limit, lower `TWEEN_MAX_UPLOAD_MB`. Large artwork should use design assistance or a separately configured private direct-to-object-storage integration; that integration is not implemented here.

When moving an existing disk-based installation, migrate its saved upload files into database storage before switching the storage mode; changing the environment variable does not copy existing files automatically. Fresh installations need no file migration.

PostgreSQL stores files as base64 text for portability across adapters. This increases file storage by roughly one third, so monitor database storage and backups. Database backups include uploaded files in this mode. Configure client-approved retention and cleanup, and use private object storage if upload volume outgrows the database. Never provide public SQL access to upload or authentication tables.

Set `APP_ORIGIN` separately for any active deploy preview that should accept forms; production origin checks intentionally reject requests from other origins. Use an isolated preview database/account when exercising admin/customer workflows. Do not weaken origin checks to make arbitrary preview URLs work.

## Troubleshooting

- **Netlify 404:** Confirm the project builds this branch as Next.js, publish directory is `.next`, the Next.js runtime is enabled, and the correct deployed domain is being opened. A drag-and-drop source ZIP is insufficient.
- **Catalog/service unavailable:** Check the private `DATABASE_URL`, TLS connectivity, database permissions and that `npm run db:migrate` has completed. The server does not fall back to temporary SQLite in production.
- **Form rejected:** Match `APP_ORIGIN` to the browser's exact HTTPS origin, then redeploy with runtime environment variables loaded.
- **Invalid credentials:** Initialize the administrator in the production database. The cloud development administrator is not included in the ZIP. Once replaced, the initial password cannot authenticate again.
- **Upload fails:** Keep database mode enabled, disk path unset, and the file under the configured limit. Check database capacity and the host's payload ceiling.

The build, API/database upload tests and browser checks were verified in the development workspace. No Netlify account, database credentials or site were provided; a live Netlify deployment has not been performed or verified.
