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
const outDir = path.resolve("docs/screenshots");
const tinyPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=", "base64");
const preferredDetailAssetId = "368";
const preferredUnsafeAssetId = "644";

fs.mkdirSync(path.join(outDir, "qa"), { recursive: true });
fs.mkdirSync(path.join(outDir, "primitive-proof"), { recursive: true });

const requiredShots = [
  { name: "library-desktop.png", path: "/", role: "Viewer", width: 1440, height: 1000 },
  { name: "library-mobile-320.png", path: "/", role: "Viewer", width: 320, height: 900 },
  { name: "library-mobile-390.png", path: "/", role: "Viewer", width: 390, height: 900 },
  { name: "collections-desktop.png", path: "/collections", role: "Viewer", width: 1440, height: 1000 },
  { name: "collections-mobile-320.png", path: "/collections", role: "Viewer", width: 320, height: 900 },
  { name: "collections-mobile-390.png", path: "/collections", role: "Viewer", width: 390, height: 900 },
  { name: "packages-desktop.png", path: "/packages", role: "Reviewer", width: 1440, height: 1000 },
  { name: "packages-mobile-320.png", path: "/packages", role: "Reviewer", width: 320, height: 900 },
  { name: "upload-desktop.png", path: "/upload", role: "Contributor", width: 1440, height: 1000 },
  { name: "upload-mobile-320.png", path: "/upload", role: "Contributor", width: 320, height: 900 },
  { name: "upload-mobile-390.png", path: "/upload", role: "Contributor", width: 390, height: 900 },
  { name: "review-desktop.png", path: "/review?queue=pending", role: "Reviewer", width: 1440, height: 1000 },
  { name: "review-mobile-320.png", path: "/review?queue=pending", role: "Reviewer", width: 320, height: 900 },
  { name: "review-mobile-390.png", path: "/review?queue=pending", role: "Reviewer", width: 390, height: 900 },
  { name: "asset-detail-desktop.png", path: "/assets/368", role: "Viewer", width: 1440, height: 1000 },
  { name: "detail-mobile-320.png", path: "/assets/368", role: "Viewer", width: 320, height: 900 },
  { name: "detail-mobile-390.png", path: "/assets/368", role: "Viewer", width: 390, height: 900 },
  { name: "admin-desktop.png", path: "/admin", role: "DAM Admin", width: 1440, height: 1000 },
  { name: "admin-mobile-320.png", path: "/admin", role: "DAM Admin", width: 320, height: 900 },
  { name: "admin-mobile-390.png", path: "/admin", role: "DAM Admin", width: 390, height: 900 },
  { name: "requests-desktop.png", path: "/requests", role: "Viewer", width: 1440, height: 1000 },
  { name: "requests-mobile-320.png", path: "/requests", role: "Viewer", width: 320, height: 900 },
  { name: "requests-mobile-390.png", path: "/requests", role: "Viewer", width: 390, height: 900 },
  { name: "my-tasks-desktop.png", path: "/my-tasks", role: "Viewer", width: 1440, height: 1000 },
  { name: "my-tasks-mobile-320.png", path: "/my-tasks", role: "Viewer", width: 320, height: 900 },
  { name: "my-tasks-mobile-390.png", path: "/my-tasks", role: "Viewer", width: 390, height: 900 },
  { name: "help-desktop.png", path: "/help", role: "Viewer", width: 1440, height: 1000 },
  { name: "help-mobile-320.png", path: "/help", role: "Viewer", width: 320, height: 900 },
  { name: "help-mobile-390.png", path: "/help", role: "Viewer", width: 390, height: 900 },
  { name: "recent-uploads-desktop.png", path: "/recent-uploads", role: "Contributor", width: 1440, height: 1000 },
  { name: "recent-uploads-mobile-320.png", path: "/recent-uploads", role: "Contributor", width: 320, height: 900 },
  { name: "recent-uploads-mobile-390.png", path: "/recent-uploads", role: "Contributor", width: 390, height: 900 }
];

const qaViewports = [1440, 1280, 1024, 768, 390, 320];
const qaPaths = [
  { path: "/", role: "Viewer", label: "library-viewer" },
  { path: "/", role: "Reviewer", label: "library-reviewer" },
  { path: "/?view=website-hero", role: "Viewer", label: "library-website-hero" },
  { path: "/collections", role: "Viewer", label: "collections-viewer" },
  { path: "/packages", role: "Viewer", label: "packages-viewer" },
  { path: "/packages", role: "Reviewer", label: "packages-reviewer" },
  { path: "/?view=needs-review", role: "Viewer", label: "viewer-needs-review-hidden" },
  { path: "/assets/368", role: "Viewer", label: "detail-approved-viewer" },
  { path: "/assets/644", role: "Viewer", label: "detail-unsafe-viewer" },
  { path: "/assets/644", role: "Reviewer", label: "detail-unsafe-reviewer" },
  { path: "/upload", role: "Viewer", label: "upload-viewer" },
  { path: "/upload", role: "Contributor", label: "upload-contributor" },
  { path: "/review", role: "Viewer", label: "review-viewer" },
  { path: "/review?queue=pending", role: "Reviewer", label: "review-reviewer" },
  { path: "/requests", role: "Viewer", label: "requests-viewer" },
  { path: "/my-tasks", role: "Viewer", label: "my-tasks-viewer" },
  { path: "/help", role: "Viewer", label: "help-viewer" },
  { path: "/recent-uploads", role: "Contributor", label: "recent-uploads-contributor" },
  { path: "/admin", role: "Viewer", label: "admin-viewer" },
  { path: "/admin", role: "DAM Admin", label: "admin-dam-admin" }
];

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
  return /Failed to load resource: the server responded with a status of (400|403|404|409)/.test(text);
}

function isTransientBrowserTargetClose(error) {
  return /Target page, context or browser has been closed|ERR_ABORTED|frame was detached/i.test(String(error?.message || error));
}

function isTransientNavigationError(error) {
  return /Timeout .* exceeded|Navigation timeout|ERR_CONNECTION_REFUSED|ECONNREFUSED|ERR_EMPTY_RESPONSE|Target page, context or browser has been closed/i.test(String(error?.message || error));
}

function trustedRoleHeaders(role) {
  if (!trustedHeaderQa || !role) return {};
  return {
    "x-tjc-role": role,
    "x-auth-request-email": `${String(role).replace(/\s+/g, "-")}@portal-browser-qa.local`
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
  if (pathname === "/") {
    await page.getByLabel("Search media library").first().waitFor({ state: "visible", timeout: 30000 }).catch(() => {});
    await page.locator(".ed-grid .ed-asset-card, .ed-empty-state").first().waitFor({ state: "visible", timeout: 30000 }).catch(() => {});
  }
  if (pathname === "/review" && (role === "Reviewer" || role === "DAM Admin")) {
    await page.waitForFunction(() => !/Loading ResourceSpace review queue/i.test(document.body.innerText || ""), null, { timeout: 30000 }).catch(() => {});
    await page.locator(".ed-review-list .ed-queue-item, [aria-label=\"Review decision actions\"]").first().waitFor({ state: "visible", timeout: 30000 })
      .catch(() => page.getByText(/Evidence and next action|Review Evidence/i).first().waitFor({ state: "visible", timeout: 30000 }).catch(() => {}));
  }
}

async function activeSidebarLabels(page) {
  return page.locator('[data-sidebar="menu-button"][data-active="true"]').evaluateAll((nodes) => nodes
    .map((node) => (node.textContent || "").replace(/\s+/g, " ").trim())
    .filter(Boolean));
}

async function assertRouteIdentity({ path: pathName, role, h1, activeLabel, primarySection, forbiddenPrimaryH1 }) {
  const { page, context } = await newRolePage(role, 1440, 1000);
  try {
    await gotoAndSettle(page, `${base}${pathName}`);
    await waitForAppReady(page, pathName, role);
    const firstH1 = (await page.locator("h1").first().innerText().catch(() => "")).replace(/\s+/g, " ").trim();
    if (firstH1 !== h1) failures.push(`${pathName}: expected primary H1 ${h1}, saw "${firstH1}"`);
    if (forbiddenPrimaryH1 && firstH1 === forbiddenPrimaryH1) failures.push(`${pathName}: primary H1 masquerades as ${forbiddenPrimaryH1}`);
    if ((await page.locator(`[data-primary-section="${primarySection}"]`).count()) < 1) failures.push(`${pathName}: primary data section ${primarySection} missing`);
    const activeLabels = await activeSidebarLabels(page);
    if (activeLabels.length !== 1 || !activeLabels[0].includes(activeLabel)) {
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
    return visibleImages.every((img) => img.complete);
  }, { timeout: 1800 }).catch(() => {});
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
    await withTimeout(`screenshot ${screenshotPath}`, 15000, () => page.screenshot({ path: screenshotPath, fullPage: true }));
  } finally {
    await style?.evaluate((node) => node.remove()).catch(() => {});
  }
}

async function fillUploadContextStep(page, prefix = "Browser QA") {
  await page.getByLabel("Title").fill(`${prefix} intake`);
  await page.getByLabel("Event").fill("Sabbath media QA");
  await page.getByLabel("Date").fill("2026-06-06");
  await page.getByLabel("Ministry/team").fill("Internet Ministry");
  await page.getByLabel("Source / photographer").fill("QA reviewer");
  await page.getByLabel("Source class").selectOption("Church photographer / TJC-created");
}

async function fillUploadRightsStep(page) {
  await page.getByLabel("People visible").selectOption("No");
  await page.getByLabel("Children/youth visible").selectOption("No");
  await page.getByLabel("Usage rights").selectOption("TJC-owned / permission confirmed");
  await page.getByLabel("Suggested approval direction").selectOption("Likely internal ministry use only");
  await page.getByLabel("Consent/restrictions").fill("No consent restrictions; no people visible.");
  await page.getByLabel("Doctrine/sacrament sensitivity").selectOption("No");
  await page.getByLabel("Testimony/pastoral sensitivity").selectOption("No");
  await page.getByLabel("Hymn/music present").selectOption("No");
}

async function clickUploadNext(page) {
  const actionBar = page.locator('[aria-label="Send actions"]').first();
  await actionBar.waitFor({ state: "visible", timeout: 30000 });
  const next = actionBar.getByRole("button", { name: /^Next$/ }).first();
  await next.waitFor({ state: "visible", timeout: 30000 });
  await next.scrollIntoViewIfNeeded().catch(() => {});
  await next.click();
}

async function advanceUploadToFiles(page, prefix = "Browser QA") {
  await clickUploadNext(page);
  await fillUploadContextStep(page, prefix);
  await clickUploadNext(page);
  await fillUploadRightsStep(page);
  await clickUploadNext(page);
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
      hasReviewBlocker: visibleText.includes("Decision locked") || visibleText.includes("Complete required evidence before approval"),
      hasViewerReviewBlock: visibleText.includes("Review inbox requires reviewer access"),
      hasViewerUploadBlock: visibleText.includes("Send media requires Contributor access"),
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
    if (["asset-detail-desktop.png", "detail-mobile-320.png", "detail-mobile-390.png"].includes(shot.name)) {
      shot.path = qaAsset.detail.path;
    }
  }

  for (const item of qaPaths) {
    if (item.label === "detail-approved-viewer") item.path = qaAsset.detail.path;
    if (item.label === "detail-unsafe-viewer" || item.label === "detail-unsafe-reviewer") item.path = qaAsset.unsafe.path;
  }

  if (!hasViewerDetailAsset()) {
    for (let index = requiredShots.length - 1; index >= 0; index -= 1) {
      if (["asset-detail-desktop.png", "detail-mobile-320.png", "detail-mobile-390.png"].includes(requiredShots[index].name)) {
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
  const findSearchInput = page.getByLabel("Search media library").first();
  if (!(await findSearchInput.isVisible({ timeout: 10000 }).catch(() => false))) {
    const bodySample = await page.locator("body").innerText({ timeout: 1000 }).catch(() => "");
    failures.push(`search interaction: global search input missing before query in "${bodySample.replace(/\s+/g, " ").slice(0, 180)}"`);
  } else {
    await findSearchInput.fill("Bible");
    await page.waitForLoadState("networkidle", { timeout: 1500 }).catch(() => {});
    await waitForVisibleText(page, "Clearance status");
    if ((await findSearchInput.inputValue()) !== "Bible") failures.push("search interaction: search input did not retain query");
    if ((await page.getByText(/Bible/i).count()) < 1) failures.push("search interaction: search query did not surface Bible results");
  }
  for (const text of ["Library", "Clearance status", "Download"]) {
    if ((await page.getByText(text).count()) < 1) failures.push(`library ResourceSpace shell: missing ${text}`);
  }
  if ((await page.getByLabel("Quick filters").count()) < 1) failures.push("library ResourceSpace shell: quick filters missing");
  if ((await page.locator(".ed-source-pill").count()) < 1) failures.push("library ResourceSpace shell: data-source badge missing");
  if ((await page.getByText(/Serene mountain|Coastal cliffs|Summer Launch Toolkit/i).count()) > 0) failures.push("library ResourceSpace shell: old demo asset copy visible");
  if ((await page.locator(".ed-inspector").count()) < 1) failures.push("library ResourceSpace shell: right inspector missing");
  await closeContext(context);
}

{
  const { page, context } = await newRolePage("Viewer", 390, 900);
  await gotoAndSettle(page, base);
  if ((await page.getByRole("heading", { name: /^(Library|Asset Library)$/ }).count()) < 1) failures.push("library mobile: library heading missing");
  if ((await page.locator(".ed-mobile-card-list article, .ed-desktop-table tbody tr").count()) < 1
    && (await page.getByText(/No media library records match this search|No matching assets/i).count()) < 1) {
    failures.push("library mobile: asset rows or safe empty state missing");
  }
  await closeContext(context);
}

{
  const { page, context } = await newRolePage("Viewer", 1440, 1000);
  await gotoAndSettle(page, `${base}/brand-hub`);
  for (const text of ["Policy Center", "Usage policy", "Rights & consent", "Public use rules", "Metadata standards"]) {
    if ((await page.getByText(text).count()) < 1) failures.push(`brand hub policy redirect shell: missing ${text}`);
  }
  if (!/section=policies/.test(page.url())) failures.push("brand hub policy redirect shell: /brand-hub did not land on policy guidance");
  await closeContext(context);
}

{
  const { page, context } = await newRolePage("Reviewer", 1440, 1000);
  await gotoAndSettle(page, `${base}/packages`);
  for (const text of ["Distribution set draft", "Set outline", "Browse DAM records", "References retained only", "Source-file copying disabled", "No ResourceSpace writeback from this draft"]) {
    if ((await page.getByText(text).count()) < 1) failures.push(`package builder ResourceSpace refs shell: missing ${text}`);
  }
  const packageSummaries = await page.locator(".ed-summary-grid").allInnerTexts().catch(() => []);
  if (!packageSummaries.some((summary) => /0\s+File copies/i.test(summary.replace(/\s+/g, " ")))) failures.push("package builder ResourceSpace refs shell: refs-only summary missing zero file copies");
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
  for (const text of ["Clearance status", "Evidence summary"]) {
    if ((await page.getByText(text).count()) < 1) failures.push(`asset detail ResourceSpace shell: missing ${text}`);
  }
  if ((await page.getByText("Download approved copy").count()) < 1 && (await page.getByText("Request DAM review").count()) < 1) {
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
  for (const text of ["Review Queue", "Evidence and next action", "Metadata completeness", "Risk signals", "Save progress", "Next asset", "Request evidence", "Rights checks require evidence before approval can proceed"]) {
    if ((await page.getByText(text).count()) < 1) failures.push(`review ResourceSpace shell: missing ${text}`);
  }
  if ((await page.getByLabel("Review decision actions").count()) < 1) failures.push("review ResourceSpace shell: decision actions footer missing");
  if ((await page.getByText("Mark checked").count()) > 0) failures.push("review ResourceSpace shell: unsafe Mark checked action visible");
  if ((await page.locator(".ed-review-list .ed-queue-item.is-active").count()) < 1) failures.push("review ResourceSpace shell: selected queue item missing");
  if ((await page.getByText(/ResourceSpace updated successfully/i).count()) > 0) failures.push("review ResourceSpace shell: fake ResourceSpace success visible");
  await closeContext(context);
}

{
  const { page, context } = await newRolePage("Contributor", 1440, 1000);
  await gotoAndSettle(page, `${base}/upload?role=Contributor`);
  await advanceUploadToFiles(page, "Browser QA");
  if ((await page.getByText("Drop files here or browse").count()) < 1) failures.push("upload file dropzone: drop/browse affordance missing");
  await page.getByText("Drop files here or browse").evaluate((node) => {
    const label = node.closest("label");
    if (!label) throw new Error("upload dropzone label missing");
    const transfer = new DataTransfer();
    transfer.items.add(new File([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], "qa-drop.jpg", { type: "image/jpeg" }));
    label.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: transfer }));
  });
  if ((await page.getByLabel("Selected file preview").getByText("qa-drop.jpg").count()) < 1) failures.push("upload file dropzone: dropped file missing from preview");
  await page.getByLabel("Selected file preview").getByRole("button", { name: "Clear files" }).click();
  await page.getByLabel("Files").setInputFiles([{ name: "qa-photo.png", mimeType: "image/png", buffer: tinyPng }]);
  if ((await page.getByLabel("Selected file preview").getByText("qa-photo.png").count()) < 1) failures.push("upload file preview: selected file missing");
  await page.getByLabel("Selected file preview").getByRole("button", { name: "Clear files" }).click();
  await page.getByLabel("Existing media-team link").fill("https://media.tjc.example/review-source");
  if ((await page.getByLabel("Suggested tags suggestions", { exact: true }).getByRole("button", { name: "Bible" }).count()) < 1) failures.push("upload tag input: taxonomy suggestions missing");
  await page.getByLabel("Suggested tags", { exact: true }).fill("qa");
  await page.keyboard.press("Enter");
  if ((await page.getByRole("button", { name: "Remove qa" }).count()) > 0) failures.push("upload tag input: non-canonical typed tag became canonical chip");
  if ((await page.getByText("not in the current taxonomy").count()) < 1) failures.push("upload tag input: non-canonical tag warning missing");
  await page.getByLabel("Suggested tags", { exact: true }).fill("Bible, worship");
  await page.keyboard.press("Enter");
  if ((await page.getByRole("button", { name: "Remove Bible" }).count()) < 1) failures.push("upload tag input: canonical typed tag chip missing");
  await page.getByLabel("Reviewer notes").fill("Browser QA no-file intake with source link only.");
  await page.getByRole("button", { name: "Next" }).click();
  if ((await page.getByText("Reviewer packet").count()) < 1) failures.push("upload contributor packet: review packet step missing");
  await page.getByRole("button", { name: "Submit for DAM review" }).click();
  await page.waitForSelector("text=Intake received");
  if ((await page.getByText("Needs Review / Do Not Publish").count()) < 1) failures.push("upload contributor receipt: default review state missing");
  await closeContext(context);
}

{
  const { page, context } = await newRolePage("Contributor", 320, 900);
  await gotoAndSettle(page, `${base}/upload?role=Contributor`);
  await advanceUploadToFiles(page, "Mobile file preview QA");
  await page.getByLabel("Files").setInputFiles([{ name: "qa-mobile-photo-with-a-long-name.png", mimeType: "image/png", buffer: tinyPng }]);
  if ((await page.getByLabel("Selected file preview").getByText("qa-mobile-photo-with-a-long-name.png").count()) < 1) failures.push("upload mobile file preview: selected file missing");
  const mobileUploadOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  if (mobileUploadOverflow) failures.push("upload mobile file preview: horizontal overflow after file selection");
  await closeContext(context);
}

{
  const { page, context } = await newRolePage("Contributor", 1440, 1000);
  await gotoAndSettle(page, `${base}/upload?role=Contributor`);
  if ((await page.getByText("What are you sending?").count()) < 1) failures.push("upload desktop wizard: template-first prompt missing");
  if ((await page.getByText(/Send never publishes/).count()) < 1) failures.push("upload desktop wizard: never-publishes safety copy missing");
  if ((await page.locator('[data-component="UploadBottomActionBar"]').count()) > 0) failures.push("upload desktop rail: detached bottom submit bar still present");
  if ((await page.getByText("Step 1 of 5").count()) < 1) failures.push("upload desktop wizard: step indicator missing");
  await page.getByRole("button", { name: "Save draft" }).click();
  if ((await page.getByText("Draft saved locally").count()) < 1) failures.push("upload desktop wizard: save draft state missing");
  await closeContext(context);
}

{
  const { page, context } = await newRolePage("Contributor", 320, 900);
  await gotoAndSettle(page, `${base}/upload`);
  if ((await page.getByText("Step 1 of 5").count()) < 1) failures.push("contributor-upload-stepper: step 1 indicator missing");
  await page.getByRole("button", { name: "Next" }).click();
  const contextStepBox = await page.locator('[data-send-step="1"]:visible').boundingBox();
  const actionBox = await page.getByLabel("Send actions").boundingBox();
  if (contextStepBox && actionBox && actionBox.y < contextStepBox.y + contextStepBox.height - 2) {
    failures.push("contributor-upload-stepper: mobile action controls appear before required step fields");
  }
  await page.getByRole("button", { name: "Next" }).click();
  if ((await page.getByText("Complete Where is this from? before continuing.").count()) < 1) failures.push("contributor-upload-stepper: context validation missing");
  await fillUploadContextStep(page, "Mobile stepper QA");
  await page.getByRole("button", { name: "Next" }).click();
  if ((await page.getByText("Who appears and what permission is known?").count()) < 1) failures.push("contributor-upload-stepper: step 2 did not appear");
  await fillUploadRightsStep(page);
  await page.getByRole("button", { name: "Next" }).click();
  if ((await page.getByText("Files, link, and reviewer notes").count()) < 1) failures.push("contributor-upload-stepper: step 3 did not appear");
  await page.getByRole("button", { name: "Next" }).click();
  if ((await page.getByText("Add a file or source link before continuing.").count()) < 1) failures.push("contributor-upload-stepper: file/source validation missing");
  await page.getByLabel("Existing media-team link").fill("https://media.tjc.example/mobile-stepper-qa");
  await page.getByLabel("Suggested tags", { exact: true }).fill("Bible, worship");
  await page.keyboard.press("Enter");
  await page.getByLabel("Reviewer notes").fill("Mobile QA source-link intake ready for reviewer packet.");
  await page.getByRole("button", { name: "Next" }).click();
  if ((await page.getByText("Reviewer packet").count()) < 1) failures.push("contributor-upload-stepper: review step did not appear");
  await page.getByRole("button", { name: "Save draft" }).click();
  if ((await page.getByText("Draft saved locally").count()) < 1) failures.push("contributor-upload-stepper: draft local state missing");
  await closeContext(context);
}

{
  const { page, context } = await newRolePage("Reviewer", 390, 900);
  await gotoAndSettle(page, `${base}/review`);
  await waitForAppReady(page, "/review", "Reviewer");
  if ((await page.getByText("Review Queue").count()) < 1) failures.push("review mobile: queue heading missing");
  if ((await page.getByLabel("Review decision actions").count()) < 1) failures.push("review mobile: decision panel missing");
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
  for (const text of ["DAM Control Center", "Permission Matrix", "Policy Summary", "System Health"]) {
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
  if ((await page.getByText("What is an approved derivative?").count()) < 1) failures.push("help-center: FAQ missing");
  await closeContext(context);
}

if (hasViewerDetailAsset()) {
  const { page, context } = await newRolePage("Viewer", 1440, 1000);
  await gotoAndSettle(page, `${base}${qaAsset.detail.path}`);
  if ((await page.locator(".ed-verdict-card").getByText("Clearance status").count()) < 1) failures.push("asset detail one-verdict: primary verdict card missing");
  if ((await page.getByText("Download approved copy").count()) < 1 && (await page.getByText("Request DAM review").count()) < 1) failures.push("asset detail: safe approved-copy/review action missing");
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
  if (hasViewerDetailAsset() && checks.approved !== 403) failures.push(`blocked approved download browser fetch status ${checks.approved}`);
  if (checks.unsafe !== 403) failures.push(`unsafe download browser fetch status ${checks.unsafe}`);
  if (checks.malformed !== 400) failures.push(`malformed download browser fetch status ${checks.malformed}`);
  await closeContext(context);
}

for (const shot of requiredShots) {
  const { page, context } = await newRolePage(shot.role, shot.width, shot.height);
  console.log(`[browser-qa] screenshot ${shot.name}`);
    await withTimeout(`required shot ${shot.name}`, 35000, async () => {
      await gotoAndSettle(page, `${base}${shot.path}`);
      await waitForAppReady(page, shot.path, shot.role);
      if (shot.selector) await page.locator(shot.selector).scrollIntoViewIfNeeded();
    await saveFullPageScreenshot(page, path.join(outDir, shot.name));
  }).catch((error) => failures.push(`${shot.name}: ${error.message || error}`));
  await closeContext(context);
}

async function captureProof(name, role, width, height, pathName, setup) {
  const { page, context } = await newRolePage(role, width, height);
  console.log(`[browser-qa] proof ${name}`);
  await withTimeout(`proof ${name}`, 35000, async () => {
    await gotoAndSettle(page, `${base}${pathName}`);
    await waitForAppReady(page, pathName, role);
    if (setup) await setup(page);
    await page.screenshot({ path: path.join(outDir, "primitive-proof", name), fullPage: false });
  }).catch((error) => failures.push(`${name}: ${error.message || error}`));
  await closeContext(context);
}

await captureProof("appnav-tubelight-desktop.png", "Viewer", 1440, 720, "/", async (page) => {
  await page.locator("header").first().scrollIntoViewIfNeeded();
});

await captureProof("appnav-tubelight-mobile.png", "Viewer", 320, 720, "/", async (page) => {
  await page.locator("header").first().scrollIntoViewIfNeeded();
});

await captureProof("library-badges-pagination-filterpills.png", "Viewer", 1440, 1000, "/?view=website-hero", async (page) => {
  await page.getByLabel("Quick filters").scrollIntoViewIfNeeded();
});

await captureProof("admin-datatable.png", "DAM Admin", 1440, 1000, "/admin", async (page) => {
  await page.getByRole("heading", { name: "Integration Status" }).scrollIntoViewIfNeeded();
});

await captureProof("review-datatable-inspector.png", "Reviewer", 1440, 1000, "/review?queue=pending", async (page) => {
  await page.getByLabel("Review decision actions").scrollIntoViewIfNeeded();
});

if (hasViewerDetailAsset()) {
  await captureProof("media-preview-panel-image.png", "DAM Admin", 1440, 1000, qaAsset.detail.path, async (page) => {
    await page.getByText("Clearance status").first().scrollIntoViewIfNeeded();
  });
} else {
  warnings.push("media preview image proof skipped: no Viewer-visible asset fixture");
}

await captureProof("media-preview-panel-document.png", "Viewer", 1440, 1000, "/help", async (page) => {
  await page.getByText("Help Center").scrollIntoViewIfNeeded();
});

await captureProof("upload-dropzone-tags.png", "Contributor", 1440, 1000, "/upload", async (page) => {
  await advanceUploadToFiles(page, "Primitive proof");
  await page.getByLabel("Files").setInputFiles([{ name: "primitive-proof-photo.png", mimeType: "image/png", buffer: tinyPng }]);
  await page.waitForFunction(() => {
    const img = document.querySelector('[aria-label="Selected file preview"] img');
    return img && img.complete && img.naturalWidth > 0;
  });
  await page.getByLabel("Suggested tags", { exact: true }).fill("Bible, worship");
  await page.keyboard.press("Enter");
});

await captureProof("toast-feedback.png", "Contributor", 1440, 900, "/upload", async (page) => {
  await page.getByRole("button", { name: "Save draft" }).click();
  await page.waitForTimeout(500);
});

await captureProof("review-hold-confirm-dialog.png", "Reviewer", 1440, 1000, "/review?queue=pending", async (page) => {
  await page.getByLabel("Review decision actions").scrollIntoViewIfNeeded();
});

await captureProof("state-system-empty-error-loading.png", "Viewer", 1440, 900, "/", async (page) => {
  await page.getByLabel("Search media library").first().fill("zzzzzz-no-visible-media-proof");
  await page.waitForLoadState("networkidle", { timeout: 1500 }).catch(() => {});
  await page.getByText(/No .* records match this search|No matching assets/i).first().waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
  await page.locator("#main-content").scrollIntoViewIfNeeded();
  const polish = await inspectPremiumPolish(page);
  if (polish.quietEmptyStates < 1) failures.push("state-system-empty-error-loading.png: compact empty state class missing");
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
