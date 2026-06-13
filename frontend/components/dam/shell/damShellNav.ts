"use client";

import {
  Archive,
  BarChart3,
  ClipboardList,
  FileCheck2,
  Gauge,
  Grid3X3,
  HelpCircle,
  Library,
  ListChecks,
  MessageSquareText,
  PackageCheck,
  ScrollText,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  UploadCloud,
  Workflow,
  type LucideIcon
} from "lucide-react";
import type { DemoRole } from "@/lib/types";

export type DamShellNavGroup = "Media" | "Workflow" | "Governance" | "Reports" | "Admin" | "System";

export type DamShellNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  roles?: DemoRole[];
  description?: string;
  group: DamShellNavGroup;
  badge?: string;
};

export const damShellNavItems: DamShellNavItem[] = [
  { label: "Library", href: "/", icon: Library, group: "Media", description: "Browse approved and source-tracked media." },
  { label: "Collections", href: "/collections", icon: Grid3X3, group: "Media", description: "Open curated ministry collections." },
  { label: "Distribution Sets", href: "/packages", icon: PackageCheck, group: "Media", description: "Build governed sets of approved media." },
  { label: "Upload / Intake", href: "/upload", icon: UploadCloud, roles: ["Contributor", "Reviewer", "DAM Admin"], group: "Workflow", badge: "5", description: "Submit source, rights, people, and usage context." },
  { label: "Review Queue", href: "/review?queue=pending", icon: ShieldAlert, roles: ["Reviewer", "DAM Admin"], group: "Workflow", badge: "12", description: "Validate assets before broad use." },
  { label: "Requests", href: "/guide#request-review", icon: MessageSquareText, group: "Workflow", badge: "4", description: "Request review, source access, rights help, or takedown support." },
  { label: "Rights & Consent", href: "/review?queue=rights-review", icon: ShieldCheck, roles: ["Reviewer", "DAM Admin"], group: "Governance", badge: "3", description: "Review rights evidence, consent, and use scope." },
  { label: "Metadata Health", href: "/insights?panel=metadata", icon: ListChecks, roles: ["Reviewer", "DAM Admin"], group: "Governance", badge: "7", description: "Inspect metadata quality and missing fields." },
  { label: "Policy Center", href: "/guide?section=policies#policies", icon: ScrollText, roles: ["Reviewer", "DAM Admin"], group: "Governance", description: "Open policy-safe DAM guidance." },
  { label: "Audit Log", href: "/admin#audit-logs", icon: FileCheck2, roles: ["DAM Admin"], group: "Governance", description: "Review audit activity and evidence trails." },
  { label: "Insights", href: "/insights", icon: BarChart3, roles: ["Reviewer", "DAM Admin"], group: "Reports", description: "Monitor usage and readiness signals." },
  { label: "Control Center", href: "/admin", icon: Gauge, roles: ["DAM Admin"], group: "Admin", description: "Monitor source health, audit activity, and policy workflows." },
  { label: "Help", href: "/guide", icon: HelpCircle, group: "System", description: "Policy-safe DAM guidance." }
];

export const damShellNavGroups: DamShellNavGroup[] = ["Media", "Workflow", "Governance", "Reports", "Admin", "System"];

export function canSeeDamShellItem(item: DamShellNavItem, role: DemoRole) {
  return !item.roles || item.roles.includes(role);
}

export function damShellItemsForRole(role: DemoRole) {
  return damShellNavItems.filter((item) => canSeeDamShellItem(item, role));
}

export const damShellQuickActions: DamShellNavItem[] = [
  { label: "Upload / Intake", href: "/upload", icon: UploadCloud, roles: ["Contributor", "Reviewer", "DAM Admin"], group: "Workflow", description: "Send media" },
  { label: "New distribution set", href: "/packages", icon: Archive, group: "Workflow", description: "Build set" },
  { label: "Review queue", href: "/review?queue=pending", icon: ShieldAlert, roles: ["Reviewer", "DAM Admin"], group: "Workflow", description: "Pending review" }
];

export const damShellWorkspaceCopy: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "Library", subtitle: "Browse approved and source-tracked media for ministry use." },
  "/collections": { title: "Collections", subtitle: "Open curated sets with reuse decisions intact." },
  "/review": { title: "Review Queue", subtitle: "Validate assets before they become broadly available." },
  "/packages": { title: "Distribution Sets", subtitle: "Build governed media sets without moving source files." },
  "/upload": { title: "Upload / Intake", subtitle: "Submit source, rights, people, and usage context for review." },
  "/insights": { title: "Insights", subtitle: "Monitor usage, readiness, and governance signals." },
  "/admin": { title: "Control Center", subtitle: "Monitor source health, audit activity, and policy-sensitive workflows." },
  "/guide": { title: "Help", subtitle: "Follow policy-safe media use and review guidance." }
};

export function workspaceCopyForPath(pathname: string, search = "") {
  const params = new URLSearchParams(search);
  if (pathname === "/review" && params.get("queue") === "rights-review") {
    return { title: "Rights & Consent", subtitle: "Review rights evidence, use scope, consent, and gated-copy decisions." };
  }
  if (pathname === "/insights" && params.get("panel") === "metadata") {
    return { title: "Metadata Health", subtitle: "Track field coverage, missing metadata, and reviewer-ready record quality." };
  }
  if (pathname === "/guide" && params.get("section") === "policies") {
    return { title: "Policy Center", subtitle: "Policy-safe DAM guidance for reuse, rights, consent, and metadata standards." };
  }
  if (pathname.startsWith("/assets/")) {
    return { title: "Asset Detail", subtitle: "Inspect source, rights, usage, and download decisions." };
  }
  return damShellWorkspaceCopy[pathname] || damShellWorkspaceCopy["/"];
}
