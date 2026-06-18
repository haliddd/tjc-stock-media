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

function pngDimensions(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    failures.push(`missing PNG proof asset: ${relativePath}`);
    return null;
  }
  const buffer = fs.readFileSync(fullPath);
  if (buffer.length < 24 || buffer.toString("ascii", 1, 4) !== "PNG") {
    failures.push(`invalid PNG proof asset: ${relativePath}`);
    return null;
  }
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
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

const requiredProofScreenshots = [
  ["docs/screenshots/primitive-proof/appnav-tubelight-desktop.png", 1200, 600],
  ["docs/screenshots/primitive-proof/appnav-tubelight-mobile.png", 300, 600],
  ["docs/screenshots/primitive-proof/library-badges-pagination-filterpills.png", 1200, 800],
  ["docs/screenshots/primitive-proof/admin-datatable.png", 1200, 800],
  ["docs/screenshots/primitive-proof/review-datatable-inspector.png", 1200, 800],
  ["docs/screenshots/primitive-proof/media-preview-panel-image.png", 1200, 800],
  ["docs/screenshots/primitive-proof/media-preview-panel-document.png", 1200, 800],
  ["docs/screenshots/primitive-proof/upload-dropzone-tags.png", 1200, 800],
  ["docs/screenshots/primitive-proof/toast-feedback.png", 1200, 800],
  ["docs/screenshots/primitive-proof/review-hold-confirm-dialog.png", 1200, 800],
  ["docs/screenshots/primitive-proof/state-system-empty-error-loading.png", 1200, 800]
];

for (const [relativePath, minWidth, minHeight] of requiredProofScreenshots) {
  const dimensions = pngDimensions(relativePath);
  if (dimensions && (dimensions.width < minWidth || dimensions.height < minHeight)) {
    failures.push(`PNG proof asset too small: ${relativePath} ${dimensions.width}x${dimensions.height}, expected at least ${minWidth}x${minHeight}`);
  }
}
requireText("docs/runs/evidence/2026-06-15/screenshots/README.md", "Primitive proof screenshots:", "primitive proof screenshot index");
requireText("docs/runs/evidence/2026-06-15/screenshots/README.md", "tracked safe UI proof assets", "primitive proof screenshot tracked-safe classification");
for (const [relativePath] of requiredProofScreenshots) {
  requireText("docs/runs/evidence/2026-06-15/screenshots/README.md", relativePath.replace("docs/screenshots/", ""), `screenshot README index for ${relativePath}`);
}

const routeIdentitySpecs = [
  {
    label: "Requests",
    routeFile: "frontend/app/requests/page.tsx",
    componentFile: "frontend/components/dam/enterprise/RequestsPage.tsx",
    navHref: 'href: "/requests"',
    h1: 'title="Requests"',
    forbiddenH1: 'title="Help Center"',
    primarySection: 'data-primary-section="requests-table"',
    inspector: "Request summary"
  },
  {
    label: "My Tasks",
    routeFile: "frontend/app/my-tasks/page.tsx",
    componentFile: "frontend/components/dam/enterprise/MyTasksPage.tsx",
    navHref: 'href: "/my-tasks"',
    h1: 'title="My Tasks"',
    forbiddenH1: 'title="Help Center"',
    primarySection: 'data-primary-section="task-work-queue"',
    inspector: "Task context"
  },
  {
    label: "Help Center",
    routeFile: "frontend/app/help/page.tsx",
    componentFile: "frontend/components/GuidePage.tsx",
    navHref: 'href: "/help"',
    h1: 'Help Center',
    forbiddenH1: 'title="Requests"',
    primarySection: 'data-primary-section="help-articles"',
    inspector: "Documentation scope"
  },
  {
    label: "Recent Uploads",
    routeFile: "frontend/app/recent-uploads/page.tsx",
    componentFile: "frontend/components/dam/enterprise/RecentUploadsPage.tsx",
    navHref: 'href: "/recent-uploads"',
    h1: 'title="Recent Uploads"',
    forbiddenH1: 'title="Library"',
    primarySection: 'data-primary-section="recent-uploads-ledger"',
    inspector: "Intake context"
  }
];

const nav = read("frontend/components/dam/shell/damShellNav.ts");
const navSurface = read("frontend/lib/dam/enterprise-route-surface.json");
const navTruth = `${nav || ""}\n${navSurface || ""}`;
const sidebar = read("frontend/components/dam/shell/AppSidebar.tsx");
const routeIdentity = read("frontend/lib/dam-route-identity.ts");
const routeIdentityTest = read("frontend/lib/dam-route-identity.test.ts");

if (sidebar) {
  if (!sidebar.includes("isDamShellRouteActive")) failures.push("AppSidebar must use shared DAM route active-state helper");
  if (!sidebar.includes("item.activeHrefs")) failures.push("AppSidebar must pass nav active aliases for legacy route support");
}

if (routeIdentity) {
  for (const text of [
    "/requests",
    "/my-tasks",
    "/tasks",
    "/help",
    "/guide",
    "/recent-uploads",
    "/governance",
    "/governance/rights-consent",
    "/governance/metadata-health",
    "/governance/policy-center",
    "/governance/audit-log",
    "/governance/integrations",
    "/admin",
    "/admin/users",
    "/admin/roles",
    "/admin/taxonomy",
    "/admin/settings"
  ]) {
    if (!routeIdentity.includes(text)) failures.push(`dam-route-identity helper missing ${text}`);
  }
}

if (routeIdentityTest) {
  for (const text of [
    "/requests/REQ-1024",
    "/my-tasks",
    "/tasks",
    "/help",
    "/guide",
    "/recent-uploads",
    "/governance/rights-consent",
    "/governance/metadata-health",
    "/governance/policy-center",
    "/governance/audit-log",
    "/governance/integrations",
    "/admin/users",
    "/admin/roles",
    "/admin/taxonomy",
    "/admin/settings",
    "activeLabels"
  ]) {
    if (!routeIdentityTest.includes(text)) failures.push(`dam-route-identity test missing ${text}`);
  }
}

for (const spec of routeIdentitySpecs) {
  requireText(spec.routeFile, spec.componentFile.includes("/components/") ? spec.componentFile.split("/").pop()?.replace(".tsx", "") || spec.label : spec.label, `${spec.label} route component import`);
  const component = read(spec.componentFile);
  if (component) {
    for (const text of [spec.h1, spec.primarySection, spec.inspector]) {
      if (!component.includes(text)) failures.push(`${spec.componentFile} missing ${spec.label} route identity marker ${text}`);
    }
    if (component.includes(spec.forbiddenH1)) failures.push(`${spec.componentFile} must not masquerade as ${spec.forbiddenH1}`);
  }
  const navHrefJson = spec.navHref.replace("href: ", '"href": ');
  if (navTruth && !navTruth.includes(spec.navHref) && !navTruth.includes(navHrefJson)) {
    failures.push(`DAM shell nav missing ${spec.label} canonical href ${spec.navHref}`);
  }
}

if (failures.length) {
  console.error("UI maturity guard failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("UI maturity guard passed.");
