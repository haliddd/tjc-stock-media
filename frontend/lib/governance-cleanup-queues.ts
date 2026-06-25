import type { DamReadinessResult } from "@/lib/types";

export type GovernanceCleanupStatus = "real" | "unavailable" | "sample-only";

export type GovernanceCleanupQueue = {
  id: "missing-rights" | "expiring-soon" | "validation-issues" | "taxonomy-conflicts" | "public-share-blockers";
  label: string;
  status: GovernanceCleanupStatus;
  count: number | null;
  detail: string;
  href?: string;
};

function queue(id: GovernanceCleanupQueue["id"], label: string, count: number | null, detail: string, href?: string, status: GovernanceCleanupStatus = "real"): GovernanceCleanupQueue {
  return { id, label, status, count, detail, href };
}

export function buildGovernanceCleanupQueues(data: DamReadinessResult): GovernanceCleanupQueue[] {
  const publicShareBlockers = Math.max(0, data.metrics.approvedPublic - data.metrics.portalReady);
  const validationIssues = data.actionBacklog.find((item) => item.id === "metadata")?.count ?? null;

  return [
    queue(
      "missing-rights",
      "Missing rights",
      data.metrics.rightsReview,
      "Rights, consent, or public-use confidence still needs reviewer attention.",
      "/review?queue=rights-review"
    ),
    queue(
      "expiring-soon",
      "Expiring soon",
      data.metrics.staleApprovals,
      "Stale approvals or lifecycle recheck items need review before reuse continues.",
      "/?view=stale-approvals"
    ),
    validationIssues !== null
      ? queue(
          "validation-issues",
          "Validation issues",
          validationIssues,
          "Field-completion and metadata cleanup backlog from current admin diagnostics.",
          "/?view=ai-enrichment"
        )
      : queue(
          "validation-issues",
          "Validation issues",
          null,
          "Validation issue count is unavailable from the current source.",
          undefined,
          "unavailable"
        ),
    queue(
      "taxonomy-conflicts",
      "Taxonomy conflicts",
      data.metrics.taxonomyDrift,
      "Controlled vocabulary drift and generic titles need normalization.",
      "/?view=taxonomy-drift"
    ),
    queue(
      "public-share-blockers",
      "Public/share blockers",
      publicShareBlockers,
      "Approved Public records that still fail portal/share readiness.",
      "/?view=batch-approved-blockers"
    )
  ];
}
