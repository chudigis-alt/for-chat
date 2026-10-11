import {
  randomUUID,
  randomBytes,
  createHash,
  timingSafeEqual,
} from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcryptjs";
import sharp from "sharp";
import { PDFDocument, PDFDict, PDFName } from "pdf-lib";
import { put, list, del } from "@vercel/blob";
import { database } from "./db.mjs";

const hash = (v) => createHash("sha256").update(v).digest("hex");
const secret = () => randomBytes(32).toString("hex");
const json = (body, status = 200, headers = {}) =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
export class RequestError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
const fail = (m, s) => {
  throw new RequestError(m, s);
};
const text = (v, label, max = 500, required = true) => {
  if (typeof v !== "string" || v.length > max) fail(`${label} is invalid.`);
  const result = v.trim().replace(/[\u0000-\u0009\u000b-\u001f]/g, " ");
  if (required && !result) fail(`${label} is required.`);
  return result;
};
const integer = (v, label, min = 0, max = 1000000) => {
  if (!Number.isSafeInteger(v) || v < min || v > max)
    fail(`${label} is invalid.`);
  return v;
};
const id = (v) => {
  if (typeof v !== "string" || !/^[a-z0-9-]{1,100}$/.test(v))
    fail("Invalid record ID.");
  return v;
};
const safeImage = (v) => {
  if (
    typeof v !== "string" ||
    !/^\/(tweentees\/[a-z0-9-]+\.webp|api\/tt\/files\/[a-f0-9-]{36})$/.test(v)
  )
    fail("Select a valid uploaded image.");
  return v;
};
const safeEqual = (a, b) =>
  typeof a === "string" &&
  typeof b === "string" &&
  Buffer.byteLength(a) === Buffer.byteLength(b) &&
  timingSafeEqual(Buffer.from(a), Buffer.from(b));
const allowedStatuses = [
  "Pending",
  "In Review",
  "Quoted",
  "Confirmed",
  "In Production",
  "Shipped",
  "Completed",
  "Cancelled",
];
const transitions = {
  Pending: ["In Review", "Cancelled"],
  "In Review": ["Quoted", "Cancelled"],
  Quoted: ["In Review", "Confirmed", "Cancelled"],
  Confirmed: ["In Production", "Cancelled"],
  "In Production": ["Shipped", "Completed", "Cancelled"],
  Shipped: ["Completed"],
  Completed: [],
  Cancelled: [],
};
const cookie = (token, secure, age = 28800) =>
  `tween_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${secure ? "; Secure" : ""}`;
const dummy = bcrypt.hash(secret(), 12);
async function body(req) {
  if (!req.headers.get("content-type")?.includes("application/json"))
    fail("JSON is required.", 415);
  const input = await req.text();
  if (input.length > 100000) fail("Request is too large.", 413);
  try {
    const value = JSON.parse(input);
    if (!value || typeof value !== "object" || Array.isArray(value))
      fail("Invalid request.");
    return value;
  } catch {
    fail("Invalid JSON.");
  }
}
async function session(req, db) {
  const token = req.headers
    .get("cookie")
    ?.split(";")
    .map((x) => x.trim())
    .find((x) => x.startsWith("tween_session="))
    ?.slice(14);
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const [s] = await db.query(
    "SELECT s.*,a.username,a.must_change FROM tt_sessions s JOIN tt_admins a ON a.id=s.admin_id WHERE s.token_hash=? AND s.expires>?",
    [hash(token), Date.now()],
  );
  return s || null;
}
export async function pageSession(req, db = database()) {
  return session(req, db);
}
async function audit(db, admin, action, entity) {
  await db.query(
    "INSERT INTO tt_audit (id,admin_id,action,entity,created) VALUES (?,?,?,?,?)",
    [randomUUID(), admin?.admin_id || null, action, entity, Date.now()],
  );
}
async function limit(req, db, bucket, max, config) {
  const ip =
    config.TRUST_VERCEL_PROXY === "true"
      ? req.headers.get("x-vercel-forwarded-for")?.split(",")[0] || "unknown"
      : "shared";
  const now = Date.now(),
    key = hash(ip + ":" + bucket + ":" + Math.floor(now / 600000));
  await db.transaction(async (tx) => {
    await tx.query(
      "INSERT INTO tt_limits (id,count,expires) VALUES (?,1,?) ON CONFLICT(id) DO UPDATE SET count=tt_limits.count+1",
      [key, now + 600000],
    );
    const [r] = await tx.query("SELECT count FROM tt_limits WHERE id=?", [key]);
    if (r.count > max)
      fail("Too many attempts. Please try again in 10 minutes.", 429);
    await tx.query("DELETE FROM tt_limits WHERE expires<?", [now]);
  });
}
function catalogRow(row) {
  return {
    ...JSON.parse(row.data),
    id: row.id,
    kind: row.kind,
    active: !!row.active,
    version: row.version,
  };
}
async function catalog(db, admin = false) {
  const rows = (
    await db.query(
      `SELECT * FROM tt_catalog${admin ? "" : " WHERE active=1"} ORDER BY id`,
    )
  ).map(catalogRow);
  if (admin) return rows;
  const categories = new Set(
      rows.filter((r) => r.kind === "category").map((r) => r.id),
    ),
    fabrics = new Set(rows.filter((r) => r.kind === "fabric").map((r) => r.id));
  return rows
    .filter(
      (r) =>
        r.kind !== "product" ||
        (categories.has(r.category) && r.fabrics.some((f) => fabrics.has(f))),
    )
    .map((r) =>
      r.kind === "product"
        ? { ...r, fabrics: r.fabrics.filter((f) => fabrics.has(f)) }
        : r,
    );
}
async function settings(db) {
  const [r] = await db.query("SELECT * FROM tt_settings WHERE id=?", [
    "website",
  ]);
  if (!r) fail("The store is not initialized.", 503);
  return { ...JSON.parse(r.data), version: r.version };
}
function parseInquiry(r) {
  return {
    ...r,
    customer: JSON.parse(r.customer),
    items: JSON.parse(r.items),
    created: Number(r.created),
    access_hash: undefined,
    payload_hash: undefined,
    idempotency_key: undefined,
  };
}
async function fileStore(config) {
  const directory =
    config.TWEEN_UPLOAD_DIR ||
    (config.NODE_ENV !== "production" ? ".data/tweentees-uploads" : null);
  if (directory) {
    await fs.mkdir(directory, { recursive: true });
    return {
      put: (key, bytes) =>
        fs.writeFile(path.join(directory, key), bytes, { flag: "wx" }),
      get: (key) => fs.readFile(path.join(directory, key)),
      del: (key) => fs.rm(path.join(directory, key), { force: true }),
    };
  }
  if (!config.BLOB_READ_WRITE_TOKEN)
    fail("Upload storage is not configured.", 503);
  return {
    put: async (key, bytes, mime) =>
      put("tweentees/" + key, bytes, {
        access: "public",
        addRandomSuffix: false,
        contentType: mime,
        token: config.BLOB_READ_WRITE_TOKEN,
      }),
    get: async (key) => {
      const { blobs } = await list({
        prefix: "tweentees/" + key,
        token: config.BLOB_READ_WRITE_TOKEN,
      });
      const found = blobs.find((b) => b.pathname === "tweentees/" + key);
      if (!found) throw Error("Missing file");
      const r = await fetch(found.url);
      if (!r.ok) throw Error("Storage unavailable");
      return Buffer.from(await r.arrayBuffer());
    },
    del: async (key) =>
      del("tweentees/" + key, { token: config.BLOB_READ_WRITE_TOKEN }),
  };
}
// Public Blob objects are unsuitable for confidential design files. Production designs require a private mounted disk.
async function upload(req, db, s, config) {
  await limit(req, db, "upload", 30, config);
  const input = await req.formData(),
    file = input.get("file"),
    purpose = input.get("purpose");
  if (!["design", "image"].includes(purpose)) fail("Invalid upload purpose.");
  if (purpose === "image" && !s) fail("Sign in to upload website images.", 401);
  if (
    config.NODE_ENV === "production" &&
    purpose === "design" &&
    !config.TWEEN_UPLOAD_DIR
  )
    fail("Private design storage is not configured.", 503);
  if (
    !file ||
    typeof file.arrayBuffer !== "function" ||
    file.size === 0 ||
    file.size > 10 * 1024 * 1024
  )
    fail("Choose a file no larger than 10 MB.");
  let bytes = Buffer.from(await file.arrayBuffer()),
    mime,
    filename;
  if (
    /\.(png|jpe?g)$/i.test(file.name) &&
    ["image/png", "image/jpeg"].includes(file.type)
  ) {
    try {
      const info = await sharp(bytes, {
        limitInputPixels: 25000000,
      }).metadata();
      if (!["png", "jpeg"].includes(info.format))
        fail("Image format does not match.");
      bytes = await sharp(bytes, { limitInputPixels: 25000000 })
        .rotate()
        .webp({ quality: 90 })
        .toBuffer();
      mime = "image/webp";
      filename = "design.webp";
    } catch {
      fail("The image is invalid or too large to decode.");
    }
  } else if (
    purpose === "design" &&
    /\.pdf$/i.test(file.name) &&
    file.type === "application/pdf" &&
    bytes.subarray(0, 5).toString() === "%PDF-"
  ) {
    try {
      const pdf = await PDFDocument.load(bytes);
      if (!pdf.getPageCount() || pdf.getPageCount() > 50)
        fail("Use a PDF with 1–50 pages.");
      for (const [, object] of pdf.context.enumerateIndirectObjects())
        if (object instanceof PDFDict)
          for (const key of object.keys())
            if (
              [
                "JS",
                "JavaScript",
                "OpenAction",
                "AA",
                "EmbeddedFiles",
                "Launch",
                "RichMedia",
                "XFA",
                "AcroForm",
              ].includes(key.asString().replace(/^\//, ""))
            )
              fail("Interactive PDF files are not supported.");
      bytes = Buffer.from(await pdf.save());
      mime = "application/pdf";
      filename = "design.pdf";
    } catch {
      fail("Use a valid PDF without interactive content.");
    }
  } else
    fail(
      "Choose a PNG, JPG or noninteractive PDF design. Website images must be PNG or JPG.",
    );
  const fileId = randomUUID(),
    token = secret(),
    store = await fileStore(config);
  await store.put(fileId, bytes, mime);
  try {
    await db.query(
      "INSERT INTO tt_uploads (id,access_hash,mime,filename,purpose,created) VALUES (?,?,?,?,?,?)",
      [fileId, hash(token), mime, filename, purpose, Date.now()],
    );
  } catch (e) {
    await store.del(fileId);
    throw e;
  }
  return json(
    {
      id: fileId,
      token: purpose === "design" ? token : undefined,
      url: "/api/tt/files/" + fileId,
      filename,
    },
    201,
  );
}
function validateCatalog(kind, b) {
  const data = { name: text(b.name, "Name", 150) };
  if (kind === "product") {
    Object.assign(data, {
      category: id(b.category),
      price: integer(b.price, "Price in centavos", 1, 100000000),
      description: text(b.description, "Description", 3000),
      image: safeImage(b.image),
    });
    if (!Array.isArray(b.fabrics) || !b.fabrics.length || b.fabrics.length > 20)
      fail("Select fabrics.");
    data.fabrics = [...new Set(b.fabrics.map(id))];
    if (!Array.isArray(b.sizes) || !b.sizes.length || b.sizes.length > 20)
      fail("Provide sizes.");
    data.sizes = [...new Set(b.sizes.map((x) => text(x, "Size", 20)))];
    data.images = (b.images || [data.image]).map(safeImage);
    if (data.images.length > 12) fail("Too many images.");
  } else if (["category", "fabric", "gallery"].includes(kind)) {
    data.description = text(b.description || "", "Description", 3000, false);
    data.image = safeImage(b.image);
    if (kind === "category" && b.desktop_image)
      data.desktop_image = safeImage(b.desktop_image);
  } else if (kind === "chart") {
    if (!Array.isArray(b.rows) || !b.rows.length || b.rows.length > 30)
      fail("Provide size-chart rows.");
    data.rows = b.rows.map((r) => ({
      size: text(r.size, "Size", 20),
      chest: integer(r.chest, "Chest", 1, 300),
      length: integer(r.length, "Length", 1, 300),
    }));
    data.note = text(b.note || "", "Note", 500, false);
  } else fail("Invalid catalog type.");
  return data;
}
export async function handle(
  req,
  { db = database(), config = process.env } = {},
) {
  try {
    const url = new URL(req.url),
      p = url.pathname.replace(/^\/api\/tt/, "") || "/",
      mutation = !["GET", "HEAD"].includes(req.method);
    if (!["GET", "POST", "PUT", "DELETE"].includes(req.method))
      fail("Method not allowed.", 405);
    // Enforce the actual streamed size even when Content-Length is absent or incorrect.
    if (mutation && req.body) {
      const reader = req.body.getReader(),
        chunks = [];
      let length = 0;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > 11 * 1024 * 1024) {
          await reader.cancel();
          fail("Request is too large.", 413);
        }
        chunks.push(Buffer.from(value));
      }
      req = new Request(req, { body: Buffer.concat(chunks), duplex: "half" });
    }
    if (mutation) {
      const origin =
        config.APP_ORIGIN ||
        (config.NODE_ENV === "production" ? null : "http://127.0.0.1:5173");
      if (!origin) fail("Application origin is not configured.", 503);
      if (
        req.headers.get("origin") !== origin ||
        req.headers.get("sec-fetch-site") === "cross-site"
      )
        fail("Submit this request from the website.", 403);
      if (Number(req.headers.get("content-length")) > 11 * 1024 * 1024)
        fail("Request is too large.", 413);
    }
    const s = await session(req, db),
      admin =
        p.startsWith("/admin/") &&
        !["/admin/login", "/admin/session"].includes(p);
    if (admin) {
      if (!s) fail("Please sign in.", 401);
      if (s.must_change && !["/admin/password", "/admin/logout"].includes(p))
        fail("Replace your temporary password first.", 428);
      if (mutation && !safeEqual(req.headers.get("x-csrf-token"), s.csrf))
        fail("Session validation failed. Refresh and try again.", 403);
    }
    if (p === "/catalog" && req.method === "GET")
      return json({ records: await catalog(db), settings: await settings(db) });
    if (p === "/admin/session" && req.method === "GET")
      return json(
        s
          ? { username: s.username, must_change: !!s.must_change, csrf: s.csrf }
          : { username: null },
      );
    if (p === "/admin/login" && req.method === "POST") {
      await limit(req, db, "login", 10, config);
      const b = await body(req),
        username = text(b.username, "Username", 100),
        [a] = await db.query("SELECT * FROM tt_admins WHERE username=?", [
          username,
        ]);
      if (
        typeof b.password !== "string" ||
        Buffer.byteLength(b.password) > 72 ||
        !(await bcrypt.compare(
          b.password,
          a?.password_hash || (await dummy),
        )) ||
        !a
      )
        fail("Incorrect username or password.", 401);
      const token = secret(),
        csrf = secret();
      await db.transaction(async (tx) => {
        await tx.query(
          "INSERT INTO tt_sessions (token_hash,admin_id,csrf,expires) VALUES (?,?,?,?)",
          [hash(token), a.id, csrf, Date.now() + 28800000],
        );
        await tx.query("DELETE FROM tt_sessions WHERE expires<?", [Date.now()]);
        await audit(tx, { admin_id: a.id }, "LOGIN", a.id);
      });
      return json(
        { username: a.username, must_change: !!a.must_change, csrf },
        200,
        { "Set-Cookie": cookie(token, config.NODE_ENV === "production") },
      );
    }
    if (p === "/admin/logout" && req.method === "POST") {
      await db.query("DELETE FROM tt_sessions WHERE token_hash=?", [
        s.token_hash,
      ]);
      return json({ ok: true }, 200, {
        "Set-Cookie": cookie("", config.NODE_ENV === "production", 0),
      });
    }
    if (p === "/admin/password" && req.method === "POST") {
      await limit(req, db, "password", 10, config);
      const b = await body(req),
        [a] = await db.query("SELECT * FROM tt_admins WHERE id=?", [
          s.admin_id,
        ]);
      if (
        typeof b.current !== "string" ||
        Buffer.byteLength(b.current) > 72 ||
        !(await bcrypt.compare(b.current, a.password_hash))
      )
        fail("Current password is incorrect.");
      if (
        typeof b.password !== "string" ||
        b.password.length < 12 ||
        Buffer.byteLength(b.password) > 72 ||
        !/\p{Lu}/u.test(b.password) ||
        !/\p{Ll}/u.test(b.password) ||
        !/\d/.test(b.password) ||
        /password|qwerty|letmein|123456/i.test(b.password) ||
        b.password.toLowerCase().includes(a.username.toLowerCase())
      )
        fail(
          "Use 12–72 bytes, uppercase and lowercase letters and a number. Avoid common passwords and your username.",
        );
      if (b.password !== b.confirm) fail("New passwords do not match.");
      if (await bcrypt.compare(b.password, a.password_hash))
        fail("Choose a different password.");
      const newHash = await bcrypt.hash(b.password, 12);
      await db.transaction(async (tx) => {
        const result = await tx.query(
          "UPDATE tt_admins SET password_hash=?,must_change=0 WHERE id=? AND password_hash=?",
          [newHash, a.id, a.password_hash],
        );
        if (!result.changes) fail("Account changed; sign in again.", 409);
        await tx.query("DELETE FROM tt_sessions WHERE admin_id=?", [a.id]);
        await audit(tx, s, "PASSWORD_CHANGED", a.id);
      });
      return json({ ok: true, reauthenticate: true }, 200, {
        "Set-Cookie": cookie("", config.NODE_ENV === "production", 0),
      });
    }
    if (p === "/uploads" && req.method === "POST") {
      const formReq = req.clone();
      const purpose = (await formReq.formData()).get("purpose");
      if (
        purpose === "image" &&
        (!s ||
          s.must_change ||
          !safeEqual(req.headers.get("x-csrf-token"), s.csrf))
      )
        fail("Administrator validation required.", 403);
      return await upload(req, db, s, config);
    }
    const fileMatch = p.match(/^\/files\/([a-f0-9-]{36})$/);
    if (fileMatch && req.method === "GET") {
      const [f] = await db.query("SELECT * FROM tt_uploads WHERE id=?", [
        fileMatch[1],
      ]);
      if (
        !f ||
        (f.purpose === "design" &&
          (!s || s.must_change) &&
          !safeEqual(hash(url.searchParams.get("token") || ""), f.access_hash))
      )
        fail("File not found.", 404);
      const bytes = await (await fileStore(config)).get(f.id);
      return new Response(bytes, {
        headers: {
          "Content-Type": f.mime,
          "X-Content-Type-Options": "nosniff",
          "Content-Security-Policy": "default-src 'none'; sandbox",
          "Cache-Control":
            f.purpose === "design"
              ? "private, no-store"
              : "public, max-age=3600",
          "Content-Disposition": `${f.purpose === "design" ? "attachment" : "inline"}; filename="${f.filename}"`,
        },
      });
    }
    if (p === "/inquiries" && req.method === "POST") {
      await limit(req, db, "inquiry", 30, config);
      const b = await body(req);
      if (b.website) fail("Invalid submission.");
      if (
        !/^[a-f0-9-]{36}$/.test(b.idempotency_key) ||
        !/^([a-f0-9]{64})$/.test(b.access_token)
      )
        fail("Invalid submission reference.");
      const c = b.customer || {},
        customer = {
          name: text(c.name, "Full name", 120),
          email: text(c.email, "Email", 200),
          phone: text(c.phone, "Phone", 30),
          team: text(c.team || "", "Team/event", 150, false),
          location: text(c.location, "Location", 200),
          contact: text(c.contact, "Contact preference", 30),
        };
      if (
        customer.name.length < 2 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email) ||
        !/^\+?[\d ()-]{8,25}$/.test(customer.phone) ||
        customer.phone.replace(/\D/g, "").length < 8 ||
        customer.phone.replace(/\D/g, "").length > 15 ||
        !["Phone", "Email"].includes(customer.contact)
      )
        fail("Check your name, email, phone and contact preference.");
      const notes = text(b.notes || "", "Notes", 500, false);
      if (!Array.isArray(b.items) || !b.items.length || b.items.length > 20)
        fail("Add at least one product.");
      const payloadHash = hash(
        JSON.stringify({ customer, items: b.items, notes }),
      );
      const receipt = await db.transaction(async (tx) => {
        const [existing] = await tx.query(
          "SELECT * FROM tt_inquiries WHERE idempotency_key=?",
          [b.idempotency_key],
        );
        if (existing) {
          if (
            existing.access_hash !== hash(b.access_token) ||
            existing.payload_hash !== payloadHash
          )
            fail("Submission reference already used.", 409);
          return parseInquiry(existing);
        }
        const items = [];
        let estimate = 0;
        for (const item of b.items) {
          const [row] = await tx.query(
            "SELECT * FROM tt_catalog WHERE id=? AND kind=? AND active=1",
            [id(item.product), "product"],
          );
          if (!row) fail("A selected product is unavailable.", 409);
          const product = catalogRow(row);
          if (!product.fabrics.includes(item.fabric))
            fail("Select an available fabric.");
          const [fabric] = await tx.query(
            "SELECT * FROM tt_catalog WHERE id=? AND kind=? AND active=1",
            [id(item.fabric), "fabric"],
          );
          const [category] = await tx.query(
            "SELECT * FROM tt_catalog WHERE id=? AND kind=? AND active=1",
            [product.category, "category"],
          );
          if (!fabric || !category)
            fail("This product configuration is unavailable.", 409);
          if (
            !item.quantities ||
            typeof item.quantities !== "object" ||
            Array.isArray(item.quantities)
          )
            fail("Select sizes and quantities.");
          let quantity = 0;
          const quantities = {};
          for (const [size, value] of Object.entries(item.quantities)) {
            if (!product.sizes.includes(size)) fail("Invalid size.");
            quantities[size] = integer(value, "Quantity", 0, 1000);
            quantity += value;
          }
          if (!quantity || quantity > 10000)
            fail("Choose a quantity between 1 and 10,000.");
          if (!["upload", "assistance"].includes(item.design))
            fail("Upload a design or request assistance.");
          let uploadId = null;
          if (item.design === "upload") {
            const [f] = await tx.query(
              "SELECT * FROM tt_uploads WHERE id=? AND purpose=?",
              [id(item.upload?.id), "design"],
            );
            if (!f || !safeEqual(hash(item.upload?.token || ""), f.access_hash))
              fail("Upload a valid design before submitting.");
            uploadId = f.id;
          }
          const subtotal = product.price * quantity;
          estimate += subtotal;
          items.push({
            product: product.id,
            name: product.name,
            image: product.image,
            category: product.category,
            fabric: JSON.parse(fabric.data).name,
            quantities,
            quantity,
            unit_price: product.price,
            subtotal,
            design: item.design,
            upload_id: uploadId,
            notes: text(item.notes || "", "Product notes", 500, false),
          });
        }
        if (!Number.isSafeInteger(estimate) || estimate > 1000000000)
          fail("Inquiry total exceeds the supported amount.");
        const inquiryId = b.idempotency_key,
          created = Date.now(),
          date = new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Manila",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          })
            .format(created)
            .replaceAll("-", ""),
          reference =
            "TWN-" +
            date +
            "-" +
            inquiryId.replaceAll("-", "").slice(0, 10).toUpperCase();
        await tx.query(
          "INSERT INTO tt_inquiries (id,reference,idempotency_key,payload_hash,access_hash,customer,items,notes,estimate,status,created) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
          [
            inquiryId,
            reference,
            b.idempotency_key,
            payloadHash,
            hash(b.access_token),
            JSON.stringify(customer),
            JSON.stringify(items),
            notes,
            estimate,
            "Pending",
            created,
          ],
        );
        await tx.query(
          "INSERT INTO tt_inquiry_history (id,inquiry_id,status,note,created) VALUES (?,?,?,?,?)",
          [
            randomUUID(),
            inquiryId,
            "Pending",
            "Inquiry received; estimate subject to confirmation.",
            created,
          ],
        );
        return {
          id: inquiryId,
          reference,
          customer,
          items,
          notes,
          estimate,
          status: "Pending",
          created,
        };
      });
      return json({ inquiry: receipt }, 201);
    }
    if (p === "/inquiry-details" && req.method === "POST") {
      await limit(req, db, "details", 60, config);
      const b = await body(req),
        [r] = await db.query("SELECT * FROM tt_inquiries WHERE id=?", [
          id(b.id),
        ]);
      if (!r || !safeEqual(hash(b.token || ""), r.access_hash))
        fail("Inquiry not found.", 404);
      const history = await db.query(
        "SELECT status,note,created FROM tt_inquiry_history WHERE inquiry_id=? ORDER BY created",
        [r.id],
      );
      return json({ inquiry: parseInquiry(r), history });
    }
    if (p === "/contact" && req.method === "POST") {
      await limit(req, db, "contact", 20, config);
      const b = await body(req);
      if (b.website) fail("Invalid submission.");
      const name = text(b.name, "Name", 120),
        email = text(b.email, "Email", 200),
        message = text(b.message, "Message", 3000);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        fail("Enter a valid email.");
      await db.query(
        "INSERT INTO tt_messages (id,name,email,message,created) VALUES (?,?,?,?,?)",
        [randomUUID(), name, email, message, Date.now()],
      );
      return json({ ok: true }, 201);
    }
    if (p === "/admin/overview" && req.method === "GET") {
      const inquiries = await db.query(
        "SELECT status,COUNT(*) AS total FROM tt_inquiries GROUP BY status",
      );
      return json({
        records: await catalog(db, true),
        settings: await settings(db),
        statistics: Object.fromEntries(
          inquiries.map((r) => [r.status, Number(r.total)]),
        ),
        messages: await db.query(
          "SELECT * FROM tt_messages ORDER BY created DESC LIMIT 100",
        ),
        audit: await db.query(
          "SELECT action,entity,created FROM tt_audit ORDER BY created DESC LIMIT 100",
        ),
        accounts: await db.query(
          "SELECT id,username,must_change FROM tt_admins",
        ),
      });
    }
    if (p === "/admin/messages" && req.method === "GET") {
      const page = integer(
          Number(url.searchParams.get("page") || 1),
          "Page",
          1,
          100000,
        ),
        search = text(
          url.searchParams.get("search") || "",
          "Search",
          100,
          false,
        ),
        status = url.searchParams.get("status") || "";
      if (status && !["Unread", "Read", "Replied"].includes(status))
        fail("Invalid status.");
      const where =
          "WHERE (LOWER(name) LIKE ? OR LOWER(email) LIKE ? OR LOWER(message) LIKE ?)" +
          (status ? " AND status=?" : ""),
        params = Array(3).fill("%" + search.toLowerCase() + "%");
      if (status) params.push(status);
      const [count] = await db.query(
        "SELECT COUNT(*) AS total FROM tt_messages " + where,
        params,
      );
      const rows = await db.query(
        "SELECT * FROM tt_messages " +
          where +
          " ORDER BY created DESC LIMIT 20 OFFSET ?",
        [...params, (page - 1) * 20],
      );
      return json({ rows, total: Number(count.total), page });
    }
    if (p === "/admin/inquiries" && req.method === "GET") {
      const page = integer(
          Number(url.searchParams.get("page") || 1),
          "Page",
          1,
          100000,
        ),
        search = text(
          url.searchParams.get("search") || "",
          "Search",
          100,
          false,
        ),
        status = url.searchParams.get("status") || "",
        sort = url.searchParams.get("sort") === "oldest" ? "ASC" : "DESC";
      if (status && !allowedStatuses.includes(status)) fail("Invalid status.");
      const where =
          "WHERE (LOWER(customer) LIKE ? OR LOWER(reference) LIKE ?)" +
          (status ? " AND status=?" : ""),
        params = [
          "%" + search.toLowerCase() + "%",
          "%" + search.toLowerCase() + "%",
          ...(status ? [status] : []),
        ];
      const [count] = await db.query(
        "SELECT COUNT(*) AS total FROM tt_inquiries " + where,
        params,
      );
      const rows = await db.query(
        "SELECT * FROM tt_inquiries " +
          where +
          " ORDER BY created " +
          sort +
          " LIMIT 20 OFFSET ?",
        [...params, (page - 1) * 20],
      );
      return json({
        rows: rows.map(parseInquiry),
        total: Number(count.total),
        page,
      });
    }
    const inquiryMatch = p.match(/^\/admin\/inquiries\/([a-f0-9-]{36})$/);
    if (inquiryMatch && req.method === "GET") {
      const [r] = await db.query("SELECT * FROM tt_inquiries WHERE id=?", [
        inquiryMatch[1],
      ]);
      if (!r) fail("Inquiry not found.", 404);
      return json({
        inquiry: parseInquiry(r),
        history: await db.query(
          "SELECT status,note,created FROM tt_inquiry_history WHERE inquiry_id=? ORDER BY created",
          [r.id],
        ),
      });
    }
    if (inquiryMatch && req.method === "PUT") {
      const b = await body(req),
        note = text(b.note || "", "Status note", 500, false);
      await db.transaction(async (tx) => {
        const [r] = await tx.query("SELECT * FROM tt_inquiries WHERE id=?", [
          inquiryMatch[1],
        ]);
        if (!r) fail("Inquiry not found.", 404);
        if (!transitions[r.status]?.includes(b.status))
          fail("Invalid status transition.");
        const result = await tx.query(
          "UPDATE tt_inquiries SET status=?,version=version+1 WHERE id=? AND version=?",
          [b.status, r.id, integer(b.version, "Version", 1)],
        );
        if (!result.changes)
          fail("This inquiry changed. Refresh before updating.", 409);
        await tx.query(
          "INSERT INTO tt_inquiry_history (id,inquiry_id,status,note,admin_id,created) VALUES (?,?,?,?,?,?)",
          [randomUUID(), r.id, b.status, note, s.admin_id, Date.now()],
        );
        await audit(tx, s, "INQUIRY_STATUS_CHANGED", r.id);
      });
      return json({ ok: true });
    }
    const catalogMatch = p.match(/^\/admin\/catalog(?:\/([a-z0-9-]{1,100}))?$/);
    if (catalogMatch && ["POST", "PUT", "DELETE"].includes(req.method)) {
      const b = await body(req),
        recordId = catalogMatch[1] || id(b.id || randomUUID());
      await db.transaction(async (tx) => {
        const [old] = await tx.query("SELECT * FROM tt_catalog WHERE id=?", [
          recordId,
        ]);
        if (req.method !== "POST" && !old) fail("Record not found.", 404);
        if (req.method === "POST" && old) fail("This ID already exists.", 409);
        if (req.method === "DELETE") {
          const rows = await tx.query(
            "SELECT * FROM tt_catalog WHERE kind=? AND active=1",
            ["product"],
          );
          if (
            rows.some((r) => {
              const d = JSON.parse(r.data);
              return d.category === recordId || d.fabrics?.includes(recordId);
            })
          )
            fail(
              "Unpublish dependent products before deleting this option.",
              409,
            );
          const result = await tx.query(
            "DELETE FROM tt_catalog WHERE id=? AND version=?",
            [recordId, integer(b.version, "Version", 1)],
          );
          if (!result.changes)
            fail("Record changed. Refresh before deleting.", 409);
        } else {
          const kind = old?.kind || b.kind,
            data = validateCatalog(kind, b.data),
            active = b.active === true ? 1 : 0;
          if (kind === "product") {
            const [category] = await tx.query(
              "SELECT * FROM tt_catalog WHERE id=? AND kind=?",
              [data.category, "category"],
            );
            if (!category) fail("Category does not exist.");
            for (const f of data.fabrics) {
              const rows = await tx.query(
                "SELECT id FROM tt_catalog WHERE id=? AND kind=?",
                [f, "fabric"],
              );
              if (!rows.length) fail("Fabric does not exist.");
            }
          }
          if (req.method === "POST")
            await tx.query(
              "INSERT INTO tt_catalog (id,kind,data,active) VALUES (?,?,?,?)",
              [recordId, kind, JSON.stringify(data), active],
            );
          else {
            const result = await tx.query(
              "UPDATE tt_catalog SET data=?,active=?,version=version+1 WHERE id=? AND version=?",
              [
                JSON.stringify(data),
                active,
                recordId,
                integer(b.version, "Version", 1),
              ],
            );
            if (!result.changes)
              fail("Record changed. Refresh before saving.", 409);
          }
        }
        await audit(tx, s, "CATALOG_" + req.method, recordId);
      });
      return json(
        { ok: true, id: recordId },
        req.method === "POST" ? 201 : 200,
      );
    }
    if (p === "/admin/settings" && req.method === "PUT") {
      const b = await body(req),
        data = {};
      for (const [key, max] of Object.entries({
        business_name: 100,
        tagline: 150,
        hero_title: 200,
        hero_description: 500,
        mobile_title: 200,
        mobile_description: 200,
        phone: 30,
        email: 200,
        address: 200,
        about: 3000,
      }))
        data[key] = text(
          b[key] ||
            (["mobile_title", "mobile_description"].includes(key)
              ? b[key === "mobile_title" ? "hero_title" : "hero_description"]
              : b[key]),
          key,
          max,
        );
      for (const [key, fallback] of Object.entries({
        hero_image: "/tweentees/hero.webp",
        mobile_hero_image: "/tweentees/mobile-hero.webp",
        logo: "/tweentees/logo.webp",
        about_image: "/tweentees/about.webp",
      }))
        data[key] = safeImage(b[key] || fallback);
      for (const [key, hosts] of Object.entries({
        facebook: ["facebook.com", "www.facebook.com"],
        instagram: ["instagram.com", "www.instagram.com"],
        tiktok: ["tiktok.com", "www.tiktok.com"],
      })) {
        const value = text(b[key] || "", key + " URL", 500, false);
        if (value) {
          let url;
          try {
            url = new URL(value);
          } catch {
            fail("Invalid " + key + " URL.");
          }
          if (
            url.protocol !== "https:" ||
            !hosts.includes(url.hostname) ||
            url.username ||
            url.password
          )
            fail("Use an HTTPS " + key + " profile URL.");
        }
        data[key] = value;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
        fail("Invalid email.");
      if (!Array.isArray(b.steps) || b.steps.length !== 4)
        fail("Provide four process steps.");
      data.steps = b.steps.map((step) => ({
        title: text(step.title, "Title", 100),
        description: text(step.description, "Description", 500),
      }));
      await db.transaction(async (tx) => {
        const result = await tx.query(
          "UPDATE tt_settings SET data=?,version=version+1 WHERE id=? AND version=?",
          [JSON.stringify(data), "website", integer(b.version, "Version", 1)],
        );
        if (!result.changes)
          fail("Settings changed; refresh before saving.", 409);
        await audit(tx, s, "SETTINGS_UPDATED", "website");
      });
      return json({ ok: true });
    }
    const messageMatch = p.match(/^\/admin\/messages\/([a-f0-9-]{36})$/);
    if (messageMatch && req.method === "PUT") {
      const b = await body(req);
      if (!["Unread", "Read", "Replied"].includes(b.status))
        fail("Invalid message status.");
      const r = await db.query("UPDATE tt_messages SET status=? WHERE id=?", [
        b.status,
        messageMatch[1],
      ]);
      if (!r.changes) fail("Message not found.", 404);
      return json({ ok: true });
    }
    fail("Endpoint not found.", 404);
  } catch (e) {
    if (e instanceof RequestError) return json({ error: e.message }, e.status);
    if (
      e.code === "23505" ||
      (e.code === "ERR_SQLITE_ERROR" && /UNIQUE/.test(e.message))
    )
      return json(
        {
          error:
            "This reference is already in use. Retry with the original details.",
        },
        409,
      );
    console.error("TweenTees request failed:", e.code || e.name);
    return json(
      { error: "The service is temporarily unavailable. Please try again." },
      503,
    );
  }
}
