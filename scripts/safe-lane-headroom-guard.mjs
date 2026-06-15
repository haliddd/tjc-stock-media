#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const expectedWorktreeInput = process.env.SAFE_LANE_EXPECTED_WORKTREE
  || "/Users/halim4pro/Desktop/MVP/tjc-stock-media-safe-ui-beta-run";
const expectedSourceCheckoutInput = process.env.SAFE_LANE_EXPECTED_SOURCE_CHECKOUT
  || "/Users/halim4pro/Desktop/MVP/tjc-stock-media";
const defaultMinFreeGiB = 10;
const minFreeGiB = Number.parseInt(process.env.SAFE_LANE_MIN_FREE_GIB || String(defaultMinFreeGiB), 10);
const overrideReason = String(process.env.SAFE_LANE_HEADROOM_OVERRIDE_REASON || "").trim();
const context = process.env.SAFE_LANE_HEADROOM_CONTEXT || "heavy local command";
const failures = [];

function run(command, args) {
  return execFileSync(command, args, { encoding: "utf8" }).trim();
}

const cwdRoot = run("git", ["rev-parse", "--show-toplevel"]);
const cwdRealRoot = fs.realpathSync(cwdRoot);
const expectedWorktree = fs.realpathSync(expectedWorktreeInput);
const expectedSourceCheckout = fs.existsSync(expectedSourceCheckoutInput)
  ? fs.realpathSync(expectedSourceCheckoutInput)
  : expectedSourceCheckoutInput;

if (cwdRealRoot !== expectedWorktree) {
  failures.push(`run ${context} only inside isolated worktree ${expectedWorktree}; got ${cwdRoot}`);
}
if (cwdRealRoot === expectedSourceCheckout) {
  failures.push(`refusing ${context} in shared checkout`);
}
if (!Number.isInteger(minFreeGiB) || minFreeGiB < 0) {
  failures.push("SAFE_LANE_MIN_FREE_GIB must be a non-negative integer");
}
if (Number.isInteger(minFreeGiB) && minFreeGiB < defaultMinFreeGiB && !overrideReason) {
  failures.push(`lowering SAFE_LANE_MIN_FREE_GIB below ${defaultMinFreeGiB} requires SAFE_LANE_HEADROOM_OVERRIDE_REASON`);
}

const freeKib = Number(run("df", ["-k", expectedWorktree]).split(/\r?\n/)[1].trim().split(/\s+/)[3]);
const freeGiB = Math.floor(freeKib / 1024 / 1024);
if (Number.isInteger(minFreeGiB) && freeGiB < minFreeGiB) {
  failures.push(`free disk ${freeGiB} GiB is below required ${minFreeGiB} GiB for ${context}`);
}

if (failures.length) {
  console.error("Safe lane headroom guard failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  console.error("Use `make safe-lane-disk-report` first. Do not clean shared checkout, source media, prod/hosted surfaces, or evidence artifacts without replacement proof.");
  process.exit(1);
}

const overrideNote = minFreeGiB < defaultMinFreeGiB ? ` override reason: ${overrideReason}` : "";
console.log(`Safe lane headroom guard passed for ${context}: ${freeGiB} GiB free, minimum ${minFreeGiB} GiB.${overrideNote}`);
