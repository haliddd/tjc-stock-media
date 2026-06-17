#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const expectedWorktree = process.env.RUNTIME_ISOLATION_EXPECTED_WORKTREE
  || "/Users/halim4pro/Desktop/MVP/tjc-stock-media-safe-ui-beta-run";
const expectedSourceCheckout = process.env.RUNTIME_ISOLATION_EXPECTED_SOURCE_CHECKOUT
  || "/Users/halim4pro/Desktop/MVP/tjc-stock-media";
const ledgerPath = process.env.RUNTIME_ISOLATION_LEDGER_PATH
  || "docs/runs/evidence/2026-06-15/12-safe-30-40h-ui-run.md";
const dailyPath = process.env.RUNTIME_ISOLATION_DAILY_PATH
  || "docs/runs/daily-checkpoint-2026-06-15.md";
const failures = [];

function run(command, args) {
  return execFileSync(command, args, { encoding: "utf8" }).trim();
}

function artifactSnapshot(fullPath) {
  const size = run("du", ["-sh", fullPath]).split(/\s+/)[0];
  const mtime = run("stat", ["-f", "%Sm", "-t", "%Y-%m-%dT%H:%M:%S%z", fullPath]);
  return { size, mtime };
}

function realInside(base, target) {
  const resolvedBase = fs.realpathSync(base);
  const resolvedTarget = fs.realpathSync(target);
  return resolvedTarget === resolvedBase || resolvedTarget.startsWith(`${resolvedBase}${path.sep}`);
}

function safeWorktreePath(relativePath, label) {
  const normalized = path.normalize(relativePath);
  if (path.isAbsolute(relativePath) || normalized === ".." || normalized.startsWith(`..${path.sep}`)) {
    failures.push(`${label} must be a relative path inside isolated worktree: ${relativePath}`);
    return path.join(expectedWorktree, "__invalid__");
  }
  const fullPath = path.join(expectedWorktree, normalized);
  if (!fs.existsSync(fullPath)) return fullPath;
  if (!realInside(expectedWorktree, fullPath)) {
    failures.push(`${label} escapes isolated worktree: ${relativePath}`);
  }
  return fullPath;
}

function read(relativePath, label) {
  const fullPath = safeWorktreePath(relativePath, label);
  return fs.existsSync(fullPath) ? fs.readFileSync(fullPath, "utf8") : "";
}

const cwdRoot = run("git", ["rev-parse", "--show-toplevel"]);
if (cwdRoot !== expectedWorktree) failures.push(`runtime isolation guard must run inside ${expectedWorktree}; got ${cwdRoot}`);
if (!fs.existsSync(expectedWorktree)) {
  failures.push(`expected isolated worktree does not exist: ${expectedWorktree}`);
}
if (!fs.existsSync(expectedSourceCheckout)) {
  failures.push(`expected source checkout does not exist: ${expectedSourceCheckout}`);
}
if (fs.existsSync(expectedWorktree) && fs.existsSync(expectedSourceCheckout)) {
  const realWorktree = fs.realpathSync(expectedWorktree);
  const realSourceCheckout = fs.realpathSync(expectedSourceCheckout);
  if (realWorktree === realSourceCheckout) {
    failures.push("isolated worktree and source checkout must be distinct real paths");
  }
}

const optionalRuntimeArtifacts = [
  ".runtime",
  "frontend/.next"
];

const requiredProofArtifacts = [
  "docs/screenshots/qa",
  "docs/screenshots/qa/browser-qa-report.json",
  "docs/runs/evidence/2026-06-15",
  "docs/runs/evidence/2026-06-15/hosted-readonly-probes/summary.json"
];

for (const relativePath of requiredProofArtifacts) {
  const fullPath = path.join(expectedWorktree, relativePath);
  if (!fs.existsSync(fullPath)) {
    failures.push(`missing isolated runtime/proof artifact: ${relativePath}`);
    continue;
  }
  if (!realInside(expectedWorktree, fullPath)) {
    failures.push(`runtime/proof artifact is outside isolated worktree: ${relativePath}`);
  }
}

for (const relativePath of optionalRuntimeArtifacts) {
  const fullPath = path.join(expectedWorktree, relativePath);
  if (fs.existsSync(fullPath) && !realInside(expectedWorktree, fullPath)) {
    failures.push(`runtime/build artifact is outside isolated worktree: ${relativePath}`);
  }
}

const ledger = read(ledgerPath, "runtime isolation ledger path");
const daily = read(dailyPath, "runtime isolation daily path");
for (const [relativePath, source] of [[ledgerPath, ledger], [dailyPath, daily]]) {
  if (!source) {
    failures.push(`missing evidence file: ${relativePath}`);
    continue;
  }
  const normalizedSource = source.toLowerCase();
  if (!normalizedSource.includes("source checkout artifact inventory")) {
    failures.push(`${relativePath} must record read-only source checkout artifact inventory`);
  }
  if (!normalizedSource.includes("not used as proof") || !normalizedSource.includes("did not mutate")) {
    failures.push(`${relativePath} must state source checkout artifacts were read-only and not used as proof`);
  }
}

const sourceRelativeArtifacts = [
  ".runtime",
  "frontend/.next",
  "docs/screenshots/qa"
];

const sourceArtifacts = sourceRelativeArtifacts.map((relativePath) => ({
  relativePath,
  fullPath: path.join(expectedSourceCheckout, relativePath)
}));

for (const { relativePath, fullPath } of sourceArtifacts) {
  if (!fs.existsSync(fullPath)) continue;
  if (!realInside(expectedSourceCheckout, fullPath)) {
    failures.push(`source checkout artifact path escapes source checkout: ${fullPath}`);
  }
  if (!ledger.includes(`| \`${fullPath}\` |`)) {
    failures.push(`${ledgerPath} must record source checkout artifact path: ${fullPath}`);
  }
  if (!daily.includes(relativePath)) {
    failures.push(`${dailyPath} must mention source checkout artifact: ${relativePath}`);
  }
}

const isolatedInventory = [
  ".runtime",
  "frontend/.next",
  "docs/screenshots/qa"
].map((relativePath) => ({
    fullPath: path.join(expectedWorktree, relativePath),
    label: `isolated worktree ${relativePath}`
  })).filter((item) => fs.existsSync(item.fullPath));

for (const item of isolatedInventory) {
  const { size, mtime } = artifactSnapshot(item.fullPath);
  const ledgerRow = `| \`${item.fullPath}\` | ${size} | ${mtime} |`;
  if (!ledger.includes(ledgerRow)) {
    failures.push(`${ledgerPath} artifact inventory stale for ${item.label}; expected row: ${ledgerRow}`);
  }
}

const tracked = run("git", ["ls-files"]).split("\n").filter(Boolean);
const trackedRuntime = tracked.filter((file) => /(^|\/)(\.runtime|\.next|data\/runtime)(\/|$)/.test(file));
if (trackedRuntime.length) {
  failures.push(`runtime/build artifacts must not be tracked:\n${trackedRuntime.map((file) => `  ${file}`).join("\n")}`);
}

if (failures.length) {
  console.error("Runtime isolation guard failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Runtime isolation guard passed.");
