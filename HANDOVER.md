# Client handover

Transfer the repository, production host, domain/DNS, PostgreSQL account, private upload storage and backup ownership to accounts controlled by the client. Provide configuration values through a secure channel or the client's secret manager. Never publish a populated environment file, database dump or password in Git, screenshots or tickets.

## Administrator ownership

1. Initialize `rodel` once using the secure standard-input command in README. If already initialized, do not seed or overwrite the password again.
2. Let the client privately log in at `/admin` using the initial credentials supplied separately. The application requires the current password and a new confirmed password before access to records.
3. After replacement, all sessions are revoked. The client signs in with the new password. Verify that the former password fails, that records remain accessible, and that logout blocks protected pages/APIs.
4. Demonstrate Account Settings → Change Password, reveal/hide controls and requirements. Future changes again require the current password and invalidate all sessions.
5. Demonstrate catalog publishing, content/contact editing, inquiry status history, private artwork downloads and contact-message review. Manual correspondence/quotation occurs outside the app.

The developer does not need to know the client's replacement password. There is no public administrator registration or automatic privilege grant, and no configured email recovery channel.

## Owner-authorized recovery

A trusted operator with production shell and database access can reset a forgotten password. Use the same secure stdin command with `npm run admin:init -- rodel --reset`, after confirming authorization and identity outside the application. Recovery replaces only the specified account hash, revokes its sessions, forces another password change, and preserves business records. Treat shell/database access as administrator access; it must not be available to visitors or untrusted support staff. Do not use recovery during routine deployments.

## Credential rotation

Transfer hosting/database/storage/domain billing and recovery methods, enable MFA where supported, and remove developer collaborators, deployment keys and unused service accounts. Rotate database credentials, upload-provider tokens, hosting API keys, CI credentials and any backup encryption access previously controlled by the developer. Update the client's secret manager and redeploy; verify health, uploads, admin login and inquiries afterward. Keep the previous deployment available for a reviewed rollback without restoring revoked developer access.

List only intentional administrator usernames in the production `tt_admins` table. Revoke remaining sessions with `DELETE FROM tt_sessions` during ownership/security transitions when appropriate. Cloud QA uses isolated disposable credentials and must never seed the production database. Archive or remove inherited BEL deployment credentials and database tables if they exist in a reused service; they are not used by TweenTees.

Give the client the latest verified backup/restore instructions, contact-data retention policy, deployment commands and test results. Launch acceptance must include the client's deployed-domain test and approval of actual prices, measurements, contact details, manual quote/payment procedure and content. No production ownership transfer has been performed in this cloud development task.
