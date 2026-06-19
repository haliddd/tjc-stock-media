import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const reviewPage = readFileSync(new URL("../components/dam/enterprise/ReviewPage.tsx", import.meta.url), "utf8");
const sourceStatus = readFileSync(new URL("../components/dam/shell/DamSourceStatus.tsx", import.meta.url), "utf8");

describe("Review Uploads UI contract", () => {
  it("keeps health cards for intake, review queue, and source system", () => {
    expect(reviewPage).toContain('label: "Upload intake"');
    expect(reviewPage).toContain('label: "Review queue"');
    expect(reviewPage).toContain('label: "Source system"');
    expect(reviewPage).toContain('value: accessAllowed ? sourceValue : "Restricted"');
    expect(reviewPage).toContain('detail: accessAllowed ? sourceCardDetail(source, role, error) : "Reviewer or DAM Admin role required."');
    expect(reviewPage).not.toMatch(/label:\s*accessAllowed\s*\?\s*"Source system"\s*:\s*"Review access"/);
  });

  it("keeps disconnected, access-missing, loading, and empty states inside the workbench shell", () => {
    expect(reviewPage).toContain("if (!ready)");
    expect(reviewPage).toContain("if (!canAccessReview)");
    expect(reviewPage).toContain("if (review.loading)");
    expect(reviewPage).toContain("if (review.error)");
    expect(reviewPage).toContain('if (workbenchState === "review-paused")');
    expect(reviewPage).toContain("buildReviewWorkbenchState");
    expect(reviewPage).toContain("if (!batches.length)");
    expect(reviewPage).toContain('title="Reviewer access needed"');
    expect(reviewPage).toContain('title="Review queue needs attention"');
    expect(reviewPage).toContain('title="Uploads can be submitted, but review is paused"');
    expect(reviewPage).toContain("<h2>No uploads waiting for review</h2>");
    expect(reviewPage.match(/<ReviewUploadsHeader/g)?.length || 0).toBeGreaterThanOrEqual(6);
    expect(reviewPage.match(/<ReviewQueueOverview/g)?.length || 0).toBeGreaterThanOrEqual(6);
  });

  it("does not present fake media or final approval/download/sync outcomes", () => {
    expect(reviewPage).not.toMatch(/Media library unavailable/i);
    expect(reviewPage).not.toMatch(/sample upload batch|demo upload|fixture upload/i);
    expect(reviewPage).not.toMatch(/approval status changed to|approved status changed to|media has changed|download ready|sync completed|writeback completed/i);
    expect(reviewPage).toContain("No approval status or media changed.");
    expect(reviewPage).toContain("No approval, publishing, download, or sync outcome is implied.");
    expect(reviewPage).toMatch(/recent submission[s]? from this browser/i);
    expect(reviewPage).toContain("Browser receipts help contributors find recent submissions. They are not reviewer work records and do not enable approval actions.");
    expect(reviewPage).toContain("contributorVisibleText(raw.batchName");
    expect(reviewPage).toContain("contributorVisibleText(raw.reviewStatus");
    expect(reviewPage).not.toMatch(/local submission receipt/i);
    expect(reviewPage).not.toMatch(/reviewStatus: String\(raw\.reviewStatus|reviewStatus: raw\.reviewStatus\s*(?:,|\n)|status: String\(raw\.status/);
  });

  it("does not treat contributor wording as rights proof", () => {
    expect(reviewPage).toContain("structuredRightsBasisForReview");
    expect(reviewPage).toContain("structuredConsentEvidenceForReview");
    expect(reviewPage).toContain('asset.rightsBasis !== "unknown"');
    expect(reviewPage).toContain("asset.consentReleaseRecordId?.trim()");
    expect(reviewPage).not.toMatch(/rights approved\|rights clear\|permission confirmed\|tjc-owned\|tjc owned\|licensed\|license\|contributor/);
  });

  it("keeps source specifics gated to reviewer/admin surfaces", () => {
    expect(reviewPage).toContain('if (role !== "DAM Admin") return null;');
    expect(reviewPage).toContain("AdvancedReviewDetailsDrawer");
    expect(reviewPage).toContain("Technical source/import information stays hidden until reviewer or admin opens it.");
    expect(reviewPage).toContain('role === "DAM Admin"');
    expect(reviewPage).toContain("Review source can be read for this workflow.");
  });
});

describe("source status UI contract", () => {
  it("never treats an empty media-library probe as unavailable", () => {
    expect(sourceStatus).not.toMatch(/Media library unavailable/i);
    expect(sourceStatus).toContain("const hasProbeRecords = Array.isArray(payload.assets) && payload.assets.length > 0;");
    expect(sourceStatus).not.toContain("!Array.isArray(payload.assets) || payload.assets.length === 0");
    expect(sourceStatus).toContain('return { status: "ready", label: "Media library", detail, source };');
  });

  it("keeps source status as a read check, not sync or writeback proof", () => {
    expect(sourceStatus).toContain("Status is a read check only.");
    expect(sourceStatus).toContain("no writeback, publication, download enablement, or sync is implied");
    expect(sourceStatus).toContain("Admin-only details hidden for this persona.");
  });
});
