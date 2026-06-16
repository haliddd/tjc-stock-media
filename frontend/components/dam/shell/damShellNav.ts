"use client";

import {
  Archive,
  BadgeCheck,
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
  { label: "Find and Use", href: "/", icon: Library, group: "Media", description: "Find role-safe approved derivatives and request review when clearance is missing." },
  { label: "Collections", href: "/collections", icon: Grid3X3, group: "Media", description: "Open curated ministry cabinets while preserving item-level reuse decisions." },
  { label: "Brand Hub", href: "/brand-hub", icon: BadgeCheck, group: "Media", description: "Open governed identity guidance and ministry kits." },
  { label: "Distribution Sets", href: "/packages", icon: PackageCheck, group: "Media", description: "Assemble governed sets from approved media without moving source files." },
  { label: "Send media for review", href: "/upload", icon: UploadCloud, roles: ["Contributor", "Reviewer", "DAM Admin"], group: "Workflow", badge: "5", description: "Submit source, rights, people, and usage context for review." },
  { label: "Review Inbox", href: "/review?queue=pending", icon: ShieldAlert, roles: ["Reviewer", "DAM Admin"], group: "Workflow", badge: "12", description: "Validate assets before they become broadly available." },
  { label: "Requests", href: "/guide#request-review", icon: MessageSquareText, group: "Workflow", badge: "4", description: "Request review, source access, rights help, or takedown support." },
  { label: "Rights & Consent", href: "/insights?panel=rights-usage", icon: ShieldCheck, roles: ["Reviewer", "DAM Admin"], group: "Governance", badge: "3", description: "Review rights evidence, consent, and use scope." },
  { label: "Metadata Health", href: "/insights?panel=metadata", icon: ListChecks, roles: ["Reviewer", "DAM Admin"], group: "Governance", badge: "7", description: "Inspect metadata quality and missing fields." },
  { label: "Policy", href: "/guide?section=policies#policies", icon: ScrollText, roles: ["Reviewer", "DAM Admin"], group: "Governance", description: "Open policy-safe DAM guidance." },
  { label: "Audit Log", href: "/admin#audit-logs", icon: FileCheck2, roles: ["DAM Admin"], group: "Governance", description: "Review audit activity and evidence trails." },
  { label: "Insights", href: "/insights", icon: BarChart3, roles: ["Reviewer", "DAM Admin"], group: "Reports", description: "Monitor usage and readiness signals." },
  { label: "Governance", href: "/admin", icon: Gauge, roles: ["DAM Admin"], group: "Admin", description: "Monitor launch readiness, source health, audit activity, and policy workflows." },
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
  { label: "Send media for review", href: "/upload", icon: UploadCloud, roles: ["Contributor", "Reviewer", "DAM Admin"], group: "Workflow", description: "Open intake" },
  { label: "New distribution set", href: "/packages", icon: Archive, group: "Workflow", description: "Build set" },
  { label: "Review Inbox", href: "/review?queue=pending", icon: ShieldAlert, roles: ["Reviewer", "DAM Admin"], group: "Workflow", description: "Pending review" }
];

export const damShellWorkspaceCopy: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "Find and Use", subtitle: "Find role-safe approved derivatives. Source files stay restricted." },
  "/collections": { title: "Collections", subtitle: "Open curated ministry cabinets with reuse decisions intact." },
  "/brand-hub": { title: "Brand Hub", subtitle: "Open governed identity, ministry kits, and public-use guidance." },
  "/review": { title: "Review Inbox", subtitle: "Validate assets before they become broadly available." },
  "/packages": { title: "Distribution Sets", subtitle: "Build governed media sets without moving source files." },
  "/upload": { title: "Send media for review", subtitle: "Submit source, rights, people, and usage context for reviewer evidence." },
  "/insights": { title: "Insights", subtitle: "Monitor usage, readiness, and governance signals." },
  "/admin": { title: "Governance", subtitle: "Monitor launch readiness, source health, audit activity, and policy-sensitive workflows." },
  "/guide": { title: "Help Center", subtitle: "Follow policy-safe media use and review guidance." }
};

export function workspaceCopyForPath(pathname: string, search = "") {
  const params = new URLSearchParams(search);
  if (pathname === "/review" && params.get("queue") === "rights-review") {
    return { title: "Rights & Consent", subtitle: "Review rights evidence, use scope, consent, and gated-copy decisions." };
  }
  if (pathname === "/insights" && params.get("panel") === "rights-usage") {
    return { title: "Rights & Consent", subtitle: "Review rights evidence, use scope, consent, and gated-copy decisions." };
  }
  if (pathname === "/insights" && params.get("panel") === "metadata") {
    return { title: "Metadata Health", subtitle: "Track field coverage, missing metadata, and reviewer-ready record quality." };
  }
  if (pathname === "/guide" && params.get("section") === "policies") {
    return { title: "Policy", subtitle: "Policy-safe DAM guidance for reuse, rights, consent, and metadata standards." };
  }
  if (pathname.startsWith("/assets/")) {
    return { title: "Asset Detail", subtitle: "Inspect source, rights, usage, and download decisions." };
  }
  return damShellWorkspaceCopy[pathname] || damShellWorkspaceCopy["/"];
}
