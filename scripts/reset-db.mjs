/**
 * Reset the demo database.  npm run reset
 *
 * Deletes data/db.json. The app rebuilds it from data/seed.json on the next
 * page load — so the demo data always comes back fresh (timestamps are relative
 * offsets in the seed). Reload the browser tab afterwards.
 */
import { rmSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const db = resolve(process.cwd(), "data/db.json");
const seed = resolve(process.cwd(), "data/seed.json");

if (!existsSync(seed)) {
  console.error("✗ data/seed.json not found. Run this from the project root.");
  process.exit(1);
}

const existed = existsSync(db);
rmSync(db, { force: true });

console.log(existed ? "✓ Demo database deleted." : "✓ No demo database found — nothing to clear.");
console.log("  Reload your browser tab and the app rebuilds it from data/seed.json.");
console.log("  (The seed stores relative times, so everything comes back fresh.)");
