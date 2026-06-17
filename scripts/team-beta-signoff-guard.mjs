#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const recordPath = process.argv[2] || "docs/team-beta-signoff-record.md";
const recordFile = path.isAbsolute(recordPath) ? recordPath : path.join(root, recordPath);
const source = fs.readFileSync(recordFile, "utf8");
const failures = [];

const requiredGates = [
  "Seed/media safety",
  "Access/private URL",
  "Hosted env/writeback",
  "Feedback triage",
  "Stop-test response"
];

const requiredResearchChecks = [
  "Doctrine/sacrament",
  "Hymn/music",
  "RE/minors",
  "Testimony/pastoral",
  "Reuse tiers",
  "Masters/derivatives",
  "AI"
];

function clean(value) {
  return value.replace(/\*\*/g, "").trim();
}

function isPlaceholder(value) {
  const normalized = clean(value).toLowerCase();
  return !normalized || normalized === "tbd" || normalized === "yes / no" || normalized.includes("tbd");
}

function hasBlockingLanguage(field, value) {
  const normalized = clean(value).toLowerCase();
  if (/\bpartial\b/.test(normalized)) return true;
  if (normalized.includes("still required")) return true;
  if (normalized.includes("still need")) return true;
  if (normalized.includes("not enough")) return true;
  if (/\bmissing\b/.test(normalized)) return true;
  if (normalized === "open") return true;
  if (field === "decision" && normalized.includes("not approved")) return true;
  return false;
}

function currentDecision() {
  const match = source.match(/^Decision:\s*(.+?)\s*$/m);
  return match ? clean(match[1]).toUpperCase() : "";
}

function currentHeaderField(label) {
  const match = source.match(new RegExp(`^${label}:\\s*(.*)$`, "m"));
  return match ? clean(match[1]) : "";
}

function parseGateRows() {
  const rows = new Map();
  for (const line of source.split("\n")) {
    if (!line.startsWith("|")) continue;
    if (line.includes("---")) continue;
    const cells = line.split("|").slice(1, -1).map(clean);
    if (cells.length < 6 || cells[0] === "Gate") continue;
    rows.set(cells[0], {
      owner: cells[1],
      timestamp: cells[2],
      evidence: cells[3],
      decision: cells[4],
      notes: cells[5]
    });
  }
  return rows;
}

function parseFinalApprovalBlock() {
  const match = source.match(/```text\n([\s\S]*?)\n```/);
  if (!match) return new Map();
  const fields = new Map();
  for (const line of match[1].split("\n")) {
    const index = line.indexOf(":");
    if (index === -1) continue;
    fields.set(line.slice(0, index).trim(), clean(line.slice(index + 1)));
  }
  return fields;
}

function requireIncludes(label, text) {
  if (!source.includes(text)) failures.push(`${recordPath} missing ${label}: ${text}`);
}

requireIncludes("no-go default", "The current default is **NO-GO**");
requireIncludes("minimum go rule", "Minimum GO rule");

for (const check of requiredResearchChecks) {
  requireIncludes(`research check ${check}`, `${check}:`);
}

const decision = currentDecision();
if (!["NO-GO", "GO"].includes(decision)) {
  failures.push(`${recordPath} current Decision must be GO or NO-GO`);
}

const currentStatus = source.match(/^Current status:\s*\*\*(.+?)\*\*/m)?.[1] || "";
if (decision === "NO-GO" && !currentStatus.toUpperCase().includes("NO-GO")) {
  failures.push(`${recordPath} NO-GO decision requires Current status to say NO-GO`);
}
if (decision === "GO") {
  const normalizedStatus = currentStatus.toUpperCase();
  if (!normalizedStatus.includes("GO") || normalizedStatus.includes("NO-GO")) {
    failures.push(`${recordPath} GO decision requires Current status to say GO, not NO-GO`);
  }
  for (const field of ["Decision timestamp", "Decision owner", "Decision notes"]) {
    const value = currentHeaderField(field);
    if (isPlaceholder(value)) failures.push(`${recordPath} GO requires ${field} to be filled`);
    if (hasBlockingLanguage(field, value)) {
      failures.push(`${recordPath} GO requires ${field} to remove blocking language: ${value}`);
    }
  }
}

const gateRows = parseGateRows();
for (const gate of requiredGates) {
  const row = gateRows.get(gate);
  if (!row) {
    failures.push(`${recordPath} missing required gate row: ${gate}`);
    continue;
  }
  if (decision === "GO") {
    for (const [field, value] of Object.entries(row)) {
      if (isPlaceholder(value)) failures.push(`${recordPath} GO requires ${gate} ${field} to be filled`);
      if (hasBlockingLanguage(field, value)) {
        failures.push(`${recordPath} GO requires ${gate} ${field} to remove blocking language: ${value}`);
      }
    }
  }
}

function noGoSummary() {
  const missing = [];
  const blankHeaderFields = ["Decision timestamp", "Decision owner", "Decision notes"]
    .filter((field) => isPlaceholder(currentHeaderField(field)) || hasBlockingLanguage(field, currentHeaderField(field)));
  if (blankHeaderFields.length) missing.push(`Current Decision: ${blankHeaderFields.join(", ")}`);

  for (const gate of requiredGates) {
    const row = gateRows.get(gate);
    if (!row) continue;
    const blockedFields = Object.entries(row)
      .filter(([field, value]) => isPlaceholder(value) || hasBlockingLanguage(field, value))
      .map(([field]) => field);
    if (blockedFields.length) missing.push(`${gate}: ${blockedFields.join(", ")}`);
  }

  const finalFields = parseFinalApprovalBlock();
  const blankFinalFields = [
    "Final decision",
    "Decision owner",
    "Decision timestamp",
    "Named tester count",
    "Roles assigned",
    "Stable URL only confirmed",
    "Preview URL sharing blocked",
    "Stop-test rule included",
    "Feedback watch window",
    "Next-batch review time"
  ].filter((field) => isPlaceholder(finalFields.get(field) || ""));

  if (blankFinalFields.length) missing.push(`Final Send Approval: ${blankFinalFields.join(", ")}`);
  return missing;
}

if (decision === "GO") {
  const finalFields = parseFinalApprovalBlock();
  const requiredFinalFields = [
    "Final decision",
    "Decision owner",
    "Decision timestamp",
    "Named tester count",
    "Roles assigned",
    "Invite copy source",
    "Stable URL only confirmed",
    "Preview URL sharing blocked",
    "Stop-test rule included",
    "Feedback watch window",
    "Next-batch review time"
  ];

  for (const field of requiredFinalFields) {
    const value = finalFields.get(field) || "";
    if (isPlaceholder(value)) failures.push(`${recordPath} GO requires final approval field "${field}" to be filled`);
  }

  if ((finalFields.get("Final decision") || "").toUpperCase() !== "GO") {
    failures.push(`${recordPath} GO requires Final decision: GO`);
  }

  const testerCount = Number(finalFields.get("Named tester count"));
  if (!Number.isInteger(testerCount) || testerCount <= 0) {
    failures.push(`${recordPath} GO requires Named tester count to be a positive integer`);
  }

  for (const yesField of ["Stable URL only confirmed", "Preview URL sharing blocked", "Stop-test rule included"]) {
    if ((finalFields.get(yesField) || "").toLowerCase() !== "yes") {
      failures.push(`${recordPath} GO requires "${yesField}: Yes"`);
    }
  }

  if (finalFields.get("Invite copy source") !== "docs/team-beta-internal-test-packet.md") {
    failures.push(`${recordPath} GO requires invite copy source to remain docs/team-beta-internal-test-packet.md`);
  }
} else if (decision === "NO-GO") {
  const finalFields = parseFinalApprovalBlock();
  if ((finalFields.get("Final decision") || "").toUpperCase() !== "NO-GO") {
    failures.push(`${recordPath} NO-GO requires Final decision: NO-GO`);
  }
  if ((finalFields.get("Stable URL only confirmed") || "").toLowerCase() === "yes") {
    failures.push(`${recordPath} NO-GO must not claim stable URL is confirmed for sending`);
  }
  const testerCount = finalFields.get("Named tester count") || "";
  if (/^\d+$/.test(testerCount)) {
    failures.push(`${recordPath} NO-GO tester count must be marked pending/historical, not send-ready`);
  }
  const testerList = finalFields.get("Named testers") || "";
  if (testerList && !/pending|historical/i.test(testerList)) {
    failures.push(`${recordPath} NO-GO tester list must be marked pending or historical`);
  }
  const rolesAssigned = finalFields.get("Roles assigned") || "";
  if (rolesAssigned && !/pending|historical/i.test(rolesAssigned)) {
    failures.push(`${recordPath} NO-GO roles assigned must be marked pending or historical`);
  }
}

if (failures.length) {
  console.error("Team Beta signoff guard failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Team Beta signoff guard passed (${decision}).`);
if (decision === "NO-GO") {
  const missing = noGoSummary();
  if (missing.length) {
    console.log("Missing before teammate invite GO:");
    for (const item of missing) console.log(`- ${item}`);
  }
}
