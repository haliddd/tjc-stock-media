"use client";

import Link from "next/link";
import {
  ArrowRight,
  Clock3,
  HelpCircle,
  Images,
  LayoutDashboard,
  Library,
  MessageSquareText,
  ShieldAlert,
  UploadCloud,
  type LucideIcon
} from "lucide-react";
import { useDemoRole } from "@/components/RoleProvider";
import { canAccessRoute } from "@/lib/permissions";
import { routeWithRole } from "@/lib/role-routes";
import type { DemoRole } from "@/lib/types";

export { GuidePage as EnterpriseHelpPage } from "../GuidePage";
export { UploadPage as EnterpriseUploadPage } from "../UploadPage";
export { EnterpriseAssetDetailPage } from "./enterprise/AssetDetailPage";
export { EnterpriseAdminPage } from "./enterprise/AdminPage";
export { EnterpriseBrandHubPage } from "./enterprise/BrandHubPage";
export { EnterpriseDashboardPage } from "./enterprise/DashboardPage";
export { EnterpriseCollectionsPage } from "./enterprise/CollectionsPage";
export { EnterpriseInsightsPage } from "./enterprise/InsightsPage";
export { EnterpriseLibraryPage } from "./enterprise/LibraryPage";
export { EnterprisePackageBuilderPage } from "./enterprise/PackageBuilderPage";
export { EnterpriseReviewPage } from "./enterprise/ReviewPage";
export { RequestsPage } from "./enterprise/RequestsPage";
export { MyTasksPage } from "./enterprise/MyTasksPage";
export { RecentUploadsPage } from "./enterprise/RecentUploadsPage";

type PortalHomeCard = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  roles?: DemoRole[];
};

const portalHomeCards: PortalHomeCard[] = [
  {
    title: "Media Library",
    description: "Browse cleared media and use guidance.",
    href: "/library",
    icon: Library
  },
  {
    title: "Albums & Events",
    description: "Browse by gathering, album, or ministry.",
    href: "/collections",
    icon: Images
  },
  {
    title: "Upload Photos",
    description: "Submit event photo sets for review.",
    href: "/upload",
    icon: UploadCloud
  },
  {
    title: "My Uploads",
    description: "Track photos you submitted for review.",
    href: "/recent-uploads",
    icon: Clock3
  },
  {
    title: "Review Uploads",
    description: "Review submitted photos before use clearance.",
    href: "/review",
    icon: ShieldAlert
  },
  {
    title: "My Work",
    description: "Follow up on uploads, review questions, and requests.",
    href: "/my-tasks",
    icon: Clock3,
    roles: ["Contributor", "Reviewer", "DAM Admin"]
  },
  {
    title: "Requests",
    description: "Ask for media help or corrections.",
    href: "/requests",
    icon: MessageSquareText
  },
  {
    title: "Help Center",
    description: "Find media-use guidance and review help.",
    href: "/help",
    icon: HelpCircle
  },
  {
    title: "Support Zone",
    description: "Check readiness, identity, and blocked operations.",
    href: "/admin",
    icon: LayoutDashboard
  }
];

const primaryHrefByRole: Record<DemoRole, string> = {
  Viewer: "/library",
  Contributor: "/upload",
  Reviewer: "/review",
  "DAM Admin": "/admin"
};

const secondaryHrefByRole: Record<DemoRole, string> = {
  Viewer: "/requests",
  Contributor: "/my-tasks",
  Reviewer: "/my-tasks",
  "DAM Admin": "/review"
};

const primaryLabelByRole: Record<DemoRole, string> = {
  Viewer: "Browse Media",
  Contributor: "Upload Photos",
  Reviewer: "Review Uploads",
  "DAM Admin": "Open Support Zone"
};

const secondaryLabelByRole: Record<DemoRole, string> = {
  Viewer: "Requests",
  Contributor: "My Work",
  Reviewer: "My Work",
  "DAM Admin": "Review Uploads"
};

const portalRoleCopy: Record<DemoRole, string> = {
  Viewer: "Find church media cleared for use, ask for help, and check guidance before sharing.",
  Contributor: "Upload event photos, see My Work follow-ups, and track your upload history.",
  Reviewer: "Review uploads, clear rights questions, and keep media requests moving.",
  "DAM Admin": "Watch review flow, keep Support Zone checks contained, and protect launch safety."
};

function describePortalHomeCard(card: PortalHomeCard, role: DemoRole) {
  if (card.href === "/my-tasks" && role === "Contributor") {
    return "Track drafts, reviewer questions, and request follow-up.";
  }
  if (card.href === "/my-tasks" && role === "DAM Admin") {
    return "Follow reviewer bottlenecks, support checks, and request follow-up.";
  }
  return card.description;
}

export function portalHomeCardsForRole(role: DemoRole) {
  return portalHomeCards
    .filter((card) => (!card.roles || card.roles.includes(role)) && canAccessRoute(role, card.href))
    .map((card) => ({ ...card, description: describePortalHomeCard(card, role) }));
}

export function portalHomePrimaryHrefForRole(role: DemoRole) {
  return primaryHrefByRole[role];
}

export function EnterprisePortalHomePage() {
  const { role } = useDemoRole();
  const visibleCards = portalHomeCardsForRole(role);
  const primaryHref = primaryHrefByRole[role];
  const secondaryHref = secondaryHrefByRole[role];
  const primaryCard = visibleCards.find((card) => card.href === primaryHref) || visibleCards[0];
  const PrimaryIcon = primaryCard?.icon;
  const secondaryCards = visibleCards.filter((card) => card.href !== primaryHref).slice(0, 5);
  const primaryLabel = primaryLabelByRole[role];
  const secondaryLabel = secondaryLabelByRole[role];
  const roleCopy = portalRoleCopy[role];
  const sectionLabel = role === "Viewer" ? "Start here" : role === "Contributor" ? "Contributor paths" : role === "DAM Admin" ? "Support paths" : "Command center";
  const portalModeLabel = role === "Reviewer" || role === "DAM Admin" ? "Internal beta DAM command center" : "Internal beta media portal";
  const roleLabel = `${role} access`;

  return (
    <section className="mx-auto flex w-full max-w-[1120px] flex-col gap-6 px-4 py-8 md:px-8 md:py-10" data-primary-section="media-portal-home">
      <section className="grid gap-6 border-b border-[#d8e1da] bg-white pb-7 md:grid-cols-[1fr_auto] md:items-end">
        <div className="max-w-3xl">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-tjc-muted">
            <span className="text-tjc-evergreen">{portalModeLabel}</span>
            <span className="rounded-full border border-[#d8e1da] px-2 py-1 tracking-[0.08em]">{roleLabel}</span>
          </div>
          <h1 className="text-3xl font-black leading-tight tracking-[0] text-tjc-ink md:text-5xl">True Jesus Church Media Portal</h1>
          <p className="mt-3 text-base font-semibold leading-7 text-tjc-muted md:text-lg">{roleCopy}</p>
        </div>
        <div className="flex flex-wrap gap-3 md:justify-end">
          <Link href={routeWithRole(primaryHref, role)} className="inline-flex min-h-11 items-center gap-2 rounded-[8px] bg-tjc-evergreen px-4 text-sm font-black text-white transition hover:bg-[#0f5f4a] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#0d7970]/20">
            {primaryLabel}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link href={routeWithRole(secondaryHref, role)} className="inline-flex min-h-11 items-center rounded-[8px] border border-[#d8e1da] px-4 text-sm font-black text-tjc-ink transition hover:border-[#9ebdac] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#0d7970]/20">
            {secondaryLabel}
          </Link>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.15fr_1fr]" aria-label="Media portal start">
        {primaryCard ? (
          <Link
            href={routeWithRole(primaryCard.href, role)}
            className="group grid min-h-56 gap-5 rounded-[8px] border border-[#cbd8d0] bg-[#f7fbf8] p-5 text-left transition hover:border-[#9ebdac] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#0d7970]/20 md:p-6"
          >
            <span className="grid size-12 place-items-center rounded-[8px] bg-white text-tjc-evergreen ring-1 ring-[#d8e1da] transition group-hover:bg-[#edf7f3]">
              {PrimaryIcon ? <PrimaryIcon size={22} strokeWidth={1.9} aria-hidden="true" /> : null}
            </span>
            <span>
              <strong className="block text-2xl font-black leading-tight text-tjc-ink">{primaryCard.title}</strong>
              <span className="mt-2 block max-w-xl text-sm font-semibold leading-6 text-tjc-muted">{primaryCard.description}</span>
            </span>
            <span className="inline-flex w-fit items-center gap-2 text-sm font-black text-tjc-evergreen">
              Open
              <ArrowRight size={15} aria-hidden="true" />
            </span>
          </Link>
        ) : null}
        <div className="grid gap-3">
          <h2 className="text-sm font-black uppercase tracking-[0.14em] text-tjc-muted">{sectionLabel}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {secondaryCards.map((card) => {
              const Icon = card.icon;
              return (
                <Link
                  key={card.href}
                  href={routeWithRole(card.href, role)}
                  className="group min-h-28 rounded-[8px] border border-[#d8e1da] bg-white p-4 text-left transition hover:border-[#9ebdac] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#0d7970]/20"
                >
                  <span className="grid size-9 place-items-center rounded-[8px] bg-[#edf7f3] text-tjc-evergreen transition group-hover:bg-[#dff3ed]">
                    <Icon size={18} strokeWidth={1.9} aria-hidden="true" />
                  </span>
                  <strong className="mt-4 block text-base font-black text-tjc-ink">{card.title}</strong>
                  <span className="mt-1 block text-sm font-semibold leading-5 text-tjc-muted">{card.description}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="grid gap-3 border-t border-[#d8e1da] pt-5 text-sm font-semibold leading-6 text-tjc-muted md:grid-cols-3" aria-label="Media portal guardrails">
        <p><strong className="font-black text-tjc-ink">Use cleared copies.</strong> Sensitive, unclear, or restricted media stays in review until cleared.</p>
        <p><strong className="font-black text-tjc-ink">Submit context.</strong> Event name, date, ministry, and consent notes help reviewers make decisions.</p>
        <p><strong className="font-black text-tjc-ink">Ask when unsure.</strong> Requests route media questions and correction needs to the team.</p>
      </section>
    </section>
  );
}
