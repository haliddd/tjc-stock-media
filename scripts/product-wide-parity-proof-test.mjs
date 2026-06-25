#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const proofPath = path.join(root, "scripts/product-wide-parity-proof.mjs");
const proofArtifactsDir = path.join(root, "docs/screenshots/qa/product-wide-parity-2026-06-25");
const runtimeProofPath = path.join(proofArtifactsDir, "runtime-proof.json");
const proofLedgerPath = path.join(proofArtifactsDir, "ledger.md");
const fallbackDataPath = path.join(root, "frontend/data/devFallback/damMockData.ts");
const makefilePath = path.join(root, "Makefile");
const frontendCheckPath = path.join(root, "scripts/frontend-check.sh");
const source = fs.readFileSync(proofPath, "utf8");

const requiredBlockMatch = source.match(/const requiredProofNames = \[([\s\S]*?)\];/);
if (!requiredBlockMatch) {
  console.error("product-wide parity proof test failed:");
  console.error("- requiredProofNames block missing");
  process.exit(1);
}

const forbiddenBlockMatch = source.match(/const forbiddenTerms = \[([\s\S]*?)\];/);
if (!forbiddenBlockMatch) {
  console.error("product-wide parity proof test failed:");
  console.error("- forbiddenTerms block missing");
  process.exit(1);
}

const requiredNames = Array.from(requiredBlockMatch[1].matchAll(/"([^"]+)"/g)).map((match) => match[1]);
const captureNames = Array.from(source.matchAll(/name: "([^"]+)"/g)).map((match) => match[1]);
const forbiddenTerms = Array.from(forbiddenBlockMatch[1].matchAll(/"([^"]+)"/g)).map((match) => match[1]);
const expectedRuntimeCaptures = {
  "marketing-home": { role: "public", route: "/" },
  "library-admin": { role: "DAM Admin", route: "/library" },
  "library-interactions-admin": { role: "DAM Admin", route: "/library" },
  "collections-admin": { role: "DAM Admin", route: "/collections" },
  "public-portal": { role: "public", route: "/public-portal/" },
  "upload-contributor-success": { role: "Contributor", route: "/upload" },
  "requests-after-upload": { role: "Contributor", route: "/requests" },
  "reviewer-workbench": { role: "Reviewer", route: "/review" },
  "distribution-admin": { role: "DAM Admin", route: "/distribution-sets" },
  "audit-admin": { role: "DAM Admin", route: "/governance/audit-log" },
  "settings-integrations-admin": { role: "DAM Admin", route: "/governance/integrations" },
  "roles-access-admin": { role: "DAM Admin", route: "/admin/roles" },
  "mobile-library": { role: "Viewer", route: "/library" },
  "brand-kit-admin": { role: "DAM Admin", route: "/brand-hub" },
  "asset-detail-download-admin": { role: "DAM Admin", route: "/assets/" }
};
const expectedForbiddenTerms = [
  "Archive One",
  "Atlas",
  "Acme",
  "Taylor Morgan",
  "Jordan Kim",
  "aone.io",
  "Okta",
  "Amazon S3",
  "fake S3 capacity",
  "Recorded by Atlas",
  "Campaign 2024",
  "Summer Campaign 2024",
  "Summer Launch Toolkit",
  "Product shots",
  "Serene mountain",
  "Coastal cliffs",
  "AONE-",
  "vs last 30 days"
];
const failures = [];
const expectedProofArtifactFiles = new Set([
  "ledger.md",
  "issue-64-acceptance-audit.md",
  "issue-65-acceptance-audit.md",
  "issue-66-acceptance-audit.md",
  "issue-67-final-visual-qa-pack.md",
  "issue-68-acceptance-audit.md",
  "issue-69-acceptance-audit.md",
  "issue-70-acceptance-audit.md",
  "issue-71-acceptance-audit.md",
  "issue-72-acceptance-audit.md",
  "issue-73-acceptance-audit.md",
  "runtime-proof.json",
  ...requiredNames.map((name) => `${name}.png`)
]);
const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function pngDimensions(filePath) {
  const buffer = fs.readFileSync(filePath);
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(pngSignature)) return null;
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
}

if (requiredNames.length !== 15) failures.push(`requiredProofNames must contain 15 captures, found ${requiredNames.length}`);
if (captureNames.length !== 15) failures.push(`proof script must push 15 captures, found ${captureNames.length}`);

for (const name of requiredNames) {
  if (!captureNames.includes(name)) failures.push(`required proof is not captured: ${name}`);
}

for (const name of captureNames) {
  if (!requiredNames.includes(name)) failures.push(`captured proof is not required: ${name}`);
}

if (forbiddenTerms.length !== expectedForbiddenTerms.length) {
  failures.push(`forbiddenTerms must contain ${expectedForbiddenTerms.length} terms, found ${forbiddenTerms.length}`);
}
for (const term of expectedForbiddenTerms) {
  if (!forbiddenTerms.includes(term)) failures.push(`forbidden copy term is not guarded: ${term}`);
}
for (const term of forbiddenTerms) {
  if (!expectedForbiddenTerms.includes(term)) failures.push(`forbiddenTerms contains unexpected term: ${term}`);
}

if (fs.existsSync(fallbackDataPath)) {
  const fallbackData = fs.readFileSync(fallbackDataPath, "utf8");
  for (const term of ["Summer Campaign 2024", "Summer Launch Toolkit", "Serene mountain", "Coastal cliffs"]) {
    if (fallbackData.includes(term)) failures.push(`fallback DAM data still contains stale demo copy: ${term}`);
  }
}

for (const [guardPath, label] of [
  [makefilePath, "Makefile"],
  [frontendCheckPath, "frontend-check"]
]) {
  const guardSource = fs.existsSync(guardPath) ? fs.readFileSync(guardPath, "utf8") : "";
  if (!guardSource.includes("node scripts/product-wide-parity-proof-test.mjs")) {
    failures.push(`${label} must run product-wide parity proof self-test`);
  }
}

for (const requiredText of [
  "missingRequiredProofs",
  "requiredProofNames",
  "report.aggregate.missingRequiredProofs.length"
]) {
  if (!source.includes(requiredText)) failures.push(`proof script must include ${requiredText}`);
}

if (fs.existsSync(runtimeProofPath)) {
  const proofArtifactFiles = fs.readdirSync(proofArtifactsDir).filter((name) => fs.statSync(path.join(proofArtifactsDir, name)).isFile());
  for (const file of proofArtifactFiles) {
    if (!expectedProofArtifactFiles.has(file)) {
      failures.push(`unexpected product-wide parity proof artifact: ${file}`);
    }
  }
  for (const file of expectedProofArtifactFiles) {
    if (!proofArtifactFiles.includes(file)) {
      failures.push(`missing product-wide parity proof artifact: ${file}`);
    }
  }
  const runtimeProof = JSON.parse(fs.readFileSync(runtimeProofPath, "utf8"));
  const proofLedger = fs.existsSync(proofLedgerPath) ? fs.readFileSync(proofLedgerPath, "utf8") : "";
  const runtimeResults = runtimeProof.results || [];
  const runtimeNames = runtimeResults.map((result) => result.name);
  const runtimeRequiredNames = runtimeProof.requiredProofNames || [];
  const runtimeForbiddenTerms = runtimeProof.forbiddenTerms || [];
  const runtimeAggregate = runtimeProof.aggregate || {};

  if (runtimeNames.length !== requiredNames.length) {
    failures.push(`runtime proof must contain ${requiredNames.length} captures, found ${runtimeNames.length}`);
  }
  if (runtimeRequiredNames.length !== requiredNames.length) {
    failures.push(`runtime proof requiredProofNames must contain ${requiredNames.length} captures, found ${runtimeRequiredNames.length}`);
  }
  for (const name of runtimeRequiredNames) {
    if (!requiredNames.includes(name)) failures.push(`runtime proof requiredProofNames contains unexpected capture: ${name}`);
  }
  if (runtimeProof.base !== "http://127.0.0.1:4871") {
    failures.push(`runtime proof base must be local demo http://127.0.0.1:4871, found ${runtimeProof.base || "missing"}`);
  }
  if (!runtimeProof.generatedAt) {
    failures.push("runtime proof generatedAt timestamp missing");
  } else if (Number.isNaN(Date.parse(runtimeProof.generatedAt))) {
    failures.push(`runtime proof generatedAt timestamp is invalid: ${runtimeProof.generatedAt}`);
  }
  if (!proofLedger) {
    failures.push("product-wide parity ledger is missing");
  } else {
    if (runtimeProof.generatedAt && !proofLedger.includes(runtimeProof.generatedAt)) {
      failures.push(`product-wide parity ledger missing latest runtime proof timestamp: ${runtimeProof.generatedAt}`);
    }
    if (!proofLedger.includes("Base URL: `http://127.0.0.1:4871`")) {
      failures.push("product-wide parity ledger must mention local demo base URL");
    }
    if (!proofLedger.includes("Required proof-name and forbidden-copy contracts passed")) {
      failures.push("product-wide parity ledger must mention proof-name and forbidden-copy contract status");
    }
    if (!proofLedger.includes("15 routes captured")) {
      failures.push("product-wide parity ledger must mention 15 captured routes");
    }
    for (const validationText of [
      "npm --prefix frontend test",
      "make slim-hygiene",
      "./scripts/frontend-check.sh",
      "35 files, 208 tests",
      "production Next build",
      "git hygiene"
    ]) {
      if (!proofLedger.includes(validationText)) {
        failures.push(`product-wide parity ledger missing validation evidence: ${validationText}`);
      }
    }
    for (const name of requiredNames) {
      const screenshotName = `${name}.png`;
      if (!proofLedger.includes(screenshotName)) {
        failures.push(`product-wide parity ledger missing render evidence screenshot: ${screenshotName}`);
      }
    }
    if (!proofLedger.includes("runtime-proof.json")) {
      failures.push("product-wide parity ledger missing runtime-proof.json render evidence");
    }
  }
  for (const result of runtimeResults) {
    const captureName = result.name || "unknown";
    for (const [field, expected] of [
      ["horizontalOverflowResult", "pass"],
      ["visibleBannedCopyScanResult", "pass"],
      ["outerFrameCheckResult", "pass"]
    ]) {
      if (result[field] !== expected) {
        failures.push(`runtime proof ${captureName} ${field} must be ${expected}, found ${result[field] || "missing"}`);
      }
    }
    for (const field of ["failedRequests", "badResponses", "consoleWarningsAndErrors"]) {
      if (!Array.isArray(result[field])) {
        failures.push(`runtime proof ${captureName} ${field} must be an array`);
      } else if (result[field].length) {
        failures.push(`runtime proof ${captureName} reports ${field}: ${JSON.stringify(result[field])}`);
      }
    }
    if (!result.screenshot) {
      failures.push(`runtime proof screenshot missing for capture: ${captureName}`);
      continue;
    }
    if (path.isAbsolute(result.screenshot)) {
      failures.push(`runtime proof screenshot must be repo-relative for ${captureName}: ${result.screenshot}`);
    }
    const screenshotPath = path.isAbsolute(result.screenshot) ? result.screenshot : path.join(root, result.screenshot);
    const normalizedScreenshotPath = path.resolve(screenshotPath);
    if (!normalizedScreenshotPath.startsWith(`${proofArtifactsDir}${path.sep}`)) {
      failures.push(`runtime proof screenshot must live under product-wide parity artifact dir for ${result.name}: ${result.screenshot}`);
    }
    if (path.extname(normalizedScreenshotPath) !== ".png") {
      failures.push(`runtime proof screenshot must be a PNG for ${result.name}: ${result.screenshot}`);
    }
    const expectedScreenshotName = `${result.name}.png`;
    if (path.basename(normalizedScreenshotPath) !== expectedScreenshotName) {
      failures.push(`runtime proof screenshot filename drifted for ${result.name}: expected ${expectedScreenshotName}, found ${path.basename(normalizedScreenshotPath)}`);
    }
    if (!fs.existsSync(screenshotPath)) {
      failures.push(`runtime proof screenshot file missing for ${result.name}: ${result.screenshot}`);
      continue;
    }
    const screenshotSize = fs.statSync(normalizedScreenshotPath).size;
    if (screenshotSize <= 0) {
      failures.push(`runtime proof screenshot file is empty for ${result.name}: ${result.screenshot}`);
    }
    const dimensions = pngDimensions(normalizedScreenshotPath);
    if (!dimensions) {
      failures.push(`runtime proof screenshot is not a valid PNG for ${result.name}: ${result.screenshot}`);
    } else if (result.name === "mobile-library") {
      if (dimensions.width !== 390 || dimensions.height < 844) {
        failures.push(`mobile runtime proof screenshot dimensions drifted for ${result.name}: expected 390x844 or taller, found ${dimensions.width}x${dimensions.height}`);
      }
    } else if (dimensions.width !== 1440 || dimensions.height < 1040) {
      failures.push(`desktop runtime proof screenshot dimensions drifted for ${result.name}: expected 1440x1040 or taller, found ${dimensions.width}x${dimensions.height}`);
    }
  }
  for (const name of requiredNames) {
    if (!runtimeNames.includes(name)) failures.push(`runtime proof missing capture: ${name}`);
    if (!runtimeRequiredNames.includes(name)) failures.push(`runtime proof requiredProofNames missing: ${name}`);
  }
  for (const [name, expected] of Object.entries(expectedRuntimeCaptures)) {
    const result = runtimeResults.find((candidate) => candidate.name === name);
    if (!result) continue;
    if (result.roleTested !== expected.role) {
      failures.push(`runtime proof ${name} role drifted: expected ${expected.role}, found ${result.roleTested || "missing"}`);
    }
    const route = result.routeTested || "";
    const routeMatches = expected.route === "/" ? route === "/" : route.includes(expected.route);
    if (!routeMatches) {
      failures.push(`runtime proof ${name} route drifted: expected ${expected.route}, found ${route || "missing"}`);
    }
  }
  for (const publicRouteName of ["marketing-home", "public-portal"]) {
    const result = runtimeResults.find((candidate) => candidate.name === publicRouteName);
    if (result?.shell?.hasAuthenticatedShell) {
      failures.push(`runtime proof ${publicRouteName} must not render the authenticated DAM shell/sidebar`);
    }
  }
  for (const result of runtimeResults.filter((candidate) => !["marketing-home", "public-portal"].includes(candidate.name))) {
    if (!result.shell?.hasAuthenticatedShell) {
      failures.push(`runtime proof ${result.name} must render the canonical authenticated DAM shell`);
    }
  }
  const marketingProof = runtimeResults.find((result) => result.name === "marketing-home")?.interactionProof;
  for (const [field, label] of [
    ["noAuthenticatedShell", "no authenticated shell on public home"],
    ["tjcIdentityVisible", "TJC identity"],
    ["heroVisible", "church DAM hero"],
    ["embeddedMockupVisible", "embedded DAM mockup"],
    ["roleCardsVisible", "role cards"],
    ["resourceSpaceTruthVisible", "ResourceSpace truth copy"]
  ]) {
    if (!marketingProof?.[field]) {
      failures.push(`runtime proof marketing-home must show ${label}`);
    }
  }
  const libraryProof = runtimeResults.find((result) => result.name === "library-admin");
  if (!libraryProof?.shell || libraryProof.shell.assetCardCount < 12) {
    failures.push(`runtime proof library-admin must show at least 12 asset cards, found ${libraryProof?.shell?.assetCardCount ?? "missing"}`);
  }
  if (libraryProof?.populatedGridResult !== "pass") {
    failures.push(`runtime proof library-admin populatedGridResult must be pass, found ${libraryProof?.populatedGridResult || "missing"}`);
  }
  const libraryAdminProof = libraryProof?.interactionProof;
  for (const [field, label] of [
    ["selectedInspectorVisible", "selected asset inspector"],
    ["rightsSafeControlVisible", "rights-safe control"],
    ["filterControlsVisible", "saved views / filters controls"],
    ["bulkActionsVisible", "bulk action controls"],
    ["mediaFramesVisible", "asset card media frames"]
  ]) {
    if (!libraryAdminProof?.[field]) {
      failures.push(`runtime proof library-admin must show ${label}`);
    }
  }
  if ((libraryAdminProof?.assetCardCount || 0) < 12) {
    failures.push(`runtime proof library-admin interaction must count at least 12 asset cards, found ${libraryAdminProof?.assetCardCount ?? "missing"}`);
  }
  const cardTextCoverage = libraryAdminProof?.cardTextCoverage || {};
  if (!cardTextCoverage.total || cardTextCoverage.withText !== cardTextCoverage.total) {
    failures.push(`runtime proof library-admin must prove no blank asset cards, found ${cardTextCoverage.withText ?? "missing"} of ${cardTextCoverage.total ?? "missing"} with text`);
  }
  if ((libraryAdminProof?.mediaFrameCount || 0) < (libraryAdminProof?.assetCardCount || 0)) {
    failures.push(`runtime proof library-admin must prove every asset card has a media frame, found ${libraryAdminProof?.mediaFrameCount ?? "missing"} of ${libraryAdminProof?.assetCardCount ?? "missing"}`);
  }
  const libraryInteractionProof = runtimeResults.find((result) => result.name === "library-interactions-admin")?.interactionProof;
  for (const [field, label] of [
    ["savedViewsVisible", "saved views menu"],
    ["filtersVisible", "filters panel"],
    ["rightsSummaryVisible", "rights-safe summary"],
    ["opsModeVisible", "Browse/Ops state"],
    ["selectedInspectorVisible", "selected asset inspector"],
    ["commandPaletteVisible", "Command Center"],
    ["commandInputFocused", "Command Center input focus"],
    ["librarySharePanelVisible", "Library distribution request panel"],
    ["libraryShareDraftResponseVisible", "Library local-only share draft response"],
    ["libraryShareReadinessResponseVisible", "Library share readiness gate response"]
  ]) {
    if (!libraryInteractionProof?.[field]) {
      failures.push(`runtime proof library-interactions-admin must show ${label}`);
    }
  }
  if (libraryInteractionProof?.searchValue !== "needs review") {
    failures.push(`runtime proof library-interactions-admin saved view must update search to needs review, found ${libraryInteractionProof?.searchValue || "missing"}`);
  }
  const cardFocusProof = libraryInteractionProof?.cardFocusProof || {};
  if (!cardFocusProof.focused || cardFocusProof.outlineStyle === "none" || cardFocusProof.outlineWidth === "0px") {
    failures.push("runtime proof library-interactions-admin must prove asset card keyboard focus ring");
  }
  const cardHoverProof = libraryInteractionProof?.cardHoverProof || {};
  if (!cardHoverProof.hovered || !cardHoverProof.hoverVisualChanged) {
    failures.push("runtime proof library-interactions-admin must prove visible asset card hover state");
  }
  const collectionsProof = runtimeResults.find((result) => result.name === "collections-admin");
  if (!collectionsProof?.shell || collectionsProof.shell.collectionCardCount < 4) {
    failures.push(`runtime proof collections-admin must show at least 4 collection cards, found ${collectionsProof?.shell?.collectionCardCount ?? "missing"}`);
  }
  if ((collectionsProof?.interactionProof?.collectionCount || 0) < 4) {
    failures.push(`runtime proof collections-admin interaction must observe at least 4 collection cards, found ${collectionsProof?.interactionProof?.collectionCount ?? "missing"}`);
  }
  for (const [field, label] of [
    ["inspectorVisible", "collection inspector"],
    ["openCollectionVisible", "Open collection action"],
    ["shareResponseVisible", "share local-demo response"],
    ["downloadRestrictionVisible", "package download restriction"],
    ["readinessResponseVisible", "collection readiness response"]
  ]) {
    if (!collectionsProof?.interactionProof?.[field]) {
      failures.push(`runtime proof collections-admin must show ${label}`);
    }
  }
  const publicPortalProof = runtimeResults.find((result) => result.name === "public-portal")?.interactionProof;
  for (const [field, label] of [
    ["noAuthenticatedShell", "no authenticated shell"],
    ["tjcPortalIdentityVisible", "TJC collection identity"],
    ["accessCardVisible", "access/usage card"],
    ["usageNotesVisible", "usage notes"],
    ["assetGridVisible", "asset grid/readiness states"],
    ["noPublicLinkTruthVisible", "no-public-link truth boundary"],
    ["disabledDownload", "disabled Download all state"],
    ["requestResponseVisible", "local request response"],
    ["shareRestrictionVisible", "disabled share-link response"]
  ]) {
    if (!publicPortalProof?.[field]) {
      failures.push(`runtime proof public-portal must show ${label}`);
    }
  }
  const distributionProof = runtimeResults.find((result) => result.name === "distribution-admin")?.interactionProof;
  for (const [field, label] of [
    ["distributionListVisible", "distribution-set list"],
    ["detailPanelVisible", "selected distribution detail panel"],
    ["performanceCardsVisible", "local performance cards"],
    ["securityFieldsVisible", "security-forward fields"],
    ["noPublicUrlVisible", "no-public-URL truth boundary"],
    ["shareFlowVisible", "security-forward share-link flow"],
    ["draftOnlySaveVisible", "local-only draft save response"],
    ["noPublicUrlCopyVisible", "no-public-URL copy response"],
    ["readinessResponseVisible", "distribution readiness response"]
  ]) {
    if (!distributionProof?.[field]) {
      failures.push(`runtime proof distribution-admin must show ${label}`);
    }
  }
  const auditProof = runtimeResults.find((result) => result.name === "audit-admin")?.interactionProof;
  for (const [field, label] of [
    ["kpiCardsVisible", "audit KPI cards"],
    ["auditTableVisible", "governance audit table"],
    ["incidentRailVisible", "incidents/compliance rail"],
    ["remediationSignalsVisible", "warning/violation remediation signals"],
    ["quickRemediationVisible", "quick remediation actions"],
    ["exportDisabledResponseVisible", "disabled audit export response"],
    ["localFilterResponseVisible", "local-only audit filter response"],
    ["requestRightsResponseVisible", "request-rights remediation response"],
    ["revokeLinkResponseVisible", "revoke-link blocked response"],
    ["metadataFixResponseVisible", "metadata-fix pending-writeback response"],
    ["escalationResponseVisible", "violation escalation response"],
    ["expiringWarningRemediationVisible", "expiring-warning remediation route"]
  ]) {
    if (!auditProof?.[field]) {
      failures.push(`runtime proof audit-admin must show ${label}`);
    }
  }
  const settingsProof = runtimeResults.find((result) => result.name === "settings-integrations-admin")?.interactionProof;
  for (const [field, label] of [
    ["resourceSpaceCardVisible", "ResourceSpace read/no-write card"],
    ["identityLocalDemoVisible", "local-demo identity boundary"],
    ["custodyBoundaryVisible", "Shared Drive/ResourceSpace custody boundary"],
    ["apiWebhookPendingVisible", "API/webhook pending boundary"],
    ["syncSurfacesVisible", "metadata/taxonomy sync surfaces"],
    ["notificationLocalOnlyVisible", "notification local-only surface"],
    ["systemStatusLocalOnlyVisible", "local-only system status response"],
    ["mappingNoChangeVisible", "no-change integration mapping response"]
  ]) {
    if (!settingsProof?.[field]) {
      failures.push(`runtime proof settings-integrations-admin must show ${label}`);
    }
  }
  const mobileProof = runtimeResults.find((result) => result.name === "mobile-library")?.interactionProof;
  for (const [field, label] of [
    ["sheetVisible", "mobile asset detail sheet"],
    ["bottomNavVisible", "mobile bottom navigation"],
    ["companionVisible", "mobile companion viewer panel"],
    ["rightsRowVisible", "mobile rights-safe row"],
    ["downloadVisible", "mobile approved-copy download action"],
    ["shareGateResponseVisible", "mobile gated-share response"],
    ["sourceLockResponseVisible", "mobile source-lock response"],
    ["requestResponseVisible", "mobile review-request response"]
  ]) {
    if (!mobileProof?.[field]) {
      failures.push(`runtime proof mobile-library must show ${label}`);
    }
  }
  if ((mobileProof?.navCount || 0) > 5) {
    failures.push(`runtime proof mobile-library bottom nav must stay at 5 items or fewer, found ${mobileProof.navCount}`);
  }
  if ((mobileProof?.touchTargetCount || 0) < 1 || (mobileProof?.smallTouchTargetCount || 0) !== 0) {
    failures.push(`runtime proof mobile-library must prove practical touch targets, found ${mobileProof?.smallTouchTargetCount ?? "missing"} small of ${mobileProof?.touchTargetCount ?? "missing"}`);
  }
  const downloadCenterProof = runtimeResults.find((result) => result.name === "asset-detail-download-admin")?.interactionProof;
  for (const [field, label] of [
    ["downloadCenterVisible", "Download Center drawer"],
    ["originalRestrictionVisible", "original/source restriction"],
    ["elevatedRequestVisible", "elevated access request action"],
    ["renditionChoicesVisible", "rendition choices"],
    ["loggedDownloadNoticeVisible", "logged download notice"],
    ["elevatedAccessExplanationVisible", "elevated access explanation"]
  ]) {
    if (!downloadCenterProof?.[field]) {
      failures.push(`runtime proof asset-detail-download-admin must show ${label}`);
    }
  }
  const rolesProof = runtimeResults.find((result) => result.name === "roles-access-admin")?.interactionProof;
  for (const [field, label] of [
    ["surfaceVisible", "roles/access surface"],
    ["matrixVisible", "permissions matrix"],
    ["legalSimulationVisible", "Legal role simulation"],
    ["riskyNoGrantResponseVisible", "risky permission no-grant response"],
    ["deniedStateVisible", "permission-denied state"],
    ["roleStateCoverageVisible", "role empty/loading/error/permission-denied state coverage"]
  ]) {
    if (!rolesProof?.[field]) {
      failures.push(`runtime proof roles-access-admin must show ${label}`);
    }
  }
  const matrixFocusProof = rolesProof?.matrixFocusProof || {};
  if (!matrixFocusProof.focused || matrixFocusProof.outlineStyle === "none" || matrixFocusProof.outlineWidth === "0px") {
    failures.push("runtime proof roles-access-admin must prove keyboard focus ring on permission matrix cells");
  }
  const brandKitProof = runtimeResults.find((result) => result.name === "brand-kit-admin")?.interactionProof;
  for (const [field, label] of [
    ["guidanceSurfaceVisible", "TJC brand/media guidance surface"],
    ["shareDisabledResponseVisible", "local-demo disabled share response"],
    ["downloadDisabledResponseVisible", "local-demo disabled download kit response"]
  ]) {
    if (!brandKitProof?.[field]) {
      failures.push(`runtime proof brand-kit-admin must show ${label}`);
    }
  }
  const uploadProof = runtimeResults.find((result) => result.name === "upload-contributor-success");
  const requestsProof = runtimeResults.find((result) => result.name === "requests-after-upload");
  const reviewProof = runtimeResults.find((result) => result.name === "reviewer-workbench");
  const uploadInteractionProof = uploadProof?.interactionProof;
  const requestsInteractionProof = requestsProof?.interactionProof;
  const reviewInteractionProof = reviewProof?.interactionProof;
  for (const [field, label] of [
    ["submittedEventVisible", "submitted upload title"],
    ["queuedSuccessVisible", "queued intake success state"],
    ["needsReviewVisible", "Needs Review default"],
    ["doNotPublishVisible", "Do Not Publish default"],
    ["resourceSpaceNoWriteVisible", "ResourceSpace no-write truth boundary"],
    ["stateCoverageVisible", "empty/loading/error/permission-denied state coverage"]
  ]) {
    if (!uploadInteractionProof?.[field]) {
      failures.push(`runtime proof upload-contributor-success must show ${label}`);
    }
  }
  for (const [field, label] of [
    ["submittedUploadVisible", "newly submitted upload ticket"],
    ["localQueueTruthVisible", "local queue truth boundary"],
    ["waitingFilterVisible", "Waiting request filter"],
    ["closedFilterVisible", "Closed request filter"],
    ["askInfoLocalDemoVisible", "Ask info local-demo response"]
  ]) {
    if (!requestsInteractionProof?.[field]) {
      failures.push(`runtime proof requests-after-upload must show ${label}`);
    }
  }
  for (const [field, label] of [
    ["submittedUploadVisible", "newly submitted upload ticket"],
    ["intakeTruthBoundaryVisible", "intake truth boundary"],
    ["approvalWorkspaceSurfaceVisible", "reviewer approval workspace surfaces"],
    ["annotationPinsVisible", "annotation pins"],
    ["openRequestActionVisible", "Open request action"],
    ["directApprovalBlocked", "direct approval blocked for intake tickets"]
  ]) {
    if (!reviewInteractionProof?.[field]) {
      failures.push(`runtime proof reviewer-workbench must show ${label}`);
    }
  }
  const submittedEventName = uploadProof?.submittedEventName;
  if (!submittedEventName || !/^Runtime Proof \d+$/.test(submittedEventName)) {
    failures.push(`runtime proof upload submittedEventName missing or malformed: ${submittedEventName || "missing"}`);
  } else {
    if (uploadProof?.interactionProof?.submittedEventName !== submittedEventName) {
      failures.push("runtime proof upload interaction submittedEventName must match top-level submittedEventName");
    }
    for (const [name, proof, requiredText] of [
      ["upload-contributor-success", uploadProof, /Needs Review|Do Not Publish|ResourceSpace written: no|Intake packet submitted/i],
      ["requests-after-upload", requestsProof, /Local queue|Portal ticket|does not approve assets|write source truth/i],
      ["reviewer-workbench", reviewProof, /Upload tickets do not approve|must become a reviewed asset|No source mutation/i]
    ]) {
      const sample = proof?.textSample || "";
      if (!sample.includes(submittedEventName)) {
        failures.push(`runtime proof ${name} must show submitted upload title: ${submittedEventName}`);
      }
      if (!requiredText.test(sample)) {
        failures.push(`runtime proof ${name} missing workflow-truth text near submitted upload`);
      }
    }
  }
  for (const term of forbiddenTerms) {
    if (!runtimeForbiddenTerms.includes(term)) failures.push(`runtime proof forbiddenTerms missing: ${term}`);
  }
  if (runtimeForbiddenTerms.length !== expectedForbiddenTerms.length) {
    failures.push(`runtime proof forbiddenTerms must contain ${expectedForbiddenTerms.length} terms, found ${runtimeForbiddenTerms.length}`);
  }
  for (const term of runtimeForbiddenTerms) {
    if (!expectedForbiddenTerms.includes(term)) failures.push(`runtime proof forbiddenTerms contains unexpected term: ${term}`);
  }
  if (runtimeAggregate.routeCount !== requiredNames.length) {
    failures.push(`runtime proof aggregate routeCount must be ${requiredNames.length}, found ${runtimeAggregate.routeCount ?? "missing"}`);
  }
  for (const key of [
    "missingRequiredProofs",
    "bannedCopyFailures",
    "outerFrameFailures",
    "horizontalOverflowFailures",
    "failedRequestRoutes",
    "consoleIssueRoutes",
    "populatedGridWarnings",
    "interactionFailures"
  ]) {
    const value = runtimeAggregate[key];
    if (!Array.isArray(value)) {
      failures.push(`runtime proof aggregate ${key} must be an array`);
      continue;
    }
    if (value.length) {
      failures.push(`runtime proof reports ${key}: ${JSON.stringify(value)}`);
    }
  }
}

if (failures.length) {
  console.error("product-wide parity proof test failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("product-wide parity proof test passed.");
