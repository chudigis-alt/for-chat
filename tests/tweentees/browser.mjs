// Run against the documented isolated QA server, never a production or customer database.
import assert from "node:assert/strict";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import sharp from "sharp";
import { chromium } from "playwright";
import { sqliteStore } from "../../server/tweentees/db.mjs";
import { seed, defaults } from "../../server/tweentees/seed.mjs";
const origin = "http://127.0.0.1:5175",
  directory = ".qa-results",
  username = "qa-" + randomUUID().slice(0, 8),
  initial = randomUUID() + "Aa7",
  password = randomUUID() + "Bb9";
fs.mkdirSync(directory, { recursive: true });
const db = sqliteStore(".data/tweentees-qa.sqlite");
await db.migrate();
await seed(db);
await db.query("DELETE FROM tt_inquiry_history");
await db.query("DELETE FROM tt_inquiries");
await db.query("DELETE FROM tt_messages");
await db.query("UPDATE tt_settings SET data=?,version=1 WHERE id=?", [
  JSON.stringify(defaults),
  "website",
]);
await db.query(
  "INSERT INTO tt_admins (id,username,password_hash) VALUES (?,?,?)",
  [randomUUID(), username, await bcrypt.hash(initial, 12)],
);
const browser = await chromium.launch({
    executablePath: process.env.TWEEN_BROWSER_EXECUTABLE || "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  }),
  context = await browser.newContext({
    viewport: { width: 1524, height: 1016 },
  }),
  page = await context.newPage(),
  errors = [],
  checks = [];
page.setDefaultTimeout(15000);
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error" && !m.text().includes("401 (Unauthorized)"))
    errors.push(m.text());
});
async function check(name, fn) {
  await fn();
  checks.push(name);
  console.log("PASS:", name);
}
async function go(route) {
  await page.goto(origin + route, { waitUntil: "domcontentloaded" });
  await page
    .locator("body")
    .filter({ hasText: "Loading TweenTees…" })
    .waitFor({ state: "hidden" })
    .catch(() => {});
}
const pixels = await sharp({
  create: { width: 20, height: 20, channels: 3, background: "#ccc" },
})
  .png()
  .toBuffer();
try {
  await check(
    "public pages, assets and no overflow at nine responsive widths",
    async () => {
      for (const width of [320, 375, 390, 430, 768, 1024, 1366, 1440, 1920]) {
        await page.setViewportSize({ width, height: 900 });
        await go("/");
        await page.getByRole("heading", { name: "Shop by category" }).waitFor();
        assert.equal(
          await page
            .getByRole("link", { name: "TweenTees on facebook", exact: true })
            .getAttribute("href"),
          defaults.facebook,
        );
        assert.equal(
          await page
            .getByRole("link", { name: "TweenTees on instagram", exact: true })
            .getAttribute("href"),
          defaults.instagram,
        );
        assert.equal(
          await page
            .getByRole("link", { name: "TweenTees on tiktok", exact: true })
            .getAttribute("href"),
          defaults.tiktok,
        );
        assert.ok(
          await page
            .locator('a[href="mailto:rodelmarkpontaoy@gmail.com"]')
            .count(),
        );
        assert.ok(await page.locator('a[href="tel:09101438872"]').count());
        await page.evaluate(() => document.fonts.ready);
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
          "Homepage overflow at " + width,
        );
        if (width === 1440 || width === 390)
          await page.screenshot({
            path: directory + "/home-" + width + ".png",
            fullPage: true,
          });
      }
      await page.setViewportSize({ width: 390, height: 844 });
      await page.getByRole("button", { name: "Open navigation" }).click();
      await page
        .getByRole("navigation", { name: "Main navigation" })
        .getByRole("link", { name: "About Us" })
        .click();
      await page
        .getByRole("heading", {
          name: "Built for teams, athletes, and events.",
        })
        .waitFor();
      for (const [route, heading] of [
        ["/how-it-works", "How It Works"],
        ["/size-charts", "Size Charts"],
        ["/fabrics", "Our Fabrics"],
        ["/contact", "Contact Us"],
        ["/gallery", "Gallery"],
      ]) {
        await go(route);
        await page
          .getByRole("heading", { name: heading, exact: true })
          .waitFor();
        await page.screenshot({
          path: directory + "/" + route.replaceAll("/", "-") + "-mobile.png",
          fullPage: true,
        });
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
          route + " overflow",
        );
      }
    },
  );
  await check(
    "catalog search/filter/sort and size quantity customization",
    async () => {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await go("/customize?category=running");
      await page
        .getByRole("heading", { name: "Running Products", exact: true })
        .waitFor();
      await page.getByLabel("Search", { exact: true }).fill("singlet");
      assert.equal(await page.locator(".product-card").count(), 1);
      await page.getByLabel("Sort", { exact: true }).selectOption("price-up");
      await page
        .getByRole("link")
        .filter({
          has: page.getByRole("heading", {
            name: "Running Singlet",
            exact: true,
          }),
        })
        .click();
      await page
        .getByRole("heading", {
          name: "Customize Running Singlet",
          exact: true,
        })
        .waitFor();
      await page.screenshot({
        path: directory + "/customize-desktop.png",
        fullPage: true,
      });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({
        path: directory + "/customize-mobile.png",
        fullPage: true,
      });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page
        .getByRole("button", { name: "Increase M", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Increase M", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Increase L", exact: true })
        .click();
      await page
        .getByLabel("Additional Notes (Optional)", { exact: true })
        .fill("Blue team colors. Browser QA.");
      await page
        .getByRole("button", { name: "Add to Inquiry", exact: true })
        .click();
      await page
        .getByRole("heading", { name: "Inquiry Summary", exact: true })
        .waitFor();
      await page.getByLabel("Running Singlet M quantity").fill("3");
      await page
        .getByRole("link", { name: "Next: Customer Information" })
        .click();
    },
  );
  await check(
    "customer review, persisted inquiry receipt and refresh",
    async () => {
      await page
        .getByLabel("Full Name", { exact: true })
        .fill("Browser QA Customer");
      await page
        .getByLabel("Contact Number", { exact: true })
        .fill("09101234567");
      await page
        .getByLabel("Email Address", { exact: true })
        .fill("browser-qa@example.com");
      await page
        .getByLabel("Organization / Team Name (Optional)")
        .fill("QA Team");
      await page
        .getByLabel("Location", { exact: true })
        .fill("Lubao, Philippines");
      await page.getByLabel("Preferred Contact Method").selectOption("Email");
      await page
        .getByRole("button", { name: "Review & Submit", exact: true })
        .click();
      await page.screenshot({
        path: directory + "/review-desktop.png",
        fullPage: true,
      });
      await page
        .getByRole("button", { name: "Submit Inquiry", exact: true })
        .click();
      await page
        .getByRole("heading", { name: "Inquiry Submitted!", exact: true })
        .waitFor();
      await page.locator(".receipt-reference").waitFor();
      await page.getByRole("button", { name: "View Inquiry Details" }).click();
      await page.getByText("₱1,400.00", { exact: true }).waitFor();
      await page.reload();
      await page.locator(".receipt-reference").waitFor();
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({
        path: directory + "/receipt-mobile.png",
        fullPage: true,
      });
      const rows = await db.query(
        "SELECT * FROM tt_inquiries WHERE customer LIKE ?",
        ["%browser-qa@example.com%"],
      );
      assert.ok(rows.length >= 1);
      const last = rows.at(-1);
      assert.equal(last.estimate, 140000);
      assert.equal(
        JSON.parse(last.items)[0].notes,
        "Blue team colors. Browser QA.",
      );
    },
  );
  await check("contact form saves a real message", async () => {
    await go("/contact");
    await page.getByLabel("Name", { exact: true }).fill("Browser QA");
    await page
      .getByLabel("Email", { exact: true })
      .fill("browser-qa@example.com");
    await page
      .getByLabel("Message", { exact: true })
      .fill("Browser QA inquiry about sizing.");
    await page.getByRole("button", { name: "Send Message" }).click();
    await page
      .getByRole("status")
      .filter({ hasText: "Your message was saved" })
      .waitFor();
    assert.ok(
      (
        await db.query("SELECT id FROM tt_messages WHERE email=?", [
          "browser-qa@example.com",
        ])
      ).length >= 1,
    );
  });
  await check(
    "protected pages redirect; first login requires replacement; password reveal controls",
    async () => {
      await go("/admin/dashboard");
      await page
        .getByRole("heading", { name: "Admin Login", exact: true })
        .waitFor();
      await page.getByLabel("Username", { exact: true }).fill(username);
      await page.getByLabel("Password", { exact: true }).fill(initial);
      await page.getByRole("button", { name: "Login", exact: true }).click();
      await page
        .getByRole("heading", { name: "Make Your Account Yours" })
        .waitFor();
      await page
        .getByRole("button", { name: "Show new password", exact: true })
        .click();
      assert.equal(
        await page
          .getByLabel("New Password", { exact: true })
          .getAttribute("type"),
        "text",
      );
      await page.getByLabel("Current Password", { exact: true }).fill(initial);
      await page.getByLabel("New Password", { exact: true }).fill(password);
      await page
        .getByLabel("Confirm New Password", { exact: true })
        .fill(password);
      await page
        .getByRole("button", { name: "Change Password", exact: true })
        .click();
      await page
        .getByRole("heading", { name: "Admin Login", exact: true })
        .waitFor();
      await page.getByLabel("Username", { exact: true }).fill(username);
      await page.getByLabel("Password", { exact: true }).fill(initial);
      await page.getByRole("button", { name: "Login", exact: true }).click();
      await page
        .getByRole("alert")
        .filter({ hasText: "Incorrect username or password" })
        .waitFor();
      await page.getByLabel("Password", { exact: true }).fill(password);
      await page.getByRole("button", { name: "Login", exact: true }).click();
      await page
        .getByRole("heading", { name: "Dashboard", exact: true })
        .waitFor();
      assert.ok(await page.locator(".stats-grid").innerText());
    },
  );
  await check(
    "admin product CRUD and image upload persist; accessible modal closes",
    async () => {
      await go("/admin/products");
      await page
        .getByRole("heading", { name: "Products", exact: true })
        .waitFor();
      await page
        .getByRole("button", { name: "Add product", exact: true })
        .click();
      const dialog = page.getByRole("dialog");
      await dialog.waitFor();
      await dialog
        .getByLabel("Name", { exact: true })
        .fill("Browser QA Product");
      const productId = "qa-product-" + randomUUID().slice(0, 8);
      await dialog
        .getByLabel("Unique ID (lowercase words separated by hyphens)")
        .fill(productId);
      await dialog
        .getByLabel("Description", { exact: true })
        .fill("Browser-created test apparel");
      await dialog
        .getByLabel("Upload PNG or JPG")
        .setInputFiles({
          name: "fixture.png",
          mimeType: "image/png",
          buffer: pixels,
        });
      await dialog.locator(".image-editor img").waitFor();
      await dialog.getByLabel("Unit Price (₱)").fill("450");
      await dialog
        .getByRole("button", { name: "Save product", exact: true })
        .click();
      await dialog.waitFor({ state: "hidden" });
      const row = page
        .getByRole("row")
        .filter({ hasText: "Browser QA Product" });
      await row.waitFor();
      const saved = (
        await db.query("SELECT * FROM tt_catalog WHERE id=?", [productId])
      )[0];
      assert.equal(JSON.parse(saved.data).price, 45000);
      await row.getByRole("button", { name: "Edit", exact: true }).click();
      await page
        .getByRole("dialog")
        .getByLabel("Name", { exact: true })
        .fill("Browser QA Product Updated");
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Save product" })
        .click();
      await page.getByRole("dialog").waitFor({ state: "hidden" });
      page.once("dialog", (d) => d.accept());
      await page
        .getByRole("row")
        .filter({ hasText: "Browser QA Product Updated" })
        .getByRole("button", { name: "Delete", exact: true })
        .click();
      await page
        .getByRole("row")
        .filter({ hasText: "Browser QA Product Updated" })
        .waitFor({ state: "hidden" });
      assert.equal(
        (await db.query("SELECT id FROM tt_catalog WHERE id=?", [productId]))
          .length,
        0,
      );
    },
  );
  await check(
    "admin inquiry review, status update and mobile dashboard",
    async () => {
      await go("/admin/inquiries");
      await page
        .getByLabel("Search", { exact: true })
        .fill("browser-qa@example.com");
      await page
        .getByRole("row")
        .filter({ hasText: "Browser QA Customer" })
        .first()
        .getByRole("button", { name: "View", exact: true })
        .click();
      await page.getByLabel("New Status").selectOption("In Review");
      await page
        .getByLabel("Customer-visible Status Note")
        .fill("Design review started.");
      await page.getByRole("button", { name: "Update Status" }).click();
      await page
        .locator(".inquiry-detail")
        .getByText("Design review started.", { exact: false })
        .waitFor();
      await go("/admin/dashboard");
      await page
        .getByRole("heading", { name: "Dashboard", exact: true })
        .waitFor();
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.screenshot({
        path: directory + "/admin-desktop.png",
        fullPage: true,
      });
      await page.setViewportSize({ width: 390, height: 844 });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      await page.screenshot({
        path: directory + "/admin-mobile.png",
        fullPage: true,
      });
    },
  );
  await check(
    "categories, fabrics, size charts and gallery CRUD persist",
    async () => {
      for (const [route, kind] of [
        ["categories", "category"],
        ["fabrics", "fabric"],
        ["charts", "chart"],
        ["gallery", "gallery"],
      ]) {
        await go("/admin/" + route);
        const addName = kind === "chart" ? "Add Size Chart" : "Add " + kind;
        await page.getByRole("button", { name: addName, exact: true }).click();
        const dialog = page.getByRole("dialog");
        await dialog.waitFor();
        const name = "Browser QA " + kind,
          recordId = "qa-" + kind + "-" + randomUUID().slice(0, 8);
        await dialog.getByLabel("Name", { exact: true }).fill(name);
        await dialog
          .getByLabel("Unique ID (lowercase words separated by hyphens)")
          .fill(recordId);
        if (kind === "chart") {
          await dialog.getByLabel("size row 1").fill("XL");
          await dialog.getByLabel("chest row 1").fill("54");
          await dialog.getByLabel("length row 1").fill("74");
          await dialog
            .getByLabel("Measurement Note")
            .fill("QA measurement table.");
        } else {
          await dialog
            .getByLabel("Description", { exact: true })
            .fill("QA " + kind + " description.");
          await dialog
            .getByLabel("Upload PNG or JPG")
            .setInputFiles({
              name: "fixture.png",
              mimeType: "image/png",
              buffer: pixels,
            });
          await dialog.locator(".image-editor img").waitFor();
        }
        await dialog
          .getByRole("button", { name: "Save " + kind, exact: true })
          .click();
        await dialog.waitFor({ state: "hidden" });
        assert.equal(
          (
            await db.query("SELECT kind FROM tt_catalog WHERE id=?", [recordId])
          )[0].kind,
          kind,
        );
        const row = page.getByRole("row").filter({ hasText: name });
        await row.getByRole("button", { name: "Edit", exact: true }).click();
        await page.getByRole("dialog").getByLabel("Published").uncheck();
        await page
          .getByRole("dialog")
          .getByRole("button", { name: "Save " + kind, exact: true })
          .click();
        await page.getByRole("dialog").waitFor({ state: "hidden" });
        assert.equal(
          (
            await db.query("SELECT active FROM tt_catalog WHERE id=?", [
              recordId,
            ])
          )[0].active,
          0,
        );
        page.once("dialog", (d) => d.accept());
        await row.getByRole("button", { name: "Delete", exact: true }).click();
        await row.waitFor({ state: "hidden" });
        assert.equal(
          (await db.query("SELECT id FROM tt_catalog WHERE id=?", [recordId]))
            .length,
          0,
        );
      }
    },
  );
  await check(
    "customer table, message review and account settings show actual records",
    async () => {
      await go("/admin/customers");
      await page
        .getByRole("cell", { name: "Browser QA Customer", exact: true })
        .waitFor();
      await go("/admin/messages");
      const reviewed = page.waitForResponse(
        (r) =>
          r.url().includes("/admin/messages/") &&
          r.request().method() === "PUT" &&
          r.status() === 200,
      );
      await page.getByLabel("Message Status").selectOption("Read");
      await reviewed;
      assert.equal(
        (
          await db.query("SELECT status FROM tt_messages WHERE email=?", [
            "browser-qa@example.com",
          ])
        )[0].status,
        "Read",
      );
      await go("/admin/accounts");
      await page.getByRole("cell", { name: username, exact: true }).waitFor();
      await go("/admin/settings");
      await page
        .getByRole("heading", { name: "Change Password", exact: true })
        .waitFor();
    },
  );
  await check("admin content edits and logout persist securely", async () => {
    await go("/admin/content");
    await page
      .getByLabel("Mobile Homepage Description")
      .fill("QA content updated");
    await page.getByRole("button", { name: "Save Content" }).click();
    await page
      .getByRole("status")
      .filter({ hasText: "Website content saved." })
      .waitFor();
    const [r] = await db.query("SELECT data FROM tt_settings WHERE id=?", [
      "website",
    ]);
    assert.equal(JSON.parse(r.data).mobile_description, "QA content updated");
    await page.getByRole("button", { name: "Logout", exact: true }).click();
    await page
      .getByRole("heading", { name: "Admin Login", exact: true })
      .waitFor();
    await go("/admin/products");
    await page
      .getByRole("heading", { name: "Admin Login", exact: true })
      .waitFor();
  });
  assert.deepEqual(errors, [], "Browser console/page errors");
  fs.writeFileSync(
    directory + "/browser-report.json",
    JSON.stringify({ checks, errors }, null, 2),
  );
  console.log("Browser checks complete:", checks.length);
} finally {
  await browser.close();
  await db.query(
    "UPDATE tt_inquiry_history SET admin_id=NULL WHERE admin_id IN (SELECT id FROM tt_admins WHERE username=?)",
    [username],
  );
  await db.query(
    "DELETE FROM tt_sessions WHERE admin_id IN (SELECT id FROM tt_admins WHERE username=?)",
    [username],
  );
  await db.query("DELETE FROM tt_admins WHERE username=?", [username]);
  await db.close();
}
