#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function read(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    failures.push(`missing file: ${relativePath}`);
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
  if (source.includes(text)) failures.push(`${relativePath} must not contain ${label}`);
}

const library = read("frontend/components/dam/enterprise/LibraryPage.tsx");
if (library) {
  if (library.includes("Quick lookSelected") || library.includes("Quick look{") || library.includes("Quick look</button><button")) {
    failures.push("Enterprise Library must not concatenate Quick look and Selected controls");
  }
  if (!library.includes('className="ed-row-open"') || !library.includes(">Open</button>")) {
    failures.push("Enterprise Library row action must keep Open as a separate action");
  }
  if (!library.includes('className={cn("ed-row-select"') || !library.includes("<CheckCircle2 size={13}") || !library.includes("Selected</>") || !library.includes(': "Select"')) {
    failures.push("Enterprise Library row selection must render a separate Selected state");
  }
  if (!library.includes("setFiltersOpen(true)") || !library.includes("<Sheet open={filtersOpen}")) {
    failures.push("Enterprise Library must keep long-tail filters in a filter sheet/drawer");
  }
}

const shared = read("frontend/components/dam/enterprise/EnterpriseShared.tsx");
if (shared) {
  if (!shared.includes('title = "Download locked"') || !shared.includes("ed-lock-notice") || !shared.includes("data-disabled-reason")) {
    failures.push("Enterprise shared actions must keep explicit disabled download lock reasons");
  }
  if (!shared.includes("Open the full record to run the approved-copy gate") || !shared.includes("Source files remain restricted")) {
    failures.push("Enterprise inspector must explain why distribution/download actions are locked");
  }
  if (!shared.includes("Quick look is read-only") || !shared.includes("no distribution copy, ZIP, or public link")) {
    failures.push("Quick look drawer must state read-only/no-distribution behavior");
  }
}

const review = read("frontend/components/dam/enterprise/ReviewPage.tsx");
if (review) {
  for (const text of [
    'className="ed-review-next-action"',
    'aria-label="Next required review evidence"',
    "Next required evidence",
    "View guidance",
    'className="ed-preview-redaction-note"',
    'aria-label="Preview redaction notice"',
    "Role-safe derivative only. Source/original hidden.",
    'aria-label="Review workbench sections"'
  ]) {
    if (!review.includes(text)) failures.push(`Enterprise Review missing ${text}`);
  }
}

const css = read("frontend/app/dam-enterprise.css");
if (css) {
  for (const selector of [
    ".enterprise-review .ed-preview-redaction-note",
    ".ed-review-next-action",
    ".ed-lock-notice",
    ".ed-row-open",
    ".ed-row-select"
  ]) {
    if (!css.includes(selector)) failures.push(`Enterprise CSS missing ${selector}`);
  }
}

const roleProvider = read("frontend/components/RoleProvider.tsx");
if (roleProvider) {
  if (roleProvider.includes("process.env.NODE_ENV")) failures.push("RoleProvider must not read server NODE_ENV in client-rendered code");
  if (!roleProvider.includes("NEXT_PUBLIC_LOCAL_BETA_ROLE_SWITCH") || !roleProvider.includes("betaLocked || !clientRoleSwitchEnabled")) {
    failures.push("RoleProvider must keep client role switch behind explicit public local switch and beta lock");
  }
}

requireNoText("frontend/components/dam/enterprise/LibraryPage.tsx", "Quick lookSelected", "Quick lookSelected regression");
requireText("docs/runs/evidence/2026-06-15/12-safe-30-40h-ui-run.md", "Fixed `Quick lookSelected`", "Quick lookSelected evidence note");
requireText("docs/runs/evidence/2026-06-15/12-safe-30-40h-ui-run.md", "Review Queue premium workflow/redaction pass", "Review Queue premium evidence row");
requireText("docs/runs/evidence/2026-06-15/12-safe-30-40h-ui-run.md", "DEV role switch hidden outside explicit local dev mode", "DEV role switch evidence row");

if (failures.length) {
  console.error("UI maturity guard failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("UI maturity guard passed.");
