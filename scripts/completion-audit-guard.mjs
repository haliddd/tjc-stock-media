#!/usr/bin/env node
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

requireLedgerText("## Completion Audit");
requireLedgerText("Audit decision: do not mark the overall goal complete");
requireLedgerText("full objective still depends on external hosted/canonical/ResourceSpace/Drive/durable/tester approval evidence");
requireAuditRowText("Final readiness decision honest", "`evidence-packet-guard-test`", "evidence packet self-test");
requireAuditRowText("Local disk headroom for long autonomous lane", "never shared checkout or source media", "safe disk-headroom follow-up boundary");
requireAuditRowText("Local disk headroom for long autonomous lane", "`make safe-lane-disk-report-test`", "safe disk-headroom self-test proof");
requireAuditRowText("Local disk headroom for long autonomous lane", "`make safe-lane-headroom-guard-test`", "safe disk-headroom hard-stop proof");
requireAuditRowText("Local disk headroom for long autonomous lane", "fail closed", "safe disk-headroom fail-closed behavior");
requireAuditRowText("Local disk headroom for long autonomous lane", "dev/build/start/browser/smoke", "safe disk-headroom smoke block scope");
requireAuditRowText("Local disk headroom for long autonomous lane", "dev/build/start/browser/smoke/bootstrap/docker", "safe disk-headroom bootstrap/docker block scope");
requireAuditRowText("Local disk headroom for long autonomous lane", "dev/build/start/browser/smoke/bootstrap/docker/import/media/backup", "safe disk-headroom import/media/backup block scope");
requireAuditRowText("Local disk headroom for long autonomous lane", "safe isolated cleanup alone is not enough for default headroom", "safe disk-headroom cleanup insufficiency");
requireAuditRowText("Local disk headroom for long autonomous lane", "SAFE_LANE_HEADROOM_OVERRIDE_REASON", "safe disk-headroom override reason boundary");
if (/Audit decision:\s*(mark|goal complete|complete)/i.test(ledger)) {
  failures.push(`${ledgerPath} must not claim audit decision is complete`);
}

for (const [requirement, status] of [
  ["Isolated worktree exists and shared checkout is not used for long build/dev/smoke/UI work", "PASS local"],
  ["Worktree branch/path/start commit/current commit/BASE_URL recorded", "PASS local"],
  ["Build artifacts, `.next`, screenshots, and runtime JSON stay isolated", "PASS local"],
  ["Local disk headroom for long autonomous lane", "FOLLOW-UP"],
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
