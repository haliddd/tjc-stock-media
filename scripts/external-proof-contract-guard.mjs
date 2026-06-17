#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const evidenceDir = path.join("docs", "runs", "evidence", "2026-06-15");
const failures = [];

const docs = [
  {
    path: path.join(evidenceDir, "01-canonical-repo-deploy.md"),
    result: "BLOCKED",
    blockerId: "canonical-deployment",
    required: [
      "Canonical GitHub repo owner/name | BLOCKED",
      "Hosted URL points to recorded commit | BLOCKED",
      "Canonical deployment remains unresolved",
      "Hali confirms canonical repo, hosted URL, Vercel project, and deployment commit"
    ]
  },
  {
    path: path.join(evidenceDir, "03-hosted-access-proof.md"),
    result: "PARTIAL PASS read-only / BLOCKED",
    blockerId: "hosted-access-protection",
    required: [
      "hosted mutating smokes intentionally not run",
      "fail-closed exit on forbidden or privileged response shapes",
      "authenticated hosted roles/env/deployment still unproven",
      "Hali confirms canonical hosted URL/protection, deployment commit, env"
    ]
  },
  {
    path: path.join(evidenceDir, "03-hosted-access-proof.md"),
    result: "PARTIAL PASS read-only / BLOCKED",
    blockerId: "vercel-env-confirmation",
    required: [
      "Hosted env values | BLOCKED",
      "No Vercel dashboard/env mutation approval",
      "authenticated hosted roles/env/deployment still unproven",
      "Hali approves Vercel env/dashboard proof"
    ]
  },
  {
    path: path.join(evidenceDir, "04-resourcespace-read-proof.md"),
    result: "BLOCKED",
    blockerId: "resourcespace-scope",
    required: [
      "Fresh ResourceSpace production read proof was not performed",
      "did not mutate ResourceSpace production data",
      "fresh real ResourceSpace read proof not captured",
      "Hali confirms read-only ResourceSpace endpoint/API user or declares non-real rehearsal scope"
    ]
  },
  {
    path: path.join(evidenceDir, "06-google-drive-custody-proof.md"),
    result: "BLOCKED",
    blockerId: "google-drive-custody",
    required: [
      "Google Drive originals were not touched",
      "Sanitized Custody Manifest Format",
      "external Drive custody not proven",
      "Hali supplies sanitized custody manifest or approved read-only custody proof"
    ]
  },
  {
    path: path.join(evidenceDir, "08-durable-state-proof.md"),
    result: "BLOCKED",
    blockerId: "durable-hosted-state",
    required: [
      "Durability remains NO-GO",
      "Creating fake env/config files would weaken the proof",
      "hosted durable/fail-closed state remains unproven",
      "Hali chooses durable store or disables/fail-closes critical hosted workflows"
    ]
  },
  {
    path: path.join(evidenceDir, "09-beta-packet.md"),
    result: "BLOCKED / NO-GO",
    blockerId: "tester-list-and-signoff",
    required: [
      "Current June 15 posture: NO-GO",
      "Do not send this invite copy from Codex",
      "Names remain placeholders until Hali confirms",
      "Hali confirms tester list, roles, durable feedback path, and final invite decision"
    ]
  }
];

const disallowedCompleteClaims = [
  "Result | PASS |",
  "Result | GO |",
  "Decision recommendation: GO",
  "Current June 15 posture: GO",
  "Hosted access remains GO",
  "Canonical deployment is confirmed",
  "ResourceSpace proof is complete",
  "Custody proof is complete",
  "Durability is GO",
  "send teammate invites"
];

const externalDocForbiddenSurfaces = [
  "Vercel prod env",
  "ResourceSpace production data",
  "Google Drive originals",
  "live writeback",
  "teammate invites"
];

function read(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    failures.push(`missing external proof doc: ${relativePath}`);
    return "";
  }
  return fs.readFileSync(fullPath, "utf8");
}

for (const doc of docs) {
  const source = read(doc.path);
  if (!source) continue;
  if (!source.includes(`| Result | ${doc.result}`)) failures.push(`${doc.path} must keep proof record result ${doc.result}`);
  if (!source.includes("| Secrets redacted | yes |")) failures.push(`${doc.path} must record secrets redacted`);
  if (!source.includes("| Follow-up |")) failures.push(`${doc.path} must keep owner follow-up row`);
  if (!source.includes("| Touched forbidden surfaces | no |")) {
    failures.push(`${doc.path} must record forbidden surfaces were not touched`);
  }
  if (!source.includes(doc.blockerId)) {
    failures.push(`${doc.path} must mention open blocker id ${doc.blockerId}`);
  }
  for (const text of doc.required) {
    if (!source.includes(text)) failures.push(`${doc.path} missing external-proof requirement: ${text}`);
  }
  for (const surface of externalDocForbiddenSurfaces) {
    if (source.includes(`touched ${surface}`) || source.includes(`mutated ${surface}`)) {
      failures.push(`${doc.path} contains forbidden external-surface touch claim: ${surface}`);
    }
  }
  for (const text of disallowedCompleteClaims) {
    if (source.includes(text)) failures.push(`${doc.path} contains disallowed external-gate completion wording: ${text}`);
  }
}

const matrixSource = read(path.join(evidenceDir, "open-blockers.json"));
if (matrixSource) {
  try {
    const matrix = JSON.parse(matrixSource);
    if (matrix.decision !== "NO-GO") failures.push("open-blockers.json decision must stay NO-GO");
    const blockers = new Map((matrix.blockers || []).map((blocker) => [blocker.id, blocker]));
    for (const id of ["canonical-deployment", "vercel-env-confirmation", "resourcespace-scope", "google-drive-custody", "durable-hosted-state", "tester-list-and-signoff"]) {
      if (blockers.get(id)?.status !== "blocked") failures.push(`open-blockers.json blocker ${id} must stay blocked`);
    }
    if (blockers.get("hosted-access-protection")?.status !== "partial") failures.push("open-blockers.json hosted-access-protection must stay partial");
    for (const doc of docs) {
      const blocker = blockers.get(doc.blockerId);
      if (!blocker) {
        failures.push(`open-blockers.json missing blocker ${doc.blockerId}`);
        continue;
      }
      if (blocker.evidenceDoc !== doc.path) {
        failures.push(`open-blockers.json blocker ${doc.blockerId} evidenceDoc must be ${doc.path}`);
      }
      if (!String(blocker.owner || "").trim()) {
        failures.push(`open-blockers.json blocker ${doc.blockerId} owner must be non-empty`);
      }
      if (!String(blocker.safeNextStep || "").trim()) {
        failures.push(`open-blockers.json blocker ${doc.blockerId} safeNextStep must be non-empty`);
      }
      if (doc.blockerId === "vercel-env-confirmation" && !String(blocker.safeNextStep || "").includes("do not mutate Vercel production env")) {
        failures.push("open-blockers.json blocker vercel-env-confirmation safeNextStep must preserve no Vercel production env mutation boundary");
      }
      if (!Array.isArray(blocker.blocks) || blocker.blocks.length === 0) {
        failures.push(`open-blockers.json blocker ${doc.blockerId} must list blocked decision surfaces`);
      }
    }
  } catch (error) {
    failures.push(`open-blockers.json must be valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failures.length) {
  console.error("External proof contract guard failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("External proof contract guard passed.");
