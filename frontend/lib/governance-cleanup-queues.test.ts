import { describe, expect, it } from "vitest";
import { buildGovernanceCleanupQueues } from "@/lib/governance-cleanup-queues";
import type { DamReadinessResult } from "@/lib/types";

function readiness(): DamReadinessResult {
  return {
    source: { adapter: "exported-metadata", label: "ResourceSpace metadata export", detail: "read-only", readOnly: true },
    score: 30,
    assetCount: 185,
    metrics: {
      approvedPublic: 20,
      portalReady: 5,
      needsReview: 100,
      rightsReview: 18,
      missingSource: 12,
      childrenYouth: 6,
      aiEnrichment: 10,
      taxonomyDrift: 7,
      duplicateCandidates: 3,
      renditionGaps: 4,
      staleApprovals: 9
    },
    readiness: [],
    fieldMappings: [],
    vocabulary: [],
    portalPolicy: [],
    actionBacklog: [
      { id: "metadata", severity: "medium", label: "Metadata enrichment", count: 17, owner: "Contributor", action: "Normalize terms.", savedViewId: "ai-enrichment" }
    ],
    integrationReadiness: [],
    betaReadiness: { ready: false, score: 0, generatedAt: "", facts: [] },
    auditLog: { count: 0, denied: 0, queued: 0, recent: [] }
  };
}

describe("governance cleanup queues", () => {
  it("maps real governance counts to real cleanup routes", () => {
    const queues = buildGovernanceCleanupQueues(readiness());
    const byId = Object.fromEntries(queues.map((queue) => [queue.id, queue]));

    expect(byId["missing-rights"]).toMatchObject({ count: 18, href: "/review?queue=rights-review", status: "real" });
    expect(byId["expiring-soon"]).toMatchObject({ count: 9, href: "/?view=stale-approvals" });
    expect(byId["taxonomy-conflicts"]).toMatchObject({ count: 7, href: "/?view=taxonomy-drift" });
    expect(byId["public-share-blockers"]).toMatchObject({ count: 15, href: "/?view=batch-approved-blockers" });
  });
});
