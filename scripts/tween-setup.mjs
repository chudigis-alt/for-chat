import { createStore } from "../server/tweentees/db.mjs";
import { seed } from "../server/tweentees/seed.mjs";
try {
  process.loadEnvFile();
} catch {}
const db = createStore();
try {
  await db.migrate();
  await seed(db);
  console.log(
    "TweenTees schema and design catalog prepared; existing records preserved.",
  );
} finally {
  await db.close();
}
