#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import playwright from "../frontend/node_modules/playwright/index.js";

const { chromium } = playwright;

const root = process.cwd();
const base = process.env.BASE_URL || "http://127.0.0.1:4871";
const outDir = path.resolve(process.env.PROOF_DIR || "docs/screenshots/qa/product-wide-parity-2026-06-25");
const forbiddenTerms = [
  "Archive One",
  "Acme",
  "Taylor Morgan",
  "Jordan Kim",
  "aone.io",
  "Okta",
  "Amazon S3",
  "Atlas",
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
const requiredProofNames = [
  "marketing-home",
  "library-admin",
  "library-interactions-admin",
  "collections-admin",
  "public-portal",
  "upload-contributor-success",
  "requests-after-upload",
  "reviewer-workbench",
  "distribution-admin",
  "audit-admin",
  "settings-integrations-admin",
  "roles-access-admin",
  "mobile-library",
  "brand-kit-admin",
  "asset-detail-download-admin"
];

function urlWithRole(route, role) {
  const url = new URL(route, base);
  if (role) url.searchParams.set("role", role);
  return url.toString();
}

function harmlessAbort(failure) {
  return /net::ERR_ABORTED|NS_BINDING_ABORTED/i.test(failure || "");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function proofPath(file) {
  return path.join(outDir, file);
}

function proofRef(file) {
  return path.relative(root, proofPath(file));
}

async function inspectPage(page) {
  const text = await page.locator("body").innerText().catch(() => "");
  const shell = await page.evaluate(() => {
    const root = document.querySelector(".proto-root");
    const shellEl = document.querySelector(".proto-app-shell");
    const rootStyle = root ? getComputedStyle(root) : null;
    const shellStyle = shellEl ? getComputedStyle(shellEl) : null;
    return {
      hasAuthenticatedShell: Boolean(shellEl),
      rootPadding: rootStyle?.padding || null,
      appShellBorder: shellStyle?.border || null,
      appShellRadius: shellStyle?.borderRadius || null,
      appShellShadow: shellStyle?.boxShadow || null,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      assetCardCount: document.querySelectorAll(".proto-asset-card").length,
      collectionCardCount: document.querySelectorAll(".proto-collection-tile").length
    };
  });
  const outerFrameOk = shell.hasAuthenticatedShell
    ? shell.rootPadding === "0px" &&
      shell.appShellRadius === "0px" &&
      shell.appShellShadow === "none" &&
      /0px none/.test(shell.appShellBorder || "")
    : true;
  return {
    bannedCopyHits: forbiddenTerms.filter((term) => text.includes(term)),
    horizontalOverflow: shell.horizontalOverflow,
    outerFrameOk,
    shell,
    textSample: text.slice(0, 2200)
  };
}

async function instrumentedContext(browser, role, viewport = { width: 1440, height: 1040 }) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    extraHTTPHeaders: role ? { "x-tjc-local-beta-role": role, "x-tjc-role": role } : undefined
  });
  const page = await context.newPage();
  const consoleWarningsAndErrors = [];
  const failedRequests = [];
  const badResponses = [];

  page.on("console", (message) => {
    if (["warning", "error"].includes(message.type())) {
      consoleWarningsAndErrors.push({ type: message.type(), text: message.text().slice(0, 500) });
    }
  });
  page.on("requestfailed", (request) => {
    const failure = request.failure()?.errorText || "";
    if (!harmlessAbort(failure)) failedRequests.push({ url: request.url(), method: request.method(), failure });
  });
  page.on("response", (response) => {
    if (response.status() >= 400) badResponses.push({ url: response.url(), status: response.status() });
  });

  return { context, page, consoleWarningsAndErrors, failedRequests, badResponses };
}

async function capture(browser, spec) {
  const { context, page, consoleWarningsAndErrors, failedRequests, badResponses } = await instrumentedContext(browser, spec.role, spec.viewport);
  await page.goto(urlWithRole(spec.route, spec.role), { waitUntil: "networkidle", timeout: 30000 });
  const interactionProof = spec.after ? await spec.after(page) : null;
  await page.waitForTimeout(350);
  await page.screenshot({ path: proofPath(spec.file), fullPage: Boolean(spec.fullPage) });
  const inspection = await inspectPage(page);
  await context.close();
  return {
    name: spec.name,
    roleTested: spec.role || "public",
    routeTested: spec.route,
    screenshot: proofRef(spec.file),
    consoleWarningsAndErrors,
    failedRequests,
    badResponses,
    horizontalOverflowResult: inspection.horizontalOverflow ? "fail" : "pass",
    visibleBannedCopyScanResult: inspection.bannedCopyHits.length ? "fail" : "pass",
    bannedCopyHits: inspection.bannedCopyHits,
    outerFrameCheckResult: inspection.outerFrameOk ? "pass" : "fail",
    populatedGridResult: spec.name === "library-admin"
      ? (inspection.shell.assetCardCount >= 12 ? "pass" : "warn")
      : spec.name === "collections-admin"
        ? (inspection.shell.collectionCardCount >= 4 ? "pass" : "warn")
        : undefined,
    interactionProof,
    shell: inspection.shell,
    textSample: inspection.textSample
  };
}

async function captureLibraryInteractions(browser) {
  const { context, page, consoleWarningsAndErrors, failedRequests, badResponses } = await instrumentedContext(browser, "DAM Admin");
  await page.goto(urlWithRole("/library?limit=24&offset=0&sort=Newest", "DAM Admin"), { waitUntil: "networkidle", timeout: 30000 });
  const failures = [];

  const firstCard = page.locator(".proto-asset-card").first();
  if (await firstCard.count()) {
    await firstCard.click();
    await page.waitForTimeout(250);
  } else {
    failures.push("asset cards missing");
  }

  const selectedInspectorVisible = await page.getByText("Asset inspector").first().isVisible().catch(() => false);
  if (!selectedInspectorVisible) failures.push("selected asset did not open inspector");

  let cardHoverProof = null;
  const hoverCard = page.locator(".proto-asset-card").nth(1);
  if (await hoverCard.count()) {
    const beforeHover = await hoverCard.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        backgroundColor: style.backgroundColor,
        borderColor: style.borderColor,
        boxShadow: style.boxShadow,
        transform: style.transform
      };
    });
    await hoverCard.hover();
    await page.waitForTimeout(200);
    cardHoverProof = await hoverCard.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        hovered: element.matches(":hover"),
        backgroundColor: style.backgroundColor,
        borderColor: style.borderColor,
        boxShadow: style.boxShadow,
        transform: style.transform
      };
    });
    const hoverVisualChanged =
      beforeHover.backgroundColor !== cardHoverProof.backgroundColor ||
      beforeHover.borderColor !== cardHoverProof.borderColor ||
      beforeHover.boxShadow !== cardHoverProof.boxShadow ||
      beforeHover.transform !== cardHoverProof.transform;
    cardHoverProof = { ...cardHoverProof, hoverVisualChanged };
    if (!cardHoverProof.hovered) failures.push("asset card hover state was not reachable");
    if (!cardHoverProof.hoverVisualChanged) failures.push("asset card hover state did not visibly change style");
  }

  let cardFocusProof = null;
  if (await firstCard.count()) {
    await firstCard.focus();
    cardFocusProof = await page.evaluate(() => {
      const active = document.activeElement;
      if (!active) return { focused: false, outlineStyle: "", outlineWidth: "" };
      const style = getComputedStyle(active);
      return {
        focused: active.classList.contains("proto-asset-card"),
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth
      };
    });
    if (!cardFocusProof.focused) failures.push("asset card is not keyboard focusable");
    if (cardFocusProof.outlineStyle === "none" || cardFocusProof.outlineWidth === "0px") failures.push("asset card focus ring is not visible");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(250);
    const keyboardInspectorVisible = await page.getByText("Asset inspector").first().isVisible().catch(() => false);
    if (!keyboardInspectorVisible) failures.push("Enter key did not open selected asset inspector");
  }

  await page.keyboard.press("Control+K");
  await page.waitForTimeout(350);
  const commandPaletteVisible = await page.getByRole("dialog", { name: /DAM command center/i }).first().isVisible().catch(() => false);
  if (!commandPaletteVisible) failures.push("Command-K did not open DAM command center");
  const commandInputFocused = await page.evaluate(() => {
    const active = document.activeElement;
    return Boolean(active && active.getAttribute("aria-label") === "Search DAM commands and assets");
  });
  if (!commandInputFocused) failures.push("Command palette did not move focus into command input");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(250);

  const opsButton = page.locator(".proto-mode-toggle button").nth(1);
  if (await opsButton.count()) {
    await opsButton.click();
    await page.waitForTimeout(250);
  } else {
    failures.push("Ops mode button missing");
  }
  const opsModeVisible = await page.getByText("Ops mode").first().isVisible().catch(() => false);
  if (!opsModeVisible) failures.push("Browse/Ops mode did not visibly change");

  await page.getByRole("button", { name: /Saved views/i }).first().click();
  const savedViewsVisible = await page.locator('[aria-label="Saved views"]').first().isVisible().catch(() => false);
  if (!savedViewsVisible) failures.push("saved views menu did not open");
  await page.getByRole("button", { name: /Need review/i }).first().click();
  await page.waitForTimeout(350);
  const searchValue = await page.locator('input[placeholder*="Search"]').first().inputValue().catch(() => "");
  if (!/needs review/i.test(searchValue)) failures.push("saved view did not update search state");

  await page.getByRole("button", { name: /Filters/i }).first().click();
  const filtersVisible = await page.locator('[aria-label="Library filters"]').first().isVisible().catch(() => false);
  if (!filtersVisible) failures.push("filters panel did not open");
  await page.locator('[aria-label="Library filters"]').getByRole("button", { name: /Rights-safe/i }).first().click();
  await page.waitForTimeout(350);
  const rightsSummaryVisible = await page.locator(".proto-rights-safe-summary").first().isVisible().catch(() => false);
  if (!rightsSummaryVisible) failures.push("rights-safe toggle did not show summary");

  const firstCheckbox = page.locator(".proto-asset-card .proto-card-check").first();
  if (await firstCheckbox.count()) {
    await firstCheckbox.click({ force: true });
    await page.waitForTimeout(250);
    const selectionVisible = /1 selected/.test(await page.locator("body").innerText().catch(() => ""));
    if (!selectionVisible) failures.push("asset checkbox did not update bulk selection state");
  } else {
    failures.push("asset selection checkbox missing");
  }

  const libraryShareButton = page.locator(".proto-toolbar").getByRole("button", { name: /^Share$/i });
  if (await libraryShareButton.count()) {
    await libraryShareButton.first().click();
    await page.waitForTimeout(250);
  } else {
    failures.push("library share control missing");
  }
  const librarySharePanel = page.locator('[aria-label="Library distribution share request"]');
  const librarySharePanelVisible = await librarySharePanel.first().isVisible().catch(() => false);
  const libraryShareFieldValues = librarySharePanelVisible
    ? await librarySharePanel.locator("input").evaluateAll((inputs) => inputs.map((input) => input.value))
    : [];
  const libraryShareFieldsVisible =
    librarySharePanelVisible &&
    /Distribution request[\s\S]*Access[\s\S]*Expiration[\s\S]*Watermark[\s\S]*Password[\s\S]*Recipients/i.test(await librarySharePanel.innerText().catch(() => "")) &&
    libraryShareFieldValues.some((value) => /No recipients notified/i.test(value)) &&
    libraryShareFieldValues.some((value) => /Required before public link/i.test(value));
  if (!libraryShareFieldsVisible) failures.push("library share action did not open distribution request panel");
  const libraryShareDraftFailure = await clickAndExpectText(
    page,
    page.locator('[aria-label="Library distribution share request"]').getByRole("button", { name: /Save draft/i }),
    /Distribution request saved locally as draft only|No public URL was created/i,
    "library share draft action did not show no-public-URL response"
  );
  if (libraryShareDraftFailure) failures.push(libraryShareDraftFailure);
  const libraryShareReadinessFailure = await clickAndExpectText(
    page,
    page.locator('[aria-label="Library distribution share request"]').getByRole("button", { name: /Check readiness/i }),
    /Share readiness blocked|approved-copy gates still apply/i,
    "library share readiness action did not show item-gate response"
  );
  if (libraryShareReadinessFailure) failures.push(libraryShareReadinessFailure);

  await page.screenshot({ path: proofPath("library-interactions-admin.png"), fullPage: false });
  const inspection = await inspectPage(page);
  await context.close();
  return {
    name: "library-interactions-admin",
    roleTested: "DAM Admin",
    routeTested: "/library?limit=24&offset=0&sort=Newest",
    screenshot: proofRef("library-interactions-admin.png"),
    consoleWarningsAndErrors,
    failedRequests,
    badResponses,
    horizontalOverflowResult: inspection.horizontalOverflow ? "fail" : "pass",
    visibleBannedCopyScanResult: inspection.bannedCopyHits.length ? "fail" : "pass",
    bannedCopyHits: inspection.bannedCopyHits,
    outerFrameCheckResult: inspection.outerFrameOk ? "pass" : "fail",
    interactionProof: {
      savedViewsVisible,
      searchValue,
      filtersVisible,
      rightsSummaryVisible,
      opsModeVisible,
      selectedInspectorVisible,
      cardHoverProof,
      cardFocusProof,
      commandPaletteVisible,
      commandInputFocused,
      librarySharePanelVisible: libraryShareFieldsVisible,
      libraryShareFieldValues,
      libraryShareDraftResponseVisible: !libraryShareDraftFailure,
      libraryShareReadinessResponseVisible: !libraryShareReadinessFailure,
      failures
    },
    shell: inspection.shell,
    textSample: inspection.textSample
  };
}

async function clickAndExpectText(page, clickTarget, expected, failureMessage) {
  const target = typeof clickTarget === "function" ? clickTarget(page) : clickTarget;
  if (!(await target.count())) return failureMessage.replace("did not show", "control missing for");
  await target.first().click();
  await page.waitForTimeout(250);
  const bodyText = await page.locator("body").innerText().catch(() => "");
  return expected.test(bodyText) ? null : failureMessage;
}

async function expectPageText(page, expected, failureMessage) {
  const bodyText = await page.locator("body").innerText().catch(() => "");
  return expected.test(bodyText) ? null : failureMessage;
}

async function captureUploadSuccess(browser) {
  const { context, page, consoleWarningsAndErrors, failedRequests, badResponses } = await instrumentedContext(browser, "Contributor");
  await page.goto(urlWithRole("/upload", "Contributor"), { waitUntil: "networkidle", timeout: 30000 });
  const submittedEventName = `Runtime Proof ${Date.now()}`;
  await page.fill('input[name="sourceLink"]', "https://drive.google.com/file/d/runtime-proof-local-demo");
  await page.fill('input[name="eventName"]', submittedEventName);
  await page.fill('input[name="eventDate"]', "2026-06-25");
  await page.fill('input[name="ministry"]', "Media Team");
  await page.fill('input[name="source"]', "Contributor proof");
  await page.fill('input[name="location"]', "Local church");
  await page.fill('input[name="usageRights"]', "Reviewer verifies");
  await page.fill('input[name="tags"]', "worship, service, review");
  await page.fill('input[name="notes"]', "Runtime product-wide parity proof.");
  const selects = page.locator(".proto-review-fields select");
  await selects.nth(0).selectOption({ label: "No" });
  await selects.nth(1).selectOption({ label: "No" });
  await selects.nth(2).selectOption({ label: "No" });
  await page.getByRole("button", { name: /Send to media team/i }).click();
  await page.waitForTimeout(1200);
  const failures = [];
  const successFailure = await expectPageText(
    page,
    /Intake ticket .* queued|Needs Review|Do Not Publish|ResourceSpace written: no/i,
    "upload submit did not show queued Needs Review / Do Not Publish success state"
  );
  if (successFailure) failures.push(successFailure);
  const postSubmitText = await page.locator("body").innerText().catch(() => "");
  const stateCoverageVisible = /State coverage[\s\S]*Empty state stays local and role-gated[\s\S]*Loading state stays local and role-gated[\s\S]*Error state stays local and role-gated[\s\S]*Permission denied state stays local and role-gated/i.test(postSubmitText);
  if (!stateCoverageVisible) failures.push("upload ingest missing empty/loading/error/permission-denied state coverage");
  await page.screenshot({ path: proofPath("upload-contributor-success.png"), fullPage: false });
  const inspection = await inspectPage(page);
  await context.close();
  return {
    name: "upload-contributor-success",
    roleTested: "Contributor",
    routeTested: "/upload",
    screenshot: proofRef("upload-contributor-success.png"),
    submittedEventName,
    consoleWarningsAndErrors,
    failedRequests,
    badResponses,
    horizontalOverflowResult: inspection.horizontalOverflow ? "fail" : "pass",
    visibleBannedCopyScanResult: inspection.bannedCopyHits.length ? "fail" : "pass",
    bannedCopyHits: inspection.bannedCopyHits,
    outerFrameCheckResult: inspection.outerFrameOk ? "pass" : "fail",
    workflowResult: inspection.textSample.includes("Intake packet submitted") || inspection.textSample.includes("review") ? "visible-success" : "check-screenshot",
    interactionProof: {
      submittedEventName,
      submittedEventVisible: postSubmitText.includes(submittedEventName),
      queuedSuccessVisible: /Intake ticket .* queued|Intake packet submitted/i.test(postSubmitText),
      needsReviewVisible: /Needs Review/i.test(postSubmitText),
      doNotPublishVisible: /Do Not Publish/i.test(postSubmitText),
      resourceSpaceNoWriteVisible: /ResourceSpace written: no/i.test(postSubmitText),
      stateCoverageVisible,
      failures
    },
    shell: inspection.shell,
    textSample: inspection.textSample
  };
}

function aggregate(results) {
  const resultNames = new Set(results.map((result) => result.name));
  return {
    routeCount: results.length,
    missingRequiredProofs: requiredProofNames.filter((name) => !resultNames.has(name)),
    bannedCopyFailures: results.filter((result) => result.visibleBannedCopyScanResult !== "pass").map((result) => result.name),
    outerFrameFailures: results.filter((result) => result.outerFrameCheckResult !== "pass").map((result) => result.name),
    horizontalOverflowFailures: results.filter((result) => result.horizontalOverflowResult !== "pass").map((result) => result.name),
    failedRequestRoutes: results
      .filter((result) => (result.failedRequests || []).length || (result.badResponses || []).length)
      .map((result) => ({ name: result.name, failedRequests: result.failedRequests, badResponses: result.badResponses })),
    consoleIssueRoutes: results
      .filter((result) => (result.consoleWarningsAndErrors || []).length)
      .map((result) => ({ name: result.name, consoleWarningsAndErrors: result.consoleWarningsAndErrors })),
    populatedGridWarnings: results.filter((result) => result.populatedGridResult === "warn").map((result) => result.name),
    interactionFailures: results
      .filter((result) => (result.interactionProof?.failures || []).length)
      .map((result) => ({ name: result.name, failures: result.interactionProof.failures }))
  };
}

fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const results = [];

results.push(await capture(browser, {
  name: "marketing-home",
  role: null,
  route: "/",
  file: "marketing-home.png",
  fullPage: true,
  after: async (page) => {
    const bodyText = await page.locator("body").innerText().catch(() => "");
    const hasAuthenticatedShell = await page.locator(".proto-app-shell").count().then((count) => count > 0).catch(() => false);
    const tjcIdentityVisible = /TJC Media Library/i.test(bodyText);
    const heroVisible = /A church media DAM for teams that need control/i.test(bodyText);
    const embeddedMockupVisible = /Library[\s\S]*Collections[\s\S]*Rights-safe only[\s\S]*Download[\s\S]*Share[\s\S]*Add to collection/i.test(bodyText);
    const roleCardsVisible = /Viewer[\s\S]*Contributor[\s\S]*Reviewer[\s\S]*Admin/i.test(bodyText);
    const resourceSpaceTruthVisible = /ResourceSpace truth|ResourceSpace/i.test(bodyText);
    const failures = [];
    if (hasAuthenticatedShell) failures.push("marketing home rendered authenticated DAM shell");
    if (!tjcIdentityVisible) failures.push("marketing home missing TJC identity");
    if (!heroVisible) failures.push("marketing home missing church DAM hero");
    if (!embeddedMockupVisible) failures.push("marketing home missing embedded DAM mockup");
    if (!roleCardsVisible) failures.push("marketing home missing role cards");
    if (!resourceSpaceTruthVisible) failures.push("marketing home missing ResourceSpace truth copy");
    return {
      noAuthenticatedShell: !hasAuthenticatedShell,
      tjcIdentityVisible,
      heroVisible,
      embeddedMockupVisible,
      roleCardsVisible,
      resourceSpaceTruthVisible,
      failures
    };
  }
}));
results.push(await capture(browser, {
  name: "library-admin",
  role: "DAM Admin",
  route: "/library?limit=24&offset=0&sort=Newest",
  file: "library-admin.png",
  after: async (page) => {
    const first = page.locator(".proto-asset-card").first();
    if (await first.count()) await first.click();
    await page.waitForTimeout(250);
    const bodyText = await page.locator("body").innerText().catch(() => "");
    const assetCardCount = await page.locator(".proto-asset-card").count().catch(() => 0);
    const selectedInspectorVisible = /Asset inspector[\s\S]*1 of/i.test(bodyText);
    const rightsSafeControlVisible = /Show rights-safe assets only/i.test(bodyText);
    const filterControlsVisible = /Saved views[\s\S]*Filters/i.test(bodyText);
    const bulkActionsVisible = /Download[\s\S]*Share[\s\S]*Add to collection/i.test(bodyText);
    const mediaFrameCount = await page.locator(".proto-asset-card .proto-asset-image").count().catch(() => 0);
    const cardTextCoverage = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll(".proto-asset-card"));
      return {
        total: cards.length,
        withText: cards.filter((card) => (card.textContent || "").trim().length > 0).length
      };
    }).catch(() => ({ total: 0, withText: 0 }));
    const failures = [];
    if (assetCardCount < 12) failures.push(`library admin showed too few asset cards: ${assetCardCount}`);
    if (!selectedInspectorVisible) failures.push("library admin did not show selected asset inspector");
    if (!rightsSafeControlVisible) failures.push("library admin missing rights-safe control");
    if (!filterControlsVisible) failures.push("library admin missing saved views / filters controls");
    if (!bulkActionsVisible) failures.push("library admin missing bulk actions");
    if (mediaFrameCount < assetCardCount) failures.push(`library admin missing media frames for some asset cards: ${mediaFrameCount} of ${assetCardCount}`);
    if (cardTextCoverage.total === 0 || cardTextCoverage.withText !== cardTextCoverage.total) failures.push("library admin contains blank asset cards");
    return {
      assetCardCount,
      selectedInspectorVisible,
      rightsSafeControlVisible,
      filterControlsVisible,
      bulkActionsVisible,
      mediaFrameCount,
      mediaFramesVisible: mediaFrameCount >= assetCardCount && assetCardCount > 0,
      cardTextCoverage,
      failures
    };
  }
}));
results.push(await captureLibraryInteractions(browser));
results.push(await capture(browser, {
  name: "collections-admin",
  role: "DAM Admin",
  route: "/collections",
  file: "collections-admin.png",
  after: async (page) => {
    await page.waitForFunction(() => document.querySelectorAll(".proto-collection-tile").length >= 4, null, { timeout: 10000 }).catch(() => null);
    const collectionCount = await page.locator(".proto-collection-tile").count().catch(() => 0);
    const inspectorVisible = await page.locator('[aria-label="Collection detail"]').first().isVisible().catch(() => false);
    const openCollectionVisible = await page.getByRole("link", { name: /Open collection/i }).first().isVisible().catch(() => false);
    const shareFailure = await clickAndExpectText(
      page,
      page.getByRole("button", { name: /Share collection/i }).first(),
      /No public collection link exists|No link was copied/i,
      "collection share action did not show no-public-link response"
    );
    const downloadFailure = await clickAndExpectText(
      page,
      page.getByRole("button", { name: /Download package/i }).first(),
      /Package download is disabled|item-level gates pass/i,
      "collection download action did not show package-disabled response"
    );
    const readinessFailure = await clickAndExpectText(
      page,
      page.getByRole("button", { name: /Check readiness|Request review/i }).first(),
      /readiness|review|ResourceSpace|gated|blocked|local demo/i,
      "collection readiness action did not show a visible response"
    );
    const bodyText = await page.locator("body").innerText().catch(() => "");
    const readinessResponseVisible = /readiness|review|ResourceSpace|gated|blocked|local demo/i.test(bodyText);
    const failures = [];
    if (collectionCount < 4) failures.push(`collections admin showed too few collection cards: ${collectionCount}`);
    if (!inspectorVisible) failures.push("collections admin did not show collection inspector");
    if (!openCollectionVisible) failures.push("collections admin did not show Open collection action");
    if (shareFailure) failures.push(shareFailure);
    if (downloadFailure) failures.push(downloadFailure);
    if (readinessFailure) failures.push(readinessFailure);
    return {
      collectionCount,
      inspectorVisible,
      openCollectionVisible,
      shareResponseVisible: !shareFailure,
      downloadRestrictionVisible: !downloadFailure,
      readinessResponseVisible,
      failures
    };
  }
}));
results.push(await capture(browser, {
  name: "public-portal",
  role: null,
  route: "/public-portal/spring-campaign-2024",
  file: "public-portal.png",
  fullPage: true,
  after: async (page) => {
    const failures = [];
    const bodyText = await page.locator("body").innerText().catch(() => "");
    const hasAuthenticatedShell = await page.locator(".proto-app-shell").count().then((count) => count > 0).catch(() => false);
    const tjcPortalIdentityVisible = /TJC Media Library[\s\S]*Sabbath Service Media[\s\S]*Approved collection/i.test(bodyText);
    const accessCardVisible = /True Jesus Church[\s\S]*Media Team[\s\S]*Allowed channels[\s\S]*Website, newsletter, internal slides[\s\S]*Region[\s\S]*Church media use/i.test(bodyText);
    const usageNotesVisible = /About this collection[\s\S]*Usage notes[\s\S]*Use approved assets only[\s\S]*Request review when people or youth appear/i.test(bodyText);
    const assetGridVisible =
      /12 assets/i.test(bodyText) &&
      /Bible Teaching Background\.jpg/i.test(bodyText) &&
      /Welcome Team Detail\.jpg/i.test(bodyText) &&
      /Rights-safe/i.test(bodyText) &&
      /Request/i.test(bodyText) &&
      /Internal/i.test(bodyText);
    let noPublicLinkTruthVisible = await page
      .getByText(/Local demo has no public share URL|Published portal link remains disabled|no public share URL/i)
      .first()
      .isVisible()
      .catch(() => false);
    if (hasAuthenticatedShell) failures.push("public portal rendered authenticated DAM shell");
    if (!tjcPortalIdentityVisible) failures.push("public portal missing TJC collection identity");
    if (!accessCardVisible) failures.push("public portal missing access/usage card");
    if (!usageNotesVisible) failures.push("public portal missing usage notes");
    if (!assetGridVisible) failures.push("public portal missing asset grid/readiness states");
    const disabledDownload = await page.getByRole("button", { name: /Download all disabled/i }).first().isDisabled().catch(() => false);
    if (!disabledDownload) failures.push("public portal download-all restriction is not visibly disabled");
    const requestFailure = await clickAndExpectText(
      page,
      page.getByRole("button", { name: /Request asset/i }),
      /Request recorded locally|Media Team review required/i,
      "public portal request action did not show local review response"
    );
    if (requestFailure) failures.push(requestFailure);
    const shareFailure = await clickAndExpectText(
      page,
      page.locator(".proto-public-access-card").getByRole("button", { name: /Share collection link/i }),
      /no public share URL|Published portal link remains disabled/i,
      "public portal share action did not show disabled-link response"
    );
    if (shareFailure) failures.push(shareFailure);
    if (!noPublicLinkTruthVisible) {
      const updatedBodyText = await page.locator("body").innerText().catch(() => "");
      noPublicLinkTruthVisible =
        /Local demo has no public share URL/i.test(updatedBodyText) ||
        /Published portal link remains disabled/i.test(updatedBodyText) ||
        /no public share URL/i.test(updatedBodyText);
    }
    if (!noPublicLinkTruthVisible) failures.push("public portal missing no-public-link truth boundary");
    return {
      noAuthenticatedShell: !hasAuthenticatedShell,
      tjcPortalIdentityVisible,
      accessCardVisible,
      usageNotesVisible,
      assetGridVisible,
      noPublicLinkTruthVisible,
      disabledDownload,
      requestResponseVisible: !requestFailure,
      shareRestrictionVisible: !shareFailure,
      failures
    };
  }
}));
const uploadResult = await captureUploadSuccess(browser);
const submittedUploadPattern = new RegExp(escapeRegExp(uploadResult.submittedEventName), "i");
results.push(uploadResult);
results.push(await capture(browser, {
  name: "requests-after-upload",
  role: "Contributor",
  route: "/requests",
  file: "requests-after-upload.png",
  after: async (page) => {
    const failures = [];
    const submittedFailure = await expectPageText(page, submittedUploadPattern, "requests page did not show the newly submitted upload intake");
    if (submittedFailure) failures.push(submittedFailure);
    const localQueueFailure = await expectPageText(page, /Local queue|Portal ticket|does not approve assets|write source truth/i, "requests page did not show local queue truth boundary");
    if (localQueueFailure) failures.push(localQueueFailure);
    const waitingFailure = await clickAndExpectText(page, page.getByRole("button", { name: /Waiting/i }), /Waiting|No waiting request tickets|Try another filter/i, "requests waiting filter did not visibly change state");
    if (waitingFailure) failures.push(waitingFailure);
    const closedFailure = await clickAndExpectText(page, page.getByRole("button", { name: /Closed/i }), /Closed|No closed request tickets|Try another filter/i, "requests closed filter did not visibly change state");
    if (closedFailure) failures.push(closedFailure);
    const askInfoFailure = await clickAndExpectText(page, page.getByRole("button", { name: /Ask info/i }), /Reply updates are not writable/i, "requests ask-info action did not show local-demo response");
    if (askInfoFailure) failures.push(askInfoFailure);
    return {
      submittedUploadVisible: !submittedFailure,
      localQueueTruthVisible: !localQueueFailure,
      waitingFilterVisible: !waitingFailure,
      closedFilterVisible: !closedFailure,
      askInfoLocalDemoVisible: !askInfoFailure,
      failures
    };
  }
}));
results.push(await capture(browser, {
  name: "reviewer-workbench",
  role: "Reviewer",
  route: "/review",
  file: "reviewer-workbench.png",
  after: async (page) => {
    const failures = [];
    const submittedFailure = await expectPageText(page, submittedUploadPattern, "review workbench did not show the newly submitted upload intake");
    if (submittedFailure) failures.push(submittedFailure);
    const intake = page.locator(".proto-review-intake-list button").first();
    if (await intake.count()) await intake.click();
    await page.waitForTimeout(350);
    const intakeFailure = await expectPageText(page, /Intake ticket|Upload tickets do not approve|Open Requests|must become a reviewed asset/i, "review workbench did not show intake truth boundary");
    if (intakeFailure) failures.push(intakeFailure);
    const surfaceFailure = await expectPageText(
      page,
      /Assign reviewer[\s\S]*Escalate[\s\S]*Version comparison[\s\S]*Reviewer SLA[\s\S]*Decision history[\s\S]*No source mutation/i,
      "review workbench missing issue #70 approval workspace surfaces"
    );
    if (surfaceFailure) failures.push(surfaceFailure);
    const annotationVisible = await page.locator(".proto-annotation-layer button").first().isVisible().catch(() => false);
    if (!annotationVisible) failures.push("review workbench annotation pins are not visible");
    const openRequestVisible = await page.getByRole("link", { name: /Open request/i }).first().isVisible().catch(() => false);
    if (!openRequestVisible) failures.push("review workbench intake did not expose Open request action");
    const approveDisabled = await page.getByRole("button", { name: /Approve public/i }).first().isDisabled().catch(() => false);
    if (!approveDisabled) failures.push("review workbench allows approving an intake ticket directly");
    return {
      submittedUploadVisible: !submittedFailure,
      intakeTruthBoundaryVisible: !intakeFailure,
      approvalWorkspaceSurfaceVisible: !surfaceFailure,
      annotationPinsVisible: annotationVisible,
      openRequestActionVisible: openRequestVisible,
      directApprovalBlocked: approveDisabled,
      failures
    };
  }
}));
results.push(await capture(browser, {
  name: "distribution-admin",
  role: "DAM Admin",
  route: "/distribution-sets",
  file: "distribution-admin.png",
  after: async (page) => {
    const failures = [];
    const shareFlowFailure = await clickAndExpectText(
      page,
      page.getByRole("button", { name: /Create share link/i }).first(),
      /Create share link[\s\S]*Access[\s\S]*Expiration[\s\S]*Watermark[\s\S]*Password[\s\S]*Recipients/i,
      "distribution create-share action did not open the security-forward share-link flow"
    );
    if (shareFlowFailure) failures.push(shareFlowFailure);
    const surfaceText = await page.locator("body").innerText().catch(() => "");
    const distributionListVisible = /All distribution sets[\s\S]*5[\s\S]*Sabbath Service Media[\s\S]*Youth Service Review[\s\S]*Public Website Approved/i.test(surfaceText);
    const detailPanelVisible = /Sabbath Service Media[\s\S]*Local demo: no public share URL created[\s\S]*Overview[\s\S]*Requesters 4[\s\S]*Settings[\s\S]*Activity/i.test(surfaceText);
    const performanceCardsVisible = /Local opens[\s\S]*128[\s\S]*Downloads enabled[\s\S]*0[\s\S]*Requesters[\s\S]*4/i.test(surfaceText);
    const securityFieldsVisible = /Access[\s\S]*Expiration[\s\S]*Watermark[\s\S]*Password[\s\S]*Recipients[\s\S]*Audit/i.test(surfaceText);
    const noPublicUrlVisible = /No public link in local demo|no public share URL created/i.test(surfaceText);
    if (!distributionListVisible) failures.push("distribution page missing distribution-set list");
    if (!detailPanelVisible) failures.push("distribution page missing selected distribution detail panel");
    if (!performanceCardsVisible) failures.push("distribution page missing local performance cards");
    if (!securityFieldsVisible) failures.push("distribution page missing security-forward share fields");
    if (!noPublicUrlVisible) failures.push("distribution page missing no-public-URL truth boundary");
    const draftFailure = await clickAndExpectText(
      page,
      page.locator(".proto-share-flow").getByRole("button", { name: /Save draft/i }),
      /draft-only|No public URL was created/i,
      "distribution share-link draft action did not show local-only restriction"
    );
    if (draftFailure) failures.push(draftFailure);
    for (const [name, expected, message] of [
      [/Copy link/i, /No public URL exists/i, "distribution copy-link action did not show no-link response"],
      [/Check readiness/i, /Readiness checked locally|rights gates still block|Readiness blocked/i, "distribution readiness action did not show readiness response"]
    ]) {
      const failure = await clickAndExpectText(page, page.getByRole("button", { name }).first(), expected, message);
      if (failure) failures.push(failure);
    }
    return {
      distributionListVisible,
      detailPanelVisible,
      performanceCardsVisible,
      securityFieldsVisible,
      noPublicUrlVisible,
      shareFlowVisible: !shareFlowFailure,
      draftOnlySaveVisible: !draftFailure,
      noPublicUrlCopyVisible: !failures.some((failure) => /copy-link/.test(failure)),
      readinessResponseVisible: !failures.some((failure) => /readiness action/.test(failure)),
      failures
    };
  }
}));
results.push(await capture(browser, {
  name: "audit-admin",
  role: "DAM Admin",
  route: "/governance/audit-log",
  file: "audit-admin.png",
  after: async (page) => {
    const failures = [];
    const initialText = await page.locator("body").innerText().catch(() => "");
    const kpiCardsVisible = /Assets missing rights[\s\S]*Expired reviews[\s\S]*Expiring links[\s\S]*Metadata validation issues[\s\S]*Policy violations/i.test(initialText);
    const auditTableVisible = /Timestamp[\s\S]*User[\s\S]*Action[\s\S]*Asset \/ Collection[\s\S]*Policy result[\s\S]*Status/i.test(initialText);
    const incidentRailVisible = /Recent incidents[\s\S]*Blocked public link attempt[\s\S]*Needs attention[\s\S]*Compliance posture/i.test(initialText);
    const remediationSignalsVisible = /Warning[\s\S]*Violation[\s\S]*Blocked|Needs review[\s\S]*Blocked/i.test(initialText);
    const quickRemediationVisible = /Quick remediation[\s\S]*Request rights[\s\S]*Revoke link[\s\S]*Assign metadata fix[\s\S]*Escalate violation[\s\S]*Review expiring links/i.test(initialText);
    if (!kpiCardsVisible) failures.push("audit page missing KPI cards");
    if (!auditTableVisible) failures.push("audit page missing governance table");
    if (!incidentRailVisible) failures.push("audit page missing incidents/compliance rail");
    if (!remediationSignalsVisible) failures.push("audit page missing warning/violation/remediation signals");
    if (!quickRemediationVisible) failures.push("audit page missing quick remediation actions");
    const exportFailure = await clickAndExpectText(page, page.getByRole("button", { name: /Export log/i }), /Audit export disabled/i, "audit export action did not show disabled response");
    if (exportFailure) failures.push(exportFailure);
    const filterFailure = await clickAndExpectText(page, page.getByRole("button", { name: /All users/i }), /filter is local-demo only|audit export was changed/i, "audit filter action did not show local filter response");
    if (filterFailure) failures.push(filterFailure);
    const rightsFailure = await clickAndExpectText(page, page.getByRole("button", { name: /Request rights/i }), /Rights request opened locally|Rights Reviewer must verify/i, "audit request-rights action did not show local remediation response");
    if (rightsFailure) failures.push(rightsFailure);
    const revokeFailure = await clickAndExpectText(page, page.getByRole("button", { name: /Revoke link/i }), /No public link exists|revoke action remains logged as blocked/i, "audit revoke-link action did not show blocked local response");
    if (revokeFailure) failures.push(revokeFailure);
    const metadataFailure = await clickAndExpectText(page, page.getByRole("button", { name: /Assign metadata fix/i }), /Metadata fix assigned locally|ResourceSpace writeback remains pending/i, "audit metadata-fix action did not show pending-writeback response");
    if (metadataFailure) failures.push(metadataFailure);
    const escalateFailure = await clickAndExpectText(page, page.getByRole("button", { name: /Escalate violation/i }), /Violation escalated locally|No approval state changed/i, "audit escalation action did not show no-approval-change response");
    if (escalateFailure) failures.push(escalateFailure);
    const expiringFailure = await clickAndExpectText(page, page.getByRole("button", { name: /Review expiring links/i }), /Expiring-link warning routed|No public link was created/i, "audit expiring warning action did not route to remediation context");
    if (expiringFailure) failures.push(expiringFailure);
    return {
      kpiCardsVisible,
      auditTableVisible,
      incidentRailVisible,
      remediationSignalsVisible,
      quickRemediationVisible,
      exportDisabledResponseVisible: !exportFailure,
      localFilterResponseVisible: !filterFailure,
      requestRightsResponseVisible: !rightsFailure,
      revokeLinkResponseVisible: !revokeFailure,
      metadataFixResponseVisible: !metadataFailure,
      escalationResponseVisible: !escalateFailure,
      expiringWarningRemediationVisible: !expiringFailure,
      failures
    };
  }
}));
results.push(await capture(browser, {
  name: "settings-integrations-admin",
  role: "DAM Admin",
  route: "/governance/integrations",
  file: "settings-integrations-admin.png",
  after: async (page) => {
    const failures = [];
    const initialText = await page.locator("body").innerText().catch(() => "");
    const resourceSpaceCardVisible = /ResourceSpace Connection[\s\S]*read local\/exported ResourceSpace metadata[\s\S]*Approval writeback remains disabled/i.test(initialText);
    const identityLocalDemoVisible = /SSO \/ Identity Provider[\s\S]*No production identity provider is claimed/i.test(initialText);
    const custodyBoundaryVisible = /Storage[\s\S]*Google Shared Drive and ResourceSpace custody[\s\S]*does not store originals[\s\S]*Not measured by portal/i.test(initialText);
    const apiWebhookPendingVisible = /Webhook & API Access[\s\S]*not enabled in this local demo[\s\S]*External automation stays off/i.test(initialText);
    const syncSurfacesVisible = /Metadata Sync[\s\S]*Read-only[\s\S]*Taxonomy Sync[\s\S]*Needs attention/i.test(initialText);
    const notificationLocalOnlyVisible = /Notification Settings[\s\S]*in-app only[\s\S]*Email notifications[\s\S]*Not configured/i.test(initialText);
    if (!resourceSpaceCardVisible) failures.push("settings page missing ResourceSpace read/no-write card");
    if (!identityLocalDemoVisible) failures.push("settings page missing local-demo identity boundary");
    if (!custodyBoundaryVisible) failures.push("settings page missing Shared Drive/ResourceSpace custody boundary");
    if (!apiWebhookPendingVisible) failures.push("settings page missing API/webhook pending boundary");
    if (!syncSurfacesVisible) failures.push("settings page missing metadata/taxonomy sync surfaces");
    if (!notificationLocalOnlyVisible) failures.push("settings page missing notification local-only surface");
    const statusFailure = await clickAndExpectText(page, page.getByRole("button", { name: /View system status/i }), /System status is local-only/i, "settings system-status action did not show local-only response");
    if (statusFailure) failures.push(statusFailure);
    const mappingFailure = await clickAndExpectText(page, page.getByRole("button", { name: /Review mapping/i }), /local-demo only|no external integration was changed/i, "settings integration action did not show no-change response");
    if (mappingFailure) failures.push(mappingFailure);
    return {
      resourceSpaceCardVisible,
      identityLocalDemoVisible,
      custodyBoundaryVisible,
      apiWebhookPendingVisible,
      syncSurfacesVisible,
      notificationLocalOnlyVisible,
      systemStatusLocalOnlyVisible: !statusFailure,
      mappingNoChangeVisible: !mappingFailure,
      failures
    };
  }
}));
results.push(await capture(browser, {
  name: "roles-access-admin",
  role: "DAM Admin",
  route: "/admin/roles",
  file: "roles-access-admin.png",
  after: async (page) => {
    const failures = [];
    const surfaceFailure = await expectPageText(
      page,
      /Roles & Access[\s\S]*Permissions matrix[\s\S]*Viewer[\s\S]*Contributor[\s\S]*Reviewer[\s\S]*Brand Manager[\s\S]*Legal[\s\S]*Admin[\s\S]*Simulate role view[\s\S]*No fake grants/i,
      "roles access page missing permissions matrix or simulation surface"
    );
    if (surfaceFailure) failures.push(surfaceFailure);
    const matrixVisible = await page.locator(".proto-permission-matrix").first().isVisible().catch(() => false);
    if (!matrixVisible) failures.push("roles access page missing permission matrix");
    const firstPermissionCell = page.locator(".proto-permission-cell").first();
    let matrixFocusProof = null;
    if (await firstPermissionCell.count()) {
      await firstPermissionCell.focus();
      matrixFocusProof = await page.evaluate(() => {
        const active = document.activeElement;
        if (!active) return { focused: false, outlineStyle: "", outlineWidth: "" };
        const style = getComputedStyle(active);
        return {
          focused: active.classList.contains("proto-permission-cell"),
          outlineStyle: style.outlineStyle,
          outlineWidth: style.outlineWidth
        };
      });
      if (!matrixFocusProof.focused) failures.push("roles permission matrix cell is not keyboard focusable");
      if (matrixFocusProof.outlineStyle === "none" || matrixFocusProof.outlineWidth === "0px") failures.push("roles permission matrix focus ring is not visible");
    } else {
      failures.push("roles permission matrix cells missing");
    }
    let legalSimulationVisible = false;
    const legalButton = page.getByRole("button", { name: /^Legal$/i }).first();
    if (await legalButton.count()) {
      await legalButton.click();
      await page.waitForTimeout(250);
      const legalFailure = await expectPageText(page, /Simulate role view[\s\S]*Legal[\s\S]*Validate rights/i, "role simulation did not switch to Legal affordance copy");
      if (legalFailure) failures.push(legalFailure);
      legalSimulationVisible = !legalFailure;
    } else {
      failures.push("Legal role simulator button missing");
    }
    const matrixFailure = await clickAndExpectText(
      page,
      page.getByRole("button", { name: /Admin Manage users: Allowed risky permission/i }).first(),
      /read-only local demo|no access grant changed/i,
      "risky permission cell did not show no-grant warning"
    );
    if (matrixFailure) failures.push(matrixFailure);
    const deniedStateVisible = await page.getByText(/Permission denied state/i).first().isVisible().catch(() => false);
    if (!deniedStateVisible) failures.push("roles page missing permission-denied state copy");
    const roleStateCoverageFailure = await expectPageText(
      page,
      /Empty[\s\S]*No role assignments loaded[\s\S]*Loading[\s\S]*Role policy hydration[\s\S]*Error[\s\S]*Identity mapping unavailable[\s\S]*Permission denied[\s\S]*Non-admin route fallback/i,
      "roles page missing empty/loading/error/permission-denied state coverage"
    );
    if (roleStateCoverageFailure) failures.push(roleStateCoverageFailure);
    await page.locator(".proto-permission-matrix").evaluate((element) => {
      element.scrollLeft = 0;
    }).catch(() => {});
    return {
      surfaceVisible: !surfaceFailure,
      matrixVisible,
      matrixFocusProof,
      legalSimulationVisible,
      riskyNoGrantResponseVisible: !matrixFailure,
      deniedStateVisible,
      roleStateCoverageVisible: !roleStateCoverageFailure,
      failures
    };
  }
}));
results.push(await capture(browser, {
  name: "mobile-library",
  role: "Viewer",
  route: "/library?limit=12&sort=Newest",
  file: "mobile-library.png",
  viewport: { width: 390, height: 844 },
  after: async (page) => {
    const failures = [];
    const sheetVisible = await page.locator(".proto-mobile-sheet").first().isVisible().catch(() => false);
    if (!sheetVisible) failures.push("mobile asset detail sheet is not visible");
    const bottomNavVisible = await page.locator(".proto-mobile-bottom").first().isVisible().catch(() => false);
    if (!bottomNavVisible) failures.push("mobile bottom navigation is not visible");
    const navCount = await page.locator(".proto-mobile-bottom a").count().catch(() => 0);
    if (navCount > 5) failures.push(`mobile bottom navigation has ${navCount} items`);
    const companionVisible = await page.locator(".proto-mobile-companion-panel").first().isVisible().catch(() => false);
    if (!companionVisible) failures.push("mobile companion viewer status panel is not visible");
    const rightsRowVisible = await page.locator(".proto-mobile-rights-row").first().isVisible().catch(() => false);
    if (!rightsRowVisible) failures.push("mobile rights-safe badge row is not visible");
    const touchTargets = await page.evaluate(() => {
      const selectors = [
        ".proto-mobile-bottom a",
        ".proto-mobile-sheet .proto-action-row button",
        ".proto-mobile-sheet .proto-action-row a",
        ".proto-mobile-companion-panel button"
      ];
      return selectors.flatMap((selector) => Array.from(document.querySelectorAll(selector)).map((element) => {
        const rect = element.getBoundingClientRect();
        return { selector, width: Math.round(rect.width), height: Math.round(rect.height) };
      }));
    });
    const smallTargets = touchTargets.filter((target) => target.height < 44 || target.width < 44);
    if (smallTargets.length) failures.push(`mobile touch targets below 44px: ${JSON.stringify(smallTargets.slice(0, 3))}`);
    const downloadVisible = await page.locator(".proto-mobile-sheet").getByRole("button", { name: /Download approved copy/i }).first().isVisible().catch(() => false);
    if (!downloadVisible) failures.push("mobile approved-copy download action is not visible");
    const shareFailure = await clickAndExpectText(
      page,
      page.locator(".proto-mobile-sheet").getByLabel(/Share selected asset/i),
      /Share stays gated by item approval and role/i,
      "mobile share action did not show gated-share response"
    );
    if (shareFailure) failures.push(shareFailure);
    const lockedFailure = await clickAndExpectText(
      page,
      page.locator(".proto-mobile-sheet").getByRole("button", { name: /Locked/i }),
      /Source\/original files remain restricted/i,
      "mobile locked action did not show source restriction response"
    );
    if (lockedFailure) failures.push(lockedFailure);
    const requestFailure = await clickAndExpectText(
      page,
      page.locator(".proto-mobile-sheet").getByRole("button", { name: /^Request$/i }),
      /review request|reviewer|queued|Media Team/i,
      "mobile request action did not show review request response"
    );
    if (requestFailure) failures.push(requestFailure);
    return {
      sheetVisible,
      bottomNavVisible,
      navCount,
      companionVisible,
      rightsRowVisible,
      touchTargetCount: touchTargets.length,
      smallTouchTargetCount: smallTargets.length,
      downloadVisible,
      shareGateResponseVisible: !shareFailure,
      sourceLockResponseVisible: !lockedFailure,
      requestResponseVisible: !requestFailure,
      failures
    };
  }
}));
results.push(await capture(browser, {
  name: "brand-kit-admin",
  role: "DAM Admin",
  route: "/brand-hub",
  file: "brand-kit-admin.png",
  after: async (page) => {
    const failures = [];
    const surfaceFailure = await expectPageText(
      page,
      /TJC Media Guidance Kit[\s\S]*Media Team \/ local demo guidance[\s\S]*Color palette[\s\S]*Typography[\s\S]*Approved templates[\s\S]*Brand rules/i,
      "brand kit page missing TJC guidance, palette, typography, templates, or rules"
    );
    if (surfaceFailure) failures.push(surfaceFailure);
    const shareFailure = await clickAndExpectText(
      page,
      page.getByRole("button", { name: /^Share$/i }),
      /Share disabled in local demo/i,
      "brand kit share action did not show local-demo disabled response"
    );
    if (shareFailure) failures.push(shareFailure);
    const downloadFailure = await clickAndExpectText(
      page,
      page.getByRole("button", { name: /Download kit/i }),
      /Brand kit ZIP creation disabled in local demo/i,
      "brand kit download action did not show local-demo disabled response"
    );
    if (downloadFailure) failures.push(downloadFailure);
    return {
      guidanceSurfaceVisible: !surfaceFailure,
      shareDisabledResponseVisible: !shareFailure,
      downloadDisabledResponseVisible: !downloadFailure,
      failures
    };
  }
}));
results.push(await capture(browser, {
  name: "asset-detail-download-admin",
  role: "DAM Admin",
  route: "/assets/1",
  file: "asset-detail-download-admin.png",
  after: async (page) => {
    const failures = [];
    const button = page.locator(".proto-detail-downloads button").nth(1);
    if (await button.count()) await button.click();
    await page.waitForTimeout(350);
    const downloadChecks = [
      ["downloadCenterVisible", /Download Center/i, "asset detail did not open Download Center"],
      ["originalRestrictionVisible", /Original\/source access stays elevated|Original access|restricted/i, "download center did not explain source/original restriction"],
      ["elevatedRequestVisible", /Request elevated access/i, "download center did not expose elevated-access request"],
      ["renditionChoicesVisible", /Select renditions|Web Large|Web Medium/i, "download center did not show rendition choices"],
      ["loggedDownloadNoticeVisible", /Downloads are logged and monitored/i, "download center did not show logged-download notice"]
    ];
    const proof = {};
    for (const [key, expected, message] of downloadChecks) {
      const failure = await expectPageText(page, expected, message);
      proof[key] = !failure;
      if (failure) failures.push(failure);
    }
    const elevatedFailure = await clickAndExpectText(
      page,
      page.getByRole("button", { name: /Request elevated access/i }),
      /Original access is restricted|does not grant access automatically|Source files stay restricted/i,
      "download center elevated-access action did not open request explanation"
    );
    if (elevatedFailure) failures.push(elevatedFailure);
    return {
      ...proof,
      elevatedAccessExplanationVisible: !elevatedFailure,
      failures
    };
  }
}));

await browser.close();

const report = {
  generatedAt: new Date().toISOString(),
  base,
  forbiddenTerms,
  requiredProofNames,
  results,
  aggregate: aggregate(results)
};

fs.writeFileSync(path.join(outDir, "runtime-proof.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.aggregate, null, 2));

if (
  report.aggregate.bannedCopyFailures.length ||
  report.aggregate.missingRequiredProofs.length ||
  report.aggregate.outerFrameFailures.length ||
  report.aggregate.horizontalOverflowFailures.length ||
    report.aggregate.failedRequestRoutes.length ||
    report.aggregate.consoleIssueRoutes.length ||
  report.aggregate.populatedGridWarnings.length ||
  report.aggregate.interactionFailures.length
) {
  process.exit(1);
}
