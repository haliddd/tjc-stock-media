#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const expectedWorktreeInput = process.env.SAFE_LANE_EXPECTED_WORKTREE
  || "/Users/halim4pro/Desktop/MVP/tjc-stock-media-safe-ui-beta-run";
const expectedSourceCheckoutInput = process.env.SAFE_LANE_EXPECTED_SOURCE_CHECKOUT
  || "/Users/halim4pro/Desktop/MVP/tjc-stock-media";
const defaultMinFreeGiB = 10;
const failures = [];

function run(command, args) {
  return execFileSync(command, args, { encoding: "utf8" }).trim();
}

function realInside(base, target) {
  const resolvedBase = fs.realpathSync(base);
  const resolvedTarget = fs.realpathSync(target);
  return resolvedTarget === resolvedBase || resolvedTarget.startsWith(`${resolvedBase}${path.sep}`);
}

function sizeOf(fullPath) {
  if (!fs.existsSync(fullPath)) return "missing";
  return run("du", ["-sh", fullPath]).split(/\s+/)[0];
}

const cwdRoot = run("git", ["rev-parse", "--show-toplevel"]);
const expectedWorktree = fs.realpathSync(expectedWorktreeInput);
const expectedSourceCheckout = fs.existsSync(expectedSourceCheckoutInput)
  ? fs.realpathSync(expectedSourceCheckoutInput)
  : expectedSourceCheckoutInput;
const cwdRealRoot = fs.realpathSync(cwdRoot);

if (cwdRealRoot !== expectedWorktree) {
  failures.push(`safe disk report must run inside isolated worktree ${expectedWorktree}; got ${cwdRoot}`);
}
if (cwdRealRoot === expectedSourceCheckout) {
  failures.push("safe disk report refused to run in shared checkout");
}

const candidates = [
  {
    path: "frontend/.next",
    note: "isolated Next build output; rebuild required after removal"
  },
  {
    path: ".next",
    note: "isolated stray root Next output if present"
  },
  {
    path: ".runtime/analytics",
    note: "isolated local usage-smoke SQLite output; preserve only if cited as evidence"
  }
];

for (const candidate of candidates) {
  const fullPath = path.join(expectedWorktree, candidate.path);
  if (fs.existsSync(fullPath) && !realInside(expectedWorktree, fullPath)) {
    failures.push(`candidate escapes isolated worktree: ${candidate.path}`);
  }
}

if (failures.length) {
  console.error("Safe lane disk report failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

const freeKib = Number(run("df", ["-k", expectedWorktree]).split(/\r?\n/)[1].trim().split(/\s+/)[3]);
const freeGiB = Math.floor(freeKib / 1024 / 1024);

console.log(`Safe lane disk report for ${expectedWorktree}`);
console.log(`Free disk: ${freeGiB} GiB`);
console.log(`Default heavy-run minimum: ${defaultMinFreeGiB} GiB`);
if (freeGiB < defaultMinFreeGiB) {
  console.log(`Heavy local reruns: BLOCKED below default ${defaultMinFreeGiB} GiB headroom.`);
  console.log("Blocked scope: dev/build/start/browser/smoke/bootstrap/docker/import/media/backup.");
  console.log("Focused threshold override requires SAFE_LANE_HEADROOM_OVERRIDE_REASON.");
} else {
  console.log(`Heavy local reruns: PASS default ${defaultMinFreeGiB} GiB headroom.`);
}
console.log("");
console.log("Report-only candidates. This script deletes nothing.");
for (const candidate of candidates) {
  const fullPath = path.join(expectedWorktree, candidate.path);
  console.log(`- ${candidate.path}: ${sizeOf(fullPath)} — ${candidate.note}`);
}
console.log("");
console.log("Do not delete from this report:");
console.log(`- shared checkout: ${expectedSourceCheckout}`);
console.log("- source media, Google Drive originals, ResourceSpace data, Vercel env, billing/DNS/live writeback");
console.log("- evidence docs and screenshots unless a new proof packet replaces them");
