#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const ledgerPath = "docs/runs/evidence/2026-06-15/12-safe-30-40h-ui-run.md";
const blockersPath = "docs/runs/evidence/2026-06-15/open-blockers.json";
const failures = [];

function read(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    failures.push(`missing file: ${relativePath}`);
    return "";
  }
  return fs.readFileSync(fullPath, "utf8");
}

const ledger = read(ledgerPath);
const blockersSource = read(blockersPath);

function requireLedgerText(text, label = text) {
  if (ledger && !ledger.includes(text)) failures.push(`${ledgerPath} missing ${label}`);
}

function requireAuditRow(requirement, expectedStatus) {
  const escaped = requirement.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rowPattern = new RegExp(`\\| ${escaped} \\|[^\\n]+\\| ${expectedStatus.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\|`);
  if (!rowPattern.test(ledger)) failures.push(`${ledgerPath} audit row missing expected status ${expectedStatus}: ${requirement}`);
}

function requireAuditRowText(requirement, text, label = text) {
  const row = ledger.split(/\r?\n/).find((line) => line.startsWith(`| ${requirement} |`));
  if (!row) {
    failures.push(`${ledgerPath} audit row missing for ${requirement}`);
    return;
  }
  if (!row.includes(text)) failures.push(`${ledgerPath} audit row for ${requirement} missing ${label}`);
}

function runGit(args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
}

function currentChangedFiles() {
  try {
    runGit(["rev-parse", "--show-toplevel"]);
    const files = [
      ...runGit(["diff", "--name-only"]).split("\n"),
      ...runGit(["diff", "--cached", "--name-only"]).split("\n"),
      ...runGit(["ls-files", "--others", "--exclude-standard"]).split("\n")
    ].map((line) => line.trim()).filter(Boolean);
    return [...new Set(files)].sort();
  } catch {
    return null;
  }
}

function ledgerChangedFiles() {
  const match = ledger.match(/## Changed Files Inventory[\s\S]*?```text\n([\s\S]*?)\n```/);
  if (!match) return null;
  return match[1].split("\n").map((line) => line.trim()).filter(Boolean);
}

requireLedgerText("## Changed Files Inventory");
requireLedgerText("Captured with `(git diff --name-only && git diff --cached --name-only && git ls-files --others --exclude-standard) | sort -u`");
requireLedgerText("it does not include main checkout sibling-lane changes");
requireLedgerText("scripts/completion-audit-guard.mjs");
requireLedgerText("docs/screenshots/qa/browser-qa-report.json");
requireLedgerText("## Completion Audit");
requireLedgerText("| `make launch-readiness` | PASS, failures=0 / warnings=2;", "launch-readiness pass/warning row");
requireLedgerText("| `npm --prefix frontend run typecheck` | PASS |", "typecheck pass row");
requireLedgerText("| `npm --prefix frontend test` | PASS, 86 tests |", "frontend test pass row");
requireLedgerText("| `npm --prefix frontend run build` | PASS, `prebuild` guard confirmed `4871` stopped |", "frontend build pass row");
requireLedgerText("| `BASE_URL=http://localhost:4871 make portal-api-smoke` | PASS |", "portal API smoke pass row");
requireLedgerText("| `BASE_URL=http://localhost:4871 make portal-download-ticket-smoke` | PASS |", "download ticket smoke pass row");
requireLedgerText("| `BASE_URL=http://localhost:4871 make portal-feedback-smoke` | PASS |", "feedback smoke pass row");
requireLedgerText("| `BASE_URL=http://localhost:4871 make portal-package-smoke` | PASS |", "package smoke pass row");
requireLedgerText("| `BASE_URL=http://localhost:4871 make portal-saved-search-smoke` | PASS |", "saved-search smoke pass row");
requireLedgerText("| `BASE_URL=http://localhost:4871 make portal-beta-rehearsal` | PASS |", "beta rehearsal pass row");
requireLedgerText("| `BASE_URL=http://localhost:4871 make portal-browser-qa` | PASS, 20 pages / 6 viewports / 32 screenshots / 0 failures;", "browser QA pass row");
requireLedgerText("Final verdict: **Not beta ready**", "exact final verdict");
requireLedgerText("Audit decision: do not mark the overall goal complete");
requireLedgerText("full objective still depends on external hosted/canonical/ResourceSpace/Drive/durable/tester approval evidence");
requireLedgerText("## Final Report Checklist", "final report checklist section");
requireLedgerText("Worktree path, branch, HEAD, and git status:", "final report worktree/branch/HEAD/status field");
requireLedgerText("/Users/halim4pro/Desktop/MVP/tjc-stock-media-safe-ui-beta-run", "final report worktree path");
requireLedgerText("codex/safe-ui-beta-proof-2026-06-15", "final report branch");
requireLedgerText("e88c5722f8e547b24f054633854e36391d670d42", "final report HEAD");
requireLedgerText("Exact files changed: see `Changed Files Inventory` above", "final report exact files changed field");
requireLedgerText("Exact checks run with pass/fail: see `Proof Commands`", "final report checks run field");
requireLedgerText("Browser QA result and screenshot/report paths: PASS", "final report browser QA field");
requireLedgerText("docs/screenshots/qa/browser-qa-report.json", "final report browser QA report path");
requireLedgerText("screenshot PNGs under `docs/screenshots/`", "final report screenshot path");
requireLedgerText("Launch-readiness result: PASS with `failures=0` and `warnings=2`", "final report launch-readiness result");
requireLedgerText("Remaining production blockers: canonical deployment, hosted access protection, Vercel env confirmation, ResourceSpace scope, Google Drive custody, durable hosted state, backup/restore proof, and tester list/signoff", "final report remaining blockers field");
requireLedgerText("Main checkout files touched: no", "final report main checkout untouched field");
requireLedgerText("not mutated, and no build/dev/smoke/browser QA ran from `/Users/halim4pro/Desktop/MVP/tjc-stock-media`", "final report shared checkout no-run field");
requireLedgerText("Final verdict: **Not beta ready**.", "final report final verdict field");

const actualChangedFiles = currentChangedFiles();
const recordedChangedFiles = ledgerChangedFiles();
if (!recordedChangedFiles) {
  failures.push(`${ledgerPath} missing parseable changed files inventory code block`);
} else if (actualChangedFiles) {
  const actual = actualChangedFiles.join("\n");
  const recorded = recordedChangedFiles.join("\n");
  if (actual !== recorded) {
    failures.push(`${ledgerPath} changed files inventory does not match current git diff/cached/untracked file set`);
    const missing = actualChangedFiles.filter((file) => !recordedChangedFiles.includes(file));
    const stale = recordedChangedFiles.filter((file) => !actualChangedFiles.includes(file));
    if (missing.length) failures.push(`  missing from inventory:\n${missing.map((file) => `    ${file}`).join("\n")}`);
    if (stale.length) failures.push(`  stale in inventory:\n${stale.map((file) => `    ${file}`).join("\n")}`);
    if (!missing.length && !stale.length) {
      const firstMismatchIndex = actualChangedFiles.findIndex((file, index) => file !== recordedChangedFiles[index]);
      if (firstMismatchIndex !== -1) {
        failures.push([
          `  inventory order differs at line ${firstMismatchIndex + 1}:`,
          `    expected: ${actualChangedFiles[firstMismatchIndex]}`,
          `    recorded: ${recordedChangedFiles[firstMismatchIndex]}`
        ].join("\n"));
      }
    }
  }
}

requireAuditRowText("Final readiness decision honest", "`evidence-packet-guard-test`", "evidence packet self-test");
requireAuditRowText("Local disk headroom for long autonomous lane", "never shared checkout or source media", "safe disk-headroom follow-up boundary");
requireAuditRowText("Local disk headroom for long autonomous lane", "`make safe-lane-disk-report-test`", "safe disk-headroom self-test proof");
requireAuditRowText("Local disk headroom for long autonomous lane", "`make safe-lane-headroom-guard-test`", "safe disk-headroom hard-stop proof");
requireAuditRowText("Local disk headroom for long autonomous lane", "fail closed", "safe disk-headroom fail-closed behavior");
requireAuditRowText("Local disk headroom for long autonomous lane", "dev/build/start/browser/smoke", "safe disk-headroom smoke block scope");
requireAuditRowText("Local disk headroom for long autonomous lane", "dev/build/start/browser/smoke/bootstrap/docker", "safe disk-headroom bootstrap/docker block scope");
requireAuditRowText("Local disk headroom for long autonomous lane", "dev/build/start/browser/smoke/bootstrap/docker/import/media/backup", "safe disk-headroom import/media/backup block scope");
requireAuditRowText("Local disk headroom for long autonomous lane", "safe isolated cleanup may not be enough for default headroom", "safe disk-headroom cleanup insufficiency");
requireAuditRowText("Local disk headroom for long autonomous lane", "SAFE_LANE_HEADROOM_OVERRIDE_REASON", "safe disk-headroom override reason boundary");
if (/Audit decision:\s*(mark|goal complete|complete)/i.test(ledger)) {
  failures.push(`${ledgerPath} must not claim audit decision is complete`);
}
if (/Final verdict:\s*\*\*(Beta ready|Beta ready with limitations)\*\*/i.test(ledger)) {
  failures.push(`${ledgerPath} final verdict must remain Not beta ready while external blockers remain`);
}

for (const [requirement, status] of [
  ["Isolated worktree exists and shared checkout is not used for long build/dev/smoke/UI work", "PASS local"],
  ["Worktree branch/path/start commit/current commit/BASE_URL recorded", "PASS local"],
  ["Build artifacts, `.next`, screenshots, and runtime JSON stay isolated", "PASS local"],
  ["Changed files inventory recorded", "PASS local"],
  ["Local disk headroom for long autonomous lane", "PASS local / WATCH"],
  ["No forbidden external surfaces touched", "PASS local"],
  ["Query-role trust bug class fixed globally", "PASS local"],
  ["Viewer/Contributor payloads remain redacted", "PASS local"],
  ["Blocked downloads remain blocked", "PASS local"],
  ["Library premium UI maturity pass", "PASS local"],
  ["Review Queue premium workflow/redaction pass", "PASS local"],
  ["Hosted access protected", "PARTIAL"],
  ["Canonical repo/deploy/commit locked", "BLOCKED"],
  ["Real ResourceSpace read or explicit non-real rehearsal scope", "BLOCKED"],
  ["Google Drive custody proof", "BLOCKED"],
  ["Durable/fail-closed hosted state", "BLOCKED"],
  ["Backup/restore proof", "BLOCKED"],
  ["Teammate beta packet complete and approved", "BLOCKED"],
  ["Final readiness decision honest", "PASS for NO-GO"],
  ["Open blockers are machine-readable", "PASS for NO-GO"]
]) {
  requireAuditRow(requirement, status);
}

if (blockersSource) {
  try {
    const matrix = JSON.parse(blockersSource);
    if (matrix.decision !== "NO-GO") failures.push(`${blockersPath} decision must remain NO-GO while completion audit is blocked`);
    const statuses = new Map((matrix.blockers || []).map((blocker) => [blocker.id, blocker.status]));
    for (const id of [
      "canonical-deployment",
      "vercel-env-confirmation",
      "resourcespace-scope",
      "google-drive-custody",
      "durable-hosted-state",
      "tester-list-and-signoff"
    ]) {
      if (statuses.get(id) !== "blocked") failures.push(`${blockersPath} blocker ${id} must remain blocked until proof exists`);
    }
    if (statuses.get("hosted-access-protection") !== "partial") {
      failures.push(`${blockersPath} hosted-access-protection must remain partial until authenticated hosted proof exists`);
    }
  } catch (error) {
    failures.push(`${blockersPath} must be valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failures.length) {
  console.error("Completion audit guard failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Completion audit guard passed.");
