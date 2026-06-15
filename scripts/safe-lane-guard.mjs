#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const expectedWorktree = process.env.SAFE_LANE_EXPECTED_WORKTREE
  || "/Users/halim4pro/Desktop/MVP/tjc-stock-media-safe-ui-beta-run";
const expectedSourceCheckout = process.env.SAFE_LANE_EXPECTED_SOURCE_CHECKOUT
  || "/Users/halim4pro/Desktop/MVP/tjc-stock-media";
const expectedBranch = process.env.SAFE_LANE_EXPECTED_BRANCH
  || "codex/safe-ui-beta-proof-2026-06-15";
const expectedBaseUrl = process.env.SAFE_LANE_EXPECTED_BASE_URL
  || "http://localhost:4871";
const ledgerPath = process.env.SAFE_LANE_LEDGER_PATH
  || "docs/runs/evidence/2026-06-15/12-safe-30-40h-ui-run.md";
const failures = [];

function run(command, args) {
  return execFileSync(command, args, { encoding: "utf8" }).trim();
}

function requireText(source, text, label = text) {
  if (!source.includes(text)) failures.push(`${ledgerPath} missing ${label}`);
}

const cwdRoot = run("git", ["rev-parse", "--show-toplevel"]);
const branch = run("git", ["branch", "--show-current"]);
const head = run("git", ["rev-parse", "HEAD"]);
const worktrees = run("git", ["worktree", "list", "--porcelain"]);
const ledger = fs.existsSync(path.join(cwdRoot, ledgerPath))
  ? fs.readFileSync(path.join(cwdRoot, ledgerPath), "utf8")
  : "";

if (cwdRoot !== expectedWorktree) failures.push(`safe lane must run inside isolated worktree ${expectedWorktree}; got ${cwdRoot}`);
if (branch !== expectedBranch) failures.push(`safe lane branch must be ${expectedBranch}; got ${branch}`);
if (!worktrees.includes(`worktree ${expectedWorktree}`)) failures.push(`git worktree list missing isolated worktree ${expectedWorktree}`);
if (!worktrees.includes(`worktree ${expectedSourceCheckout}`)) failures.push(`git worktree list missing source checkout ${expectedSourceCheckout}`);
if (!worktrees.includes(`branch refs/heads/${expectedBranch}`)) failures.push(`git worktree list missing branch refs/heads/${expectedBranch}`);

if (!ledger) {
  failures.push(`missing safe-lane ledger: ${ledgerPath}`);
} else {
  requireText(ledger, `Source checkout: \`${expectedSourceCheckout}\``, "source checkout path");
  requireText(ledger, `Isolated worktree path: \`${expectedWorktree}\``, "isolated worktree path");
  requireText(ledger, `Branch: \`${expectedBranch}\``, "safe branch");
  requireText(ledger, `Current HEAD commit: \`${head}\``, "current HEAD commit");
  requireText(ledger, `Actual BASE_URL: \`${expectedBaseUrl}\``, "actual BASE_URL");
  requireText(ledger, "Secrets redacted: yes");
  requireText(ledger, "Runtime/build artifacts isolated under isolated worktree: yes");
  requireText(ledger, "Shared checkout untouched by this build/dev/smoke lane: yes");
  requireText(ledger, "019ec981-e816-70d0-bac1-759bb7792a12", "sibling session 019ec981");
  requireText(ledger, "019ec84d-5d83-7010-9393-f7df3739e4d9", "sibling session 019ec84d");
  for (const forbidden of [
    "Vercel prod env",
    "ResourceSpace prod data",
    "Google Drive originals",
    "DNS",
    "Billing",
    "Live writeback",
    "Tester invites",
    "Public launch",
    "Source media"
  ]) {
    requireText(ledger, `- ${forbidden}`, `forbidden surface ${forbidden}`);
  }
}

const trackedFiles = run("git", ["ls-files"]).split("\n").filter(Boolean);
const forbiddenTrackedPatterns = [
  /(^|\/)\.env$/,
  /(^|\/)\.runtime(\/|$)/,
  /(^|\/)\.next(\/|$)/,
  /(^|\/)data\/runtime(\/|$)/,
  /(^|\/)(filestore|mariadb|models|ComfyUI)(\/|$)/,
  /\.(heic|heif|tif|tiff|mp4|mov|m4v|mp3|wav|m4a|aac|flac)$/i
];
const forbiddenTracked = trackedFiles.filter((file) => forbiddenTrackedPatterns.some((pattern) => pattern.test(file)));
if (forbiddenTracked.length) {
  failures.push(`forbidden runtime/media/env artifacts tracked:\n${forbiddenTracked.map((file) => `  ${file}`).join("\n")}`);
}

if (failures.length) {
  console.error("Safe lane guard failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Safe lane guard passed.");
