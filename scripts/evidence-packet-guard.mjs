#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const evidenceDir = path.join("docs", "runs", "evidence", "2026-06-15");
const failures = [];
const latestLocalProofStamp = "2026-06-15T12:14:57Z";
const localRuntimeSmokeHeadroomContexts = [
  "portal-api-smoke",
  "portal-sso-smoke",
  "portal-usage-smoke",
  "portal-delivery-smoke",
  "portal-download-ticket-smoke",
  "portal-writeback-guard-smoke",
  "portal-package-smoke",
  "portal-saved-search-smoke",
  "portal-feedback-smoke",
  "portal-beta-rehearsal"
];
const riskyMakeHeadroomContexts = [
  "tag-search-static-smoke",
  "import-audit",
  "import-mvp-batch",
  "approve-mvp-batch",
  "heic-derivatives",
  "polish-mvp-ui",
  "lm-photos-zip-inventory",
  "lm-photos-stream-run",
  "lm-photos-run-report",
  "video-manifest",
  "export-metadata",
  "backup",
  "restore-test",
  "demo-check"
];
const directScriptHeadroomGuards = [
  { path: "scripts/portal-smoke-trusted-identity.sh", context: "portal-smoke" },
  { path: "scripts/portal-api-smoke.sh", context: "portal-api-smoke" },
  { path: "scripts/portal-sso-smoke.sh", context: "portal-sso-smoke" },
  { path: "scripts/portal-hosted-smoke.sh", context: "portal-hosted-smoke" },
  { path: "scripts/smoke.sh", context: "resourcespace-smoke" },
  { path: "scripts/import-audit.sh", context: "import-audit" },
  { path: "scripts/import-mvp-batch.sh", context: "import-mvp-batch" },
  { path: "scripts/approve-mvp-batch.sh", context: "approve-mvp-batch" },
  { path: "scripts/heic-derivatives.sh", context: "heic-derivatives" },
  { path: "scripts/polish-mvp-ui.sh", context: "polish-mvp-ui" },
  { path: "scripts/lm-photos-zip-inventory.sh", context: "lm-photos-zip-inventory" },
  { path: "scripts/lm-photos-stream-run.sh", context: "lm-photos-stream-run" },
  { path: "scripts/video-manifest.sh", context: "video-manifest" },
  { path: "scripts/export-metadata.sh", context: "export-metadata" },
  { path: "scripts/backup.sh", context: "backup" },
  { path: "scripts/restore-test.sh", context: "restore-test" },
  { path: "scripts/demo-check.sh", context: "demo-check" }
];
const pythonHeadroomGuards = [
  { path: "scripts/lm-photos-zip-inventory.py", context: "lm-photos-zip-inventory" },
  { path: "scripts/stage-batch-masters.py", context: "stage-batch-masters" },
  { path: "scripts/generate-run-report.py", context: "lm-photos-run-report" }
];

const requiredDocs = [
  "00-hali-dependencies.md",
  "01-canonical-repo-deploy.md",
  "02-local-baseline-checks.md",
  "03-hosted-access-proof.md",
  "04-resourcespace-read-proof.md",
  "05-real-vs-demo-proof.md",
  "06-google-drive-custody-proof.md",
  "07-redaction-and-download-safety-proof.md",
  "08-durable-state-proof.md",
  "09-beta-packet.md",
  "10-final-qa-summary.md",
  "11-friday-readiness-report.md",
  "12-safe-30-40h-ui-run.md"
];

function read(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    failures.push(`missing required file: ${relativePath}`);
    return "";
  }
  return fs.readFileSync(fullPath, "utf8");
}

function requireText(relativePath, text, label = text) {
  const source = read(relativePath);
  if (source && !source.includes(text)) failures.push(`${relativePath} missing ${label}`);
}

function requireNoText(relativePath, text, label = text) {
  const source = read(relativePath);
  if (source.includes(text)) failures.push(`${relativePath} must not contain stale/disallowed text: ${label}`);
}

function requireNoActiveOldLocalPorts(relativePath) {
  const source = read(relativePath);
  if (!source) return;
  const lines = source.split(/\r?\n/);
  let historicalContext = false;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (/historical|pre-June-15|superseded/i.test(line)) historicalContext = true;
    if (/^#{1,6}\s+/.test(line) && !/historical|pre-June-15|superseded/i.test(line)) historicalContext = false;
    if (!historicalContext && /localhost:(4868|4876|4878|4880)|127\.0\.0\.1:<port>/.test(line)) {
      failures.push(`${relativePath}:${index + 1} contains active stale local proof port; use BASE_URL=http://localhost:4871 or mark as historical`);
    }
  }
}

for (const file of requiredDocs) read(path.join(evidenceDir, file));
read("docs/runs/daily-checkpoint-2026-06-15.md");
const browserQaSource = read("docs/screenshots/qa/browser-qa-report.json");
read(path.join(evidenceDir, "screenshots", "README.md"));

requireText(path.join(evidenceDir, "02-local-baseline-checks.md"), "PASS, 6 files / 78 tests", "current 78-test proof");
requireText(path.join(evidenceDir, "02-local-baseline-checks.md"), `Latest protected rerun: \`${latestLocalProofStamp}\``, "latest protected rerun stamp");
requireText(path.join(evidenceDir, "02-local-baseline-checks.md"), "public-env-guard-test", "public env guard self-test proof");
requireText(path.join(evidenceDir, "02-local-baseline-checks.md"), "BASE_URL=http://localhost:4871 make portal-api-smoke");
requireText(path.join(evidenceDir, "02-local-baseline-checks.md"), "BASE_URL=http://localhost:4871 make portal-download-ticket-smoke");
requireText(path.join(evidenceDir, "02-local-baseline-checks.md"), "make hosted-smoke-mutation-guard");
requireText(path.join(evidenceDir, "02-local-baseline-checks.md"), "EXPECTED FAIL-CLOSED");
requireText(path.join(evidenceDir, "02-local-baseline-checks.md"), "Current heavy rerun status: blocked by `safe-lane-headroom-guard`", "local baseline current heavy rerun headroom block");
requireText(path.join(evidenceDir, "03-hosted-access-proof.md"), "make hosted-readonly-probe-guard");
requireText(path.join(evidenceDir, "03-hosted-access-proof.md"), "make hosted-smoke-mutation-guard");
requireText(path.join(evidenceDir, "03-hosted-access-proof.md"), "hosted mutating smokes intentionally not run");
requireText(path.join(evidenceDir, "07-redaction-and-download-safety-proof.md"), "reviewer-query-role-not-trusted");
requireText(path.join(evidenceDir, "07-redaction-and-download-safety-proof.md"), `Latest required rerun: \`${latestLocalProofStamp}\``, "latest redaction/download proof stamp");
requireText(path.join(evidenceDir, "07-redaction-and-download-safety-proof.md"), "x-tjc-beta-session-verified");
requireText(path.join(evidenceDir, "07-redaction-and-download-safety-proof.md"), "api-identity-guard-test", "API identity guard self-test proof");
requireText(path.join(evidenceDir, "07-redaction-and-download-safety-proof.md"), "api-payload-guard-test", "API payload guard self-test proof");
requireText(path.join(evidenceDir, "07-redaction-and-download-safety-proof.md"), "private-source-guard-test", "Private source guard self-test proof");
requireText(path.join(evidenceDir, "07-redaction-and-download-safety-proof.md"), "fake-hosted fail-closed dry gate");
requireText(path.join(evidenceDir, "07-redaction-and-download-safety-proof.md"), 'searchParams.get("role")', "route-level query role guard evidence");
requireText(path.join(evidenceDir, "10-final-qa-summary.md"), "make hosted-readonly-probe-guard");
requireText(path.join(evidenceDir, "10-final-qa-summary.md"), "make hosted-smoke-mutation-guard");
requireText(path.join(evidenceDir, "10-final-qa-summary.md"), "make evidence-packet-guard-test", "final QA evidence packet guard self-test row");
requireText(path.join(evidenceDir, "10-final-qa-summary.md"), `Latest required local rerun: \`${latestLocalProofStamp}\``, "latest final QA local rerun stamp");
requireText(path.join(evidenceDir, "10-final-qa-summary.md"), `Latest required smoke rerun: \`${latestLocalProofStamp}\``, "latest final QA smoke rerun stamp");
requireText(path.join(evidenceDir, "10-final-qa-summary.md"), "future `make frontend-dev`, `npm --prefix frontend run dev`, `npm --prefix frontend run build`, `npm --prefix frontend run start`, `frontend-check`, ResourceSpace bootstrap/docker targets, import/media/backup Make targets, local runtime smoke Make targets, and `portal-browser-qa` now fail closed", "final QA current heavy rerun headroom block");
requireText(path.join(evidenceDir, "10-final-qa-summary.md"), "SAFE_LANE_HEADROOM_OVERRIDE_REASON", "final QA headroom override reason boundary");
requireText(path.join(evidenceDir, "10-final-qa-summary.md"), "Overall beta posture remains NO-GO");
requireText(path.join(evidenceDir, "09-beta-packet.md"), "Team Beta human signoff record is current NO-GO after June 15 P0", "beta packet current NO-GO signoff proof");
requireText(path.join(evidenceDir, "08-durable-state-proof.md"), "Backup/restore proof was not run", "durable proof backup blocker");
requireText(path.join(evidenceDir, "08-durable-state-proof.md"), "no `.env` and no `.runtime/resourcespace-config.php`", "durable proof missing env/config");
requireText(path.join(evidenceDir, "08-durable-state-proof.md"), "storage-honesty-guard-test", "storage honesty guard self-test proof");
requireText(path.join(evidenceDir, "08-durable-state-proof.md"), "Warning classification:", "durable proof launch-readiness warning classification");
requireText(path.join(evidenceDir, "08-durable-state-proof.md"), "| `.env missing` | blocker for hosted/durable beta proof |", "durable proof .env warning blocker classification");
requireText(path.join(evidenceDir, "08-durable-state-proof.md"), "| `.runtime/backups missing` | blocker for backup/restore proof |", "durable proof backups warning blocker classification");
requireText(path.join(evidenceDir, "08-durable-state-proof.md"), "| `local free disk below 10 GiB` | operational follow-up for long local lane |", "durable proof local disk warning classification");
requireText(path.join(evidenceDir, "08-durable-state-proof.md"), "`make safe-lane-disk-report` is report-only and deletes nothing", "durable proof safe disk report boundary");
requireText(path.join(evidenceDir, "08-durable-state-proof.md"), "safe isolated cleanup alone is not enough to restore the default 10 GiB headroom", "durable proof safe cleanup insufficiency");
requireText(path.join(evidenceDir, "08-durable-state-proof.md"), "`make safe-lane-disk-report-test` proves shared-checkout refusal", "durable proof safe disk report self-test boundary");
requireText(path.join(evidenceDir, "08-durable-state-proof.md"), "`make safe-lane-headroom-guard-test` proves heavy local dev/build/start/browser/bootstrap/docker paths fail closed", "durable proof safe headroom guard self-test boundary");
requireText(path.join(evidenceDir, "08-durable-state-proof.md"), "SAFE_LANE_HEADROOM_OVERRIDE_REASON", "durable proof headroom override reason boundary");
requireText(path.join(evidenceDir, "08-durable-state-proof.md"), "Creating fake env/config files would weaken the proof", "durable proof no fake env/config warning");
requireText(path.join(evidenceDir, "11-friday-readiness-report.md"), "Decision recommendation: NO-GO");
requireText(path.join(evidenceDir, "11-friday-readiness-report.md"), `Latest local rerun: \`${latestLocalProofStamp}\``, "latest readiness report local rerun stamp");
requireText(path.join(evidenceDir, "11-friday-readiness-report.md"), "Prior tiny-beta signoff superseded", "readiness report superseded signoff blocker");
requireText(path.join(evidenceDir, "11-friday-readiness-report.md"), "Backup/restore proof missing", "readiness report backup blocker");
requireText(path.join(evidenceDir, "11-friday-readiness-report.md"), "Current heavy rerun status: blocked by `safe-lane-headroom-guard`", "readiness report current heavy rerun headroom block");
requireText(path.join(evidenceDir, "11-friday-readiness-report.md"), "SAFE_LANE_HEADROOM_OVERRIDE_REASON", "readiness report headroom override reason boundary");
requireText(path.join(evidenceDir, "11-friday-readiness-report.md"), "make evidence-packet-guard-test", "readiness report evidence packet guard self-test row");
requireText(path.join(evidenceDir, "11-friday-readiness-report.md"), "NO-GO\n\nLocal proof is useful");
requireText(path.join(evidenceDir, "12-safe-30-40h-ui-run.md"), "Audit decision: do not mark the overall goal complete");
requireText(path.join(evidenceDir, "12-safe-30-40h-ui-run.md"), `Latest protected rerun: \`${latestLocalProofStamp}\``, "latest safe ledger protected rerun stamp");
requireText(path.join(evidenceDir, "12-safe-30-40h-ui-run.md"), "hosted-readonly-probe-guard");
requireText(path.join(evidenceDir, "12-safe-30-40h-ui-run.md"), "hosted-readonly-probe-guard-test");
requireText(path.join(evidenceDir, "12-safe-30-40h-ui-run.md"), "hosted-smoke-mutation-guard");
requireText(path.join(evidenceDir, "12-safe-30-40h-ui-run.md"), "hosted-smoke-mutation-guard-test");
requireText(path.join(evidenceDir, "12-safe-30-40h-ui-run.md"), "safe-lane-guard");
requireText(path.join(evidenceDir, "12-safe-30-40h-ui-run.md"), "safe-lane-guard-test");
requireText(path.join(evidenceDir, "12-safe-30-40h-ui-run.md"), "runtime-isolation-guard");
requireText(path.join(evidenceDir, "12-safe-30-40h-ui-run.md"), "runtime-isolation-guard-test");
requireText(path.join(evidenceDir, "12-safe-30-40h-ui-run.md"), "safe-lane-disk-report");
requireText(path.join(evidenceDir, "12-safe-30-40h-ui-run.md"), "safe-lane-disk-report-test");
requireText(path.join(evidenceDir, "12-safe-30-40h-ui-run.md"), "safe-lane-headroom-guard");
requireText(path.join(evidenceDir, "12-safe-30-40h-ui-run.md"), "safe-lane-headroom-guard-test");
requireText(path.join(evidenceDir, "12-safe-30-40h-ui-run.md"), "long-local-dev-build-start-browser-reruns", "safe ledger low-disk block scope");
requireText(path.join(evidenceDir, "12-safe-30-40h-ui-run.md"), "heavy dev/build/start/browser/smoke/bootstrap/docker/import/media/backup reruns", "safe ledger low-disk import/media/backup block scope");
requireText(path.join(evidenceDir, "12-safe-30-40h-ui-run.md"), "dev-server-build-guard");
requireText(path.join(evidenceDir, "12-safe-30-40h-ui-run.md"), "dev-server-build-guard-test");
requireText(path.join(evidenceDir, "12-safe-30-40h-ui-run.md"), "ui-maturity-guard");
requireText(path.join(evidenceDir, "12-safe-30-40h-ui-run.md"), "ui-maturity-guard-test");
requireText(path.join(evidenceDir, "12-safe-30-40h-ui-run.md"), "completion-audit-guard");
requireText(path.join(evidenceDir, "12-safe-30-40h-ui-run.md"), "completion-audit-guard-test");
requireText(path.join(evidenceDir, "12-safe-30-40h-ui-run.md"), "open-blockers-guard-test");
requireText(path.join(evidenceDir, "12-safe-30-40h-ui-run.md"), "evidence-packet-guard-test");
requireText(path.join(evidenceDir, "12-safe-30-40h-ui-run.md"), "external-proof-contract-guard");
requireText(path.join(evidenceDir, "12-safe-30-40h-ui-run.md"), "external-proof-contract-guard-test");
requireText(path.join(evidenceDir, "12-safe-30-40h-ui-run.md"), "route-level `searchParams.get(\"role\")` reads", "safe ledger query role guard hardening");
requireText(path.join(evidenceDir, "12-safe-30-40h-ui-run.md"), "Current heavy rerun status: blocked by `safe-lane-headroom-guard`", "safe ledger current heavy rerun headroom block");
requireText(path.join(evidenceDir, "12-safe-30-40h-ui-run.md"), "SAFE_LANE_HEADROOM_OVERRIDE_REASON", "safe ledger headroom override reason boundary");
requireText(path.join(evidenceDir, "12-safe-30-40h-ui-run.md"), "safe isolated cleanup alone is not enough to restore default headroom", "safe ledger safe cleanup insufficiency");
requireText("docs/runs/daily-checkpoint-2026-06-15.md", "Do not recommend GO");
requireText("docs/runs/daily-checkpoint-2026-06-15.md", "Current heavy rerun status: blocked by `safe-lane-headroom-guard`", "daily current heavy rerun headroom block");
requireText("docs/runs/daily-checkpoint-2026-06-15.md", "long-local-dev-build-start-browser-reruns", "daily low-disk block scope");
requireText("docs/runs/daily-checkpoint-2026-06-15.md", "heavy dev/build/start/browser/smoke/bootstrap/docker/import/media/backup work", "daily low-disk import/media/backup block scope");
requireText("docs/runs/daily-checkpoint-2026-06-15.md", "SAFE_LANE_HEADROOM_OVERRIDE_REASON", "daily headroom override reason boundary");
requireText("docs/runs/daily-checkpoint-2026-06-15.md", "safe isolated cleanup alone is not enough to restore default 10 GiB headroom", "daily safe cleanup insufficiency");
requireText("docs/runs/daily-checkpoint-2026-06-15.md", `Latest protected rerun: \`${latestLocalProofStamp}\``, "latest daily protected rerun stamp");
requireText("docs/runs/daily-checkpoint-2026-06-15.md", `Latest required guard/typecheck/test/build/API/download-ticket/runtime smoke rerun passed at \`${latestLocalProofStamp}\``, "latest daily checkpoint local proof stamp");
requireText("docs/runs/daily-checkpoint-2026-06-15.md", "Source checkout artifact inventory");
requireText("docs/runs/daily-checkpoint-2026-06-15.md", "old June 11 six-person GO is superseded", "daily checkpoint superseded signoff note");
requireText("docs/runs/daily-checkpoint-2026-06-15.md", "Backup/restore proof", "daily checkpoint backup blocker");
requireText("docs/runs/daily-checkpoint-2026-06-15.md", "public-env-guard-test", "daily checkpoint public env guard self-test");
requireText("docs/runs/daily-checkpoint-2026-06-15.md", "api-identity-guard-test", "daily checkpoint API identity guard self-test");
requireText("docs/runs/daily-checkpoint-2026-06-15.md", "api-payload-guard-test", "daily checkpoint API payload guard self-test");
requireText("docs/runs/daily-checkpoint-2026-06-15.md", "private-source-guard-test", "daily checkpoint private source guard self-test");
requireText("docs/runs/daily-checkpoint-2026-06-15.md", "git-hygiene-guard-test", "daily checkpoint git hygiene guard self-test");
requireText("docs/runs/daily-checkpoint-2026-06-15.md", "storage-honesty-guard-test", "daily checkpoint storage honesty guard self-test");
requireText("docs/runs/daily-checkpoint-2026-06-15.md", "open-blockers-guard-test", "daily checkpoint open blockers self-test");
requireText("docs/runs/daily-checkpoint-2026-06-15.md", "ui-maturity-guard", "daily checkpoint UI maturity guard");
requireText("docs/runs/daily-checkpoint-2026-06-15.md", "ui-maturity-guard-test", "daily checkpoint UI maturity guard self-test");
requireText("docs/runs/daily-checkpoint-2026-06-15.md", "completion-audit-guard", "daily checkpoint completion audit guard");
requireText("docs/runs/daily-checkpoint-2026-06-15.md", "completion-audit-guard-test", "daily checkpoint completion audit guard self-test");
requireText("docs/runs/daily-checkpoint-2026-06-15.md", "safe-lane-guard-test", "daily checkpoint safe lane guard self-test");
requireText("docs/runs/daily-checkpoint-2026-06-15.md", "runtime-isolation-guard-test", "daily checkpoint runtime isolation guard self-test");
requireText("docs/runs/daily-checkpoint-2026-06-15.md", "dev-server-build-guard-test", "daily checkpoint dev server build guard self-test");
requireText("docs/runs/daily-checkpoint-2026-06-15.md", "hosted-readonly-probe-guard-test", "daily checkpoint hosted read-only probe guard self-test");
requireText("docs/runs/daily-checkpoint-2026-06-15.md", "hosted-smoke-mutation-guard-test", "daily checkpoint hosted smoke mutation guard self-test");
requireText("docs/runs/daily-checkpoint-2026-06-15.md", "evidence-packet-guard-test", "daily checkpoint evidence packet guard self-test");
requireText("docs/runs/daily-checkpoint-2026-06-15.md", "external-proof-contract-guard-test", "daily checkpoint external proof contract guard self-test");
requireNoText(path.join(evidenceDir, "11-friday-readiness-report.md"), "Decision recommendation: GO", "false GO recommendation");

function pngDimensions(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) return null;
  const buffer = fs.readFileSync(fullPath);
  if (buffer.length < 24 || buffer.toString("ascii", 1, 4) !== "PNG") return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

if (browserQaSource) {
  try {
    const report = JSON.parse(browserQaSource);
    if (report.checkedAt !== "2026-06-15T13:27:23.819Z") failures.push("browser QA report checkedAt changed without evidence doc update");
    if (report.pages !== 17) failures.push(`browser QA report pages expected 17 got ${report.pages}`);
    if ((report.screenshots || []).length !== 23) failures.push(`browser QA report screenshots expected 23 got ${(report.screenshots || []).length}`);
    for (const key of ["failures", "consoleErrors", "networkFailures", "warnings"]) {
      if ((report[key] || []).length !== 0) failures.push(`browser QA report has ${key}: ${(report[key] || []).length}`);
    }
    for (const width of [1440, 1280, 1024, 768, 390, 320]) {
      if (!(report.viewports || []).includes(width)) failures.push(`browser QA report missing viewport ${width}`);
    }
    for (const name of report.screenshots || []) {
      const relativePath = path.join("docs", "screenshots", name);
      const dimensions = pngDimensions(relativePath);
      if (!dimensions) {
        failures.push(`browser QA screenshot missing or invalid PNG: ${relativePath}`);
      } else if (dimensions.width < 300 || dimensions.height < 600) {
        failures.push(`browser QA screenshot too small: ${relativePath} ${dimensions.width}x${dimensions.height}`);
      }
    }
    requireText(path.join(evidenceDir, "screenshots", "README.md"), report.checkedAt, "screenshot README browser QA timestamp");
  } catch (error) {
    failures.push(`docs/screenshots/qa/browser-qa-report.json must be valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

for (const currentDoc of [
  "docs/beta-readiness-command-center.md",
  "docs/team-beta-qa-matrix.md",
  "docs/team-beta-demo-script.md",
  "docs/team-beta-go-no-go-packet.md",
  "docs/team-beta-internal-test-packet.md",
  "docs/teammate-beta-invite-pack.md",
  "docs/teammate-test-guide.md"
]) {
  requireText(currentDoc, "June 15", `${currentDoc} June 15 safety override`);
  requireText(currentDoc, "NO-GO", `${currentDoc} current NO-GO marker`);
  requireText(currentDoc, "portal-hosted-readonly-probe", `${currentDoc} hosted read-only probe path`);
  requireText(currentDoc, "PORTAL_HOSTED_SMOKE_ALLOW_MUTATION", `${currentDoc} hosted mutation approval flag`);
}
requireText("docs/team-beta-signoff-record.md", "Decision: NO-GO", "current signoff NO-GO");
requireText("docs/team-beta-signoff-record.md", "Current status: **NO-GO for teammate invite batch until June 15 evidence blockers close.**", "current signoff status NO-GO");
requireText("docs/team-beta-signoff-record.md", "Do not fill as GO until June 15 evidence blockers close", "current signoff no premature GO instruction");
requireNoText("docs/team-beta-signoff-record.md", "Fill only when ready to send", "current signoff stale ready-to-send wording");
requireText("Makefile", "team-beta-signoff-guard-test:", "Team Beta signoff guard Make target");
requireText("Makefile", "node scripts/team-beta-signoff-guard-test.mjs", "Team Beta signoff guard self-test Make command");
requireText("docs/team-beta-go-no-go-packet.md", "Tiny teammate invite batch | NO-GO until human gates close", "current packet invite NO-GO");
requireText("docs/team-beta-go-no-go-packet.md", "Current final call: **NO-GO for teammate invite batch", "current packet final NO-GO");
requireText("docs/team-beta-go-no-go-packet.md", "Owner-led internal dry run | PASS local only", "current packet dry run PASS local");
requireText("docs/team-beta-go-no-go-packet.md", "`warnings=3`", "current packet launch-readiness warning count");
requireText("docs/team-beta-go-no-go-packet.md", "`local free disk below 10 GiB`", "current packet launch-readiness disk warning");
requireText("docs/team-beta-go-no-go-packet.md", "Do not convert this block to GO", "current packet no premature GO instruction");
requireText("docs/team-beta-go-no-go-packet.md", "BASE_URL=http://localhost:4871 make portal-feedback-smoke", "current packet actual feedback smoke BASE_URL");
requireText("docs/team-beta-go-no-go-packet.md", "BASE_URL=http://localhost:4871 make portal-beta-rehearsal", "current packet actual beta rehearsal BASE_URL");
requireText("docs/team-beta-go-no-go-packet.md", "BASE_URL=http://localhost:4871 make portal-browser-qa", "current packet actual browser QA BASE_URL");
requireNoText("docs/team-beta-go-no-go-packet.md", "Fill this block before sending teammate invites", "current packet stale send-ready signoff wording");
requireNoText("docs/team-beta-go-no-go-packet.md", "warnings=2", "current packet stale warning count");
requireText("docs/team-beta-internal-test-packet.md", "Packet status: draft / blocked after June 15 P0.", "internal packet draft blocked");
requireText("docs/team-beta-internal-test-packet.md", "Invite status: NO-GO", "internal packet invite NO-GO");
requireText("docs/teammate-beta-invite-pack.md", "Current status: **NO-GO for sending teammate invites.**", "invite pack current NO-GO");
requireText("docs/teammate-beta-invite-pack.md", "Do not send hosted `?role=` links", "invite pack query-role warning");
requireText("docs/teammate-test-guide.md", "Current status: **NO-GO for sending teammate invites.**", "teammate test guide current NO-GO");
requireText("docs/teammate-test-guide.md", "Do not send hosted `?role=` links", "teammate test guide query-role warning");
requireText("docs/teammate-test-guide.md", "hosted invite links are not sent while current NO-GO blockers remain open", "teammate test guide no hosted invite links");
requireNoText("docs/teammate-test-guide.md", "invite links are beta affordances", "teammate test guide stale invite link affordance");
requireText("docs/team-beta-internal-test-packet.md", "Role entry paths after trusted beta session/SSO", "internal packet trusted role entry paths");
requireText("docs/teammate-beta-invite-pack.md", "Role Entry Paths", "invite pack trusted role entry paths");
requireText("docs/team-beta-hosted-access-proof.md", "Query role URLs are not used as hosted authority.", "hosted access proof no query-role authority");
requireText("docs/team-beta-hosted-access-proof.md", "Current status: **NO-GO for sharing teammate invite links.**", "hosted access proof share NO-GO");
requireText("docs/team-beta-hosted-access-proof.md", "Current production SSO proof means Cloudflare Access assertion/email plus mapped groups", "hosted access proof Cloudflare production SSO boundary");
requireNoText("docs/team-beta-hosted-access-proof.md", "Only share the stable unlisted beta URL", "hosted access proof stale share-ready URL wording");
requireText("docs/team-beta-feedback-incident-runbook.md", "<trusted-beta-or-sso-admin-session>", "feedback export trusted session placeholder");
requireNoText("docs/team-beta-qa-matrix.md", "Older `?role=` links remain", "QA matrix stale query-role shortcut wording");
requireNoText("docs/resourcespace-integration.md", "Local query/form roles remain beta fallback only", "ResourceSpace doc stale query/form fallback wording");
requireText("docs/resourcespace-integration.md", "generic `x-tjc-role`, `x-auth-request-email`, or `x-auth-request-groups`", "ResourceSpace doc production generic-header warning");
requireText("docs/resourcespace-integration.md", "Cloudflare Access assertion/email headers", "ResourceSpace doc Cloudflare Access production proof");
for (const context of localRuntimeSmokeHeadroomContexts) {
  requireText("Makefile", `SAFE_LANE_HEADROOM_CONTEXT=${context}`, `Makefile ${context} headroom guard`);
}
requireText("Makefile", "SAFE_LANE_HEADROOM_CONTEXT=docker-up", "Makefile docker-up headroom guard");
requireText("Makefile", "SAFE_LANE_HEADROOM_CONTEXT=resourcespace-smoke", "Makefile ResourceSpace smoke headroom guard");
requireText("Makefile", "SAFE_LANE_HEADROOM_CONTEXT=frontend-check", "Makefile frontend-check headroom guard");
requireText("Makefile", "SAFE_LANE_HEADROOM_CONTEXT=frontend-dev", "Makefile frontend-dev headroom guard");
requireText("Makefile", "SAFE_LANE_HEADROOM_CONTEXT=portal-browser-qa", "Makefile portal-browser-qa headroom guard");
requireText("frontend/package.json", '"predev": "SAFE_LANE_HEADROOM_CONTEXT=dev-server node ../scripts/safe-lane-headroom-guard.mjs"', "frontend package predev headroom guard");
requireText("frontend/package.json", '"prebuild": "node ../scripts/dev-server-build-guard.mjs && SAFE_LANE_HEADROOM_CONTEXT=production-build node ../scripts/safe-lane-headroom-guard.mjs"', "frontend package prebuild headroom guard");
requireText("frontend/package.json", '"prestart": "SAFE_LANE_HEADROOM_CONTEXT=next-start node ../scripts/safe-lane-headroom-guard.mjs"', "frontend package prestart headroom guard");
for (const context of riskyMakeHeadroomContexts) {
  requireText("Makefile", `SAFE_LANE_HEADROOM_CONTEXT=${context}`, `Makefile ${context} headroom guard`);
}
requireText("scripts/frontend-check.sh", 'SAFE_LANE_HEADROOM_CONTEXT="${SAFE_LANE_HEADROOM_CONTEXT:-frontend-check}"', "frontend-check script headroom guard");
requireText("scripts/bootstrap-official-docker.sh", 'SAFE_LANE_HEADROOM_CONTEXT="${SAFE_LANE_HEADROOM_CONTEXT:-resourcespace-bootstrap}"', "ResourceSpace bootstrap headroom guard");
for (const guard of directScriptHeadroomGuards) {
  requireText(guard.path, `SAFE_LANE_HEADROOM_CONTEXT="\${SAFE_LANE_HEADROOM_CONTEXT:-${guard.context}}"`, `${guard.path} direct headroom guard`);
}
for (const guard of pythonHeadroomGuards) {
  requireText(guard.path, "run_headroom_guard", `${guard.path} Python headroom helper`);
  requireText(guard.path, `run_headroom_guard("${guard.context}")`, `${guard.path} Python ${guard.context} headroom call`);
}
for (const testPath of [
  "scripts/api-identity-guard-test.mjs",
  "scripts/api-payload-guard-test.mjs",
  "scripts/private-source-guard-test.mjs",
  "scripts/public-env-guard-test.mjs",
  "scripts/git-hygiene-guard-test.mjs",
  "scripts/runtime-isolation-guard-test.mjs",
  "scripts/hosted-readonly-probe-guard-test.mjs",
  "scripts/hosted-smoke-mutation-guard-test.mjs",
  "scripts/safe-lane-guard-test.mjs",
  "scripts/safe-lane-headroom-guard-test.mjs",
  "scripts/safe-lane-disk-report-test.mjs",
  "scripts/evidence-packet-guard-test.mjs",
  "scripts/completion-audit-guard-test.mjs",
  "scripts/external-proof-contract-guard-test.mjs",
  "scripts/ui-maturity-guard-test.mjs",
  "scripts/open-blockers-guard-test.mjs",
  "scripts/team-beta-signoff-guard-test.mjs",
  "scripts/storage-honesty-guard-test.mjs"
]) {
  const source = read(testPath);
  if (source.includes("mkdtempSync") && !source.includes("fs.rmSync")) {
    failures.push(`${testPath} creates temp fixtures without cleanup`);
  }
}
requireText("docs/team-beta-qa-matrix.md", "Production SSO role proof now requires Cloudflare Access assertion/email evidence", "QA matrix Cloudflare production SSO boundary");
requireText("docs/teammate-beta-invite-pack.md", "Current production SSO proof requires Cloudflare Access assertion/email plus mapped groups", "invite pack Cloudflare production SSO boundary");
requireText("docs/teammate-test-guide.md", "Current production SSO proof requires Cloudflare Access assertion/email plus mapped groups", "test guide Cloudflare production SSO boundary");
requireText("tasks/prd-enterprise-tjc-media-library.md", "Cloudflare Access is the current production-supported trusted-header path", "PRD production-supported SSO path");
requireNoText("scripts/portal-hosted-smoke.sh", "query/local trusted-header fallback", "hosted smoke stale query/local fallback wording");
for (const currentDoc of [
  "docs/beta-readiness-command-center.md",
  "docs/resourcespace-integration.md"
]) {
  requireNoText(
    currentDoc,
    "TJC_STOCK_MEDIA_ROOT=/Users/halim4pro/Desktop/MVP/tjc-stock-media ",
    `${currentDoc} must not point local runtime root at shared checkout`
  );
}
for (const currentDoc of [
  "docs/beta-readiness-command-center.md",
  "docs/resourcespace-integration.md",
  "docs/team-beta-qa-matrix.md",
  "docs/team-beta-feedback-incident-runbook.md",
  "docs/team-beta-go-no-go-packet.md",
  "tasks/prd-enterprise-tjc-media-library.md"
]) {
  requireNoActiveOldLocalPorts(currentDoc);
}
for (const script of [
  "scripts/portal-api-smoke.sh",
  "scripts/portal-browser-qa.mjs",
  "scripts/portal-download-ticket-smoke.sh",
  "scripts/portal-sso-smoke.sh",
  "scripts/portal-delivery-smoke.sh",
  "scripts/portal-writeback-guard-smoke.sh",
  "scripts/portal-package-smoke.sh",
  "scripts/portal-saved-search-smoke.sh",
  "scripts/portal-feedback-smoke.sh",
  "scripts/portal-beta-rehearsal.sh",
  "scripts/portal-usage-smoke.sh"
]) {
  requireNoText(script, "localhost:4868", `${script} stale default port 4868`);
  requireNoText(script, "localhost:3008", `${script} stale default port 3008`);
}
for (const currentDoc of [
  "docs/beta-readiness-command-center.md",
  "docs/resourcespace-integration.md",
  "docs/team-beta-feedback-incident-runbook.md",
  "docs/team-beta-hosted-access-proof.md",
  "tasks/prd-enterprise-tjc-media-library.md"
]) {
  requireNoText(
    currentDoc,
    "\nBASE_URL=https://tjc-stock-media.vercel.app make portal-hosted-smoke\n",
    `${currentDoc} must not show bare mutating hosted smoke command`
  );
  requireNoText(
    currentDoc,
    "`BASE_URL=https://tjc-stock-media.vercel.app make portal-hosted-smoke`",
    `${currentDoc} must not show inline bare mutating hosted smoke command`
  );
}
requireText("docs/team-beta-enterprise-gap-map.md", "June 15 safety update", "enterprise gap map June 15 override");
requireText("docs/team-beta-enterprise-gap-map.md", "Final call: **NO-GO for teammate invite/send under the June 15 packet.**", "enterprise gap map current NO-GO final call");
for (const stale of ["Final call: Go", "Team Beta ready"]) {
  requireNoText("docs/team-beta-enterprise-gap-map.md", stale, `enterprise gap map stale readiness wording ${stale}`);
}
requireText("docs/teammate-real-dam-beta-packet-2026-06-14.md", "June 15 safety update", "real DAM packet June 15 override");
requireText("docs/teammate-real-dam-beta-packet-2026-06-14.md", "NO-GO for sending teammate invites", "real DAM packet current NO-GO");
requireNoText("docs/teammate-real-dam-beta-packet-2026-06-14.md", "ready as a human-facing draft", "real DAM packet stale ready draft wording");

const staleDecisionText = [
  "Closed for six-person tiny beta",
  "GO for six named testers",
  "GO for first 24 hours after invite",
  "GO for preview-only tiny beta",
  "GO for internal beta ops",
  "GO for beta dry run",
  "GO for local dry run",
  "local code/test gate is GO",
  "final signoff is GO",
  "stable hosted alias has smoke evidence",
  "Ready for six named testers",
  "invite gate open",
  "?role=Reviewer",
  "?role=DAM%20Admin",
  "Current final call: **GO",
  "Current status: **GO"
];

for (const stale of staleDecisionText) {
  requireNoText("docs/beta-readiness-command-center.md", stale, `stale command center GO marker ${stale}`);
  requireNoText("docs/team-beta-qa-matrix.md", stale, `stale QA matrix GO marker ${stale}`);
  requireNoText("docs/team-beta-go-no-go-packet.md", stale, `stale packet GO marker ${stale}`);
  requireNoText("docs/team-beta-signoff-record.md", stale, `stale signoff GO marker ${stale}`);
  requireNoText("docs/teammate-test-guide.md", stale, `stale teammate test guide GO/query marker ${stale}`);
}

for (const currentDoc of [
  "docs/teammate-beta-invite-pack.md",
  "docs/team-beta-internal-test-packet.md",
  "docs/team-beta-hosted-access-proof.md",
  "docs/team-beta-seed-media-signoff.md",
  "docs/team-beta-feedback-incident-runbook.md",
  "docs/team-beta-feedback-backlog-2026-06-13.md",
  "docs/team-beta-demo-strategy.md"
]) {
  for (const stale of ["?role=Viewer", "?role=Reviewer", "?role=DAM%20Admin"]) {
    requireNoText(currentDoc, stale, `${currentDoc} stale hosted query-role URL ${stale}`);
  }
  for (const stale of ["assigned role link", "starting role link", "beta role links"]) {
    requireNoText(currentDoc, stale, `${currentDoc} stale role-link wording ${stale}`);
  }
}

for (const blocker of [
  "Canonical repo/deployment confirmation",
  "Hosted access/protection proof",
  "Vercel env confirmation",
  "ResourceSpace scope",
  "Google Drive custody",
  "Durable hosted state",
  "Tester list/roles"
]) {
  requireText(path.join(evidenceDir, "11-friday-readiness-report.md"), blocker, `blocker row ${blocker}`);
}

for (const blockedDoc of [
  "01-canonical-repo-deploy.md",
  "04-resourcespace-read-proof.md",
  "05-real-vs-demo-proof.md",
  "06-google-drive-custody-proof.md",
  "08-durable-state-proof.md",
  "09-beta-packet.md"
]) {
  requireText(path.join(evidenceDir, blockedDoc), "BLOCKED", `${blockedDoc} explicit BLOCKED status`);
}

const hostedSummaryPath = path.join(evidenceDir, "hosted-readonly-probes", "summary.json");
const hostedSummarySource = read(hostedSummaryPath);
if (hostedSummarySource) {
  try {
    const summary = JSON.parse(hostedSummarySource);
    if (!summary.note?.includes("No POST")) failures.push(`${hostedSummaryPath} must record no-POST contract`);
    if (!summary.checkedAt || typeof summary.checkedAt !== "string") failures.push(`${hostedSummaryPath} must include checkedAt timestamp`);
    if (!Array.isArray(summary.results) || summary.results.length < 6) failures.push(`${hostedSummaryPath} must include hosted probe result array`);
    const ids = new Set((summary.results || []).map((result) => result.id));
    for (const id of ["root-head", "session-get", "review-query-role", "admin-query-role", "asset-admin-query-role", "blocked-download-viewer"]) {
      if (!ids.has(id)) failures.push(`${hostedSummaryPath} missing probe result ${id}`);
    }
    for (const result of summary.results || []) {
      if (!["GET", "HEAD"].includes(result.method)) failures.push(`${hostedSummaryPath} contains non-read-only method for ${result.id}`);
      if (result.forbiddenPatternFound) failures.push(`${hostedSummaryPath} forbidden pattern found for ${result.id}`);
      if (result.privilegedShapeFound) failures.push(`${hostedSummaryPath} privileged shape found for ${result.id}`);
      if (typeof result.privilegedShapeFound !== "boolean") failures.push(`${hostedSummaryPath} must include privilegedShapeFound boolean for ${result.id}`);
      if (result.status === 0) failures.push(`${hostedSummaryPath} request failed for ${result.id}`);
    }
    if (summary.checkedAt) {
      for (const doc of [
        path.join(evidenceDir, "03-hosted-access-proof.md"),
        path.join(evidenceDir, "10-final-qa-summary.md"),
        path.join(evidenceDir, "11-friday-readiness-report.md"),
        path.join(evidenceDir, "12-safe-30-40h-ui-run.md"),
        "docs/runs/daily-checkpoint-2026-06-15.md"
      ]) {
        requireText(doc, summary.checkedAt, `${doc} latest hosted read-only summary timestamp`);
      }
    }
  } catch (error) {
    failures.push(`${hostedSummaryPath} must be valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

const blockerMatrixPath = path.join(evidenceDir, "open-blockers.json");
const blockerMatrixSource = read(blockerMatrixPath);
if (blockerMatrixSource) {
  try {
    const matrix = JSON.parse(blockerMatrixSource);
    if (matrix.schema !== "tjc-stock-media-beta-open-blockers.v1") failures.push(`${blockerMatrixPath} has wrong schema`);
    if (matrix.decision !== "NO-GO") failures.push(`${blockerMatrixPath} decision must stay NO-GO`);
    if (matrix.checkedAt !== latestLocalProofStamp) failures.push(`${blockerMatrixPath} checkedAt must match latest protected proof timestamp`);
    if (matrix.latestLocalProtectedProofAt !== latestLocalProofStamp) failures.push(`${blockerMatrixPath} latestLocalProtectedProofAt must match latest protected proof timestamp`);
    if (matrix.latestLocalBrowserQaProofAt !== "2026-06-15T13:27:23.819Z") failures.push(`${blockerMatrixPath} latestLocalBrowserQaProofAt must match latest browser QA proof timestamp`);
    if (matrix.latestHostedReadOnlyProofAt !== "2026-06-15T11:52:56.617Z") failures.push(`${blockerMatrixPath} latestHostedReadOnlyProofAt must match latest hosted read-only proof timestamp`);
    if (matrix.worktree !== "/Users/halim4pro/Desktop/MVP/tjc-stock-media-safe-ui-beta-run") failures.push(`${blockerMatrixPath} worktree must be isolated safe lane path`);
    if (matrix.branch !== "codex/safe-ui-beta-proof-2026-06-15") failures.push(`${blockerMatrixPath} branch must be safe lane branch`);
    if (matrix.baseUrl !== "http://localhost:4871") failures.push(`${blockerMatrixPath} BASE_URL must be local isolated proof URL`);
    if (!Array.isArray(matrix.forbiddenSurfacesNotTouched)) failures.push(`${blockerMatrixPath} must list forbidden surfaces not touched`);
    for (const surface of ["Vercel prod env", "ResourceSpace prod data", "Google Drive originals", "live writeback", "tester invites", "public launch", "source media"]) {
      if (!(matrix.forbiddenSurfacesNotTouched || []).includes(surface)) failures.push(`${blockerMatrixPath} missing forbidden surface: ${surface}`);
    }
    const diskFollowUp = (matrix.localOperationalFollowUps || []).find((item) => item.id === "safe-lane-disk-headroom");
    if (!diskFollowUp) {
      failures.push(`${blockerMatrixPath} missing safe-lane-disk-headroom operational follow-up`);
    } else {
      if (diskFollowUp.status !== "follow-up") failures.push(`${blockerMatrixPath} safe-lane-disk-headroom must remain follow-up`);
      if (diskFollowUp.currentSignal !== "local free disk below 10 GiB") failures.push(`${blockerMatrixPath} safe-lane-disk-headroom current signal drifted`);
      if (!String(diskFollowUp.safeNextStep || "").includes("never clean shared checkout")) failures.push(`${blockerMatrixPath} safe-lane-disk-headroom missing shared-checkout cleanup boundary`);
      if (!String(diskFollowUp.safeNextStep || "").includes("evidence artifacts")) failures.push(`${blockerMatrixPath} safe-lane-disk-headroom missing evidence-artifact cleanup boundary`);
      if (!String(diskFollowUp.safeNextStep || "").includes("not enough for default 10 GiB headroom")) failures.push(`${blockerMatrixPath} safe-lane-disk-headroom missing cleanup-insufficiency boundary`);
      if (!String(diskFollowUp.safeNextStep || "").includes("SAFE_LANE_HEADROOM_OVERRIDE_REASON")) failures.push(`${blockerMatrixPath} safe-lane-disk-headroom missing override-reason boundary`);
      if (!(diskFollowUp.blocks || []).includes("long-local-dev-build-start-browser-reruns")) failures.push(`${blockerMatrixPath} safe-lane-disk-headroom missing dev/build/start/browser block scope`);
      if (!(diskFollowUp.blocks || []).includes("long-local-dev-build-start-browser-smoke-reruns")) failures.push(`${blockerMatrixPath} safe-lane-disk-headroom missing dev/build/start/browser/smoke block scope`);
      if (!(diskFollowUp.blocks || []).includes("long-local-dev-build-start-browser-smoke-bootstrap-docker-reruns")) failures.push(`${blockerMatrixPath} safe-lane-disk-headroom missing dev/build/start/browser/smoke/bootstrap/docker block scope`);
      if (!(diskFollowUp.blocks || []).includes("long-local-dev-build-start-browser-smoke-bootstrap-docker-import-media-backup-reruns")) failures.push(`${blockerMatrixPath} safe-lane-disk-headroom missing dev/build/start/browser/smoke/bootstrap/docker/import/media/backup block scope`);
    }
    const expectedBlockers = new Map([
      ["canonical-deployment", "blocked"],
      ["hosted-access-protection", "partial"],
      ["vercel-env-confirmation", "blocked"],
      ["resourcespace-scope", "blocked"],
      ["google-drive-custody", "blocked"],
      ["durable-hosted-state", "blocked"],
      ["tester-list-and-signoff", "blocked"]
    ]);
    if (!Array.isArray(matrix.blockers)) {
      failures.push(`${blockerMatrixPath} blockers must be an array`);
    } else {
      const byId = new Map(matrix.blockers.map((blocker) => [blocker.id, blocker]));
      for (const [id, status] of expectedBlockers) {
        const blocker = byId.get(id);
        if (!blocker) {
          failures.push(`${blockerMatrixPath} missing blocker ${id}`);
          continue;
        }
        if (blocker.status !== status) failures.push(`${blockerMatrixPath} blocker ${id} expected status ${status} got ${blocker.status}`);
        if (!String(blocker.owner || "").trim()) failures.push(`${blockerMatrixPath} blocker ${id} missing owner`);
        if (!String(blocker.requiredProof || "").trim()) failures.push(`${blockerMatrixPath} blocker ${id} missing requiredProof`);
        if (!String(blocker.safeNextStep || "").trim()) failures.push(`${blockerMatrixPath} blocker ${id} missing safeNextStep`);
        if (!String(blocker.evidenceDoc || "").startsWith(`${evidenceDir}/`)) failures.push(`${blockerMatrixPath} blocker ${id} evidenceDoc must point inside current evidence dir`);
        if (!Array.isArray(blocker.blocks) || blocker.blocks.length === 0) failures.push(`${blockerMatrixPath} blocker ${id} must declare blocked decision surfaces`);
      }
      for (const blocker of matrix.blockers) {
        if (!expectedBlockers.has(blocker.id)) failures.push(`${blockerMatrixPath} has unexpected blocker ${blocker.id}`);
        if (["resolved", "complete", "pass", "go"].includes(String(blocker.status || "").toLowerCase())) {
          failures.push(`${blockerMatrixPath} blocker ${blocker.id} must not claim resolved/pass/go while readiness is NO-GO`);
        }
      }
    }
    for (const doc of [
      path.join(evidenceDir, "11-friday-readiness-report.md"),
      path.join(evidenceDir, "12-safe-30-40h-ui-run.md"),
      "docs/runs/daily-checkpoint-2026-06-15.md"
    ]) {
      requireText(doc, "open-blockers.json", `${doc} open blocker matrix reference`);
    }
  } catch (error) {
    failures.push(`${blockerMatrixPath} must be valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

const prd = read("prd.json");
if (prd) {
  let story = null;
  try {
    const parsed = JSON.parse(prd);
    story = (parsed.userStories || []).find((item) => item.id === "US-025");
  } catch (error) {
    failures.push(`prd.json must be valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!story) {
    failures.push("prd.json missing US-025");
  } else {
    const storyText = JSON.stringify(story);
    for (const text of [
      "trusted beta session",
      "safe lane guard",
      "runtime isolation guard",
      "hosted read-only probe guard",
      "hosted smoke mutation guard",
      "current Team Beta NO-GO signoff",
      "draft-only invite packets",
      "trusted beta session/SSO hosted entry paths",
      "backup/restore blocked",
      "route-level searchParams.get",
      "2026-06-15T11:52:56.617Z",
      "2026-06-15T13:27:23.819Z",
      "Client privileged GET paths no longer append query-role authority",
      "78 tests",
      "beta role/marker"
    ]) {
      if (!storyText.includes(text)) failures.push(`prd.json US-025 missing freshness marker: ${text}`);
    }
    if (storyText.includes("73 tests")) failures.push("prd.json US-025 contains stale 73-test count");
    if (storyText.includes("76 tests")) failures.push("prd.json US-025 contains stale 76-test count");
  }
}

const ralphStory = read("tasks/prd-premium-enterprise-dam-architecture.md");
for (const text of [
  "trusted beta session",
  "safe lane guard",
  "runtime isolation guard",
  "hosted read-only probe guard",
  "hosted smoke mutation guard",
  "current Team Beta NO-GO signoff",
  "draft-only invite packets",
  "trusted beta session/SSO hosted entry paths",
  "backup/restore blocked",
  "route-level `searchParams.get(\"role\")`",
  "2026-06-15T11:52:56.617Z",
  "2026-06-15T13:27:23.819Z",
  "Client privileged GET paths no longer append query-role authority",
  "78 tests",
  "beta role/marker"
]) {
  if (!ralphStory.includes(text)) failures.push(`tasks/prd-premium-enterprise-dam-architecture.md missing freshness marker: ${text}`);
}
if (ralphStory.includes("73 tests")) failures.push("tasks/prd-premium-enterprise-dam-architecture.md contains stale 73-test count");
if (ralphStory.includes("76 tests")) failures.push("tasks/prd-premium-enterprise-dam-architecture.md contains stale 76-test count");
if (prd.includes("with role links") || prd.includes("role links, missions")) failures.push("prd.json contains stale role links wording");
if (ralphStory.includes("with role links") || ralphStory.includes("role links, missions")) failures.push("tasks/prd-premium-enterprise-dam-architecture.md contains stale role links wording");
if (ralphStory.includes("share-ready teammate invite packet")) failures.push("tasks/prd-premium-enterprise-dam-architecture.md contains stale share-ready invite wording");

if (failures.length) {
  console.error("Evidence packet guard failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Evidence packet guard passed.");
