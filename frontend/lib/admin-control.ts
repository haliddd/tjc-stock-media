import type { EnterpriseStatus } from "@/lib/enterprise-status";
import type { DamReadinessResult, IntegrationReadinessItem } from "@/lib/types";

export type AdminNavItem = {
  id: string;
  label: string;
};

export type AdminMetricRow = {
  label: string;
  value: number;
};

export type AdminHealthRow = {
  id: string;
  label: string;
  state: EnterpriseStatus;
};

export type CustodyMapRow = {
  id: "drive" | "resourcespace" | "s3" | "portal";
  name: string;
  role: string;
  detail: string;
  status: EnterpriseStatus;
};

export const adminNavItems: AdminNavItem[] = [
  { id: "overview", label: "Overview" },
  { id: "feedback-inbox", label: "Feedback Inbox" },
  { id: "users-roles", label: "Users & Access" },
  { id: "roles-permissions", label: "Permission Matrix" },
  { id: "teams", label: "Teams & Owners" },
  { id: "taxonomy", label: "Taxonomy" },
  { id: "metadata-schemas", label: "Metadata Fields" },
  { id: "rights-policies", label: "Rights Policies" },
  { id: "review-workflows", label: "Review Sync" },
  { id: "storage-retention", label: "Storage" },
  { id: "ai-moderation", label: "AI Assist" },
  { id: "integrations", label: "Integrations" },
  { id: "audit-logs", label: "Audit Logs" },
  { id: "system-settings", label: "System Status" }
];

export const integrationReadinessColumns = ["Module", "Owner", "Status", "Detail"];

export function adminNavLabel(activeId: string) {
  return adminNavItems.find((item) => item.id === activeId)?.label || adminNavItems[0].label;
}

export function integrationState(row: IntegrationReadinessItem): EnterpriseStatus {
  return row.state || (row.ready ? "Operational" : "Not configured");
}

export function policySummaryRows(readiness?: DamReadinessResult | null): AdminMetricRow[] {
  return [
    { label: "Approved public", value: readiness?.metrics.approvedPublic || 0 },
    { label: "Portal ready", value: readiness?.metrics.portalReady || 0 },
    { label: "Rights review", value: readiness?.metrics.rightsReview || 0 },
    { label: "Missing source", value: readiness?.metrics.missingSource || 0 },
    { label: "Rendition gaps", value: readiness?.metrics.renditionGaps || 0 }
  ];
}

export function systemHealthRows(readiness?: DamReadinessResult | null): AdminHealthRow[] {
  return (readiness?.integrationReadiness || []).slice(0, 5).map((item) => ({
    id: item.id,
    label: item.label,
    state: integrationState(item)
  }));
}

export function custodyMapStatus(readiness: DamReadinessResult | null | undefined, integrationId: string): EnterpriseStatus {
  const item = (readiness?.integrationReadiness || []).find((row) => row.id === integrationId);
  if (item?.state) return item.state;
  if (item?.ready === true) return "Operational";
  if (integrationId === "review-writes" && readiness?.source?.readOnly) return "Read-only";
  return item?.ready === false ? "Not configured" : "Degraded";
}

export function custodyMapRows(readiness?: DamReadinessResult | null): CustodyMapRow[] {
  const integration = new Map((readiness?.integrationReadiness || []).map((item) => [item.id, item]));
  return [
    {
      id: "drive",
      name: "Google Shared Drive",
      role: "Master-original custody",
      detail: integration.get("master-originals")?.detail || "Source intake and original custody must be confirmed.",
      status: custodyMapStatus(readiness, "master-originals")
    },
    {
      id: "resourcespace",
      name: "ResourceSpace",
      role: "Metadata and review truth",
      detail: readiness?.source?.detail || "ResourceSpace connection not checked yet.",
      status: custodyMapStatus(readiness, "metadata-source")
    },
    {
      id: "s3",
      name: "Approved derivative storage",
      role: "Approved derivative delivery",
      detail: integration.get("approved-copy-delivery")?.detail || "Approved derivative delivery status not configured.",
      status: custodyMapStatus(readiness, "approved-copy-delivery")
    },
    {
      id: "portal",
      name: "Media Library UI",
      role: "Role-aware access layer",
      detail: integration.get("audit-log")?.detail || "Portal gates route all access through backend APIs.",
      status: custodyMapStatus(readiness, "audit-log")
    }
  ];
}
