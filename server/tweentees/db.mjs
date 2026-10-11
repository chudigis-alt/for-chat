import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import pg from "pg";

const migration = () =>
  fs.readFileSync(path.join(process.cwd(), "migrations/tweentees.sql"), "utf8");
export function sqliteStore(filename) {
  if (filename !== ":memory:")
    fs.mkdirSync(path.dirname(filename), { recursive: true });
  const raw = new DatabaseSync(filename);
  raw.exec(
    "PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;",
  );
  let tail = Promise.resolve();
  const locked = (fn) => {
    const result = tail.then(fn);
    tail = result.catch(() => {});
    return result;
  };
  const query = async (sql, params = []) => {
    const s = raw.prepare(sql);
    return /^\s*(SELECT|WITH)/i.test(sql)
      ? s.all(...params)
      : { changes: Number(s.run(...params).changes) };
  };
  return {
    query: (sql, p) => locked(() => query(sql, p)),
    transaction: (fn) =>
      locked(async () => {
        raw.exec("BEGIN IMMEDIATE");
        try {
          const result = await fn({ query });
          raw.exec("COMMIT");
          return result;
        } catch (e) {
          raw.exec("ROLLBACK");
          throw e;
        }
      }),
    migrate: () => locked(() => raw.exec(migration())),
    close: () => locked(() => raw.close()),
  };
}
export function postgresStore(pool) {
  const query = async (client, sql, params = []) => {
    let i = 0;
    const r = await client.query(
      sql.replace(/\?/g, () => "$" + ++i),
      params,
    );
    return /^\s*(SELECT|WITH)/i.test(sql) ? r.rows : { changes: r.rowCount };
  };
  return {
    query: (sql, p) => query(pool, sql, p),
    migrate: () => pool.query(migration()),
    transaction: async (fn) => {
      const c = await pool.connect();
      try {
        await c.query("BEGIN");
        const result = await fn({ query: (sql, p) => query(c, sql, p) });
        await c.query("COMMIT");
        return result;
      } catch (e) {
        await c.query("ROLLBACK");
        throw e;
      } finally {
        c.release();
      }
    },
    close: () => pool.end(),
  };
}
export function createStore(config = process.env) {
  if (config.DATABASE_URL) {
    const url = new URL(config.DATABASE_URL);
    if (config.NODE_ENV === "production") {
      if (
        url.searchParams.get("sslmode") === "disable" ||
        url.searchParams.get("ssl") === "0" ||
        url.searchParams.get("uselibpqcompat") === "true"
      )
        throw Error("Production requires verified PostgreSQL TLS.");
      url.searchParams.set("sslmode", "verify-full");
    }
    return postgresStore(
      new pg.Pool({
        connectionString: url.toString(),
        max: 5,
        ...(config.NODE_ENV === "production"
          ? { ssl: { rejectUnauthorized: true } }
          : {}),
      }),
    );
  }
  if (config.NODE_ENV === "production")
    throw Error("PostgreSQL DATABASE_URL is required for production.");
  return sqliteStore(config.TWEEN_DEV_DB || ".data/tweentees.sqlite");
}
export const database = () =>
  globalThis.tweenDatabase || (globalThis.tweenDatabase = createStore());
