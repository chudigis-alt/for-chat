import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { randomUUID, createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import sharp from "sharp";
import { PGlite } from "@electric-sql/pglite";
import { PDFDocument, PDFName, PDFString } from "pdf-lib";
import { sqliteStore, postgresStore } from "../../server/tweentees/db.mjs";
import { seed } from "../../server/tweentees/seed.mjs";
import { handle } from "../../server/tweentees/api.mjs";
const sha = (v) => createHash("sha256").update(v).digest("hex");
const config = {
  APP_ORIGIN: "https://tween.test",
  NODE_ENV: "development",
  TWEEN_UPLOAD_DIR: "/tmp/tween-test-" + randomUUID(),
};
for (const engine of ["sqlite", "postgresql"])
  test("TweenTees integration: " + engine, async (t) => {
    let pg;
    const db =
      engine === "sqlite"
        ? sqliteStore(":memory:")
        : await (async () => {
            pg = new PGlite();
            const query = async (sql, values = []) => {
              if (sql.includes("CREATE TABLE")) {
                await pg.exec(sql);
                return { rows: [], rowCount: 0 };
              }
              const r = await pg.query(sql, values);
              return { rows: r.rows, rowCount: r.affectedRows };
            };
            let tail = Promise.resolve();
            return postgresStore({
              query,
              connect: async () => {
                const previous = tail;
                let release;
                tail = new Promise((resolve) => {
                  release = resolve;
                });
                await previous;
                return { query, release };
              },
              end: () => pg.close(),
            });
          })();
    await db.migrate();
    await seed(db);
    const username = "fixture-owner",
      initial = randomUUID() + "Aa7",
      password = randomUUID() + "Zz9",
      adminId = randomUUID();
    await db.query(
      "INSERT INTO tt_admins (id,username,password_hash) VALUES (?,?,?)",
      [adminId, username, await bcrypt.hash(initial, 12)],
    );
    let cookie = "",
      csrf = "",
      receipt,
      submission,
      uploaded;
    async function request(
      path,
      method = "GET",
      body,
      auth = false,
      extra = {},
    ) {
      const form = body instanceof FormData;
      const headers = {
        origin: config.APP_ORIGIN,
        ...(body === undefined || form
          ? {}
          : { "Content-Type": "application/json" }),
        ...(auth ? { cookie, "x-csrf-token": csrf } : {}),
        ...extra,
      };
      const r = await handle(
        new Request(config.APP_ORIGIN + "/api/tt" + path, {
          method,
          headers,
          ...(body === undefined
            ? {}
            : { body: form ? body : JSON.stringify(body) }),
        }),
        { db, config },
      );
      return {
        status: r.status,
        headers: r.headers,
        data: r.headers.get("content-type")?.includes("json")
          ? await r.json()
          : Buffer.from(await r.arrayBuffer()),
      };
    }
    const customer = {
      name: "Test Customer",
      email: "fixture@example.com",
      phone: "09101234567",
      location: "Lubao, Philippines",
      team: "Fixture Team",
      contact: "Email",
    };
    const inquire = () => ({
      idempotency_key: randomUUID(),
      access_token: sha(randomUUID()),
      customer,
      notes: "Fixture notes",
      items: [
        {
          product: "running-singlet",
          fabric: "ripstop",
          quantities: { M: 2, L: 1 },
          design: "assistance",
          price: 1,
        },
      ],
    });
    try {
      await t.test(
        "design catalog persists and repeat seed preserves owner edits",
        async () => {
          let r = await request("/catalog");
          assert.equal(r.status, 200);
          assert.equal(
            r.data.records.filter((x) => x.kind === "product").length,
            10,
          );
          const [settings] = await db.query(
            "SELECT data FROM tt_settings WHERE id=?",
            ["website"],
          );
          const data = JSON.parse(settings.data);
          data.about = "Owner updated content";
          await db.query("UPDATE tt_settings SET data=? WHERE id=?", [
            JSON.stringify(data),
            "website",
          ]);
          await seed(db);
          r = await request("/catalog");
          assert.equal(r.data.settings.about, "Owner updated content");
          assert.equal(
            r.data.records.find((x) => x.id === "running-singlet").price,
            35000,
          );
        },
      );
      await t.test(
        "admin APIs independently deny unauthenticated requests and wrong origin",
        async () => {
          for (const path of [
            "/admin/overview",
            "/admin/inquiries",
            "/admin/catalog",
          ])
            assert.equal((await request(path)).status, 401);
          assert.equal(
            (
              await request(
                "/contact",
                "POST",
                { name: "A", email: "a@b.test", message: "Hello" },
                false,
                { origin: "https://evil.test" },
              )
            ).status,
            403,
          );
          assert.equal(
            (
              await request("/admin/login", "POST", {
                username,
                password: "wrong",
              })
            ).status,
            401,
          );
        },
      );
      await t.test(
        "temporary login requires replacement; CSRF enforced; password confirmation verified",
        async () => {
          const r = await request("/admin/login", "POST", {
            username,
            password: initial,
          });
          assert.equal(r.status, 200);
          assert.equal(r.data.must_change, true);
          cookie = r.headers.get("set-cookie").split(";")[0];
          csrf = r.data.csrf;
          assert.match(
            r.headers.get("set-cookie"),
            /HttpOnly; SameSite=Strict/,
          );
          assert.equal(
            (await request("/admin/overview", "GET", undefined, true)).status,
            428,
          );
          assert.equal(
            (
              await request(
                "/admin/password",
                "POST",
                { current: initial, password, confirm: password },
                true,
                { "x-csrf-token": "bad" },
              )
            ).status,
            403,
          );
          assert.equal(
            (
              await request(
                "/admin/password",
                "POST",
                { current: "wrong", password, confirm: password },
                true,
              )
            ).status,
            400,
          );
          assert.equal(
            (
              await request(
                "/admin/password",
                "POST",
                { current: initial, password, confirm: "mismatch" },
                true,
              )
            ).status,
            400,
          );
          assert.equal(
            (
              await request(
                "/admin/password",
                "POST",
                { current: initial, password, confirm: password },
                true,
              )
            ).status,
            200,
          );
          assert.equal(
            (await request("/admin/session", "GET", undefined, true)).data
              .username,
            null,
          );
          assert.equal(
            (
              await request("/admin/login", "POST", {
                username,
                password: initial,
              })
            ).status,
            401,
          );
          const login = await request("/admin/login", "POST", {
            username,
            password,
          });
          assert.equal(login.status, 200);
          assert.equal(login.data.must_change, false);
          cookie = login.headers.get("set-cookie").split(";")[0];
          csrf = login.data.csrf;
        },
      );
      await t.test(
        "catalog CRUD, publish/unpublish, relationships, optimistic concurrency and prices",
        async () => {
          const data = {
            name: "Fixture Product",
            category: "running",
            price: 45000,
            description: "Fixture description",
            image: "/tweentees/singlet.webp",
            fabrics: ["ripstop"],
            sizes: ["M", "L"],
          };
          let r = await request(
            "/admin/catalog",
            "POST",
            { id: "fixture-product", kind: "product", active: true, data },
            true,
          );
          assert.equal(r.status, 201);
          const row = (
            await request("/admin/overview", "GET", undefined, true)
          ).data.records.find((x) => x.id === "fixture-product");
          assert.equal(
            (
              await request(
                "/admin/catalog/fixture-product",
                "PUT",
                {
                  version: row.version,
                  active: false,
                  data: { ...data, price: 48000 },
                },
                true,
              )
            ).status,
            200,
          );
          assert.equal(
            (
              await request(
                "/admin/catalog/fixture-product",
                "PUT",
                { version: row.version, active: true, data },
                true,
              )
            ).status,
            409,
          );
          assert.ok(
            !(await request("/catalog")).data.records.some(
              (x) => x.id === "fixture-product",
            ),
          );
          assert.equal(
            (
              await request(
                "/admin/catalog/ripstop",
                "DELETE",
                { version: 1 },
                true,
              )
            ).status,
            409,
          );
          assert.equal(
            (
              await request(
                "/admin/catalog/fixture-product",
                "DELETE",
                { version: 2 },
                true,
              )
            ).status,
            200,
          );
          assert.equal(
            (
              await request(
                "/admin/catalog",
                "POST",
                {
                  id: "bad-price",
                  kind: "product",
                  active: true,
                  data: { ...data, price: -1 },
                },
                true,
              )
            ).status,
            400,
          );
        },
      );
      await t.test(
        "server recalculates totals, saves snapshots and prevents duplicate submissions",
        async () => {
          submission = inquire();
          let r = await request("/inquiries", "POST", submission);
          assert.equal(r.status, 201, JSON.stringify(r.data));
          receipt = r.data.inquiry;
          assert.equal(receipt.estimate, 105000);
          assert.equal(receipt.status, "Pending");
          assert.equal(receipt.items[0].unit_price, 35000);
          assert.equal(
            (await request("/inquiries", "POST", submission)).data.inquiry.id,
            receipt.id,
          );
          assert.equal(
            (
              await request("/inquiries", "POST", {
                ...submission,
                notes: "Changed",
              })
            ).status,
            409,
          );
          const [count] = await db.query(
            "SELECT COUNT(*) AS n FROM tt_inquiries",
          );
          assert.equal(Number(count.n), 1);
        },
      );
      await t.test(
        "inquiry access requires private token and does not expose hashes",
        async () => {
          assert.equal(
            (
              await request("/inquiry-details", "POST", {
                id: receipt.id,
                token: "wrong",
              })
            ).status,
            404,
          );
          const r = await request("/inquiry-details", "POST", {
            id: receipt.id,
            token: submission.access_token,
          });
          assert.equal(r.status, 200);
          assert.equal(r.data.inquiry.customer.email, customer.email);
          assert.ok(!JSON.stringify(r.data).includes("access_hash"));
          assert.ok(!JSON.stringify(r.data).includes("payload_hash"));
        },
      );
      await t.test(
        "invalid sizes, quantities, fabrics, hidden products and honeypots rejected",
        async () => {
          for (const item of [
            { quantities: { M: -1 } },
            { quantities: { M: 0 } },
            { quantities: { XXX: 1 } },
            { fabric: "missing" },
            { product: "missing" },
            { design: "upload" },
          ]) {
            const b = inquire();
            b.items[0] = { ...b.items[0], ...item };
            assert.ok((await request("/inquiries", "POST", b)).status >= 400);
          }
          assert.equal(
            (
              await request("/inquiries", "POST", {
                ...inquire(),
                website: "spam",
              })
            ).status,
            400,
          );
        },
      );
      await t.test(
        "concurrent duplicate requests never create duplicate inquiries",
        async () => {
          const b = inquire(),
            rs = await Promise.all([
              request("/inquiries", "POST", b),
              request("/inquiries", "POST", b),
            ]);
          assert.ok(rs.every((r) => [201, 409].includes(r.status)));
          const rows = await db.query(
            "SELECT id FROM tt_inquiries WHERE idempotency_key=?",
            [b.idempotency_key],
          );
          assert.equal(rows.length, 1);
          assert.equal((await request("/inquiries", "POST", b)).status, 201);
        },
      );
      await t.test(
        "design uploads validate bytes and private file access; image uploads require admin CSRF",
        async () => {
          const bytes = await sharp({
            create: { width: 10, height: 10, channels: 3, background: "#aaa" },
          })
            .png()
            .toBuffer();
          const form = (
            bytes,
            name = "design.png",
            type = "image/png",
            purpose = "design",
          ) => {
            const f = new FormData();
            f.set("file", new File([bytes], name, { type }));
            f.set("purpose", purpose);
            return f;
          };
          assert.equal(
            (await request("/uploads", "POST", form(Buffer.from("bad"))))
              .status,
            400,
          );
          assert.equal(
            (
              await request(
                "/uploads",
                "POST",
                form(bytes, "file.svg", "image/svg+xml"),
              )
            ).status,
            400,
          );
          assert.equal(
            (
              await request(
                "/uploads",
                "POST",
                form(bytes, "file.png", "image/png", "image"),
              )
            ).status,
            403,
          );
          const r = await request("/uploads", "POST", form(bytes));
          assert.equal(r.status, 201);
          uploaded = r.data;
          assert.equal((await request("/files/" + uploaded.id)).status, 404);
          assert.equal(
            (
              await request(
                "/files/" + uploaded.id + "?token=" + uploaded.token,
              )
            ).status,
            200,
          );
          assert.equal(
            (await request("/files/" + uploaded.id, "GET", undefined, true))
              .status,
            200,
          );
          const b = inquire();
          b.items[0].design = "upload";
          b.items[0].upload = uploaded;
          assert.equal((await request("/inquiries", "POST", b)).status, 201);
          assert.equal(
            (
              await request(
                "/uploads",
                "POST",
                form(bytes, "site.png", "image/png", "image"),
                true,
              )
            ).status,
            201,
          );
        },
      );
      await t.test(
        "PDF validation rejects corrupt and interactive files",
        async () => {
          const doc = await PDFDocument.create();
          doc.addPage();
          const form = (bytes) => {
            const f = new FormData();
            f.set(
              "file",
              new File([bytes], "design.pdf", { type: "application/pdf" }),
            );
            f.set("purpose", "design");
            return f;
          };
          assert.equal(
            (await request("/uploads", "POST", form(await doc.save()))).status,
            201,
          );
          assert.equal(
            (
              await request(
                "/uploads",
                "POST",
                form(Buffer.from("%PDF-corrupt")),
              )
            ).status,
            400,
          );
          doc.catalog.set(
            PDFName.of("OpenAction"),
            doc.context.obj({
              S: PDFName.of("JavaScript"),
              JS: PDFString.of('app.alert("fixture")'),
            }),
          );
          assert.equal(
            (await request("/uploads", "POST", form(await doc.save()))).status,
            400,
          );
        },
      );
      await t.test(
        "inquiry state transitions, history and conflicts are enforced",
        async () => {
          let r = await request(
            "/admin/inquiries/" + receipt.id,
            "GET",
            undefined,
            true,
          );
          assert.equal(
            (
              await request(
                "/admin/inquiries/" + receipt.id,
                "PUT",
                { version: r.data.inquiry.version, status: "Completed" },
                true,
              )
            ).status,
            400,
          );
          assert.equal(
            (
              await request(
                "/admin/inquiries/" + receipt.id,
                "PUT",
                {
                  version: r.data.inquiry.version,
                  status: "In Review",
                  note: "Reviewing design",
                },
                true,
              )
            ).status,
            200,
          );
          assert.equal(
            (
              await request(
                "/admin/inquiries/" + receipt.id,
                "PUT",
                { version: r.data.inquiry.version, status: "Quoted" },
                true,
              )
            ).status,
            409,
          );
          r = await request(
            "/admin/inquiries/" + receipt.id,
            "GET",
            undefined,
            true,
          );
          assert.equal(r.data.history.length, 2);
          assert.equal(r.data.inquiry.status, "In Review");
        },
      );
      await t.test(
        "contact messages persist and admin marks reviewed; settings changes persist",
        async () => {
          assert.equal(
            (
              await request("/contact", "POST", {
                name: "Customer",
                email: "invalid",
                message: "Hello",
              })
            ).status,
            400,
          );
          assert.equal(
            (
              await request("/contact", "POST", {
                name: "Customer",
                email: "customer@example.com",
                message: "Hello",
              })
            ).status,
            201,
          );
          let overview = (
            await request("/admin/overview", "GET", undefined, true)
          ).data;
          assert.equal(overview.messages.length, 1);
          assert.equal(
            (
              await request(
                "/admin/messages/" + overview.messages[0].id,
                "PUT",
                { status: "Read" },
                true,
              )
            ).status,
            200,
          );
          assert.equal(
            (
              await request(
                "/admin/settings",
                "PUT",
                { ...overview.settings, hero_title: "Owner updated headline" },
                true,
              )
            ).status,
            200,
          );
          assert.equal(
            (await request("/catalog")).data.settings.hero_title,
            "Owner updated headline",
          );
          overview = (await request("/admin/overview", "GET", undefined, true))
            .data;
          assert.equal(overview.statistics["In Review"], 1);
          assert.equal(overview.messages[0].status, "Read");
          assert.ok(
            overview.audit.some((r) => r.action === "PASSWORD_CHANGED"),
          );
        },
      );
      await t.test(
        "admin filtering and pagination return accurate data without credential leakage",
        async () => {
          const r = await request(
            "/admin/inquiries?search=fixture&status=In%20Review&page=1",
            "GET",
            undefined,
            true,
          );
          assert.equal(r.status, 200);
          assert.equal(r.data.total, 1);
          assert.equal(r.data.rows.length, 1);
          const messages = await request(
            "/admin/messages?search=customer&status=Read&page=1",
            "GET",
            undefined,
            true,
          );
          assert.equal(messages.data.total, 1);
          assert.equal(messages.data.rows[0].status, "Read");
          assert.ok(
            !JSON.stringify(
              (await request("/admin/overview", "GET", undefined, true)).data,
            ).includes("password_hash"),
          );
        },
      );
      await t.test(
        "expired sessions are denied even with valid stored token hashes",
        async () => {
          const token = sha(randomUUID());
          await db.query(
            "INSERT INTO tt_sessions (token_hash,admin_id,csrf,expires) VALUES (?,?,?,?)",
            [sha(token), adminId, sha(randomUUID()), Date.now() - 1000],
          );
          assert.equal(
            (
              await request("/admin/overview", "GET", undefined, true, {
                cookie: "tween_session=" + token,
              })
            ).status,
            401,
          );
        },
      );
      await t.test(
        "logout invalidates cookie and secure production cookies are configured",
        async () => {
          const r = await request("/admin/logout", "POST", {}, true);
          assert.equal(r.status, 200);
          assert.match(r.headers.get("set-cookie"), /Max-Age=0/);
          assert.equal(
            (await request("/admin/overview", "GET", undefined, true)).status,
            401,
          );
          const production = await handle(
            new Request(config.APP_ORIGIN + "/api/tt/admin/login", {
              method: "POST",
              headers: {
                origin: config.APP_ORIGIN,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ username, password }),
            }),
            { db, config: { ...config, NODE_ENV: "production" } },
          );
          assert.equal(production.status, 200);
          assert.match(production.headers.get("set-cookie"), /Secure/);
        },
      );
      await t.test(
        "database failures produce generic errors without internal details",
        async () => {
          const r = await handle(
            new Request(config.APP_ORIGIN + "/api/tt/catalog"),
            {
              db: {
                query: async () => {
                  throw Error("private SQL credential data");
                },
              },
              config,
            },
          );
          assert.equal(r.status, 503);
          assert.ok(!JSON.stringify(await r.json()).includes("private SQL"));
        },
      );
      await t.test(
        "repeated failed login attempts are rate limited",
        async () => {
          let r;
          for (let i = 0; i < 12; i++)
            r = await request("/admin/login", "POST", {
              username,
              password: "wrong",
            });
          assert.equal(r.status, 429);
        },
      );
    } finally {
      await db.close();
      fs.rmSync(config.TWEEN_UPLOAD_DIR, { recursive: true, force: true });
    }
  });
