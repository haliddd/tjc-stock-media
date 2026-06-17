#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const guardPath = path.join(root, "scripts/team-beta-signoff-guard.mjs");
const baseRecord = fs.readFileSync(path.join(root, "docs/team-beta-signoff-record.md"), "utf8");
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "tjc-team-beta-signoff-"));
const failures = [];
process.on("exit", () => fs.rmSync(tempDir, { recursive: true, force: true }));

function writeFixture(name, source) {
  const filePath = path.join(tempDir, `${name}.md`);
  fs.writeFileSync(filePath, source);
  return filePath;
}

function runGuard(filePath) {
  return spawnSync(process.execPath, [guardPath, filePath], {
    cwd: root,
    encoding: "utf8"
  });
}

function expectPass(label, source) {
  const result = runGuard(writeFixture(label, source));
  if (result.status !== 0) failures.push(`${label} should pass:\n${result.stderr || result.stdout}`);
}

function expectFail(label, source) {
  const result = runGuard(writeFixture(label, source));
  if (result.status === 0) failures.push(`${label} should fail but passed:\n${result.stdout}`);
}

const noGoRecord = baseRecord
  .replace("Decision: GO", "Decision: NO-GO")
  .replace(/^Current status:.*$/m, "Current status: **NO-GO until this record is complete.**");

const validGo = baseRecord
  .replace("Decision: NO-GO", "Decision: GO")
  .replace(/^Current status:.*$/m, "Current status: **GO for tiny internal Team Beta invite batch. Production remains blocked.**")
  .replace(
    /^\| Seed\/media safety \|.*\|$/m,
    "| Seed/media safety | Enoch Liu primary; Hali Ding backup | 2026-06-15T07:29:52Z | Renewed June 15 seed/media approval captured for preview-only tiny internal beta with 181 Viewer-visible records and 0 portal-ready/downloadable records. | Approved | No public reuse or download approval. |"
  )
  .replace(
    /^\| Access\/private URL \|.*\|$/m,
    "| Access/private URL | Enoch Liu | 2026-06-15T07:29:52Z | Canonical hosted protection, stable URL policy, and named tester list are approved for tiny internal beta only. | Approved | No preview URL sharing. |"
  )
  .replace(
    /^\| Hosted env\/writeback \|.*\|$/m,
    "| Hosted env/writeback | Hali Ding | 2026-06-15T07:29:52Z | Hosted env, durable state, authenticated redaction/download, and queued writeback proof are approved for tiny internal beta only. | Approved | Live ResourceSpace writeback is not approved. |"
  )
  .replace(
    /^\| Feedback triage \|.*\|$/m,
    "| Feedback triage | Hali Ding primary; Enoch Liu backup | 2026-06-15T07:29:52Z | First 24 hour feedback watch and export owner are approved for tiny internal beta only. | Approved | Next-batch review happens after first invite. |"
  )
  .replace(
    /^\| Stop-test response \|.*\|$/m,
    "| Stop-test response | Hali Ding primary; Enoch Liu backup | 2026-06-15T07:29:52Z | Stop-test owner and tester notification path are approved for tiny internal beta only. | Approved | P0 stops active testing. |"
  )
  .replaceAll("NO-GO pending renewed approval", "Approved")
  .replaceAll("NO-GO pending canonical hosted proof", "Approved")
  .replaceAll("NO-GO pending hosted proof", "Approved")
  .replaceAll("renewed proof still required after June 15 P0", "renewed proof captured")
  .replaceAll("renewed assignment still required before invite", "renewed assignment captured")
  .replace("Final decision: NO-GO", "Final decision: GO")
  .replace(/^Named tester count:.*$/m, "Named tester count: 6")
  .replace(/^Named testers:.*$/m, "Named testers: Jackie Yu, Alan Yu, Enoch Liu, Hali Ding, Joanna Chou, Richard Pang")
  .replace(/^Roles assigned:.*$/m, "Roles assigned: Viewer, Contributor, Reviewer, DAM Admin QA roles as needed for assigned beta tasks")
  .replace(/^Stable URL only confirmed:.*$/m, "Stable URL only confirmed: Yes")
  .replace(/^Feedback watch window:.*$/m, "Feedback watch window: First 24 hours after invite")
  .replace(/^Next-batch review time:.*$/m, "Next-batch review time: 24 hours after first invite")
  .replace("Current status: **NO-GO for teammate invite batch until June 15 evidence blockers close.**", "Current status: **GO for tiny internal Team Beta invite batch. Production remains blocked.**");

const incompleteGo = validGo
  .replace(/^Named tester count:.*$/m, "Named tester count:")
  .replace(/^Stable URL only confirmed: Yes$/m, "Stable URL only confirmed: Yes / No");

const partialGoWithFinalBlock = validGo
  .replace(
    /^\| Seed\/media safety \|.*\|$/m,
    "| Seed/media safety | Hali/requester partial consent | 2026-06-11T21:23:01Z | Human response captured; final reviewer evidence still required. | Partial; final invite GO not approved | Preview-only consent captured; reviewer evidence fields still need final send approval. |"
  );

const noGoWithSendReadyTesterList = baseRecord
  .replace(/^Named tester count:.*$/m, "Named tester count: 6")
  .replace(/^Named testers:.*$/m, "Named testers: Jackie Yu, Alan Yu, Enoch Liu, Hali Ding, Joanna Chou, Richard Pang");

const noGoWithStableUrlConfirmed = baseRecord
  .replace(/^Stable URL only confirmed:.*$/m, "Stable URL only confirmed: Yes");

expectPass("current-record", baseRecord);
expectPass("no-go-record", noGoRecord);
expectPass("valid-go", validGo);
expectFail("incomplete-go", incompleteGo);
expectFail("partial-go-with-final-block", partialGoWithFinalBlock);
expectFail("no-go-with-send-ready-tester-list", noGoWithSendReadyTesterList);
expectFail("no-go-with-stable-url-confirmed", noGoWithStableUrlConfirmed);

if (failures.length) {
  console.error("Team Beta signoff guard self-test failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Team Beta signoff guard self-test passed.");
