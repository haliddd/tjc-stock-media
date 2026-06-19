import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isLocalRequestReceiptOpen, requestHelpHref } from "@/components/GuidePage";

const guidePageSource = readFileSync(new URL("../components/GuidePage.tsx", import.meta.url), "utf8");
const requestsPageSource = readFileSync(new URL("../components/dam/enterprise/RequestsPage.tsx", import.meta.url), "utf8");

describe("request and help safety helpers", () => {
  function sourceIndex(label: string) {
    const index = guidePageSource.indexOf(label);
    expect(index, `${label} should exist in GuidePage`).toBeGreaterThanOrEqual(0);
    return index;
  }

  it("routes Help Center request tasks into typed Requests wizard paths", () => {
    expect(requestHelpHref("Request permission")).toBe("/requests?type=Request%20permission");
    expect(requestHelpHref("Report privacy or rights issue")).toBe("/requests?type=Report%20privacy%20or%20rights%20issue");
    expect(requestHelpHref("Request original or high-resolution help")).toBe("/requests?type=Request%20original%20or%20high-resolution%20help");
    expect(requestHelpHref("General media help")).toBe("/requests?type=General%20media%20help");
  });

  it("does not count claimed completion outcomes as local open request receipts", () => {
    for (const status of ["Approved", "Cancelled", "Closed", "Complete", "Done", "Downloaded", "Published", "Resolved", "Synced"]) {
      expect(isLocalRequestReceiptOpen(status)).toBe(false);
    }

    expect(isLocalRequestReceiptOpen("Draft")).toBe(true);
    expect(isLocalRequestReceiptOpen("Local receipt")).toBe(true);
    expect(isLocalRequestReceiptOpen(undefined)).toBe(true);
  });

  it("hides contributor-only upload links from viewer help paths", () => {
    expect(guidePageSource).toContain("uploadOnly?: boolean");
    expect(guidePageSource).toContain("const uploadAllowed = canUpload(role)");
    expect(guidePageSource).toContain("!task.uploadOnly || uploadAllowed");
    expect(guidePageSource).toContain("!link.uploadOnly || uploadAllowed");
    expect(guidePageSource).toContain("title: \"Upload photos\"");
    expect(guidePageSource).toContain("uploadOnly: true");
  });

  it("keeps the Help Center task-first before lower article and policy docs", () => {
    expect(guidePageSource).toContain("What do you need help with?");

    for (const taskTitle of [
      "Find media",
      "Upload photos",
      "Check my uploads",
      "Request permission",
      "Report a privacy or rights issue",
      "Ask for source/high-resolution access",
      "Contact media team"
    ]) {
      expect(guidePageSource).toContain(`title: "${taskTitle}"`);
    }

    const tasksIndex = sourceIndex("Common help tasks");
    const searchIndex = sourceIndex("Find guidance");
    const articlesIndex = sourceIndex("Helpful articles");
    const policiesIndex = sourceIndex("Media-use rules");

    expect(tasksIndex).toBeLessThan(searchIndex);
    expect(searchIndex).toBeLessThan(articlesIndex);
    expect(articlesIndex).toBeLessThan(policiesIndex);
  });

  it("keeps contributor help copy away from custody jargon and fake download promises", () => {
    expect(guidePageSource).not.toMatch(/\bResourceSpace\b|source custody|source-system|writeback/i);
    expect(guidePageSource).not.toMatch(/\bDAM\b/);
    expect(guidePageSource).not.toContain("Download approved copy");
    expect(guidePageSource).not.toContain("Request help with original files");
  });

  it("keeps Requests guided, local-only, and triage-focused", () => {
    for (const label of ["What do you need", "Tell us", "Review and send", "Send request"]) {
      expect(requestsPageSource).toContain(label);
    }

    expect(requestsPageSource).toContain("local-only receipt");
    expect(requestsPageSource).toContain("It has not reached the media team yet.");
    expect(requestsPageSource).toContain("does not notify the media team yet or clear media for use");
    expect(requestsPageSource).toContain("contact the media team separately for urgent needs");
    expect(requestsPageSource).toContain("Assignment changes here are local triage notes only");
    expect(requestsPageSource).toContain("Blockers");
    expect(requestsPageSource).toContain("Waiting for info");
    expect(requestsPageSource).not.toMatch(/ResourceSpace|writeback/i);
    expect(requestsPageSource).not.toMatch(/No backend submission|connected backend|sync data|unlock downloads/i);

    for (const claimedOutcome of ["Approved", "Resolved", "Synced", "Downloaded", "Published", "Complete"]) {
      expect(requestsPageSource).not.toContain(`status: "${claimedOutcome}"`);
    }
  });

});
