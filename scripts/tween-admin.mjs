import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { createStore } from "../server/tweentees/db.mjs";
try {
  process.loadEnvFile();
} catch {}
const username = process.argv[2],
  reset = process.argv.includes("--reset");
if (!username || !/^[a-zA-Z0-9._@-]{3,100}$/.test(username))
  throw Error(
    "Provide an administrator username. Password is read only from standard input.",
  );
let input = "";
for await (const chunk of process.stdin) {
  input += chunk;
  if (input.length > 1000) throw Error("Input too long.");
}
const password = input.replace(/\r?\n$/, "");
if (password.length < 8 || Buffer.byteLength(password) > 72)
  throw Error("Initial password must be 8–72 bytes.");
const hash = await bcrypt.hash(password, 12),
  db = createStore();
try {
  await db.transaction(async (tx) => {
    const [existing] = await tx.query(
      "SELECT id FROM tt_admins WHERE username=?",
      [username],
    );
    if (existing && !reset)
      throw Error(
        "Account exists; refusing to overwrite it. Use --reset only for an authorized recovery.",
      );
    if (existing) {
      await tx.query(
        "UPDATE tt_admins SET password_hash=?,must_change=1 WHERE id=?",
        [hash, existing.id],
      );
      await tx.query("DELETE FROM tt_sessions WHERE admin_id=?", [existing.id]);
    } else
      await tx.query(
        "INSERT INTO tt_admins (id,username,password_hash,must_change) VALUES (?,?,?,1)",
        [randomUUID(), username, hash],
      );
  });
  console.log(
    "Administrator initialized; password replacement required at first login.",
  );
} finally {
  await db.close();
}
