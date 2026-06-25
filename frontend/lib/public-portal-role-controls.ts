import { decideAccess, type AccessDecision } from "@/lib/access-decisions";
import { canOpenResourceSpace, canReview, canUpload } from "@/lib/permissions";
import type { DemoRole } from "@/lib/types";

export type PublicPortalControlState = "available" | "gated" | "blocked";

export type PublicPortalControl = {
  id: "search" | "download" | "upload" | "review" | "source" | "original" | "mutation" | "resourcespace";
  label: string;
  state: PublicPortalControlState;
  detail: string;
};

export type PublicPortalRoleSummary = {
  title: string;
  subtitle: string;
};

const roleSummary: Record<DemoRole, PublicPortalRoleSummary> = {
  Viewer: {
    title: "Viewer lane",
    subtitle: "Find role-safe media and request approved copies."
  },
  Contributor: {
    title: "Contributor lane",
    subtitle: "Share media for review without publishing it."
  },
  Reviewer: {
    title: "Reviewer lane",
    subtitle: "Review evidence, restrictions, and approved-copy gates."
  },
  "DAM Admin": {
    title: "DAM Admin lane",
    subtitle: "Operate policy controls with ResourceSpace still authoritative."
  }
};

export function publicPortalRoleSummary(role: DemoRole): PublicPortalRoleSummary {
  return roleSummary[role];
}

function stateFromDecision(decision: AccessDecision): PublicPortalControlState {
  if (decision.allowed) return "available";
  return decision.effect === "pending" ? "gated" : "blocked";
}

export function publicPortalRoleControls(role: DemoRole): PublicPortalControl[] {
  const uploadAllowed = canUpload(role);
  const reviewAllowed = canReview(role);
  const resourceSpaceAllowed = canOpenResourceSpace(role);
  const sourceMetadata = decideAccess(role, "viewOriginalMetadata");
  const originalDownload = decideAccess(role, "downloadOriginal");

  return [
    {
      id: "search",
      label: "Role-safe media",
      state: "available",
      detail: "Library results use portal visibility rules."
    },
    {
      id: "download",
      label: "Approved copies",
      state: "gated",
      detail: "Download gate checks every asset."
    },
    {
      id: "upload",
      label: "Photo intake",
      state: uploadAllowed ? "available" : "blocked",
      detail: uploadAllowed ? "New media enters review first." : "Contributor access required."
    },
    {
      id: "review",
      label: "Review decisions",
      state: reviewAllowed ? "available" : "blocked",
      detail: reviewAllowed ? "Reviewer note and checklist required." : "Reviewer access required."
    },
    {
      id: "source",
      label: "Source metadata",
      state: stateFromDecision(sourceMetadata),
      detail: sourceMetadata.allowed ? "Reviewer-visible metadata only; source files stay locked." : "Source paths stay locked."
    },
    {
      id: "original",
      label: "Original files",
      state: stateFromDecision(originalDownload),
      detail: originalDownload.effect === "pending" ? "Request-only; no live original download." : "Original downloads stay locked."
    },
    {
      id: "mutation",
      label: "Source mutation",
      state: "blocked",
      detail: "Portal cannot mutate ResourceSpace or source media."
    },
    {
      id: "resourcespace",
      label: "ResourceSpace admin",
      state: resourceSpaceAllowed ? "available" : "blocked",
      detail: resourceSpaceAllowed ? "Admin controls visible; ResourceSpace remains authoritative." : "ResourceSpace admin stays locked."
    }
  ];
}

export function publicPortalActionLabel(role: DemoRole) {
  return canUpload(role) ? "Share photos" : "Request media";
}
