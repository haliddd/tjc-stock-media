import { describe, expect, it } from "vitest";
import {
  buildReviewEvidencePacket,
  reviewEvidencePacketAuditRecord,
  reviewEvidencePacketBlockedAuditEvent,
  reviewEvidencePacketBlockedBody,
  reviewEvidencePacketQueuedAuditEvent
} from "@/lib/review-evidence-packet";
import { reviewActions } from "@/lib/workflow-policy";
import type { StockMediaAsset } from "@/lib/types";

function asset(overrides: Partial<StockMediaAsset> = {}): StockMediaAsset {
  return {
    id: "asset-1",
    title: "Youth worship testimony",
    thumbnail: "/thumb.jpg",
    thumbnailAlt: "Youth worship testimony",
    imageUrls: {
      small: "/small.jpg",
      card: "/card.jpg",
      collection: "/collection.jpg",
      detail: "/detail.jpg",
      download: "/download.jpg"
    },
    mediaType: "photo",
    collection: "Sabbath",
    status: "Needs Review",
    usageScope: "Do Not Publish",
    peopleRisk: "Possible minors",
    sensitiveContext: "Youth testimony after worship service",
    sourceSystem: "ResourceSpace",
    sourcePath: "/private/source.jpg",
    masterDrivePath: "/private/master.jpg",
    originalFilename: "original.jpg",
    checksumSha256: "abc123abc123abc123abc123abc123ab",
    rightsStatus: "Needs review",
    consentStatus: "Needs review",
    downloadPolicy: "not-downloadable",
    resourceSpaceId: "1001",
    reviewer: "Reviewer One",
    reviewedDate: "2026-06-01",
    tags: ["worship", "youth"],
    tjcTerms: ["testimony"],
    ...overrides
  };
}

describe("review evidence packet", () => {
  it("normalizes checklist/note and collapses checklist plus domain blockers into one packet", () => {
    const approve = reviewActions.find((item) => item.backend === "Approve Public");
    const packet = buildReviewEvidencePacket({
      asset: asset(),
      action: "Approve Public",
      actionDefinition: approve,
      label: "  Public approval  ",
      note: "short",
      checklist: {
        sourceConfirmed: true,
        rightsConfirmed: false,
        attributionConfirmed: false,
        peopleVisibilityConfirmed: true,
        childrenYouthChecked: false,
        usageScopeSelected: true,
        derivativeAvailable: false,
        sensitiveContextChecked: false,
        creditRequirementChecked: false,
        expirationRereviewSet: false,
        proofLinkAttached: false
      }
    });

    expect(packet).toMatchObject({
      action: "Approve Public",
      label: "Public approval",
      note: "short",
      requestedStatus: "Approved Public",
      resourceSpaceId: "1001",
      blocked: true
    });
    expect(packet.missingEvidence).toEqual(expect.arrayContaining([
      "rightsConfirmed",
      "childrenYouthChecked",
      "derivativeAvailable",
      "reviewNote",
      "consentReleaseRecord",
      "domainReviewer:RE/minors",
      "approvedDerivativeEvidence"
    ]));
    expect(packet.missingEvidenceLabels).toEqual(expect.arrayContaining([
      "Owner/license evidence missing",
      "Children/youth review required",
      "Review note missing",
      "Consent/release record missing"
    ]));
    expect(packet.disabledReason).toContain("Missing:");
  });

  it("builds blocked body and audit from packet without source custody fields", () => {
    const packet = buildReviewEvidencePacket({
      asset: asset(),
      action: "Approve Public",
      actionDefinition: reviewActions.find((item) => item.backend === "Approve Public"),
      note: "short",
      checklist: {}
    });
    const body = reviewEvidencePacketBlockedBody(packet);
    const audit = reviewEvidencePacketBlockedAuditEvent(packet, "Reviewer", "reviewer@example.test");
    const text = JSON.stringify({ body, audit });

    expect(body).toMatchObject({ error: "Review evidence is incomplete." });
    expect(audit).toMatchObject({
      type: "review_evidence_incomplete",
      status: "blocked",
      assetId: "asset-1",
      resourceSpaceId: "1001"
    });
    for (const forbidden of ["sourcePath", "masterDrivePath", "originalFilename", "checksumSha256", "/private/source.jpg", "/private/master.jpg"]) {
      expect(text).not.toContain(forbidden);
    }
  });

  it("builds queued audit and response audit record from one packet", () => {
    const packet = buildReviewEvidencePacket({
      asset: asset({
        status: "Approved Internal",
        usageScope: "Internal",
        peopleRisk: "No people",
        sensitiveContext: undefined,
        rightsStatus: "Rights approved",
        consentStatus: "Consent confirmed",
        downloadPolicy: "internal-approved-copy-allowed"
      }),
      action: "Request More Info",
      actionDefinition: reviewActions.find((item) => item.backend === "Request More Info"),
      note: "Ask uploader for exact approved usage scope.",
      checklist: {
        sourceConfirmed: true,
        rightsConfirmed: true,
        peopleVisibilityConfirmed: true,
        childrenYouthChecked: true,
        usageScopeSelected: true
      }
    });

    const queued = reviewEvidencePacketQueuedAuditEvent(packet, "Reviewer", "reviewer@example.test", "pending-1");
    const record = reviewEvidencePacketAuditRecord(packet, "Reviewer", "reviewer@example.test", "2026-06-14T00:00:00.000Z");

    expect(packet.blocked).toBe(false);
    expect(queued).toMatchObject({
      type: "review_pending_write_queued",
      status: "queued",
      details: { action: "Request More Info", requestedStatus: "Needs Review", pendingWriteId: "pending-1" }
    });
    expect(record).toMatchObject({
      assetId: "asset-1",
      previousStatus: "Approved Internal",
      requestedStatus: "Needs Review",
      actor: "reviewer@example.test",
      reviewerRole: "Reviewer"
    });
  });

  it("blocks public approval without reviewer, review date, and matching approval scope", () => {
    const packet = buildReviewEvidencePacket({
      asset: asset({
        usageScope: "Public",
        peopleRisk: "No people",
        sensitiveContext: undefined,
        rightsStatus: "Rights approved",
        consentStatus: "Consent confirmed",
        downloadPolicy: "approved-copy-allowed",
        imageDimensions: "1600x900",
        tags: ["general"],
        tjcTerms: ["approved"]
      }),
      action: "Approve Public",
      actionDefinition: reviewActions.find((item) => item.backend === "Approve Public"),
      note: "Reviewed source, rights, people, scope, derivative, and lifecycle evidence for public reuse.",
      checklist: {
        sourceConfirmed: true,
        rightsConfirmed: true,
        attributionConfirmed: true,
        peopleVisibilityConfirmed: true,
        childrenYouthChecked: true,
        usageScopeSelected: true,
        derivativeAvailable: true,
        sensitiveContextChecked: true,
        creditRequirementChecked: true,
        expirationRereviewSet: true,
        proofLinkAttached: true
      }
    });

    expect(packet.blocked).toBe(true);
    expect(packet.missingEvidence).toEqual(expect.arrayContaining(["reviewerName", "reviewDate", "approvalScope"]));
    expect(packet.missingEvidenceLabels).toEqual(expect.arrayContaining([
      "Reviewer name missing",
      "Review date missing or future",
      "Approval usage scope missing"
    ]));
  });

  it("accepts public approval only when reviewer evidence and public scope are present", () => {
    const today = new Date().toISOString().slice(0, 10);
    const packet = buildReviewEvidencePacket({
      asset: asset({
        usageScope: "Public",
        peopleRisk: "No people",
        sensitiveContext: undefined,
        rightsStatus: "Rights approved",
        consentStatus: "Consent confirmed",
        downloadPolicy: "approved-copy-allowed",
        imageDimensions: "1600x900",
        tags: ["general"],
        tjcTerms: ["approved"]
      }),
      action: "Approve Public",
      actionDefinition: reviewActions.find((item) => item.backend === "Approve Public"),
      note: "Reviewed source, rights, people, scope, derivative, and lifecycle evidence for public reuse.",
      checklist: {
        sourceConfirmed: true,
        rightsConfirmed: true,
        attributionConfirmed: true,
        peopleVisibilityConfirmed: true,
        childrenYouthChecked: true,
        usageScopeSelected: true,
        derivativeAvailable: true,
        sensitiveContextChecked: true,
        creditRequirementChecked: true,
        expirationRereviewSet: true,
        proofLinkAttached: true
      },
      reviewerName: "Reviewer One",
      reviewDate: today,
      approvalScope: "Public"
    });

    expect(packet.blocked).toBe(false);
    expect(packet.approvalEvidence).toEqual({ reviewerName: "Reviewer One", reviewDate: today, approvalScope: "Public" });
    expect(reviewEvidencePacketAuditRecord(packet, "Reviewer", "reviewer@example.test", "2026-06-14T00:00:00.000Z")).toMatchObject({
      reviewerName: "Reviewer One",
      reviewDate: today,
      approvalScope: "Public"
    });
  });
});
