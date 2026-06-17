#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const guardPath = path.join(root, "scripts/api-audit-guard.mjs");
const tempRoot = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "tjc-api-audit-guard-")));
const failures = [];

function cleanup() {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

function writeRoute(targetRoot, relativeRoute, source) {
  const target = path.join(targetRoot, "frontend/app/api", relativeRoute, "route.ts");
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, source);
}

function fixturePath(label) {
  const targetRoot = path.join(tempRoot, label);
  fs.mkdirSync(path.join(targetRoot, "frontend/app/api"), { recursive: true });
  return targetRoot;
}

function runGuard(targetRoot) {
  return spawnSync(process.execPath, [guardPath], {
    cwd: targetRoot,
    encoding: "utf8"
  });
}

function outputFor(result) {
  return `${result.stdout || ""}\n${result.stderr || ""}`;
}

function expectPass(label, setup) {
  if (label === "current-real-lane") {
    const result = spawnSync(process.execPath, [guardPath], { cwd: root, encoding: "utf8" });
    if (result.status !== 0) failures.push(`${label} should pass:\n${outputFor(result)}`);
    return;
  }
  const targetRoot = fixturePath(label);
  setup(targetRoot);
  const result = runGuard(targetRoot);
  if (result.status !== 0) failures.push(`${label} should pass:\n${outputFor(result)}`);
}

function expectFail(label, setup, expectedText) {
  const targetRoot = fixturePath(label);
  setup(targetRoot);
  const result = runGuard(targetRoot);
  const output = outputFor(result);
  if (result.status === 0) {
    failures.push(`${label} should fail but passed:\n${output}`);
    return;
  }
  if (expectedText && !output.includes(expectedText)) {
    failures.push(`${label} failure should mention ${expectedText}:\n${output}`);
  }
}

expectPass("current-real-lane");

expectPass("append-audit-event-valid", (targetRoot) => {
  writeRoute(targetRoot, "feedback", `
export async function POST() {
  appendAuditEvent({ type: "feedback" });
  return Response.json({ ok: true });
}
`);
});

expectPass("required-audit-event-valid", (targetRoot) => {
  writeRoute(targetRoot, "batch", `
export async function DELETE() {
  appendRequiredAuditEvent({ type: "batch-delete" });
  return Response.json({ ok: true });
}
`);
});

expectPass("audited-workflow-delegation-valid", (targetRoot) => {
  writeRoute(targetRoot, "review", `
export async function PATCH() {
  return runReviewActionWorkflow({ action: "Request More Info" });
}
export async function POST() {
  return runApprovedDeliveryGate({ termsAccepted: true });
}
`);
});

expectPass("audit-after-string-brace-valid", (targetRoot) => {
  writeRoute(targetRoot, "string-brace", `
export async function POST() {
  const copy = "not a body close }";
  appendAuditEvent({ type: "string-brace" });
  return Response.json({ ok: true, copy });
}
`);
});

expectPass("audit-after-comment-brace-valid", (targetRoot) => {
  writeRoute(targetRoot, "comment-brace", `
export async function POST() {
  /* not a body close } */
  appendRequiredAuditEvent({ type: "comment-brace" });
  return Response.json({ ok: true });
}
`);
});

expectFail("missing-post-audit", (targetRoot) => {
  writeRoute(targetRoot, "unsafe-post", `
export async function POST() {
  return Response.json({ ok: true });
}
`);
}, "unsafe-post/route.ts exposes POST without");

expectFail("audit-outside-handler-not-enough", (targetRoot) => {
  writeRoute(targetRoot, "outside-handler", `
appendAuditEvent({ type: "module-load" });
export async function POST() {
  return Response.json({ ok: true });
}
`);
}, "outside-handler/route.ts exposes POST without");

expectFail("audit-in-get-not-enough-for-patch", (targetRoot) => {
  writeRoute(targetRoot, "wrong-handler", `
export async function GET() {
  appendAuditEvent({ type: "read" });
  return Response.json({ ok: true });
}
export async function PATCH() {
  return Response.json({ ok: true });
}
`);
}, "wrong-handler/route.ts exposes PATCH without");

expectFail("audit-comment-not-enough", (targetRoot) => {
  writeRoute(targetRoot, "comment-audit", `
export async function POST() {
  // appendAuditEvent({ type: "comment-only" });
  return Response.json({ ok: true });
}
`);
}, "comment-audit/route.ts exposes POST without");

expectFail("audit-string-not-enough", (targetRoot) => {
  writeRoute(targetRoot, "string-audit", `
export async function POST() {
  const fake = "appendAuditEvent({ type: 'string-only' })";
  return Response.json({ ok: true, fake });
}
`);
}, "string-audit/route.ts exposes POST without");

expectFail("fake-audit-before-string-brace-not-enough", (targetRoot) => {
  writeRoute(targetRoot, "fake-before-brace", `
export async function POST() {
  const fake = "appendAuditEvent({ type: 'fake' }) and not a close }";
  return Response.json({ ok: true, fake });
}
`);
}, "fake-before-brace/route.ts exposes POST without");

expectFail("missing-delete-audit", (targetRoot) => {
  writeRoute(targetRoot, "unsafe-delete", `
export async function DELETE() {
  return Response.json({ ok: true });
}
`);
}, "unsafe-delete/route.ts exposes DELETE without");

if (failures.length) {
  console.error("API audit guard self-test failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  cleanup();
  process.exit(1);
}

cleanup();
console.log("API audit guard self-test passed.");
