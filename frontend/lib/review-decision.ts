import { buildReuseDecision } from "@/lib/reuse-policy";
import { createPendingReviewWrite, createPendingReviewWriteAsync } from "@/lib/pending-review-writes";
import { normalizeReviewRoleWithFallback } from "@/lib/permissions";
import type { DemoRole, ReviewEvidenceChecklist, StockMediaAsset } from "@/lib/types";

export {
  buildReviewEvidenceDecision,
  missingReviewEvidence,
  normalizeReviewChecklist,
  requiredReviewEvidence
} from "@/lib/review-evidence";

export function queuePendingReviewDecision({
  asset,
  requestedStatus,
  role,
  reviewerName,
  note,
  checklist
}: {
  asset: StockMediaAsset;
  requestedStatus: string;
  role: DemoRole;
  reviewerName?: string;
  note: string;
  checklist: ReviewEvidenceChecklist;
}) {
  const reuse = buildReuseDecision(asset);
  return createPendingReviewWrite({
    asset,
    requestedStatus,
    reviewerRole: normalizeReviewRoleWithFallback(role),
    reviewerName,
    note,
    checklist,
    blockers: reuse.blockers.map((item) => item.label)
  });
}

export async function queuePendingReviewDecisionAsync(input: Parameters<typeof queuePendingReviewDecision>[0]) {
  const reuse = buildReuseDecision(input.asset);
  return createPendingReviewWriteAsync({
    asset: input.asset,
    requestedStatus: input.requestedStatus,
    reviewerRole: normalizeReviewRoleWithFallback(input.role),
    reviewerName: input.reviewerName,
    note: input.note,
    checklist: input.checklist,
    blockers: reuse.blockers.map((item) => item.label)
  });
}
