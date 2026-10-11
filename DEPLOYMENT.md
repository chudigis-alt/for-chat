# Production deployment and recovery

This checkout is prepared for a Node.js 24 server with PostgreSQL and a private persistent upload disk. No live host, production database credentials or domain were supplied, so production deployment/HTTPS verification remains an owner action.

## Configuration

Use a managed PostgreSQL service and an application-only database role with access to this application's tables. Provide `DATABASE_URL` securely. Production uses verified PostgreSQL TLS (`verify-full`, certificate validation enabled); do not bypass certificate verification. If a provider requires a private CA, configure Node's trusted CA file using the provider's instructions. Run migrations with an authorized schema owner, then use a least-privilege application role for normal operation.

Set `APP_ORIGIN` to the exact HTTPS origin used by visitors, with no trailing slash. Configure a private persistent mounted disk and set `TWEEN_UPLOAD_DIR` to its absolute directory. Restrict disk/backup access to the application and authorized operators; do not expose it as a static web directory. Uploaded artwork is confidential. Public Vercel Blob support is only for website imagery: it cannot store private customer designs. An ephemeral Vercel filesystem alone cannot support the complete upload workflow; choose persistent disk hosting or implement a private object-storage adapter before deploying there.

Set `NODE_ENV=production` at runtime. Do not set `TWEEN_DEV_DB` for production. Keep optional `BLOB_READ_WRITE_TOKEN` secret and omit it when using disk storage. `TRUST_VERCEL_PROXY` defaults false: rate limiting uses a shared conservative bucket instead of trusting spoofable forwarded IP headers. Enable it only behind Vercel ingress that overwrites the documented header. On another host, retain the conservative default and configure per-client anti-abuse controls at the trusted edge; do not blindly trust arbitrary client forwarding headers. Review rate limits against actual traffic before launch.

## Build and launch

```sh
npm ci
npm test
npm run validate
npm run build
# With the production database/origin/storage configuration loaded securely:
npm run db:migrate
# Initialize the owner account once through the secure stdin procedure in README.
bash scripts/start-render.sh
```

`start-render.sh` runs idempotent schema/seed setup, then binds Next.js to the provider's `PORT` on all interfaces (default 10000). Place it behind the provider's HTTPS proxy. `npm start` is the local loopback alternative. Do not run development mode on production. Keep the service working directory at this repository root; migrations and disk paths are resolved there.

Schema creation is repeatable and initial rows use insert-if-absent; existing accounts, inquiries and owner content are preserved. Future schema changes should be versioned migrations with reviewed backups/rollback plans; editing an existing CREATE TABLE statement does not migrate an existing table. The current migration is the initial schema.

Before allowing customers, verify health readiness, actual PostgreSQL connectivity, confidential upload storage across a restart, correct HTTPS origin, secure session cookies, CSRF checks, private API denial, and the full inquiry/admin workflow on the deployed domain. Confirm starter prices, sizing, address, contact links and imagery with the owner. Ensure no QA account, test customer record, old BEL account or unnecessary developer credential exists in the production database. Do not copy the cloud development `.data` directory to production.

There is no payment gateway, courier API or email transport configured. The business manually quotes, contacts customers, records payment in its authorized external bookkeeping process and advances inquiry statuses. Displayed estimates remain estimates. Add verified provider webhooks and business rules before advertising online payments.

## Backups and restoration

Enable encrypted managed PostgreSQL backups/PITR and verify the retention/recovery objectives with the client. For exports, use `pg_dump --format=custom` with provider-approved TLS and credentials supplied securely; store dumps outside the repository and public web storage. Back up the private upload disk alongside database snapshots because upload records reference disk files. Public artwork also needs a backup if edited through the admin.

Practice restoration into a separate database and private disk: restore the database, restore the corresponding upload snapshot, load the new connection/origin configuration, revoke restored sessions with `DELETE FROM tt_sessions`, start the app, and verify an existing private upload and inquiry. Do not test restores against the live database. Rotate compromised credentials before recovery. Document the successful restore time and the selected backup with the client.

Configure uptime/error monitoring without recording passwords, tokens, upload access URLs or customer payloads. Establish client-approved customer-data retention and deletion procedures, including orphan-upload cleanup and backup retention. Automatic retention deletion and malware scanning are not implemented; format validation is not a malware scanner. Restrict administrative database/host access accordingly.

## Serverless database upload option

Netlify and other serverless hosts can set `TWEEN_UPLOAD_STORAGE=database`, leave `TWEEN_UPLOAD_DIR` empty, and use the `tt_file_objects` table for durable private files (4 MB maximum). Without disk or Blob configuration, production defaults to database upload storage. The public Blob restrictions above still apply when that adapter is explicitly used. Database-mode backups include file bytes. See NETLIFY.md for configuration and host payload limits.
