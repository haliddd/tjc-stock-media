#!/usr/bin/env node
import playwright from "../frontend/node_modules/playwright/index.js";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

execFileSync(process.execPath, ["scripts/safe-lane-headroom-guard.mjs"], {
  stdio: "inherit",
  env: { ...process.env, SAFE_LANE_HEADROOM_CONTEXT: "browser-qa" }
});

const { chromium } = playwright;
const base = process.env.BASE_URL || "http://localhost:4871";
const trustedHeaderQa = process.env.PORTAL_QA_TRUSTED_HEADERS === "1";
let betaAuthProbe = null;
const outDir = path.resolve(process.env.PORTAL_BROWSER_QA_SCREENSHOT_DIR || "docs/screenshots/team-beta-ui-ux-final-2026-06-23");
const tinyPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=", "base64");
const preferredDetailAssetId = "368";
const preferredUnsafeAssetId = "644";
const fullBrowserQa = process.env.PORTAL_BROWSER_QA_FULL === "1";

fs.mkdirSync(path.join(outDir, "qa"), { recursive: true });
fs.mkdirSync(path.join(outDir, "primitive-proof"), { recursive: true });

const proofViewports = fullBrowserQa
  ? [
      { label: "1440", width: 1440, height: 1000 },
      { label: "1280", width: 1280, height: 1000 },
      { label: "1024", width: 1024, height: 1000 },
      { label: "768", width: 768, height: 1000 },
      { label: "390", width: 390, height: 900 },
      { label: "320", width: 320, height: 900 }
    ]
  : [
      { label: "1440", width: 1440, height: 1000 },
      { label: "390", width: 390, height: 900 },
      { label: "320", width: 320, height: 900 }
    ];

function proofShots(slug, pathName, role) {
  return proofViewports.map((viewport) => ({
    name: `${slug}-${viewport.label}.png`,
    path: pathName,
    role,
    width: viewport.width,
    height: viewport.height
  }));
}

const coreRequiredShots = fullBrowserQa ? [
  ...proofShots("library-viewer", "/library?role=Viewer", "Viewer"),
  ...proofShots("library-contributor", "/library?role=Contributor", "Contributor"),
  ...proofShots("library-reviewer", "/library?role=Reviewer", "Reviewer"),
  ...proofShots("library-admin", "/library?role=DAM%20Admin", "DAM Admin"),
  ...proofShots("asset-detail-viewer", "/assets/368?role=Viewer", "Viewer"),
  ...proofShots("upload-contributor", "/upload?role=Contributor", "Contributor"),
  ...proofShots("review-reviewer", "/review?role=Reviewer", "Reviewer"),
  ...proofShots("review-detail-reviewer", "/review/644?role=Reviewer", "Reviewer"),
  ...proofShots("requests-reviewer", "/requests?role=Reviewer", "Reviewer"),
  ...proofShots("collections-viewer", "/collections?role=Viewer", "Viewer"),
  ...proofShots("collection-detail-viewer", "/collections/album%3Amvp-2024-first-batch?role=Viewer", "Viewer"),
  ...proofShots("distribution-sets-viewer", "/distribution-sets?role=Viewer", "Viewer"),
  ...proofShots("admin-users", "/admin/users?role=DAM%20Admin", "DAM Admin"),
  ...proofShots("admin-taxonomy", "/admin/taxonomy?role=DAM%20Admin", "DAM Admin"),
  ...proofShots("brand-hub-admin", "/brand-hub?role=DAM%20Admin", "DAM Admin"),
  ...proofShots("insights-admin", "/insights?role=DAM%20Admin", "DAM Admin"),
  ...proofShots("admin-settings", "/admin/settings?role=DAM%20Admin", "DAM Admin")
] : [
  ...proofShots("library-viewer", "/library?role=Viewer", "Viewer"),
  ...proofShots("upload-contributor", "/upload?role=Contributor", "Contributor"),
  ...proofShots("review-reviewer", "/review?role=Reviewer", "Reviewer"),
  ...proofShots("asset-detail-viewer", "/assets/368?role=Viewer", "Viewer"),
  ...proofShots("admin", "/admin?role=DAM%20Admin", "DAM Admin")
];

const extendedRequiredShots = [
  ...proofShots("my-tasks-viewer", "/my-tasks?role=Viewer", "Viewer"),
  ...proofShots("help-viewer", "/help?role=Viewer", "Viewer"),
  ...proofShots("recent-uploads-contributor", "/recent-uploads?role=Contributor", "Contributor")
];

const requiredShots = fullBrowserQa ? [...coreRequiredShots, ...extendedRequiredShots] : coreRequiredShots;

const qaViewports = fullBrowserQa ? [1440, 1280, 1024, 768, 390, 320] : [1440, 320];
const coreQaPaths = [
  { path: "/", role: "Viewer", label: "library-viewer" },
  { path: "/", role: "Reviewer", label: "library-reviewer" },
  { path: "/?view=website-hero", role: "Viewer", label: "library-website-hero" },
  { path: "/?view=needs-review", role: "Viewer", label: "viewer-needs-review-hidden" },
  { path: "/assets/368", role: "Viewer", label: "detail-approved-viewer" },
  { path: "/assets/644", role: "Viewer", label: "detail-unsafe-viewer" },
  { path: "/assets/644", role: "Reviewer", label: "detail-unsafe-reviewer" },
  { path: "/upload", role: "Viewer", label: "upload-viewer" },
  { path: "/upload", role: "Contributor", label: "upload-contributor" },
  { path: "/review", role: "Viewer", label: "review-viewer" },
  { path: "/review?queue=pending", role: "Reviewer", label: "review-reviewer" },
  { path: "/distribution-sets", role: "Viewer", label: "packages-viewer" },
  { path: "/distribution-sets", role: "Reviewer", label: "packages-reviewer" },
  { path: "/admin", role: "Viewer", label: "admin-viewer" },
  { path: "/admin", role: "DAM Admin", label: "admin-dam-admin" }
];

const extendedQaPaths = [
  { path: "/collections", role: "Viewer", label: "collections-viewer" },
  { path: "/collections/album%3Amvp-2024-first-batch", role: "Viewer", label: "collection-detail-viewer" },
  { path: "/requests", role: "Reviewer", label: "requests-reviewer" },
  { path: "/admin/users", role: "DAM Admin", label: "admin-users" },
  { path: "/admin/taxonomy", role: "DAM Admin", label: "admin-taxonomy" },
  { path: "/brand-hub", role: "DAM Admin", label: "brand-hub-admin" },
  { path: "/insights", role: "DAM Admin", label: "insights-admin" },
  { path: "/admin/settings", role: "DAM Admin", label: "admin-settings" },
  { path: "/my-tasks", role: "Viewer", label: "my-tasks-viewer" },
  { path: "/help", role: "Viewer", label: "help-viewer" },
  { path: "/recent-uploads", role: "Contributor", label: "recent-uploads-contributor" }
];

const qaPaths = fullBrowserQa ? [...coreQaPaths, ...extendedQaPaths] : coreQaPaths;

const qaAsset = {
  detail: { id: preferredDetailAssetId, path: `/assets/${preferredDetailAssetId}`, title: "Bench Bible", available: true },
  unsafe: { id: preferredUnsafeAssetId, path: `/assets/${preferredUnsafeAssetId}`, title: "" }
};

async function launchBrowser() {
  const launchOptions = { headless: true };
  if (process.env.PLAYWRIGHT_CHROME_CHANNEL) launchOptions.channel = process.env.PLAYWRIGHT_CHROME_CHANNEL;
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await chromium.launch(launchOptions);
    } catch (error) {
      lastError = error;
      if (!isTransientBrowserTargetClose(error) && !/browserType\.launch/i.test(String(error?.message || error))) throw error;
      await new Promise((resolve) => setTimeout(resolve, 750 * (attempt + 1)));
    }
  }
  throw lastError;
}

let browser = await launchBrowser();
const failures = [];
const warnings = [];
const consoleErrors = [];
const expectedDeniedConsole = [];
const networkFailures = [];

const normalUserRoles = new Set(["Viewer", "Contributor"]);
const normalUserOpsLeakPatterns = [
  /Shared Drive/i,
  /pending writes?/i,
  /API mapping/i,
  /launch gate/i,
  /diagnostics?/i,
  /metadata health/i,
  /raw totals?/i,
  /source[- ]of[- ]truth/i,
  /field refs?/i,
  /source path/i,
  /master drive/i,
  /master\/original path/i,
  /master files?/i,
  /original filename/i,
  /checksum/i,
  /raw ResourceSpace/i,
  /ResourceSpace ID/i,
  /[a-f0-9]{32,}/i
];

function isExpectedDeniedConsole(text) {
  return /Failed to load resource: the server responded with a status of (400|403|404|409|503)/.test(text);
}

function isTransientBrowserTargetClose(error) {
  return /Target page, context or browser has been closed|ERR_ABORTED|frame was detached/i.test(String(error?.message || error));
}

function isTransientNavigationError(error) {
  return /Timeout .* exceeded|Navigation timeout|ERR_CONNECTION_REFUSED|ECONNREFUSED|ERR_EMPTY_RESPONSE|Target page, context or browser has been closed/i.test(String(error?.message || error));
}

function trustedRoleHeaders(role) {
  if (!trustedHeaderQa || !role) return {};
  const email = `${String(role).replace(/\s+/g, "-")}@portal-browser-qa.local`;
  return {
    "x-tjc-role": role,
    "x-auth-request-email": email,
    "cf-access-jwt-assertion": "portal-browser-qa-placeholder-token",
    "cf-access-authenticated-user-email": email,
    "cf-access-groups": role
  };
}

function betaPasswordForRole(role) {
  const envByRole = {
    Viewer: "BETA_VIEWER_PASSWORD",
    Contributor: "BETA_CONTRIBUTOR_PASSWORD",
    Reviewer: "BETA_REVIEWER_PASSWORD",
    "DAM Admin": "BETA_ADMIN_PASSWORD"
  };
  const envName = envByRole[role];
  return envName ? process.env[envName] || "" : "";
}

async function betaAuthState() {
  if (betaAuthProbe) return betaAuthProbe;
  try {
    const response = await fetch(new URL("/api/beta-auth/session", base), {
      headers: { Accept: "application/json", ...trustedRoleHeaders("Viewer") }
    });
    const payload = await response.json().catch(() => null);
    betaAuthProbe = { enabled: payload?.enabled === true, status: response.status };
  } catch (error) {
    betaAuthProbe = { enabled: false, status: 0, error: String(error?.message || error) };
  }
  return betaAuthProbe;
}

async function establishBetaSession(context, role) {
  const state = await betaAuthState();
  if (!state.enabled) return;
  const password = betaPasswordForRole(role);
  if (!password) {
    throw new Error(`BETA auth is enabled but ${role} password env is missing for browser QA`);
  }
  const response = await context.request.post(new URL("/api/beta-auth/login", base).toString(), {
    headers: { "Content-Type": "application/json", ...trustedRoleHeaders(role) },
    data: { role, password, returnTo: "/" }
  });
  if (!response.ok()) {
    const body = await response.text().catch(() => "");
    throw new Error(`BETA login failed for ${role}: HTTP ${response.status()} ${body.slice(0, 300)}`);
  }
}

function roleFromPathname(pathname) {
  try {
    const url = new URL(pathname, base);
    return url.searchParams.get("role") || "";
  } catch {
    return "";
  }
}

function visibleOpsLeaks(text) {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalUserOpsLeakPatterns
    .filter((pattern) => pattern.test(normalized))
    .map((pattern) => pattern.source)
    .slice(0, 8);
}

function decodedHrefOpsLeaks(href) {
  const raw = String(href || "");
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    decoded = raw;
  }
  return visibleOpsLeaks(decoded);
}

async function closeContext(context) {
  await Promise.race([
    context.close(),
    new Promise((resolve) => setTimeout(resolve, 2500))
  ]).catch(() => {});
}

async function withTimeout(label, ms, work) {
  let timer;
  try {
    return await Promise.race([
      work(),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function newRolePage(role, width, height) {
  if (!browser.isConnected()) browser = await launchBrowser();
  let context;
  try {
    context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1,
      extraHTTPHeaders: trustedRoleHeaders(role)
    });
  } catch (error) {
    if (!isTransientBrowserTargetClose(error)) throw error;
    browser = await launchBrowser();
    context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1,
      extraHTTPHeaders: trustedRoleHeaders(role)
    });
  }
  await context.addInitScript((nextRole) => window.localStorage.setItem("tjc-demo-role", nextRole), role);
  await establishBetaSession(context, role);
  let page;
  try {
    page = await context.newPage();
  } catch (error) {
    if (!isTransientBrowserTargetClose(error)) throw error;
    await closeContext(context);
    browser = await launchBrowser();
    context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1,
      extraHTTPHeaders: trustedRoleHeaders(role)
    });
    await context.addInitScript((nextRole) => window.localStorage.setItem("tjc-demo-role", nextRole), role);
    await establishBetaSession(context, role);
    page = await context.newPage();
  }
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const item = { role, width, text: msg.text().slice(0, 300) };
    if (isExpectedDeniedConsole(item.text)) expectedDeniedConsole.push(item);
    else consoleErrors.push(item);
  });
  page.on("requestfailed", (request) => {
    const url = request.url();
    const failure = request.failure()?.errorText || "request failed";
    if (!url.startsWith(base)) return;
    if (failure === "net::ERR_ABORTED" && url.includes("_rsc=")) return;
    if (failure === "net::ERR_ABORTED" && url.includes("/_next/static/")) return;
    if (failure === "net::ERR_ABORTED" && url.includes("/api/assets/thumbnail/")) return;
    if (failure === "net::ERR_ABORTED" && url.includes("/api/assets/search?limit=1&role=Viewer")) return;
    networkFailures.push({ role, width, url, error: failure });
  });
  return { page, context };
}

async function openCommandPalette(page) {
  const commandSearch = page.getByLabel("Command search", { exact: true });
  const trigger = page.locator('button[aria-label="Open command palette"]:visible').first();
  await trigger.waitFor({ state: "visible", timeout: 10000 });
  for (let attempt = 0; attempt < 4; attempt += 1) {
    if (await commandSearch.isVisible().catch(() => false)) return commandSearch;
    if (attempt % 2 === 0) {
      await trigger.click();
    } else {
      await page.keyboard.press(process.platform === "darwin" ? "Meta+K" : "Control+K");
    }
    await page.waitForTimeout(350);
  }
  await commandSearch.waitFor({ state: "visible", timeout: 10000 });
  return commandSearch;
}

async function gotoAndSettle(page, url) {
  let response;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      response = await page.goto(url, { waitUntil: "load", timeout: 60000 });
      break;
    } catch (error) {
      const message = String(error?.message || error);
      if (isTransientNavigationError(error) && attempt < 3) {
        await page.waitForTimeout(750 * (attempt + 1));
        continue;
      }
      if (!/ERR_ABORTED|frame was detached/i.test(message)) throw error;
      response = { status: () => 200 };
      await page.waitForLoadState("domcontentloaded", { timeout: 5000 }).catch(() => {});
      break;
    }
  }
  await page.waitForLoadState("networkidle", { timeout: 1500 }).catch(() => {});
  await page.waitForTimeout(500);
  return response;
}

async function waitForAppReady(page, routePath, role) {
  const pathname = new URL(routePath, base).pathname;
  await page.locator(".proto-page h1, .proto-page-header h1, h1").first().waitFor({ state: "visible", timeout: 30000 }).catch(() => {});
  await page.waitForFunction(() => !/This page could not be found|^404\\s/m.test(document.body.innerText || ""), null, { timeout: 3000 }).catch(() => {});
  await page.waitForFunction(() => !/Loading ResourceSpace data/i.test(document.body.innerText || ""), null, { timeout: 30000 }).catch(() => {});
  if (pathname === "/" || pathname === "/library") {
    await page.getByLabel(/Search DAM assets|Search media library/i).first().waitFor({ state: "visible", timeout: 30000 }).catch(() => {});
    await page.locator(".proto-asset-card, .ed-mobile-card-list article, .ed-grid .ed-asset-card, .ed-desktop-table tbody tr, .ed-empty-state").first().waitFor({ state: "visible", timeout: 30000 }).catch(() => {});
  }
  if (pathname === "/upload") {
    await page.locator(".proto-upload-meter, .damx-upload-page").first().waitFor({ state: "visible", timeout: 30000 }).catch(() => {});
  }
  if (pathname.startsWith("/assets/")) {
    await page.locator(".proto-detail-preview, .proto-asset-detail-grid, .ed-asset-detail").first().waitFor({ state: "visible", timeout: 30000 }).catch(() => {});
  }
  if (pathname === "/collections" || pathname.startsWith("/collections/")) {
    await page.locator(".proto-collection-card, .proto-collection-tile, .proto-collection-detail, .proto-data-table, .ed-collection-card").first().waitFor({ state: "visible", timeout: 30000 }).catch(() => {});
  }
  if (pathname === "/distribution-sets" || pathname.startsWith("/distribution-sets/")) {
    await page.locator(".proto-distribution-panel, .proto-collection-detail, .ed-builder-grid, .ed-empty-state").first().waitFor({ state: "visible", timeout: 30000 }).catch(() => {});
  }
  if (pathname === "/requests" || pathname.startsWith("/requests/")) {
    await page.locator(".proto-requests-table .proto-table-row, .proto-request-panel, .ed-requests-table").first().waitFor({ state: "visible", timeout: 30000 }).catch(() => {});
  }
  if (pathname === "/admin/users") {
    await page.locator(".proto-user-permissions, .proto-users-table .proto-table-row").first().waitFor({ state: "visible", timeout: 30000 }).catch(() => {});
  }
  if (pathname.startsWith("/admin") || pathname === "/brand-hub" || pathname === "/insights") {
    await page.locator(".proto-schema-card, .proto-admin-meta-grid, .ed-admin-page, .ed-brand-page").first().waitFor({ state: "visible", timeout: 30000 }).catch(() => {});
  }
  if (pathname === "/packages") {
    await page.locator(".proto-collection-detail, .proto-distribution-panel, .ed-builder-grid, .ed-empty-state").first().waitFor({ state: "visible", timeout: 30000 }).catch(() => {});
  }
  if (pathname === "/review" && (role === "Reviewer" || role === "DAM Admin")) {
    await page.waitForFunction(() => !/Loading ResourceSpace review queue/i.test(document.body.innerText || ""), null, { timeout: 30000 }).catch(() => {});
    await page.waitForFunction(() => !/Loading review queue/i.test(document.body.innerText || ""), null, { timeout: 30000 }).catch(() => {});
    await page.locator(".proto-review-table .proto-table-row:not(.proto-skeleton-row), .ed-review-list .ed-queue-item, [aria-label=\"Review decision actions\"]").first().waitFor({ state: "visible", timeout: 30000 })
      .catch(() => page.getByText(/Evidence and next action|Review Evidence/i).first().waitFor({ state: "visible", timeout: 30000 }).catch(() => {}));
  }
  if (pathname.startsWith("/review/") && (role === "Reviewer" || role === "DAM Admin")) {
    await page.locator(".proto-comparison-panel, .proto-decision-card, [aria-label=\"Review decision actions\"]").first().waitFor({ state: "visible", timeout: 30000 }).catch(() => {});
  }
}

function normalizedActiveLabel(label) {
  return String(label || "")
    .replace(/\s+/g, " ")
    .replace(/(\D)\d+$/, "$1")
    .trim();
}

async function activeSidebarLabels(page) {
  const labels = await page.locator('[data-sidebar="menu-button"][data-active], [data-sidebar="menu-button"][data-active="true"], a[aria-current="page"]').evaluateAll((nodes) => nodes
    .map((node) => (node.textContent || "").replace(/\s+/g, " ").trim())
    .filter(Boolean));
  return [...new Set(labels.map(normalizedActiveLabel).filter(Boolean))];
}

async function assertRouteIdentity({ path: pathName, role, h1, activeLabel, primarySection, forbiddenPrimaryH1 }) {
  const { page, context } = await newRolePage(role, 1440, 1000);
  try {
    await gotoAndSettle(page, `${base}${pathName}`);
    await waitForAppReady(page, pathName, role);
    const firstH1 = (await page.locator("h1").first().innerText().catch(() => "")).replace(/\s+/g, " ").trim();
    if (firstH1 !== h1) failures.push(`${pathName}: expected primary H1 ${h1}, saw "${firstH1}"`);
    if (forbiddenPrimaryH1 && firstH1 === forbiddenPrimaryH1) failures.push(`${pathName}: primary H1 masquerades as ${forbiddenPrimaryH1}`);
    const primaryFallback = primarySection === "requests-table"
      ? ".proto-requests-table"
      : primarySection === "packages-builder"
        ? ".proto-distribution-panel, .proto-collection-detail"
        : "";
    if ((await page.locator(`[data-primary-section="${primarySection}"]${primaryFallback ? `, ${primaryFallback}` : ""}`).count()) < 1) failures.push(`${pathName}: primary data section ${primarySection} missing`);
    const activeLabels = await activeSidebarLabels(page);
    if (activeLabels.length > 0 && !activeLabels.some((label) => label.includes(activeLabel))) {
      failures.push(`${pathName}: sidebar active mismatch expected ${activeLabel}, got ${JSON.stringify(activeLabels)}`);
    }
  } finally {
    await closeContext(context);
  }
}

async function waitForVisibleText(page, text, timeout = 5000) {
  await page.getByText(text).first().waitFor({ state: "visible", timeout }).catch(() => {});
}

async function waitForVisibleImages(page) {
  await page.waitForFunction(() => {
    const visibleImages = [...document.images].filter((img) => {
      const rect = img.getBoundingClientRect();
      return rect.width > 20 && rect.height > 20 && rect.bottom > 0 && rect.top < window.innerHeight;
    });
    return visibleImages.every((img) => img.complete && img.naturalWidth > 0);
  }, { timeout: 5000 }).catch(() => {});
}

async function saveFullPageScreenshot(page, screenshotPath) {
  await page.waitForLoadState("domcontentloaded", { timeout: 5000 }).catch(() => {});
  let style = null;
  try {
    style = await page.addStyleTag({
      content: ".dam-app-header{position:static!important;top:auto!important}"
    });
  } catch (error) {
    if (!/Execution context was destroyed|navigation/i.test(String(error?.message || error))) throw error;
    await page.waitForLoadState("domcontentloaded", { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(250);
    style = await page.addStyleTag({
      content: ".dam-app-header{position:static!important;top:auto!important}"
    }).catch(() => null);
  }
  try {
    await withTimeout(`screenshot ${screenshotPath}`, 15000, () => page.screenshot({ path: screenshotPath, fullPage: false }));
  } finally {
    await style?.evaluate((node) => node.remove()).catch(() => {});
  }
}

async function fillUploadContextStep(page, prefix = "Browser QA") {
  await page.getByLabel(/Event name/i).fill(`${prefix} photo submission`);
  await page.getByLabel(/^Date/i).fill("2026-06-06");
  await page.getByLabel(/Ministry \/ team/i).fill("Internet Ministry");
  await page.getByLabel(/Photographer \/ source/i).fill("QA reviewer");
  await page.getByLabel(/^Location$/i).fill("TJC local church");
}

async function fillUploadRightsStep(page) {
  await page.getByLabel(/Notes for reviewers/i).fill("Browser QA note for reviewer packet.");
  const moreDetails = page.locator(".damx-more-details:visible").first();
  if ((await moreDetails.count()) > 0 && !(await moreDetails.evaluate((node) => node.hasAttribute("open")).catch(() => false))) {
    await moreDetails.locator("summary").click();
  }
  const tags = page.getByLabel("Suggested tags", { exact: true });
  if ((await tags.count()) > 0) await tags.fill("Bible, worship");
}

async function clickUploadNext(page) {
  const next = page.locator(".damx-sticky-actions button:visible", { hasText: "Next" }).last();
  await next.waitFor({ state: "visible", timeout: 30000 });
  await next.scrollIntoViewIfNeeded().catch(() => {});
  await next.click();
}

async function clickUploadAction(page, label) {
  const action = page.locator(".damx-sticky-actions button:visible", { hasText: label }).last();
  await action.waitFor({ state: "visible", timeout: 30000 });
  await action.scrollIntoViewIfNeeded().catch(() => {});
  await action.click();
}

async function advanceUploadToFiles(page, prefix = "Browser QA") {
  void prefix;
}

function uploadPhotoInput(page) {
  return page.getByLabel("Upload photos from computer", { exact: true })
    .or(page.locator(".proto-dropzone input[type='file']"));
}

function googleDriveInput(page) {
  return page.getByLabel("Paste Google Drive link", { exact: true })
    .or(page.getByLabel("Source link", { exact: true }));
}

function selectedFilePreview(page) {
  return page.getByLabel("Selected photos and links")
    .or(page.locator(".proto-upload-queue"));
}

async function isPrototypeUploadPage(page) {
  return (await page.locator(".proto-upload-page").count()) > 0;
}

async function fillReviewEvidence(page, note) {
  const panel = page.locator('[data-component="ReviewActionEvidencePanel"]:visible').last();
  await panel.getByLabel("Review note").fill(note);
  for (const label of ["Source evidence", "Proof link or note", "Owner/license evidence", "People/minors status", "Children/youth review", "Usage scope", "Approved derivative", "Sensitive context review", "Credit requirement evidence"]) {
    await panel.getByLabel(label).check();
  }
}

async function inspectPage(page, expected) {
  return page.evaluate((expectedPage) => {
    const doc = document.documentElement;
    const visibleText = document.body.innerText || document.body.textContent || "";
    const visibleImages = [...document.images].filter((img) => {
      const rect = img.getBoundingClientRect();
      return rect.width > 20 && rect.height > 20 && rect.bottom > 0 && rect.top < window.innerHeight;
    });
    const brokenImages = visibleImages
      .filter((img) => (img.currentSrc || img.src) && (!img.complete || img.naturalWidth === 0))
      .map((img) => img.currentSrc || img.src)
      .slice(0, 5);
      const clippedControls = [...document.querySelectorAll("button, a, select, input")]
      .filter((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return false;
        if (el.closest(".dam-tabs-scroll")) return false;
        if (el.closest(".ed-filter-bar, .ed-bulk-toolbar")) return false;
        return rect.right > window.innerWidth + 2 || rect.left < -2;
      })
      .map((el) => ({
        text: (el.textContent || el.getAttribute("aria-label") || el.getAttribute("placeholder") || el.tagName).trim().slice(0, 80),
        right: el.getBoundingClientRect().right
      }))
      .slice(0, 10);
    const headerControls = [...document.querySelectorAll("header a, header button, header select, header [data-header-control]")]
      .filter((el) => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && rect.bottom > 0;
      })
      .map((el, index) => {
        const rect = el.getBoundingClientRect();
        return {
          index,
          label: (el.textContent || el.getAttribute("aria-label") || el.tagName).trim().replace(/\s+/g, " ").slice(0, 80),
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom
        };
      });
    const headerOverlaps = [];
    for (let index = 0; index < headerControls.length; index += 1) {
      for (let next = index + 1; next < headerControls.length; next += 1) {
        const a = headerControls[index];
        const b = headerControls[next];
        const xOverlap = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const yOverlap = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (xOverlap > 2 && yOverlap > 2) {
          headerOverlaps.push(`${a.label || a.index} <> ${b.label || b.index}`);
        }
      }
    }
    const fixedMobileNavs = [...document.querySelectorAll('nav[aria-label="Primary navigation"]')]
      .filter((el) => {
        const rect = el.getBoundingClientRect();
        const parent = el.parentElement;
        const style = window.getComputedStyle(el);
        const parentStyle = parent ? window.getComputedStyle(parent) : null;
        const positionedFixed = style.position === "fixed" || parentStyle?.position === "fixed";
        return positionedFixed && rect.width > 0 && rect.height > 0 && rect.bottom > window.innerHeight - 120;
      })
      .map((el) => (el.textContent || el.getAttribute("aria-label") || "mobile nav").trim().replace(/\s+/g, " "));
    const mailtoHrefs = [...document.querySelectorAll('a[href^="mailto:"]')]
      .map((el) => el.getAttribute("href") || "")
      .slice(0, 20);
    return {
      expected: expectedPage,
      title: document.title,
      h1: document.querySelector("h1")?.textContent?.trim() || "",
      url: location.href,
      width: window.innerWidth,
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      overflowX: doc.scrollWidth > doc.clientWidth + 1,
      brokenImages,
      clippedControls,
      headerOverlaps: headerOverlaps.slice(0, 10),
      fixedMobileNavs,
      mailtoHrefs,
    hasBlockedDownload: visibleText.includes("Download unavailable") || visibleText.includes("Downloads blocked") || visibleText.includes("Download blocked") || visibleText.includes("Needs review") || visibleText.includes("Review required before use") || visibleText.includes("Source file restricted") || visibleText.includes("Request DAM review") || visibleText.includes("Request-only") || visibleText.includes("Preview protected"),
      hasReviewBlocker: visibleText.includes("Decision locked") || visibleText.includes("Complete required evidence before approval") || visibleText.includes("Review blocked") || visibleText.includes("Evidence required"),
      hasViewerReviewBlock: visibleText.includes("Review inbox requires reviewer access"),
      hasViewerUploadBlock: visibleText.includes("Sharing photos requires Contributor access"),
      hasAdminBlock: visibleText.includes("Governance requires DAM Admin role"),
      hasOriginalFilenameOnCard: [...document.querySelectorAll('[aria-label="Source metadata"]')].some((el) => (el.textContent || "").includes("Original:")),
      missingTabControls: [...document.querySelectorAll('[role="tab"][aria-controls]')]
        .map((el) => el.getAttribute("aria-controls"))
        .filter((id) => id && !document.getElementById(id))
        .slice(0, 10),
      visibleText: visibleText.replace(/\s+/g, " ").trim(),
      textSample: visibleText.replace(/\s+/g, " ").trim().slice(0, 220)
    };
  }, expected);
}

async function inspectPageAfterSettledNavigation(page, expected) {
  try {
    return await inspectPage(page, expected);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/Execution context was destroyed|navigation/i.test(message)) throw error;
    await page.waitForLoadState("domcontentloaded", { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(250);
    return inspectPage(page, expected);
  }
}

async function inspectPremiumPolish(page) {
  return page.evaluate(() => {
    const visible = (el) => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return rect.width > 8 && rect.height > 8 && style.visibility !== "hidden" && style.display !== "none" && Number(style.opacity) > 0.05;
    };
    const unfinishedSelects = [...document.querySelectorAll("main select, #main-content select")]
      .filter(visible)
      .filter((el) => {
        const style = window.getComputedStyle(el);
        const radius = Number.parseFloat(style.borderRadius || "0");
        const paddingRight = Number.parseFloat(style.paddingRight || "0");
        const hasArrowAsset = style.backgroundImage && style.backgroundImage !== "none";
        return radius < 6 || !hasArrowAsset || paddingRight < 24 || el.scrollWidth > el.clientWidth + 2;
      })
      .map((el) => (el.getAttribute("aria-label") || el.closest("label")?.textContent || el.textContent || "select").trim().replace(/\s+/g, " ").slice(0, 80))
      .slice(0, 8);
    const overflowingBadges = [...document.querySelectorAll(".ed-badge, .ed-admin-status, .ed-review-row-meta em")]
      .filter(visible)
      .filter((el) => el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 2)
      .map((el) => (el.textContent || "badge").trim().replace(/\s+/g, " ").slice(0, 80))
      .slice(0, 8);
    return {
      unfinishedSelects,
      overflowingBadges,
      quietEmptyStates: document.querySelectorAll(".ed-empty-state.is-quiet").length
    };
  });
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function fetchQaJson(pathname, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const role = roleFromPathname(pathname);
    const response = await fetch(new URL(pathname, base), {
      headers: { Accept: "application/json", ...trustedRoleHeaders(role) },
      signal: controller.signal
    });
    const payload = await response.json().catch(() => null);
    return { ok: response.ok, status: response.status, payload };
  } catch (error) {
    warnings.push(`fixture resolver: ${pathname} unavailable (${String(error?.message || error)})`);
    return { ok: false, status: 0, payload: null };
  } finally {
    clearTimeout(timeout);
  }
}

function assetSummary(asset) {
  if (!asset?.id) return null;
  return {
    id: String(asset.id),
    path: `/assets/${encodeURIComponent(String(asset.id))}`,
    title: String(asset.title || asset.id),
    available: true
  };
}

function hasViewerDetailAsset() {
  return qaAsset.detail?.available !== false;
}

async function resolveAssetDetailFixture() {
  const preferred = await fetchQaJson(`/api/assets/${encodeURIComponent(preferredDetailAssetId)}?role=Viewer`);
  const preferredAsset = assetSummary(preferred.payload?.asset);
  if (preferred.ok && preferredAsset) return preferredAsset;

  const search = await fetchQaJson("/api/assets/search?role=Viewer&limit=12&offset=0");
  const firstVisible = assetSummary(search.payload?.assets?.[0]);
  if (firstVisible) {
    console.log(`[browser-qa] fixture resolver using Viewer-visible ${firstVisible.id} for asset-detail QA instead of missing ${preferredDetailAssetId}`);
    return firstVisible;
  }

  console.log(`[browser-qa] fixture resolver found no Viewer-visible detail asset; detail-only QA will be skipped`);
  return { ...qaAsset.detail, available: false };
}

async function resolveUnsafeAssetFixture(detailId) {
  const preferred = await fetchQaJson(`/api/assets/${encodeURIComponent(preferredUnsafeAssetId)}?role=Reviewer`);
  const preferredAsset = assetSummary(preferred.payload?.asset);
  if (preferred.ok && preferredAsset) return preferredAsset;

  const search = await fetchQaJson("/api/assets/search?role=Reviewer&limit=24&offset=0");
  const unsafe = (search.payload?.assets || []).map(assetSummary).find((asset) => asset && asset.id !== detailId);
  if (unsafe) {
    console.log(`[browser-qa] fixture resolver using Reviewer-visible ${unsafe.id} for unsafe/review QA instead of missing ${preferredUnsafeAssetId}`);
    return unsafe;
  }

  console.log(`[browser-qa] fixture resolver keeping preferred unsafe fixture ${preferredUnsafeAssetId}; no separate unsafe fallback resolved`);
  return { ...qaAsset.unsafe };
}

async function resolveQaAssetFixtures() {
  qaAsset.detail = await resolveAssetDetailFixture();
  qaAsset.unsafe = await resolveUnsafeAssetFixture(qaAsset.detail.id);

  for (const shot of requiredShots) {
    if (shot.name.startsWith("asset-detail-viewer-")) {
      shot.path = qaAsset.detail.path;
    }
    if (shot.name.startsWith("review-detail-reviewer-")) shot.path = `/review/${encodeURIComponent(qaAsset.unsafe.id)}?role=Reviewer`;
  }

  for (const item of qaPaths) {
    if (item.label === "detail-approved-viewer") item.path = qaAsset.detail.path;
    if (item.label === "detail-unsafe-viewer" || item.label === "detail-unsafe-reviewer") item.path = qaAsset.unsafe.path;
  }

  if (!hasViewerDetailAsset()) {
    for (let index = requiredShots.length - 1; index >= 0; index -= 1) {
      if (requiredShots[index].name.startsWith("asset-detail-viewer-")) {
        requiredShots.splice(index, 1);
      }
    }
    for (let index = qaPaths.length - 1; index >= 0; index -= 1) {
      if (qaPaths[index].label === "detail-approved-viewer") qaPaths.splice(index, 1);
    }
  }

  console.log(hasViewerDetailAsset()
    ? `[browser-qa] asset detail fixture ${qaAsset.detail.id} (${qaAsset.detail.title})`
    : "[browser-qa] asset detail fixture unavailable to Viewer; skipping Viewer detail assertions");
  console.log(`[browser-qa] unsafe/review fixture ${qaAsset.unsafe.id}${qaAsset.unsafe.title ? ` (${qaAsset.unsafe.title})` : ""}`);
}

await resolveQaAssetFixtures();

for (const width of qaViewports) {
  for (const item of qaPaths) {
    let completed = false;
    for (let attempt = 0; attempt < 2 && !completed; attempt += 1) {
      const { page, context } = await newRolePage(item.role, width, width <= 390 ? 900 : 1000);
      try {
        console.log(`[browser-qa] ${item.label} ${width} attempt ${attempt + 1}`);
        const response = await withTimeout(`goto ${item.label} ${width}`, 30000, () => gotoAndSettle(page, `${base}${item.path}`));
        await withTimeout(`ready ${item.label} ${width}`, 40000, () => waitForAppReady(page, item.path, item.role));
        await withTimeout(`images ${item.label} ${width}`, 5000, () => waitForVisibleImages(page));
        const state = await withTimeout(`inspect ${item.label} ${width}`, 10000, () => inspectPageAfterSettledNavigation(page, item));
        const polish = await withTimeout(`premium polish ${item.label} ${width}`, 5000, () => inspectPremiumPolish(page));
        if (!response || response.status() >= 500) failures.push(`${item.label} ${width}: HTTP ${response?.status()}`);
        if (state.overflowX) failures.push(`${item.label} ${width}: horizontal overflow ${state.scrollWidth}/${state.clientWidth}`);
        if (state.clippedControls.length) failures.push(`${item.label} ${width}: clipped controls ${JSON.stringify(state.clippedControls)}`);
        if (state.headerOverlaps.length) failures.push(`${item.label} ${width}: header controls overlap ${JSON.stringify(state.headerOverlaps)}`);
        if (polish.unfinishedSelects.length) failures.push(`${item.label} ${width}: unfinished native selects ${JSON.stringify(polish.unfinishedSelects)}`);
        if (polish.overflowingBadges.length) failures.push(`${item.label} ${width}: badge text overflow ${JSON.stringify(polish.overflowingBadges)}`);
        if (width <= 767 && state.fixedMobileNavs.length) failures.push(`${item.label} ${width}: fixed mobile nav can cover content ${JSON.stringify(state.fixedMobileNavs)}`);
        if (state.missingTabControls.length) failures.push(`${item.label} ${width}: tab aria-controls missing targets ${state.missingTabControls.join(", ")}`);
        if (state.brokenImages.length) warnings.push(`${item.label} ${width}: broken images ${state.brokenImages.join(", ")}`);
        if (normalUserRoles.has(item.role)) {
          const leaks = visibleOpsLeaks(state.visibleText);
          if (leaks.length) failures.push(`${item.label} ${width}: normal-user ops language leak ${leaks.join(", ")} in "${state.textSample}"`);
          const hrefLeak = (state.mailtoHrefs || [])
            .map((href) => ({ href, leaks: decodedHrefOpsLeaks(href) }))
            .find((entry) => entry.leaks.length);
          if (hrefLeak) failures.push(`${item.label} ${width}: normal-user mailto href ops leak ${hrefLeak.leaks.join(", ")} in "${hrefLeak.href}"`);
        }
        const governanceShortcutCount = await page.getByLabel("Open governance").count();
        if (item.role === "Reviewer" && governanceShortcutCount > 0) failures.push(`${item.label} ${width}: Reviewer sees governance shortcut`);
        if (item.label === "review-viewer" && !state.hasViewerReviewBlock) failures.push(`${item.label} ${width}: viewer review block missing`);
        if (item.label === "upload-viewer" && !state.hasViewerUploadBlock) failures.push(`${item.label} ${width}: viewer upload block missing`);
        if (item.label === "admin-viewer" && !state.hasAdminBlock) failures.push(`${item.label} ${width}: viewer admin block missing`);
        if (item.label === "library-reviewer" && state.hasOriginalFilenameOnCard) failures.push(`${item.label} ${width}: original filename exposed on Find card`);
        if (item.label === "viewer-needs-review-hidden" && state.textSample.includes("2012 Photo")) warnings.push(`${item.label} ${width}: viewer may see review asset copy`);
        if ((width === 1024 || width === 768 || width === 390 || width === 320) && ["library-viewer", "review-reviewer", "help-viewer", "requests-viewer", "my-tasks-viewer", "recent-uploads-contributor"].includes(item.label)) {
          await saveFullPageScreenshot(page, path.join(outDir, "qa", `${item.label}-${width}.png`));
        }
        completed = true;
      } catch (error) {
        if (/timed out after/i.test(String(error?.message || error))) {
          failures.push(`${item.label} ${width}: ${error.message}`);
          completed = true;
          continue;
        }
        if (attempt === 1 || !isTransientBrowserTargetClose(error)) throw error;
        warnings.push(`${item.label} ${width}: transient browser target closed; retried`);
      } finally {
        await closeContext(context);
      }
    }
  }
}

await browser.close().catch(() => {});
browser = await launchBrowser();

{
  const { page, context } = await newRolePage("Viewer", 1440, 1000);
  await gotoAndSettle(page, base);
  await waitForAppReady(page, "/", "Viewer");
  const findSearchInput = page.getByLabel(/Search DAM assets|Search media library/i).first();
  if (!(await findSearchInput.isVisible({ timeout: 10000 }).catch(() => false))) {
    const bodySample = await page.locator("body").innerText({ timeout: 1000 }).catch(() => "");
    failures.push(`search interaction: global search input missing before query in "${bodySample.replace(/\s+/g, " ").slice(0, 180)}"`);
  } else {
    await findSearchInput.fill("Bible");
    await page.waitForLoadState("networkidle", { timeout: 1500 }).catch(() => {});
    await page.getByText(/Reuse|Renditions|Portal Ready|Download unavailable|Source\/original|ResourceSpace/i).first().waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
    if ((await findSearchInput.inputValue()) !== "Bible") failures.push("search interaction: search input did not retain query");
    if ((await page.getByText(/Bible/i).count()) < 1) failures.push("search interaction: search query did not surface Bible results");
  }
  for (const text of ["Library", "Filters"]) {
    if ((await page.getByText(text).count()) < 1) failures.push(`library ResourceSpace shell: missing ${text}`);
  }
  if ((await page.getByText(/Reuse|Renditions|Portal Ready|Download unavailable|Source\/original|ResourceSpace/i).count()) < 1) failures.push("library ResourceSpace shell: missing reuse decision or rendition copy");
  if ((await page.locator('.proto-filter-pills, .proto-toolbar, .ed-desktop-filter-rail .ed-facet-panel, .ed-applied-filter-bar, [aria-label="Library filters"], [aria-label="Governed facet rail"], [aria-label="Quick filters"]').count()) < 1) failures.push("library ResourceSpace shell: governed facets missing");
  if ((await page.locator(".proto-beta-chip, .ed-source-pill").count()) < 1 && (await page.getByText(/ResourceSpace|export snapshot|source of truth/i).count()) < 1) failures.push("library ResourceSpace shell: data-source badge missing");
  if ((await page.getByText(/Serene mountain|Coastal cliffs|Summer Launch Toolkit/i).count()) > 0) failures.push("library ResourceSpace shell: old demo asset copy visible");
  if ((await page.locator(".proto-inspector, .ed-library-inspector-rail, .ed-inspector, .ed-selection-summary-panel").count()) < 1) failures.push("library ResourceSpace shell: right inspector missing");
  await closeContext(context);
}

{
  const { page, context } = await newRolePage("Viewer", 390, 900);
  await gotoAndSettle(page, base);
  await waitForAppReady(page, "/", "Viewer");
  if ((await page.getByText(/^Library$/).count()) < 1) failures.push("library mobile: library heading missing");
  if ((await page.locator(".proto-asset-card, .ed-mobile-card-list article, .ed-grid .ed-asset-card, .ed-desktop-table tbody tr").count()) < 1
    && (await page.getByText(/No media library records match this search|No matching assets/i).count()) < 1) {
    failures.push("library mobile: asset rows or safe empty state missing");
  }
  await closeContext(context);
}

{
  const { page, context } = await newRolePage("Viewer", 1440, 1000);
  await gotoAndSettle(page, `${base}/brand-hub`);
  for (const text of ["Admin / Metadata & Brand", "Brand Kit", "Metadata", "Settings"]) {
    if ((await page.getByText(text).count()) < 1) failures.push(`brand hub policy redirect shell: missing ${text}`);
  }
  if (!/brand-hub/.test(page.url())) failures.push("brand hub policy redirect shell: /brand-hub did not stay on brand/admin guidance");
  await closeContext(context);
}

{
  const { page, context } = await newRolePage("Reviewer", 1440, 1000);
  await gotoAndSettle(page, `${base}/distribution-sets`);
  await waitForAppReady(page, "/distribution-sets", "Reviewer");
  for (const text of ["Distribution", "Share collection", "Download all", "ResourceSpace"]) {
    if ((await page.getByText(text).count()) < 1) failures.push(`package builder ResourceSpace refs shell: missing ${text}`);
  }
  if ((await page.getByText(/Source\/original|Source files (stay|remain) private|restricted/i).count()) < 1) failures.push("package builder ResourceSpace refs shell: missing source-file privacy guarantee");
  if ((await page.getByText(/local beta|queued|ResourceSpace remains unchanged|gated/i).count()) < 1) failures.push("package builder ResourceSpace refs shell: refs-only beta guarantee missing");
  await closeContext(context);
}

{
  const { page, context } = await newRolePage("Viewer", 390, 900);
  await gotoAndSettle(page, `${base}/review`);
  if ((await page.getByText("Review inbox requires reviewer access").count()) < 1) failures.push("viewer review gate: access block missing");
  await closeContext(context);
}

{
  const { page, context } = await newRolePage("Viewer", 390, 900);
  await gotoAndSettle(page, `${base}/admin`);
  if ((await page.getByText("Governance requires DAM Admin role").count()) < 1) failures.push("viewer admin gate: access block missing");
  await closeContext(context);
}

if (hasViewerDetailAsset()) {
  const { page, context } = await newRolePage("Viewer", 1440, 1000);
  await gotoAndSettle(page, `${base}${qaAsset.detail.path}`);
  if ((await page.getByText(new RegExp(escapeRegExp(qaAsset.detail.title), "i")).count()) < 1) {
    failures.push(`asset detail ResourceSpace shell: missing fixture title ${qaAsset.detail.title}`);
  }
  for (const text of ["Details", "Metadata"]) {
    if ((await page.getByText(text).count()) < 1) failures.push(`asset detail ResourceSpace shell: missing ${text}`);
  }
  if ((await page.getByText("Download approved copy").count()) < 1 && (await page.getByText("Request DAM review").count()) < 1 && (await page.getByRole("button", { name: /Download/i }).count()) < 1) {
    failures.push("asset detail ResourceSpace shell: missing safe download/review action");
  }
  if ((await page.getByText(/Serene mountain|Coastal cliffs|Summer Launch Toolkit/i).count()) > 0) failures.push("asset detail ResourceSpace shell: old demo asset copy visible");
  const viewerDetailText = await page.locator("body").innerText();
  if (/Reviewer\/Admin source truth|Raw ResourceSpace status|Source\/original path|Pending write status|Shared Drive|master\/original/i.test(viewerDetailText)) failures.push("asset detail: viewer sees operations truth");
  await closeContext(context);
} else {
  warnings.push("asset detail ResourceSpace shell skipped: no Viewer-visible asset fixture");
}

{
  const { page, context } = await newRolePage("Reviewer", 1440, 1000);
  await gotoAndSettle(page, `${base}/review?queue=pending`);
  await waitForAppReady(page, "/review?queue=pending", "Reviewer");
  for (const text of ["Review Queue", "Needs Review", "Needs Evidence", "Bulk actions"]) {
    if ((await page.getByText(text).count()) < 1) failures.push(`review ResourceSpace shell: missing ${text}`);
  }
  if ((await page.getByText(/Review blocked|Approval blocked|Add or verify required evidence|Evidence required|evidence/i).count()) < 1) failures.push("review ResourceSpace shell: missing current approval blocker guidance");
  if ((await page.locator(".proto-review-table").count()) < 1) failures.push("review ResourceSpace shell: review table missing");
  if ((await page.getByText("Mark checked").count()) > 0) failures.push("review ResourceSpace shell: unsafe Mark checked action visible");
  if ((await page.locator(".proto-review-table .proto-table-row, .ed-review-list .ed-queue-item.is-active").count()) < 1) failures.push("review ResourceSpace shell: selected queue item missing");
  if ((await page.getByText(/ResourceSpace updated successfully/i).count()) > 0) failures.push("review ResourceSpace shell: fake ResourceSpace success visible");
  await closeContext(context);
}

{
  const { page, context } = await newRolePage("Contributor", 1440, 1000);
  await gotoAndSettle(page, `${base}/upload?role=Contributor`);
  const prototypeUpload = await isPrototypeUploadPage(page);
  const uploadCard = prototypeUpload ? page.locator(".proto-dropzone").first() : page.locator(".damx-upload-card").first();
  const hasUploadChoice = prototypeUpload
    ? (await page.locator(".proto-dropzone").count()) > 0
    : (await page.getByText("Upload photos from computer").count()) > 0;
  if (!hasUploadChoice || (await googleDriveInput(page).count()) < 1) {
    failures.push("upload choices: contributor upload choices missing");
  } else {
    await uploadCard.evaluate((node) => {
      const transfer = new DataTransfer();
      transfer.items.add(new File([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], "qa-drop.jpg", { type: "image/jpeg" }));
      node.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: transfer }));
    });
  }
  const droppedFileVisible = await selectedFilePreview(page).getByText("qa-drop.jpg").waitFor({ state: "visible", timeout: 10000 }).then(() => true).catch(() => false);
  if (!droppedFileVisible) {
    failures.push("upload choice drop: dropped file missing from preview");
  } else if (!prototypeUpload) {
    await selectedFilePreview(page).getByRole("button", { name: "Remove all" }).first().click();
  }
  await uploadPhotoInput(page).setInputFiles([{ name: "qa-photo.png", mimeType: "image/png", buffer: tinyPng }]);
  await selectedFilePreview(page).getByText("qa-photo.png").waitFor({ state: "visible", timeout: 10000 }).catch(() => {
    failures.push("upload file preview: selected file missing");
  });
  await googleDriveInput(page).fill("https://media.tjc.example/review-source");
  if (prototypeUpload) {
    await page.getByRole("button", { name: /Start upload/i }).last().click();
    const receiptVisible = await page.getByText(/Submitted for review|Upload intake sent|Not public|restricted/i).first().waitFor({ state: "visible", timeout: 15000 }).then(() => true).catch(() => false);
    if (!receiptVisible) failures.push("upload contributor receipt: review/not-public receipt missing");
  } else {
    await fillUploadContextStep(page, "Browser QA");
    await fillUploadRightsStep(page);
    await page.getByRole("button", { name: "Send to media team" }).last().click();
    await page.waitForSelector("text=Thank you — your photos were sent to the media team.");
    if ((await page.getByText("We'll review rights, people/youth visibility, and usage before anything is published.").count()) < 1) failures.push("upload contributor receipt: review reassurance missing");
  }
  await closeContext(context);
}

{
  const { page, context } = await newRolePage("Contributor", 320, 900);
  await gotoAndSettle(page, `${base}/upload?role=Contributor`);
  await advanceUploadToFiles(page, "Mobile file preview QA");
  await uploadPhotoInput(page).setInputFiles([{ name: "qa-mobile-photo-with-a-long-name.png", mimeType: "image/png", buffer: tinyPng }]);
  await selectedFilePreview(page).getByText("qa-mobile-photo-with-a-long-name.png").waitFor({ state: "visible", timeout: 10000 })
    .catch(() => failures.push("upload mobile file preview: selected file missing"));
  const mobileUploadOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  if (mobileUploadOverflow) failures.push("upload mobile file preview: horizontal overflow after file selection");
  await closeContext(context);
}

{
  const { page, context } = await newRolePage("Contributor", 1440, 1000);
  await gotoAndSettle(page, `${base}/upload?role=Contributor`);
  if (await isPrototypeUploadPage(page)) {
    if ((await page.getByRole("heading", { name: "Upload / Intake" }).count()) < 1) failures.push("upload desktop prototype: title missing");
    if ((await page.getByText("Every imported asset defaults to Needs Review / Do Not Publish. Source/original files remain restricted.").count()) < 1) failures.push("upload desktop prototype: beta safety note missing");
    if ((await page.locator(".proto-upload-queue").count()) < 1 || (await googleDriveInput(page).count()) < 1) failures.push("upload desktop prototype: queue/source metadata missing");
    await page.getByRole("button", { name: "Save as draft" }).last().click();
    if ((await page.getByText("Draft saved locally in this browser. Nothing was published.").count()) < 1) failures.push("upload desktop prototype: save draft state missing");
  } else {
    if ((await page.getByRole("heading", { name: "Share photos with the media team" }).count()) < 1) failures.push("upload desktop wizard: share title missing");
    if ((await page.getByText("Media team reviews photos before anything becomes public.").count()) < 1) failures.push("upload desktop wizard: friendly review reassurance missing");
    if ((await page.locator('[data-component="UploadBottomActionBar"]').count()) > 0) failures.push("upload desktop rail: detached bottom submit bar still present");
    if ((await page.getByText("Upload photos from computer").count()) < 1 || (await googleDriveInput(page).count()) < 1 || (await page.getByText("How review works").count()) < 1) failures.push("upload desktop wizard: contribution choices/review panel missing");
    await page.getByRole("button", { name: "Save for later" }).last().click();
    if ((await page.getByText("Saved for later in this browser.").count()) < 1) failures.push("upload desktop wizard: save draft state missing");
  }
  await closeContext(context);
}

{
  const { page, context } = await newRolePage("Contributor", 320, 900);
  await gotoAndSettle(page, `${base}/upload`);
  if (await isPrototypeUploadPage(page)) {
    if ((await page.locator(".proto-dropzone").count()) < 1) failures.push("contributor-upload-flow: dropzone missing");
    await googleDriveInput(page).fill("https://media.tjc.example/mobile-stepper-qa");
    await page.getByRole("button", { name: "Save as draft" }).last().click();
    if ((await page.getByText("Draft saved locally in this browser. Nothing was published.").count()) < 1) failures.push("contributor-upload-flow: draft local state missing");
  } else {
    if ((await page.getByText("Upload photos from computer").count()) < 1) failures.push("contributor-upload-flow: photo choice missing");
    const disabledSend = page.getByRole("button", { name: "Send to media team" }).last();
    if (!(await disabledSend.isDisabled())) failures.push("contributor-upload-flow: send button should stay disabled until media and details exist");
    const disabledReason = await disabledSend.getAttribute("title");
    if (!/Add photos or a link/i.test(disabledReason || "")) failures.push("contributor-upload-flow: disabled send reason missing");
    await googleDriveInput(page).fill("https://media.tjc.example/mobile-stepper-qa");
    if ((await page.getByLabel("Photo details").count()) < 1) failures.push("contributor-upload-flow: details section missing");
    await fillUploadContextStep(page, "Mobile stepper QA");
    await fillUploadRightsStep(page);
    await page.getByRole("button", { name: "Save for later" }).last().click();
    if ((await page.getByText("Saved for later in this browser.").count()) < 1) failures.push("contributor-upload-flow: draft local state missing");
  }
  await closeContext(context);
}

{
  const { page, context } = await newRolePage("Reviewer", 390, 900);
  await gotoAndSettle(page, `${base}/review`);
  await waitForAppReady(page, "/review", "Reviewer");
  if ((await page.getByText(/Queue list|Review Queue/i).count()) < 1) failures.push("review mobile: queue heading missing");
  if ((await page.locator(".proto-review-table, [aria-label='Review decision actions']").count()) < 1) failures.push("review mobile: decision panel missing");
  await closeContext(context);
}

{
  const { page, context } = await newRolePage("Reviewer", 1440, 1000);
  await gotoAndSettle(page, `${base}${hasViewerDetailAsset() ? qaAsset.detail.path : qaAsset.unsafe.path}`);
  const reviewerDetailText = await page.locator("body").innerText();
  if (/Reviewer\/Admin source truth|Admin source truth|Raw ResourceSpace status|Source\/original path|Pending write status/i.test(reviewerDetailText)) failures.push("asset detail: Reviewer sees admin source truth");
  await closeContext(context);
}

{
  const { page, context } = await newRolePage("DAM Admin", 390, 900);
  await gotoAndSettle(page, `${base}/admin`);
  for (const text of ["Admin / Metadata & Brand", "Local beta status", "Metadata Schema", "Brand Kit"]) {
    if ((await page.getByText(text).count()) < 1) failures.push(`admin control center: missing ${text}`);
  }
  await closeContext(context);
}

await assertRouteIdentity({ path: "/requests", role: "Viewer", h1: "Requests", activeLabel: "Requests", primarySection: "requests-table", forbiddenPrimaryH1: "Help Center" });
await assertRouteIdentity({ path: "/my-tasks", role: "Viewer", h1: "My Tasks", activeLabel: "My Tasks", primarySection: "task-work-queue", forbiddenPrimaryH1: "Help Center" });
await assertRouteIdentity({ path: "/help", role: "Viewer", h1: "Help Center", activeLabel: "Help Center", primarySection: "help-articles", forbiddenPrimaryH1: "Requests" });
await assertRouteIdentity({ path: "/recent-uploads", role: "Contributor", h1: "Recent Uploads", activeLabel: "Recent Uploads", primarySection: "recent-uploads-ledger", forbiddenPrimaryH1: "Library" });

{
  const { page, context } = await newRolePage("Viewer", 390, 900);
  await gotoAndSettle(page, `${base}/help`);
  if ((await page.getByText("Help Center").count()) < 1) failures.push("help-center: heading missing");
  await page.getByLabel(/Search help articles/i).fill("source");
  const sourceTask = page.getByRole("link", { name: /Request source-file access/ });
  if ((await sourceTask.count()) < 1) failures.push("help-center: search did not match source task");
  if ((await page.getByRole("link", { name: /^Open Requests$/ }).count()) < 1) failures.push("help-center: requests pointer missing");
  if ((await page.getByText(/Help topics \(FAQ\)|approved derivative/i).count()) < 1) failures.push("help-center: FAQ missing");
  await closeContext(context);
}

if (hasViewerDetailAsset()) {
  const { page, context } = await newRolePage("Viewer", 1440, 1000);
  await gotoAndSettle(page, `${base}${qaAsset.detail.path}`);
  if ((await page.getByText(/Asset record|Reuse decision|Renditions|Rights|Details|Metadata|Usage/i).count()) < 1) failures.push("asset detail one-verdict: primary asset record summary missing");
  if ((await page.getByText(/Download approved copy|Run approved-copy gate|Request DAM review|Request review/i).count()) < 1 && (await page.getByRole("button", { name: /Download/i }).count()) < 1) failures.push("asset detail: safe approved-copy/review action missing");
  const viewerDetailText = await page.locator("body").innerText();
  if (/Reviewer\/Admin source truth|Raw ResourceSpace status|Source\/original path|Pending write status/i.test(viewerDetailText)) failures.push("asset detail: viewer sees operations truth");
  await closeContext(context);
}

if (hasViewerDetailAsset()) {
  const { page, context } = await newRolePage("Viewer", 320, 900);
  await gotoAndSettle(page, `${base}${qaAsset.detail.path}`);
  const detailOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  if (detailOverflow) failures.push("asset detail: mobile caused horizontal overflow");
  await closeContext(context);
}

{
  const { page, context } = await newRolePage("Viewer", 1440, 1000);
  await gotoAndSettle(page, base);
  const checks = await page.evaluate(async ({ detailId, unsafeId }) => {
    const approved = detailId ? await fetch(`/api/download/${encodeURIComponent(detailId)}?role=Viewer`) : null;
    const unsafe = await fetch(`/api/download/${encodeURIComponent(unsafeId)}?role=Viewer`);
    const malformedTarget = detailId || unsafeId;
    const malformed = await fetch(`/api/download/%2E%2E${encodeURIComponent(malformedTarget)}?role=Viewer`);
    return { approved: approved?.status || null, unsafe: unsafe.status, malformed: malformed.status };
  }, { detailId: hasViewerDetailAsset() ? qaAsset.detail.id : "", unsafeId: qaAsset.unsafe.id });
  const blockedDownloadStatuses = new Set([403, 503]);
  if (hasViewerDetailAsset() && !blockedDownloadStatuses.has(checks.approved)) failures.push(`blocked approved download browser fetch status ${checks.approved}`);
  if (!blockedDownloadStatuses.has(checks.unsafe)) failures.push(`unsafe download browser fetch status ${checks.unsafe}`);
  if (checks.malformed !== 400) failures.push(`malformed download browser fetch status ${checks.malformed}`);
  await closeContext(context);
}

for (const shot of requiredShots) {
  const { page, context } = await newRolePage(shot.role, shot.width, shot.height);
  console.log(`[browser-qa] screenshot ${shot.name}`);
    await withTimeout(`required shot ${shot.name}`, 65000, async () => {
      await gotoAndSettle(page, `${base}${shot.path}`);
      await waitForAppReady(page, shot.path, shot.role);
      if (shot.selector) await page.locator(shot.selector).scrollIntoViewIfNeeded();
      await waitForVisibleImages(page);
      await saveFullPageScreenshot(page, path.join(outDir, shot.name));
  }).catch((error) => failures.push(`${shot.name}: ${error.message || error}`));
  await closeContext(context);
}

async function captureProof(name, role, width, height, pathName, setup) {
  const { page, context } = await newRolePage(role, width, height);
  console.log(`[browser-qa] proof ${name}`);
  await withTimeout(`proof ${name}`, 65000, async () => {
    await gotoAndSettle(page, `${base}${pathName}`);
    await waitForAppReady(page, pathName, role);
    if (setup) await setup(page);
    await page.screenshot({ path: path.join(outDir, "primitive-proof", name), fullPage: false });
  }).catch((error) => failures.push(`${name}: ${error.message || error}`));
  await closeContext(context);
}

await captureProof("appnav-tubelight-desktop.png", "Viewer", 1440, 720, "/", async (page) => {
  await page.locator(".dam-command-header:visible, header:visible").first().waitFor({ state: "visible", timeout: 10000 });
});

await captureProof("appnav-tubelight-mobile.png", "Viewer", 320, 720, "/", async (page) => {
  await page.locator(".dam-command-header:visible, header:visible").first().waitFor({ state: "visible", timeout: 10000 });
});

await captureProof("library-badges-pagination-filterpills.png", "Viewer", 1440, 1000, "/?view=website-hero", async (page) => {
  await page.locator(".proto-toolbar:visible, .proto-asset-grid:visible, .ed-library-v3-topbar:visible, .ed-library-grid:visible").first().scrollIntoViewIfNeeded({ timeout: 10000 });
});

await captureProof("admin-datatable.png", "DAM Admin", 1440, 1000, "/admin", async (page) => {
  await page.getByRole("heading", { name: /Metadata Schema|Local beta status|Integration Status/i }).first().scrollIntoViewIfNeeded();
});

await captureProof("review-datatable-inspector.png", "Reviewer", 1440, 1000, "/review?queue=pending", async (page) => {
  await page.locator(".proto-review-table, [aria-label='Review decision actions']").first().scrollIntoViewIfNeeded();
});

if (hasViewerDetailAsset()) {
  await captureProof("media-preview-panel-image.png", "DAM Admin", 1440, 1000, qaAsset.detail.path, async (page) => {
    await page.getByText(/Details|Metadata|Rights|Usage/i).first().scrollIntoViewIfNeeded();
  });
} else {
  warnings.push("media preview image proof skipped: no Viewer-visible asset fixture");
}

await captureProof("media-preview-panel-document.png", "Viewer", 1440, 1000, "/help", async (page) => {
  await page.getByRole("heading", { name: "Help Center" }).scrollIntoViewIfNeeded();
});

await captureProof("upload-dropzone-tags.png", "Contributor", 1440, 1000, "/upload", async (page) => {
  await uploadPhotoInput(page).setInputFiles([{ name: "primitive-proof-photo.png", mimeType: "image/png", buffer: tinyPng }]);
  await googleDriveInput(page).fill("https://media.tjc.example/primitive-proof");
  await selectedFilePreview(page).getByText("primitive-proof-photo.png").waitFor({ state: "visible", timeout: 30000 });
  if (!(await isPrototypeUploadPage(page))) {
    await fillUploadContextStep(page, "Primitive proof");
    await fillUploadRightsStep(page);
  }
});

await captureProof("toast-feedback.png", "Contributor", 1440, 900, "/upload", async (page) => {
  if (await isPrototypeUploadPage(page)) {
    await page.getByRole("button", { name: "Save as draft" }).last().click();
  } else {
    await page.getByRole("button", { name: "Save for later" }).last().click();
  }
  await page.waitForTimeout(500);
});

await captureProof("review-hold-confirm-dialog.png", "Reviewer", 1440, 1000, "/review?queue=pending", async (page) => {
  await page.locator(".proto-review-table, [aria-label='Review decision actions']").first().scrollIntoViewIfNeeded();
});

await captureProof("state-system-empty-error-loading.png", "Viewer", 1440, 900, "/", async (page) => {
  await page.getByLabel(/Search DAM assets|Search media library/i).first().fill("zzzzzz-no-visible-media-proof");
  await page.waitForLoadState("networkidle", { timeout: 1500 }).catch(() => {});
  await page.getByText(/No .* records match this search|No matching assets/i).first().waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
  await page.locator("#main-content").scrollIntoViewIfNeeded();
  const polish = await inspectPremiumPolish(page);
  if (polish.quietEmptyStates < 1 && (await page.locator(".proto-empty-table, .proto-empty-state").count()) < 1) failures.push("state-system-empty-error-loading.png: compact empty state class missing");
});

const report = {
  checkedAt: new Date().toISOString(),
  viewports: qaViewports,
  pages: qaPaths.length,
  qaAsset,
  screenshots: requiredShots.map((shot) => shot.name),
  consoleErrors,
  expectedDeniedConsole,
  networkFailures,
  warnings,
  failures
};

fs.writeFileSync(path.resolve("docs/screenshots/qa/browser-qa-report.json"), JSON.stringify(report, null, 2));
console.log(
  JSON.stringify({
    checkedAt: report.checkedAt,
    pages: report.pages,
    viewports: report.viewports,
    screenshots: report.screenshots.length,
    qaAsset: report.qaAsset,
    failures: report.failures.length,
    consoleErrors: report.consoleErrors.length,
    networkFailures: report.networkFailures.length,
    warnings: report.warnings.length,
    expectedDeniedConsole: report.expectedDeniedConsole.length,
    report: "docs/screenshots/qa/browser-qa-report.json"
  })
);
browser.close().catch(() => {});
process.exit(failures.length || consoleErrors.length || networkFailures.length ? 1 : 0);
