"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, LockKeyhole, ShieldAlert, UserCog } from "lucide-react";
import { useDemoRole } from "@/components/RoleProvider";
import { canAccessRoute, roles } from "@/lib/permissions";
import { routeWithRole } from "@/lib/role-routes";
import type { DemoRole } from "@/lib/types";

const localRoleSwitchEnabled = process.env.NEXT_PUBLIC_LOCAL_BETA_ROLE_SWITCH === "1";

const roleCopy: Record<DemoRole, { summary: string; proof: string }> = {
  Viewer: {
    summary: "Browse role-safe library records and request help when reuse is blocked.",
    proof: "Viewer is the default local role and cannot open reviewer or admin controls."
  },
  Contributor: {
    summary: "Submit intake evidence while new media remains Needs Review / Do Not Publish.",
    proof: "Contributor can open upload, but cannot approve, publish, or administer records."
  },
  Reviewer: {
    summary: "Inspect review evidence and queue pending decisions without ResourceSpace success claims.",
    proof: "Reviewer controls remain evidence-gated and queued until sync confirms."
  },
  "DAM Admin": {
    summary: "Inspect governance, permissions, and readiness diagnostics in read-only local rehearsal.",
    proof: "Admin proof does not grant credential, source custody, or mutation authority."
  }
};

const rehearsalRoutes = [
  { label: "Library", href: "/library", purpose: "Search and reuse proof." },
  { label: "Upload", href: "/upload", purpose: "Contributor intake proof." },
  { label: "Review", href: "/review", purpose: "Reviewer evidence proof." },
  { label: "Admin", href: "/admin", purpose: "Governance proof." },
  { label: "Requests", href: "/requests", purpose: "Viewer request proof." }
];

function roleStatus(targetRole: DemoRole, activeRole: DemoRole) {
  if (targetRole === activeRole) return "Active in this browser";
  if (localRoleSwitchEnabled) return "Available for local rehearsal";
  return "Requires local role switch flag";
}

export function RoleRehearsalPage() {
  const { role, setRole, betaLocked } = useDemoRole();

  return (
    <section className="proto-rehearsal-page" aria-labelledby="role-rehearsal-title">
      <div className="proto-rehearsal-hero">
        <div>
          <span className="proto-rehearsal-eyebrow"><UserCog size={16} /> Local role rehearsal</span>
          <h1 id="role-rehearsal-title">True Jesus Church Media Library role rehearsal</h1>
          <p>
            Visible local QA path for role walkthroughs. This is not production auth, not SSO, not real user impersonation,
            and not permission delegation.
          </p>
        </div>
        <div className="proto-rehearsal-status" aria-label="Role rehearsal status">
          <strong>{role}</strong>
          <span>{localRoleSwitchEnabled && !betaLocked ? "Role switch enabled" : betaLocked ? "Beta session locked" : "Viewer default locked"}</span>
        </div>
      </div>

      <div className="proto-rehearsal-warning" role="note">
        <ShieldAlert size={18} />
        <p>
          ResourceSpace remains source truth. Download, review, source, and admin actions still use backend gates. No
          public publishing, source media mutation, fake approvals, fake downloads, or ResourceSpace writeback happens here.
        </p>
      </div>

      <div className="proto-rehearsal-grid" aria-label="Role rehearsal personas">
        {roles.map((targetRole) => {
          const active = targetRole === role;
          const disabled = betaLocked || !localRoleSwitchEnabled;
          return (
            <article className={active ? "is-active" : ""} key={targetRole}>
              <header>
                <span>{targetRole}</span>
                {active ? <CheckCircle2 size={17} /> : <LockKeyhole size={17} />}
              </header>
              <p>{roleCopy[targetRole].summary}</p>
              <small>{roleCopy[targetRole].proof}</small>
              <button
                type="button"
                disabled={disabled}
                onClick={() => setRole(targetRole)}
                aria-label={`Use ${targetRole} for local rehearsal`}
              >
                {roleStatus(targetRole, role)}
              </button>
            </article>
          );
        })}
      </div>

      <section className="proto-rehearsal-routes" aria-labelledby="role-rehearsal-routes-title">
        <div>
          <h2 id="role-rehearsal-routes-title">Open proof route</h2>
          <p>Route links carry the selected rehearsal role for local proof only. Backend route access still decides what opens.</p>
        </div>
        <div className="proto-rehearsal-route-list">
          {rehearsalRoutes.map((item) => {
            const allowed = canAccessRoute(role, item.href);
            return (
              <Link
                className={allowed ? "" : "is-blocked"}
                href={routeWithRole(item.href, role)}
                key={item.href}
                aria-disabled={!allowed}
              >
                <span>
                  <strong>{item.label}</strong>
                  <small>{allowed ? item.purpose : `${role} cannot access this route.`}</small>
                </span>
                <ArrowRight size={16} />
              </Link>
            );
          })}
        </div>
      </section>
    </section>
  );
}
