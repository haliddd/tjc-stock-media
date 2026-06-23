#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

const root = process.env.SMALL_TEAM_BETA_READINESS_GUARD_ROOT || process.cwd();
const failures = [];

const files = {
  report: "docs/runs/evidence/2026-06-17/small-team-beta-readiness-pass.md",
  blockers: "docs/runs/evidence/2026-06-17/open-blockers.json",
  hostedSummary: "docs/runs/evidence/2026-06-15/hosted-readonly-probes/summary.json",
  browserQa: "docs/screenshots/qa/browser-qa-report.json",
  operations: "docs/small-team-beta-operations-runbook.md",
  joannaRunbook: "docs/joanna-mini-beta-runbook.md",
  joannaReadiness: "docs/joanna-mini-beta-readiness-report.md",
  teamPacket: "docs/team-beta-internal-test-packet.md",
  goNoGo: "docs/team-beta-go-no-go-packet.md"
};

function filePath(relativePath) {
  return path.join(root, relativePath);
}

function read(relativePath) {
  const fullPath = filePath(relativePath);
  if (!fs.existsSync(fullPath)) {
    failures.push(`missing file: ${relativePath}`);
    return "";
  }
  return fs.readFileSync(fullPath, "utf8");
}

function requireText(source, relativePath, text, label = text) {
  if (!source.includes(text)) failures.push(`${relativePath} missing ${label}`);
}

function forbidText(source, relativePath, text, label = text) {
  if (source.includes(text)) failures.push(`${relativePath} contains forbidden ${label}`);
}

function requireArray(payload, key, relativePath) {
  if (!Array.isArray(payload[key])) {
    failures.push(`${relativePath} ${key} must be an array`);
    return null;
  }
  return payload[key];
}

function requireZeroArray(payload, key, relativePath) {
  const value = requireArray(payload, key, relativePath);
  if (value && value.length !== 0) failures.push(`${relativePath} ${key} must be empty`);
}

function requireArrayIncludes(payload, key, value, relativePath) {
  if (!Array.isArray(payload[key])) {
    failures.push(`${relativePath} ${key} must be an array`);
    return;
  }
  if (!payload[key].includes(value)) failures.push(`${relativePath} ${key} missing ${value}`);
}

function isCurrentJuneProof(value) {
  return /^2026-06-(18|22|23)T/.test(String(value || ""));
}

function gitValue(args) {
  try {
    return execFileSync("git", ["-C", root, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
}

const report = read(files.report);
const operations = read(files.operations);
const joannaRunbook = read(files.joannaRunbook);
const joannaReadiness = read(files.joannaReadiness);
const teamPacket = read(files.teamPacket);
const goNoGo = read(files.goNoGo);
let blockers = null;
let browserQa = null;
let hostedSummary = null;

const blockersPath = filePath(files.blockers);
if (!fs.existsSync(blockersPath)) {
  failures.push(`missing file: ${files.blockers}`);
} else {
  try {
    blockers = JSON.parse(fs.readFileSync(blockersPath, "utf8"));
  } catch (error) {
    failures.push(`${files.blockers} must be valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

const hostedSummaryPath = filePath(files.hostedSummary);
if (!fs.existsSync(hostedSummaryPath)) {
  failures.push(`missing file: ${files.hostedSummary}`);
} else {
  try {
    hostedSummary = JSON.parse(fs.readFileSync(hostedSummaryPath, "utf8"));
  } catch (error) {
    failures.push(`${files.hostedSummary} must be valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

requireText(report, files.report, "Small-team beta not ready.", "strict not-ready classification");
requireText(report, files.report, "Hosted/current deployment was not proven.", "hosted/current deployment limitation");
requireText(report, files.report, "Trusted headers prove local QA role behavior only. They are not real team login.", "trusted-header auth boundary");
requireText(report, files.report, "The real hosted/current content target of 181 approved photos plus remaining pending/unapproved photos was not proven.", "real content count limitation");
requireText(report, files.report, "Hosted protected URL read-only access protection was tested, but current deployment/version was not proven.", "hosted protected URL partial blocker");
requireText(report, files.report, "Real login/invite-code flow was not tested without trusted headers.", "real auth blocker");
requireText(report, files.report, "Hosted/runtime persistence was not proven.", "hosted persistence blocker");
requireText(report, files.report, "NO-GO", "NO-GO marker");
forbidText(report, files.report, "Final decision: Small-team beta ready", "small-team beta ready final decision");
forbidText(report, files.report, "Final Classification\n\nSmall-team beta ready", "small-team beta ready classification");
forbidText(report, files.report, "Final Classification\n\nSmall-team beta ready with limitations", "small-team beta ready-with-limitations classification");

requireText(operations, files.operations, "Never put real invite codes", "raw invite-code handling rule");
requireText(operations, files.operations, "<QUEENS_INVITE_CODE>", "invite-code placeholder");
forbidText(operations, files.operations, "private-code", "raw-looking invite-code example");
forbidText(joannaRunbook, files.joannaRunbook, "private-code", "raw-looking invite-code example");

for (const [relativePath, source] of [
  [files.joannaRunbook, joannaRunbook],
  [files.joannaReadiness, joannaReadiness],
  [files.teamPacket, teamPacket],
  [files.goNoGo, goNoGo]
]) {
  if (!/(June 17|June 18|June 22|June 23|2026-06-17|2026-06-18|2026-06-22|2026-06-23)/.test(source)) failures.push(`${relativePath} missing current June freshness marker`);
  requireText(source, relativePath, "NO-GO", "NO-GO send boundary");
  requireText(source, relativePath, "hosted", "hosted gate wording");
  requireText(source, relativePath, "real", "real beta proof wording");
}

requireText(teamPacket, files.teamPacket, "Current status: **NO-GO for sending teammate invites.**", "team packet current NO-GO status");
requireText(teamPacket, files.teamPacket, "June 18 ORCH Final Override", "team packet June 18 ORCH override");
requireText(goNoGo, files.goNoGo, "June 18 ORCH Final Override", "GO/NO-GO packet June 18 ORCH override");
requireText(goNoGo, files.goNoGo, "Team Beta invite/send: NO-GO", "GO/NO-GO packet current invite NO-GO");
requireText(goNoGo, files.goNoGo, "Tiny teammate invite batch | NO-GO until owner signoff exists", "GO/NO-GO packet owner signoff gate");
requireText(joannaReadiness, files.joannaReadiness, "Final decision: Small-team beta not ready; hosted/team beta NO-GO", "Joanna report not-ready final decision");

const browserQaPath = filePath(files.browserQa);
if (!fs.existsSync(browserQaPath)) {
  failures.push(`missing file: ${files.browserQa}`);
} else {
  try {
    browserQa = JSON.parse(fs.readFileSync(browserQaPath, "utf8"));
    if (!String(browserQa.checkedAt || "").startsWith("2026-06-18T")) failures.push(`${files.browserQa} checkedAt must be June 18`);
    if (browserQa.pages !== 20) failures.push(`${files.browserQa} pages must be 20`);
    if (!Array.isArray(browserQa.viewports) || browserQa.viewports.length !== 6) failures.push(`${files.browserQa} viewports must include 6 widths`);
    if (!Array.isArray(browserQa.screenshots) || browserQa.screenshots.length !== 33) failures.push(`${files.browserQa} screenshots must include 33 files`);
    requireZeroArray(browserQa, "failures", files.browserQa);
    requireZeroArray(browserQa, "consoleErrors", files.browserQa);
    requireZeroArray(browserQa, "networkFailures", files.browserQa);
    requireZeroArray(browserQa, "warnings", files.browserQa);
    const expectedDenied = requireArray(browserQa, "expectedDeniedConsole", files.browserQa);
    if (expectedDenied && expectedDenied.length < 1) failures.push(`${files.browserQa} expectedDeniedConsole must record expected role-denial noise`);
  } catch (error) {
    failures.push(`${files.browserQa} must be valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (blockers) {
  if (blockers.schema !== "tjc-stock-media-small-team-beta-open-blockers.v1") failures.push(`${files.blockers} schema mismatch`);
  if (blockers.classification !== "Small-team beta not ready") failures.push(`${files.blockers} classification must remain Small-team beta not ready until browser QA is green and hosted gates close`);
  if (blockers.hostedTeammateInviteDecision !== "NO-GO") failures.push(`${files.blockers} hostedTeammateInviteDecision must be NO-GO`);
  if (blockers.baseUrl !== "http://localhost:4871") failures.push(`${files.blockers} baseUrl must be http://localhost:4871`);
  if (!String(blockers.branch || "").startsWith("codex/")) failures.push(`${files.blockers} branch must be a codex branch`);
  if (!/^[a-f0-9]{40}$/.test(String(blockers.head || ""))) failures.push(`${files.blockers} head must be a 40-character git SHA`);
  if (fs.existsSync(path.join(root, ".git"))) {
    const currentBranch = gitValue(["branch", "--show-current"]);
    const currentHead = gitValue(["rev-parse", "HEAD"]);
    if (currentBranch && blockers.branch !== currentBranch) failures.push(`${files.blockers} branch ${blockers.branch} must match current branch ${currentBranch}`);
    if (currentHead && blockers.head !== currentHead) {
      const isAncestor = spawnSync("git", ["-C", root, "merge-base", "--is-ancestor", String(blockers.head || ""), currentHead], { encoding: "utf8" }).status === 0;
      if (!isAncestor) failures.push(`${files.blockers} head ${blockers.head} must match or be an ancestor of current HEAD ${currentHead}`);
    }
  }
  for (const surface of ["source media", "prd.json", "real invite codes", "deploy", "merge", "tester invites", "public launch"]) {
    requireArrayIncludes(blockers, "forbiddenSurfacesNotTouched", surface, files.blockers);
  }
  const blockersById = new Map(Array.isArray(blockers.blockers) ? blockers.blockers.map((item) => [item.id, item]) : []);
  const browserQaBlocker = blockersById.get("production-mode-browser-qa-download-audit");
  if (!browserQaBlocker) failures.push(`${files.blockers} missing blocker production-mode-browser-qa-download-audit`);
  else if (browserQaBlocker.status !== "complete") failures.push(`${files.blockers} blocker production-mode-browser-qa-download-audit must be complete after June 18 browser QA pass`);
  const hostedCurrent = blockersById.get("hosted-protected-url-current");
  if (!hostedCurrent) failures.push(`${files.blockers} missing blocker hosted-protected-url-current`);
  else if (!["partial", "complete"].includes(hostedCurrent.status)) failures.push(`${files.blockers} blocker hosted-protected-url-current must be partial or complete`);
  const authBlocker = blockersById.get("real-beta-auth-and-invite-codes");
  if (!authBlocker) failures.push(`${files.blockers} missing blocker real-beta-auth-and-invite-codes`);
  else if (!["blocked", "complete"].includes(authBlocker.status)) failures.push(`${files.blockers} blocker real-beta-auth-and-invite-codes must be blocked or complete`);
  const durableBlocker = blockersById.get("durable-hosted-runtime-state");
  if (!durableBlocker) failures.push(`${files.blockers} missing blocker durable-hosted-runtime-state`);
  else if (!["blocked", "partial"].includes(durableBlocker.status)) failures.push(`${files.blockers} blocker durable-hosted-runtime-state must be blocked or partial`);
  for (const id of [
    "real-content-counts",
    "owner-signoff-and-tester-packet"
  ]) {
    const blocker = blockersById.get(id);
    if (!blocker) {
      failures.push(`${files.blockers} missing blocker ${id}`);
    } else if (blocker.status !== "blocked") {
      failures.push(`${files.blockers} blocker ${id} must be blocked`);
    }
  }
  const historicalGuard = blockersById.get("historical-guard-freshness");
  if (!historicalGuard) failures.push(`${files.blockers} missing blocker historical-guard-freshness`);
  else if (historicalGuard.status !== "partial") failures.push(`${files.blockers} blocker historical-guard-freshness must be partial`);
  const summary = blockers.localProofSummary?.browserQa;
  const buildCurrentness = blockers.localProofSummary?.buildCurrentness;
  if (!buildCurrentness) {
    failures.push(`${files.blockers} localProofSummary.buildCurrentness missing`);
  } else {
    if (buildCurrentness.status !== "local-contract-ready") failures.push(`${files.blockers} buildCurrentness.status must be local-contract-ready`);
    if (buildCurrentness.readinessContract !== "small-team-beta-readiness-2026-06-17") failures.push(`${files.blockers} buildCurrentness.readinessContract mismatch`);
    if (buildCurrentness.sessionEndpoint !== "/api/beta-auth/session") failures.push(`${files.blockers} buildCurrentness.sessionEndpoint mismatch`);
    if (![null, "small-team-beta-readiness-2026-06-17"].includes(buildCurrentness.hostedSessionBuildContract)) failures.push(`${files.blockers} buildCurrentness.hostedSessionBuildContract must be null or small-team-beta-readiness-2026-06-17`);
    if (buildCurrentness.routeSurfaceHomePage !== "EnterpriseLibraryPage") failures.push(`${files.blockers} buildCurrentness.routeSurfaceHomePage mismatch`);
    if (buildCurrentness.routeSurfaceUploadPage !== "EnterpriseUploadPage") failures.push(`${files.blockers} buildCurrentness.routeSurfaceUploadPage mismatch`);
  }
  if (browserQa && summary) {
    if (summary.checkedAt !== browserQa.checkedAt) failures.push(`${files.blockers} browser QA checkedAt must match ${files.browserQa}`);
    if (summary.pages !== browserQa.pages) failures.push(`${files.blockers} browser QA pages must match ${files.browserQa}`);
    if (summary.viewports !== browserQa.viewports?.length) failures.push(`${files.blockers} browser QA viewports must match ${files.browserQa}`);
    if (summary.screenshots !== browserQa.screenshots?.length) failures.push(`${files.blockers} browser QA screenshots must match ${files.browserQa}`);
    for (const key of ["failures", "consoleErrors", "networkFailures", "warnings"]) {
      if (summary[key] !== browserQa[key]?.length) failures.push(`${files.blockers} browser QA ${key} must match ${files.browserQa}`);
    }
  } else {
    failures.push(`${files.blockers} localProofSummary.browserQa missing`);
  }
  if (hostedSummary) {
    if (!isCurrentJuneProof(blockers.latestHostedReadOnlyProofAt)) failures.push(`${files.blockers} latestHostedReadOnlyProofAt must record current June hosted read-only proof`);
  }
}

if (hostedSummary) {
  if (hostedSummary.base !== "https://tjc-stock-media.vercel.app") failures.push(`${files.hostedSummary} base must be https://tjc-stock-media.vercel.app`);
  if (!isCurrentJuneProof(hostedSummary.checkedAt)) failures.push(`${files.hostedSummary} checkedAt must be current June proof`);
  if (!String(hostedSummary.note || "").includes("No POST, no hosted writeback, no env mutation, no raw bodies or headers stored")) failures.push(`${files.hostedSummary} must record read-only/no-raw-capture note`);
  const hostedResults = new Map(Array.isArray(hostedSummary.results) ? hostedSummary.results.map((item) => [item.id, item]) : []);
  for (const id of ["root-head", "session-get", "review-query-role", "admin-query-role", "asset-admin-query-role", "blocked-download-viewer"]) {
    const result = hostedResults.get(id);
    if (!result) {
      failures.push(`${files.hostedSummary} missing result ${id}`);
      continue;
    }
    if (!["GET", "HEAD"].includes(result.method)) failures.push(`${files.hostedSummary} ${id} method must be read-only`);
    if (result.forbiddenPatternFound !== false) failures.push(`${files.hostedSummary} ${id} forbiddenPatternFound must be false`);
    if (result.privilegedShapeFound !== false) failures.push(`${files.hostedSummary} ${id} privilegedShapeFound must be false`);
  }
  for (const id of ["root-head", "review-query-role", "admin-query-role", "asset-admin-query-role", "blocked-download-viewer"]) {
    const result = hostedResults.get(id);
    if (result && !String(result.finalUrl || "").includes("/beta-login")) failures.push(`${files.hostedSummary} ${id} finalUrl must redirect to beta-login`);
  }
  const session = hostedResults.get("session-get");
  if (session && ![401, 403].includes(session.status)) failures.push(`${files.hostedSummary} session-get status must be 401 or 403`);
}

if (failures.length) {
  console.error("Small-team beta readiness guard failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Small-team beta readiness guard passed.");
