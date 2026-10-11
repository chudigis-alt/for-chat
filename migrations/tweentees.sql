CREATE TABLE IF NOT EXISTS tt_admins (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, must_change INTEGER NOT NULL DEFAULT 1 CHECK(must_change IN (0,1)));
CREATE TABLE IF NOT EXISTS tt_sessions (token_hash TEXT PRIMARY KEY, admin_id TEXT NOT NULL REFERENCES tt_admins(id) ON DELETE CASCADE, csrf TEXT NOT NULL, expires BIGINT NOT NULL);
CREATE INDEX IF NOT EXISTS tt_sessions_expiry ON tt_sessions(expires);
CREATE TABLE IF NOT EXISTS tt_catalog (id TEXT PRIMARY KEY, kind TEXT NOT NULL CHECK(kind IN ('product','category','fabric','chart','gallery')), data TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)), version INTEGER NOT NULL DEFAULT 1);
CREATE INDEX IF NOT EXISTS tt_catalog_kind ON tt_catalog(kind,active);
CREATE TABLE IF NOT EXISTS tt_settings (id TEXT PRIMARY KEY, data TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS tt_inquiries (id TEXT PRIMARY KEY, reference TEXT NOT NULL UNIQUE, idempotency_key TEXT NOT NULL UNIQUE, payload_hash TEXT NOT NULL, access_hash TEXT NOT NULL, customer TEXT NOT NULL, items TEXT NOT NULL, notes TEXT NOT NULL, estimate INTEGER NOT NULL CHECK(estimate>=0), status TEXT NOT NULL DEFAULT 'Pending', created BIGINT NOT NULL, version INTEGER NOT NULL DEFAULT 1);
CREATE INDEX IF NOT EXISTS tt_inquiries_created ON tt_inquiries(created);
CREATE INDEX IF NOT EXISTS tt_inquiries_status ON tt_inquiries(status,created);
CREATE TABLE IF NOT EXISTS tt_inquiry_history (id TEXT PRIMARY KEY, inquiry_id TEXT NOT NULL REFERENCES tt_inquiries(id), status TEXT NOT NULL, note TEXT NOT NULL, admin_id TEXT REFERENCES tt_admins(id), created BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS tt_messages (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, message TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'Unread', created BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS tt_uploads (id TEXT PRIMARY KEY, access_hash TEXT NOT NULL, mime TEXT NOT NULL, filename TEXT NOT NULL, purpose TEXT NOT NULL CHECK(purpose IN ('design','image')), created BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS tt_limits (id TEXT PRIMARY KEY, count INTEGER NOT NULL, expires BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS tt_audit (id TEXT PRIMARY KEY, admin_id TEXT, action TEXT NOT NULL, entity TEXT NOT NULL, created BIGINT NOT NULL);

-- Private durable upload bytes for serverless hosts; metadata/API enforce access.
CREATE TABLE IF NOT EXISTS tt_file_objects (id TEXT PRIMARY KEY, bytes_base64 TEXT NOT NULL CHECK(length(bytes_base64)<=5592408));
