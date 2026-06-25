import { afterEach, describe, expect, it } from "vitest";
import { updateResourceReviewStatus } from "@/lib/media-source/resourcespace-api";
import type { ReviewWriteRecord } from "@/lib/types";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

function pendingWrite(overrides: Partial<ReviewWriteRecord> = {}): ReviewWriteRecord {
  return {
    id: "pending-1",
    resourceId: "1001",
    oldStatus: "Needs Review",
    requestedStatus: "Approved Internal",
    reviewerRole: "Reviewer",
    reviewerName: "Reviewer One",
    createdAt: "2026-06-24T00:00:00.000Z",
    updatedAt: "2026-06-24T00:00:00.000Z",
    note: "Reviewed evidence for internal use.",
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
    blockers: [],
    syncState: "queued",
    retryCount: 0,
    ...overrides
  };
}

describe("review writeback policy", () => {
  it("queues when ResourceSpace API is unavailable and does not claim approval truth", async () => {
    delete process.env.RESOURCESPACE_API_USER;
    delete process.env.RS_API_USER;
    delete process.env.RESOURCESPACE_API_KEY;
    delete process.env.RS_API_KEY;

    const result = await updateResourceReviewStatus(pendingWrite());

    expect(result).toMatchObject({
      ok: false,
      status: 409
    });
    expect(result.message).toContain("Decision remains queued");
    expect(result.message).toContain("no ResourceSpace approval truth was written");
  });
});
