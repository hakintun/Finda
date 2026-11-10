#!/usr/bin/env node
/**
 * Pre-push check for Finda — run this BEFORE you commit or push.
 *
 *   node scripts/pre-push-check.mjs
 *
 * It refuses to be cheerful about anything that would embarrass you in review.
 * Exit code 0 = safe to push.  Exit code 1 = fix the ✗ items first.
 */
import { existsSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve } from "node:path";

const ROOT = process.cwd();
const results = [];
let failed = 0;
let warned = 0;

function ok(msg, detail = "") { results.push({ s: "ok", msg, detail }); }
function bad(msg, detail = "") { results.push({ s: "bad", msg, detail }); failed++; }
function warn(msg, detail = "") { results.push({ s: "warn", msg, detail }); warned++; }
function info(msg, detail = "") { results.push({ s: "info", msg, detail }); }

function sh(cmd) {
  try {
    return execSync(cmd, { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" }).trim();
  } catch (e) {
    return null;
  }
}
function has(cmd) { return sh(`command -v ${cmd}`) !== null || sh(`which ${cmd}`) !== null; }

console.log("\n  Finda — pre-push check\n  " + "─".repeat(46) + "\n");

/* ---------------------------------------------------------------- 1. location */
if (!existsSync(resolve(ROOT, "package.json"))) {
  console.log("  ✗ There is no package.json here.\n");
  console.log("  You are in the wrong folder. Run this from the folder that");
  console.log("  directly contains app/, lib/ and package.json.\n");
  process.exit(1);
}
const pkg = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8"));
ok("Project found", `finda@${pkg.version}`);

/* ------------------------------------------------------------ 2. dependencies */
if (existsSync(resolve(ROOT, "node_modules"))) ok("Dependencies installed");
else bad("node_modules missing", "run: npm install");

/* ---------------------------------------------------------------- 3. gitignore */
const giPath = resolve(ROOT, ".gitignore");
if (!existsSync(giPath)) {
  bad(".gitignore is missing", "node_modules would be committed — restore the file");
} else {
  const gi = readFileSync(giPath, "utf8");
  const must = [
    ["node_modules", /node_modules/],
    [".next", /\.next/],
    ["data/db.json", /data\/db\.json/],
    [".env", /\.env/],
  ];
  const missing = must.filter(([, re]) => !re.test(gi)).map(([n]) => n);
  if (missing.length) bad(".gitignore is incomplete", `missing: ${missing.join(", ")}`);
  else ok(".gitignore protects node_modules, .next, data/db.json, .env");
}

/* ------------------------------------------------------- 4. no secrets in repo */
const envFiles = [".env", ".env.local", ".env.production"].filter((f) => existsSync(resolve(ROOT, f)));
if (envFiles.length) warn(`Environment file present: ${envFiles.join(", ")}`, "make sure it is git-ignored; never commit real keys");
else ok("No .env files lying around");

/* ------------------------------------------------------------- 5. test suite */
if (existsSync(resolve(ROOT, "tests"))) {
  process.stdout.write("  … running the test suite\n");
  const out = sh("npm test 2>&1");
  if (out === null) {
    bad("Tests failed to run", "run npm test yourself and read the error");
  } else {
    const fail = /# fail (\d+)/.exec(out);
    const pass = /# pass (\d+)/.exec(out);
    if (fail && Number(fail[1]) > 0) bad(`${fail[1]} test(s) failing`, "run npm test");
    else if (pass) ok(`All ${pass[1]} tests pass`);
    else warn("Could not read the test summary", "run npm test manually");
  }
} else warn("No tests/ folder found");

/* -------------------------------------------------------------- 6. typecheck */
process.stdout.write("  … type-checking\n");
const tsc = sh("npx tsc --noEmit 2>&1");
if (tsc !== null && tsc.length > 0 && /error TS/.test(tsc)) {
  bad("TypeScript errors", tsc.split("\n")[0]);
} else {
  ok("TypeScript is clean");
}

/* ------------------------------------------------------------------ 7. build */
process.stdout.write("  … running a production build (this takes ~30s)\n");
const build = sh("npm run build 2>&1");
if (build === null || /Failed to compile|error/i.test(build) && /Failed to compile/i.test(build)) {
  bad("Production build failed", "run npm run build and read the error");
} else if (/Compiled successfully/.test(build)) {
  ok("Production build succeeds");
} else {
  warn("Build output not recognised", "run npm run build to confirm");
}

/* ----------------------------------------------------------------- 8. git */
const isRepo = sh("git rev-parse --is-inside-work-tree") === "true";
if (!isRepo) {
  bad("Not a git repository", "run git init, or work inside your clone of hakintun/Finda");
} else {
  const branch = sh("git branch --show-current");
  if (!branch) bad("Detached HEAD", "run: git checkout -b member3/seller-admin-market-data");
  else if (["main", "master", "production"].includes(branch)) {
    bad(`You are on '${branch}'`, "never commit straight to a shared branch — create your own");
  } else ok(`On branch '${branch}'`);

  const remote = sh("git remote -v");
  if (!remote) warn("No git remote configured", "git remote add origin https://github.com/hakintun/Finda.git");
  else if (remote.includes("hakintun/Finda")) ok("Remote points at hakintun/Finda");
  else warn("Remote is not hakintun/Finda", remote.split("\n")[0]);

  const name = sh("git config user.name");
  const email = sh("git config user.email");
  if (!name || !email) warn("Git identity not set", 'git config --global user.name "Your Name" and user.email "you@..."');
  else ok(`Git identity: ${name} <${email}>`);

  // What is about to be committed?
  const status = sh("git status --porcelain");
  if (status) {
    const lines = status.split("\n").filter(Boolean);
    const junk = lines.filter((l) =>
      /node_modules|\.next\/|data\/db\.json|\.tsbuildinfo|next-env\.d\.ts|\.DS_Store/.test(l)
    );
    if (junk.length) {
      bad(`${junk.length} file(s) that should never be committed`, junk.slice(0, 3).map((j) => j.slice(3)).join(", "));
    } else {
      ok(`${lines.length} changed path(s) staged for commit, no junk detected`);
    }

    // nested-project guard: is the project buried inside another repo folder?
    const top = sh("git rev-parse --show-toplevel");
    if (top && resolve(top) !== resolve(ROOT)) {
      warn("This project sits inside a bigger git repo", `repo root is ${top}`);
      info("", "That is fine, but commit from the repo root and make sure the files land where your team expects them.");
    }
  } else {
    info("", "Nothing changed since the last commit — already up to date.");
  }
}

/* ------------------------------------------------------------------ report */
console.log("\n  " + "─".repeat(46) + "\n");
const icon = { ok: "  ✓", bad: "  ✗", warn: "  !", info: "  ·" };
const colour = { ok: "\x1b[32m", bad: "\x1b[31m", warn: "\x1b[33m", info: "\x1b[90m" };
const reset = "\x1b[0m";
for (const r of results) {
  console.log(`${colour[r.s]}${icon[r.s]} ${r.msg}${reset}${r.detail ? `\n      ${r.detail}` : ""}`);
}
console.log("\n  " + "─".repeat(46));
if (failed === 0 && warned === 0) console.log("\n  \x1b[32mAll good — safe to commit and push.\x1b[0m\n");
else if (failed === 0) console.log(`\n  \x1b[33m${warned} warning(s) — read them, then push if you are happy.\x1b[0m\n`);
else console.log(`\n  \x1b[31m${failed} problem(s) to fix before pushing.\x1b[0m\n`);
process.exit(failed > 0 ? 1 : 0);
