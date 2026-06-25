import type { DemoRole } from "@/lib/types";

export type PermissionPreviewState = "Allowed" | "Blocked" | "Request only" | "Review only" | "Preview only";

export type PermissionPreviewRow = {
  id:
    | "collection"
    | "brand-kit"
    | "channel"
    | "region"
    | "rendition"
    | "original-download"
    | "source-file"
    | "public-sharing"
    | "restricted-asset"
    | "expired-asset"
    | "approval-authority";
  label: string;
  inheritance: string;
  exception: string;
  detail: string;
  viewer: PermissionPreviewState;
  contributor: PermissionPreviewState;
  reviewer: PermissionPreviewState;
  admin: PermissionPreviewState;
};

export type PermissionPreviewAssignment = {
  scope: string;
  inheritedFrom: string;
  exceptionState: string;
  effect: string;
};

export type PermissionInheritancePreview = {
  readOnly: true;
  rows: PermissionPreviewRow[];
  assignments: PermissionPreviewAssignment[];
};

export function canAccessPermissionInheritancePreview(role: DemoRole) {
  return role === "DAM Admin";
}

export function buildPermissionInheritancePreview(): PermissionInheritancePreview {
  return {
    readOnly: true,
    rows: [
      {
        id: "collection",
        label: "Collection access",
        inheritance: "Inherited from role defaults",
        exception: "Collection can narrow or expand preview access",
        detail: "Collection membership organizes media, but access still respects role-safe gates.",
        viewer: "Allowed",
        contributor: "Allowed",
        reviewer: "Allowed",
        admin: "Allowed"
      },
      {
        id: "brand-kit",
        label: "Brand kit scope",
        inheritance: "Inherited from mapped approved media",
        exception: "Brand kit can hide unmapped or gated items",
        detail: "Brand kits inherit item readiness and never override item-level permission truth.",
        viewer: "Preview only",
        contributor: "Preview only",
        reviewer: "Review only",
        admin: "Allowed"
      },
      {
        id: "channel",
        label: "Channel permission",
        inheritance: "Inherited from approved channel metadata",
        exception: "Channel-specific exception can narrow download/share",
        detail: "Web, social, print, or internal channels can be limited without changing raw approval.",
        viewer: "Preview only",
        contributor: "Preview only",
        reviewer: "Review only",
        admin: "Allowed"
      },
      {
        id: "region",
        label: "Region scope",
        inheritance: "Inherited from rights metadata",
        exception: "Region exception can hide or request review",
        detail: "Region stays a read-only policy preview until backend persistence is wired.",
        viewer: "Preview only",
        contributor: "Preview only",
        reviewer: "Review only",
        admin: "Allowed"
      },
      {
        id: "rendition",
        label: "Rendition download",
        inheritance: "Inherited from approved-copy gate",
        exception: "Collection or channel exception can narrow renditions",
        detail: "Approved copies remain gate-backed; missing renditions stay request-only.",
        viewer: "Allowed",
        contributor: "Allowed",
        reviewer: "Allowed",
        admin: "Allowed"
      },
      {
        id: "original-download",
        label: "Original download",
        inheritance: "Blocked by default",
        exception: "Admin preview can request scoped original access",
        detail: "Original/master access remains request-only and audited.",
        viewer: "Blocked",
        contributor: "Blocked",
        reviewer: "Blocked",
        admin: "Request only"
      },
      {
        id: "source-file",
        label: "Source file metadata",
        inheritance: "Hidden from normal roles",
        exception: "Reviewer/Admin can see reviewer-safe source metadata",
        detail: "No raw paths, private URLs, or custody controls are exposed to Viewer or Contributor.",
        viewer: "Blocked",
        contributor: "Blocked",
        reviewer: "Review only",
        admin: "Allowed"
      },
      {
        id: "public-sharing",
        label: "Public sharing",
        inheritance: "Blocked by default",
        exception: "Admin preview can model share policy only",
        detail: "Public sharing preview remains read-only until safe backend persistence exists.",
        viewer: "Blocked",
        contributor: "Blocked",
        reviewer: "Blocked",
        admin: "Preview only"
      },
      {
        id: "restricted-asset",
        label: "Restricted asset access",
        inheritance: "Blocked for normal browsing",
        exception: "Reviewer/Admin can inspect for governance work",
        detail: "Restricted or sensitive assets stay outside normal Viewer/Contributor browsing.",
        viewer: "Blocked",
        contributor: "Blocked",
        reviewer: "Review only",
        admin: "Allowed"
      },
      {
        id: "expired-asset",
        label: "Expired asset access",
        inheritance: "Blocked from reuse",
        exception: "Reviewer/Admin can inspect for re-review",
        detail: "Expired assets remain visible for governance only, not normal reuse.",
        viewer: "Blocked",
        contributor: "Blocked",
        reviewer: "Review only",
        admin: "Allowed"
      },
      {
        id: "approval-authority",
        label: "Approval authority",
        inheritance: "Not granted to normal roles",
        exception: "Reviewer can queue decisions; Admin can manage policy",
        detail: "Queued review decisions still require ResourceSpace sync confirmation before truth changes.",
        viewer: "Blocked",
        contributor: "Blocked",
        reviewer: "Review only",
        admin: "Allowed"
      }
    ],
    assignments: [
      {
        scope: "Collection rule",
        inheritedFrom: "Role defaults",
        exceptionState: "Preview-only collection override",
        effect: "Narrows or broadens which approved items a role can see in a collection."
      },
      {
        scope: "Brand kit rule",
        inheritedFrom: "Mapped approved media",
        exceptionState: "Brand kit-specific hide/show preview",
        effect: "Never overrides item-level approval, rights, or download gates."
      },
      {
        scope: "Channel rule",
        inheritedFrom: "Approved channel metadata",
        exceptionState: "Per-channel restriction preview",
        effect: "Can hide social/print/public availability without changing raw asset status."
      },
      {
        scope: "Region rule",
        inheritedFrom: "Rights metadata",
        exceptionState: "Region-limited preview",
        effect: "Shows where geography can narrow reuse even when the asset stays approved."
      }
    ]
  };
}
