#!/usr/bin/env node
import playwright from "../frontend/node_modules/playwright/index.js";
import fs from "node:fs";
import path from "node:path";

const { chromium } = playwright;
const base = process.env.BASE_URL || "http://localhost:4871";
const outDir = path.resolve("docs/screenshots/qa/focused-core");
const stamp = new Date().toISOString().replace(/[:.]/g, "");
const tinyPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=", "base64");

fs.mkdirSync(outDir, { recursive: true });

const failures = [];
const warnings = [];
const consoleErrors = [];
const networkFailures = [];
const screenshots = [];

async function withQaTimeout(label, ms, work) {
  let timer;
  try {
    return await Promise.race([
      work(),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
      })
    ]);
  } finally {
    clearTimeout(timer);
  }
}

function roleHeaders(role) {
  const email = `${role.replace(/\s+/g, "-")}@focused-core-qa.local`;
  return {
    "x-tjc-role": role,
    "x-auth-request-email": email,
    "cf-access-jwt-assertion": "focused-core-qa-placeholder-token",
    "cf-access-authenticated-user-email": email,
    "cf-access-groups": role
  };
}

async function newPage(browser, role, width, height) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
    extraHTTPHeaders: roleHeaders(role)
  });
  await context.addInitScript((nextRole) => window.localStorage.setItem("tjc-demo-role", nextRole), role);
  const page = await context.newPage();
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (/Failed to load resource: the server responded with a status of (400|403|404|409|503)/.test(text)) return;
    consoleErrors.push({ role, width, text: text.slice(0, 300) });
  });
  page.on("requestfailed", (request) => {
    const url = request.url();
    if (!url.startsWith(base)) return;
    const error = request.failure()?.errorText || "request failed";
    if (error === "net::ERR_ABORTED" && (url.includes("_rsc=") || url.includes("/_next/static/") || url.includes("/api/assets/thumbnail/"))) return;
    networkFailures.push({ role, width, url, error });
  });
  return { page, context };
}

async function gotoReady(page, route, label) {
  const response = await page.goto(`${base}${route}`, { waitUntil: "load", timeout: 60000 }).catch((error) => {
    failures.push(`${label}: navigation failed ${error.message || error}`);
    return null;
  });
  if (response && response.status() >= 500) failures.push(`${label}: HTTP ${response.status()}`);
  await page.waitForLoadState("networkidle", { timeout: 2500 }).catch(() => {});
  await page.waitForTimeout(250);
}

async function visibleText(page) {
  return page.locator("body").innerText({ timeout: 5000 }).catch(() => "");
}

async function checkNoOverflow(page, label) {
  const state = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth
  }));
  if (state.scrollWidth > state.clientWidth + 1) failures.push(`${label}: horizontal overflow ${state.scrollWidth}/${state.clientWidth}`);
}

async function checkKeyboard(page, label) {
  await page.locator("body").click({ position: { x: 1, y: 1 } }).catch(() => {});
  const focused = [];
  for (let index = 0; index < 8; index += 1) {
    await page.keyboard.press("Tab");
    await page.waitForTimeout(50);
    const item = await page.evaluate(() => {
      const active = document.activeElement;
      if (!active || active === document.body || active === document.documentElement) return "";
      const rect = active.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return "";
      return `${active.tagName}:${(active.getAttribute("aria-label") || active.textContent || active.getAttribute("placeholder") || "").replace(/\s+/g, " ").trim().slice(0, 80)}`;
    });
    if (item) focused.push(item);
  }
  if (!new Set(focused).size) failures.push(`${label}: no keyboard focus target reached with Tab`);
}

async function shot(page, name) {
  const target = path.join(outDir, `${stamp}-${name}.png`);
  await page.screenshot({ path: target, fullPage: true });
  screenshots.push(target);
}

async function smokeRoute(browser, item) {
  for (const viewport of [{ width: 1440, height: 1000, suffix: "desktop" }, { width: 390, height: 900, suffix: "mobile" }]) {
    const { page, context } = await newPage(browser, item.role, viewport.width, viewport.height);
    try {
      const label = `${item.label} ${viewport.suffix}`;
      await gotoReady(page, item.path, label);
      const text = await visibleText(page);
      if (item.must && !item.must.some((pattern) => pattern.test(text))) failures.push(`${label}: expected copy missing`);
      if (item.mustNot && item.mustNot.some((pattern) => pattern.test(text))) failures.push(`${label}: forbidden copy visible`);
      await checkNoOverflow(page, label);
      await checkKeyboard(page, label);
      if (viewport.suffix === "mobile") await shot(page, `${item.id}-mobile`);
    } finally {
      await context.close().catch(() => {});
    }
  }
}

async function fillFirst(page, selector, value, label) {
  const field = page.locator(selector).first();
  if (!(await field.waitFor({ state: "visible", timeout: 10000 }).then(() => true).catch(() => false))) {
    failures.push(`${label}: missing`);
    return;
  }
  await field.fill(value).catch((error) => failures.push(`${label}: ${error.message || error}`));
}

async function isVisible(page, selector, timeout = 1500) {
  return page.locator(selector).first().waitFor({ state: "visible", timeout }).then(() => true).catch(() => false);
}

async function clickFirstButton(page, names, label) {
  for (const name of names) {
    const clicked = await page.getByRole("button", { name }).first().click({ timeout: 3500 })
      .then(() => true)
      .catch(() => false);
    if (clicked) {
      await page.waitForTimeout(350);
      return true;
    }
  }
  failures.push(`${label}: button missing`);
  return false;
}

async function selectUploadOption(page, name, label, value) {
  const field = page.locator(`select[name="${name}"]`).first();
  if (!(await field.waitFor({ state: "visible", timeout: 10000 }).then(() => true).catch(() => false))) {
    failures.push(`${label}: missing`);
    return;
  }
  await field.selectOption({ label: value })
    .catch((error) => failures.push(`${label}: ${error.message || error}`));
}

async function setUploadFixtureFile(page) {
  const input = page.locator('#damx-upload-file-input, input[type="file"][name="files"], input[type="file"][accept*="image"]').first();
  if (!(await input.waitFor({ state: "attached", timeout: 10000 }).then(() => true).catch(() => false))) {
    failures.push("upload receipt flow: file input missing");
    return false;
  }
  await input.setInputFiles([{ name: "focused-core-photo.png", mimeType: "image/png", buffer: tinyPng }])
    .catch((error) => failures.push(`upload receipt flow: file input failed ${error.message || error}`));
  return true;
}

async function fillFirstAvailable(page, selectors, value, label) {
  for (const selector of selectors) {
    const field = page.locator(selector).first();
    const ready = await field.waitFor({ state: "visible", timeout: 1500 }).then(() => true).catch(() => false);
    if (!ready) continue;
    await field.fill(value).catch((error) => failures.push(`${label}: ${error.message || error}`));
    return true;
  }
  failures.push(`${label}: missing`);
  return false;
}

async function oldUploadFlow(page) {
  await fillFirst(page, 'input[name="title"]', "Focused core QA photo submission", "upload title");
  await fillFirst(page, 'input[name="eventName"]', "Focused core QA fellowship", "upload event");
  await fillFirst(page, 'input[name="eventDate"]', "2026-06-06", "upload date");
  await fillFirst(page, 'input[name="ministry"]', "Internet Ministry", "upload ministry");
  await fillFirst(page, 'input[name="source"]', "QA reviewer", "upload source");
  await clickFirstButton(page, [/^Next$/i], "upload step 1");

  await selectUploadOption(page, "peopleVisible", "people visible", "No");
  await selectUploadOption(page, "minorsVisible", "children/youth visible", "No");
  await selectUploadOption(page, "usageRights", "usage rights", "TJC-owned / permission confirmed");
  await fillFirst(page, 'textarea[name="notes"]', "No known restrictions from focused QA fixture.", "upload restrictions");
  await clickFirstButton(page, [/^Next$/i], "upload step 2");

  await fillFirst(page, 'textarea[name="intakeNotes"]', "Focused browser QA note.", "upload reviewer note");
  await clickFirstButton(page, [/^Next$/i], "upload step 3");
}

async function enterpriseUploadFlow(page) {
  await fillFirstAvailable(page, ['input[placeholder="Youth Service"]', 'label:has-text("Event name") input', 'input[name="eventName"]'], "Focused core QA fellowship", "upload event");
  await fillFirstAvailable(page, ['input[type="date"]', 'input[name="eventDate"]'], "2026-06-06", "upload date");
  await fillFirstAvailable(page, ['input[placeholder="Youth / RE"]', 'label:has-text("Ministry / team") input', 'input[name="ministry"]'], "Internet Ministry", "upload ministry");
  await fillFirstAvailable(page, ['input[placeholder="Media team or photographer"]', 'label:has-text("Photographer / source") input', 'input[name="source"]'], "QA reviewer", "upload source");
  await fillFirstAvailable(page, ['input[placeholder="Church, city, or room"]', 'label:has-text("Location") input', 'input[name="location"]'], "Local QA", "upload location");
  await fillFirstAvailable(page, ['textarea[placeholder^="How might these photos"]', 'label:has-text("Intended use") textarea', 'textarea[name="usageNote"]'], "No known restrictions from focused QA fixture.", "upload permission note");
  await fillFirstAvailable(page, ['textarea[placeholder^="Anything the media team"]', 'label:has-text("Notes for reviewers") textarea', 'textarea[name="reviewerNote"]'], "Focused browser QA note.", "upload reviewer note");
  await clickFirstButton(page, [/^Review and send$/i, /^Next$/i], "upload review step");
}

async function uploadReceiptFlow(browser) {
  const { page, context } = await newPage(browser, "Contributor", 390, 900);
  try {
    await gotoReady(page, "/upload", "upload receipt flow");
    await setUploadFixtureFile(page);
    await clickFirstButton(page, [/^Describe them$/i, /^Next$/i], "upload start step");

    if (await isVisible(page, 'input[name="title"]')) {
      await oldUploadFlow(page);
    } else {
      await enterpriseUploadFlow(page);
    }

    const submitError = await page.getByRole("button", { name: /Submit for review|Send to media team/i }).click({ timeout: 10000 })
      .then(() => null)
      .catch((error) => error);
    const submitted = await page.getByRole("heading", { name: /Photos sent|Submitted for review/i }).first().waitFor({ state: "visible", timeout: 15000 })
      .then(() => true)
      .catch(() => false);
    if (!submitted) {
      if (submitError) failures.push(`upload receipt flow: submit failed ${submitError.message || submitError}`);
      failures.push("upload receipt flow: receipt confirmation missing");
    }
    await shot(page, "upload-receipt-mobile");
  } finally {
    await context.close().catch(() => {});
  }

  const ledger = await newPage(browser, "Contributor", 390, 900);
  try {
    await gotoReady(ledger.page, "/recent-uploads", "my uploads receipt");
    const text = await visibleText(ledger.page);
    if (!/My Uploads|Local browser receipt|Focused core QA|focused-core-photo/i.test(text)) failures.push("my uploads receipt: receipt ledger copy missing");
    await checkKeyboard(ledger.page, "my uploads receipt");
    await shot(ledger.page, "my-uploads-receipt-mobile");
  } finally {
    await ledger.context.close().catch(() => {});
  }
}

async function requestsFlow(browser) {
  const { page, context } = await newPage(browser, "Viewer", 390, 900);
  try {
    await gotoReady(page, "/requests", "requests flow");
    await page.locator("button").filter({ hasText: "Request permission" }).first().click({ timeout: 5000 });
    await fillFirst(page, 'label:has-text("Context") input', "Focused core QA permission request", "request context");
    await fillFirst(page, 'label:has-text("Message") textarea', "Please review whether this media can be used.", "request message");
    await page.getByRole("button", { name: /Save (request|local) receipt/i }).click({ timeout: 5000 });
    await page.getByText(/Local receipt saved|Request receipt saved/i).first().waitFor({ state: "visible", timeout: 10000 }).catch(() => failures.push("requests flow: receipt confirmation missing"));
    await checkKeyboard(page, "requests flow");
    await shot(page, "requests-receipt-mobile");
  } finally {
    await context.close().catch(() => {});
  }
}

const browser = await chromium.launch({ headless: true });

const routes = [
  { id: "browse-media", label: "Browse Media", path: "/library", role: "Viewer", must: [/Media Library|Browse Media/i] },
  { id: "albums", label: "Albums", path: "/collections", role: "Viewer", must: [/Albums|Collections/i] },
  { id: "asset-detail", label: "Asset Detail", path: "/assets/368", role: "Viewer", must: [/Bench Bible|Asset record|Reuse decision/i] },
  { id: "review-viewer-gate", label: "Review Uploads disconnected", path: "/review", role: "Viewer", must: [/reviewer access|Review Uploads requires|Reviewer access needed/i] },
  { id: "reviewer-upload-review", label: "Review Uploads", path: "/review?queue=pending", role: "Reviewer", must: [/Review Uploads|Uploads to review|No uploads need review/i], mustNot: [/ResourceSpace updated successfully/i] },
  { id: "my-work-reviewer", label: "My Work Reviewer", path: "/my-tasks", role: "Reviewer", must: [/My Work/i] },
  { id: "my-work-admin", label: "My Work Admin", path: "/my-tasks", role: "DAM Admin", must: [/My Work/i] },
  { id: "requests", label: "Requests", path: "/requests", role: "Viewer", must: [/Requests/i] },
  { id: "help", label: "Help", path: "/help", role: "Viewer", must: [/Help Center/i] },
  { id: "admin", label: "Admin", path: "/admin", role: "DAM Admin", must: [/Admin|Read-only observer mode/i] },
  { id: "support", label: "Admin Support Zone", path: "/governance/integrations", role: "DAM Admin", must: [/Support Zone|Integration/i] }
];

for (const route of routes) await smokeRoute(browser, route);
await withQaTimeout("upload receipt flow", 60000, () => uploadReceiptFlow(browser)).catch((error) => failures.push(error.message || String(error)));
await withQaTimeout("requests flow", 45000, () => requestsFlow(browser)).catch((error) => failures.push(error.message || String(error)));

await Promise.race([
  browser.close(),
  new Promise((resolve) => setTimeout(resolve, 5000))
]).catch(() => {});

const report = {
  checkedAt: new Date().toISOString(),
  base,
  routes: routes.map((route) => route.label),
  screenshots,
  failures,
  warnings,
  consoleErrors,
  networkFailures
};

const reportPath = path.join(outDir, `${stamp}-report.json`);
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify({
  report: reportPath,
  failures: failures.length,
  warnings: warnings.length,
  consoleErrors: consoleErrors.length,
  networkFailures: networkFailures.length,
  screenshots: screenshots.length
}, null, 2));

process.exit(failures.length || consoleErrors.length || networkFailures.length ? 1 : 0);
