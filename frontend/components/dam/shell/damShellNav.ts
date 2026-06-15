"use client";

import {
  Bell,
  Boxes,
  Clock3,
  Database,
  FileCheck2,
  FolderClock,
  Grid3X3,
  HelpCircle,
  Library,
  ListChecks,
  MessageSquareText,
  PackageCheck,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Tags,
  UploadCloud,
  UserCog,
  type LucideIcon
} from "lucide-react";
import type { DemoRole } from "@/lib/types";

export type DamShellNavGroup = "Media" | "Workflow" | "Governance" | "Admin" | "Support";

export type DamShellNavItem = {
  label: string;
  href: string;
  activeHrefs?: string[];
  icon: LucideIcon;
  roles?: DemoRole[];
  description?: string;
  group: DamShellNavGroup;
  badge?: string;
};

export const damShellNavItems: DamShellNavItem[] = [
  { label: "Library", href: "/library", activeHrefs: ["/"], icon: Library, group: "Media", description: "Search assets, rights, approved derivatives, and source access state." },
  { label: "Collections", href: "/collections", icon: Grid3X3, group: "Media", description: "Curated ministry asset groups. Collections do not approve assets." },
  { label: "Distribution Sets", href: "/distribution-sets", activeHrefs: ["/packages"], icon: PackageCheck, group: "Media", description: "Build governed packages from approved references." },
  { label: "Upload / Intake", href: "/upload", icon: UploadCloud, roles: ["Contributor", "Reviewer", "DAM Admin"], group: "Workflow", badge: "5", description: "Submit files, metadata, rights evidence, people details, and usage scope." },
  { label: "Recent Uploads", href: "/recent-uploads", activeHrefs: ["/library?view=recent-uploads"], icon: Clock3, roles: ["Contributor", "Reviewer", "DAM Admin"], group: "Workflow", badge: "8", description: "Inspect recent intake without treating uploads as approved media." },
  { label: "Review Queue", href: "/review", activeHrefs: ["/review?queue=pending"], icon: ShieldAlert, roles: ["Reviewer", "DAM Admin"], group: "Workflow", badge: "7", description: "Evaluate evidence, derivatives, access, restrictions, and approvals." },
  { label: "Requests", href: "/requests", icon: MessageSquareText, group: "Workflow", badge: "6", description: "Review, source access, rights issue, and policy decision requests." },
  { label: "My Tasks", href: "/my-tasks", activeHrefs: ["/tasks", "/requests?view=my-tasks"], icon: Bell, group: "Workflow", badge: "4", description: "Role-scoped tasks needing your action." },
  { label: "Rights & Consent", href: "/governance/rights-consent", activeHrefs: ["/review?queue=rights-review"], icon: ShieldCheck, roles: ["Reviewer", "DAM Admin"], group: "Governance", badge: "3", description: "Evidence, consent, owner/license, minors, and public-use approvals." },
  { label: "Metadata Health", href: "/governance/metadata-health", activeHrefs: ["/insights?panel=metadata"], icon: ListChecks, roles: ["Reviewer", "DAM Admin"], group: "Governance", badge: "7", description: "Required fields, duplicate candidates, taxonomy drift, and orphaned records." },
  { label: "Policy Center", href: "/governance/policy-center", activeHrefs: ["/help?section=policies#policies", "/guide?section=policies#policies"], icon: ScrollText, roles: ["Reviewer", "DAM Admin"], group: "Governance", description: "Download gates, source restrictions, roles, approval, consent, and expiration rules." },
  { label: "Audit Log", href: "/governance/audit-log", activeHrefs: ["/admin#audit-logs"], icon: FileCheck2, roles: ["DAM Admin"], group: "Governance", description: "Immutable upload, edit, approval, download, export, and policy events." },
  { label: "Users & Roles", href: "/admin/users", icon: UserCog, roles: ["DAM Admin"], group: "Admin", description: "Role-safe permissions and user assignments." },
  { label: "Taxonomy", href: "/admin/taxonomy", icon: Tags, roles: ["DAM Admin"], group: "Admin", description: "Ministry, event, collection, tag, and metadata vocabularies." },
  { label: "Integrations", href: "/governance/integrations", icon: Database, roles: ["DAM Admin"], group: "Admin", description: "ResourceSpace, Google Shared Drive, portal, storage, and identity health." },
  { label: "Settings", href: "/admin/settings", icon: SlidersHorizontal, roles: ["DAM Admin"], group: "Admin", description: "DAM workspace settings and operational controls." },
  { label: "Help Center", href: "/help", activeHrefs: ["/guide"], icon: HelpCircle, group: "Support", description: "Help articles, quick tasks, requests, and policy shortcuts." }
];

export const damShellNavGroups: DamShellNavGroup[] = ["Media", "Workflow", "Governance", "Admin", "Support"];

export function canSeeDamShellItem(item: DamShellNavItem, role: DemoRole) {
  return !item.roles || item.roles.includes(role);
}

export function damShellItemsForRole(role: DemoRole) {
  return damShellNavItems.filter((item) => canSeeDamShellItem(item, role));
}

export const damShellQuickActions: DamShellNavItem[] = [
  { label: "Upload / Intake", href: "/upload", icon: UploadCloud, roles: ["Contributor", "Reviewer", "DAM Admin"], group: "Workflow", description: "Send media" },
  { label: "New distribution set", href: "/distribution-sets", activeHrefs: ["/packages"], icon: Boxes, group: "Workflow", description: "Build set" },
  { label: "Review queue", href: "/review", activeHrefs: ["/review?queue=pending"], icon: ShieldAlert, roles: ["Reviewer", "DAM Admin"], group: "Workflow", description: "Pending review" }
];

export const damShellWorkspaceCopy: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "Library", subtitle: "Browse approved and source-tracked media for ministry use." },
  "/library": { title: "Library", subtitle: "Browse approved and reviewable media. Source files remain restricted." },
  "/collections": { title: "Collections", subtitle: "Open curated sets with reuse decisions intact." },
  "/review": { title: "Review Queue", subtitle: "Validate assets before they become broadly available." },
  "/packages": { title: "Distribution Sets", subtitle: "Build governed media sets without moving source files." },
  "/distribution-sets": { title: "Distribution Sets", subtitle: "Build governed packages from approved references only." },
  "/upload": { title: "Upload / Intake", subtitle: "Submit source, rights, people, and usage context for review." },
  "/recent-uploads": { title: "Recent Uploads", subtitle: "Review recent intake items without approving or moving source files." },
  "/requests": { title: "Requests", subtitle: "Track review, source access, rights issue, and policy decision requests." },
  "/my-tasks": { title: "My Tasks", subtitle: "Open assigned DAM work, evidence checks, and review actions." },
  "/tasks": { title: "My Tasks", subtitle: "Open assigned DAM work, evidence checks, and review actions." },
  "/insights": { title: "Insights", subtitle: "Monitor usage, readiness, and governance signals." },
  "/admin": { title: "Control Center", subtitle: "Monitor source health, audit activity, and policy-sensitive workflows." },
  "/admin/users": { title: "Users & Roles", subtitle: "Manage role-safe access and assignments." },
  "/admin/roles": { title: "Users & Roles", subtitle: "Manage role-safe access and assignments." },
  "/admin/taxonomy": { title: "Taxonomy", subtitle: "Govern metadata vocabularies and drift." },
  "/admin/settings": { title: "Settings", subtitle: "Configure DAM operational controls." },
  "/governance": { title: "Governance Dashboard", subtitle: "Operational health across approvals, rights, metadata, policy, audit, and integrations." },
  "/governance/rights-consent": { title: "Rights & Consent", subtitle: "Search evidence records, missing consent, licenses, minors review, and owner verification." },
  "/governance/metadata-health": { title: "Metadata Health", subtitle: "Measure required field completion, duplicates, taxonomy drift, and orphaned records." },
  "/governance/policy-center": { title: "Policy Center", subtitle: "Rules for downloads, public use, source access, roles, expiration, and consent." },
  "/governance/audit-log": { title: "Audit Log", subtitle: "Immutable upload, edit, approval, access, download, export, and policy events." },
  "/governance/integrations": { title: "Integrations", subtitle: "ResourceSpace, Google Shared Drive, portal, storage, and identity provider health." },
  "/guide": { title: "Help Center", subtitle: "Search policy-safe media use and review guidance." },
  "/help": { title: "Help Center", subtitle: "Find help articles, quick tasks, open requests, and policy shortcuts." }
};

export function workspaceCopyForPath(pathname: string, search = "") {
  const params = new URLSearchParams(search);
  if (pathname === "/review" && params.get("queue") === "rights-review") {
    return { title: "Rights & Consent", subtitle: "Review rights evidence, use scope, consent, and gated-copy decisions." };
  }
  if (pathname === "/insights" && params.get("panel") === "metadata") {
    return { title: "Metadata Health", subtitle: "Track field coverage, missing metadata, and reviewer-ready record quality." };
  }
  if ((pathname === "/help" || pathname === "/guide") && params.get("section") === "policies") {
    return { title: "Policy Center", subtitle: "Policy-safe DAM guidance for reuse, rights, consent, and metadata standards." };
  }
  if (pathname.startsWith("/assets/")) {
    return { title: "Asset Detail", subtitle: "Inspect source, rights, usage, and download decisions." };
  }
  if (pathname.startsWith("/library/")) {
    return { title: "Asset Detail", subtitle: "Inspect source, rights, usage, and download decisions." };
  }
  if (pathname.startsWith("/collections/")) {
    return { title: "Collection Detail", subtitle: "Review curated asset readiness without overriding item-level approval." };
  }
  if (pathname.startsWith("/distribution-sets/")) {
    return { title: "Distribution Set Draft", subtitle: "Build governed packages from approved references only." };
  }
  if (pathname.startsWith("/review/")) {
    return { title: "Review Queue", subtitle: "Validate evidence and decisions before reuse." };
  }
  if (pathname.startsWith("/requests/")) {
    return { title: "Requests", subtitle: "Track review, source access, rights issue, and policy decisions." };
  }
  if (pathname.startsWith("/upload/drafts/")) {
    return { title: "Upload Draft", subtitle: "Resume intake without publishing assets." };
  }
  if (pathname.startsWith("/help/articles/")) {
    return { title: "Help Article", subtitle: "Policy-safe DAM guidance for current task." };
  }
  return damShellWorkspaceCopy[pathname] || damShellWorkspaceCopy["/"];
}
