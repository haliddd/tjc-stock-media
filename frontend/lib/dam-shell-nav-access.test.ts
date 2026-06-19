import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { portalHomeCardsForRole, portalHomeCopyForRole, portalHomePrimaryHrefForRole } from "@/components/dam/EnterpriseDamPages";
import { dashboardActionsForRole, dashboardCopyForRole } from "@/components/dam/enterprise/DashboardPage";
import { canSeeDamShellGroup, damShellItemsForRole, getVisibleMobileNavItems } from "@/components/dam/shell/damShellNav";
import { canAccessRoute } from "@/lib/permissions";
import type { DemoRole } from "@/lib/types";

function labelsFor(role: DemoRole) {
  return damShellItemsForRole(role).map((item) => item.label);
}

function mobileLabelsFor(role: DemoRole) {
  return getVisibleMobileNavItems(role).map((item) => item.mobileLabel || item.label);
}

function mobileHrefsFor(role: DemoRole) {
  return getVisibleMobileNavItems(role).map((item) => item.href);
}

describe("DAM shell role-aware navigation", () => {
  it("keeps Albums & Events in main nav and Delivery Sets deferred", () => {
    for (const role of ["Viewer", "Contributor", "Reviewer", "DAM Admin"] as const) {
      expect(labelsFor(role)).toContain("Albums & Events");
      expect(labelsFor(role)).not.toContain("Collections");
      expect(mobileLabelsFor(role)).not.toContain("Collections");
      expect(labelsFor(role)).not.toContain("Delivery Sets");
      expect(mobileLabelsFor(role)).not.toContain("Delivery Sets");
    }
    for (const role of ["Viewer", "Reviewer", "DAM Admin"] as const) {
      expect(mobileLabelsFor(role)).toContain("Albums");
    }
  });

  it("shows only simple Viewer navigation", () => {
    expect(labelsFor("Viewer")).toEqual(["Media Library", "Albums & Events", "Requests", "Help Center"]);
    expect(mobileLabelsFor("Viewer")).toEqual(["Library", "Albums", "Requests", "Help"]);
    expect(labelsFor("Viewer")).not.toContain("My Uploads");
    expect(labelsFor("Viewer")).not.toContain("My Work");
    expect(canSeeDamShellGroup("Admin", "Viewer")).toBe(false);
  });

  it("shows Contributor upload inbox navigation without review or admin tools", () => {
    expect(labelsFor("Contributor")).toEqual([
      "Media Library",
      "Albums & Events",
      "Upload Photos",
      "My Uploads",
      "My Work",
      "Requests",
      "Help Center"
    ]);
    expect(mobileLabelsFor("Contributor")).toEqual(["Library", "Upload", "Work", "Uploads", "Requests"]);
    expect(labelsFor("Contributor")).not.toContain("Review Uploads");
    expect(canSeeDamShellGroup("Admin", "Contributor")).toBe(false);
  });

  it("shows Reviewer work inbox navigation without admin tools", () => {
    expect(labelsFor("Reviewer")).toEqual([
      "Media Library",
      "Albums & Events",
      "Upload Photos",
      "Review Uploads",
      "My Work",
      "Requests",
      "Help Center"
    ]);
    expect(mobileLabelsFor("Reviewer")).toEqual(["Library", "Albums", "Upload", "Review", "Work"]);
    expect(labelsFor("Reviewer")).not.toContain("My Uploads");
    expect(canSeeDamShellGroup("Admin", "Reviewer")).toBe(false);
  });

  it("keeps Admin visible only for DAM Admin", () => {
    expect(labelsFor("DAM Admin")).toEqual([
      "Media Library",
      "Albums & Events",
      "Upload Photos",
      "Review Uploads",
      "My Work",
      "Requests",
      "Support Zone",
      "Help Center"
    ]);
    expect(mobileLabelsFor("DAM Admin")).toEqual(["Library", "Albums", "Upload", "Review", "Work"]);
    expect(labelsFor("DAM Admin")).not.toContain("My Uploads");
    expect(canSeeDamShellGroup("Admin", "DAM Admin")).toBe(true);
  });

  it("does not promote legacy task or package language in nav", () => {
    const legacyLanguage = /Review Queue|My Tasks|Distribution Sets|package|ResourceSpace|Governance|Admin Zone|command center/i;
    for (const role of ["Viewer", "Contributor", "Reviewer", "DAM Admin"] as const) {
      const labels = [...labelsFor(role), ...mobileLabelsFor(role)].join(" ");
      expect(labels).not.toMatch(legacyLanguage);
    }
    const commandPalette = readFileSync(new URL("../components/CommandPalette.tsx", import.meta.url), "utf8");
    expect(commandPalette).not.toMatch(/Admin Zone|command center/i);
  });

  it("promotes Contributor My Work where browser-based contributor work exists", () => {
    expect(labelsFor("Contributor")).toContain("My Work");
    expect(mobileHrefsFor("Contributor")).toContain("/my-tasks");
    expect(portalHomeCardsForRole("Contributor").map((card) => card.href)).toContain("/my-tasks");
    expect(portalHomePrimaryHrefForRole("Contributor")).toBe("/upload");
    expect(dashboardActionsForRole("Contributor").map((action) => action.href)).toEqual([
      "/upload",
      "/my-tasks",
      "/recent-uploads",
      "/requests"
    ]);
  });

  it("keeps contributor and public home/dashboard copy free of backend jargon", () => {
    const visibleText = (value: unknown): string[] => {
      if (typeof value === "string") return [value];
      if (Array.isArray(value)) return value.flatMap(visibleText);
      if (value && typeof value === "object") return Object.values(value).flatMap(visibleText);
      return [];
    };
    const publicCopy = JSON.stringify({
      viewerDashboard: dashboardCopyForRole("Viewer"),
      contributorDashboard: dashboardCopyForRole("Contributor"),
      viewerActions: dashboardActionsForRole("Viewer").map(({ href, title, detail }) => ({ href, title, detail })),
      contributorActions: dashboardActionsForRole("Contributor").map(({ href, title, detail }) => ({ href, title, detail })),
      viewerHome: portalHomeCardsForRole("Viewer").map(({ href, title, description }) => ({ href, title, description })),
      contributorHome: portalHomeCardsForRole("Contributor").map(({ href, title, description }) => ({ href, title, description })),
      viewerHomeCopy: portalHomeCopyForRole("Viewer"),
      contributorHomeCopy: portalHomeCopyForRole("Contributor"),
      viewerNav: damShellItemsForRole("Viewer").map(({ label, mobileLabel, description }) => ({ label, mobileLabel, description })),
      contributorNav: damShellItemsForRole("Contributor").map(({ label, mobileLabel, description }) => ({ label, mobileLabel, description }))
    });
    const publicVisibleText = visibleText(JSON.parse(publicCopy)).join(" ");

    expect(publicCopy).not.toMatch(/ResourceSpace|writeback|sync|backend|source truth|source files|source\/original|reviewer packet|hosted DAM|API|command center/i);
    expect(publicVisibleText).not.toMatch(/\bapproved\b|\bapproval\b|\bdownload\b|\bpublic\b/i);
  });

  it("keeps reviewer and admin power tools in reviewer/admin dashboard actions", () => {
    expect(dashboardActionsForRole("Reviewer").map((action) => action.href)).toEqual(["/review", "/my-tasks", "/upload", "/requests"]);
    expect(dashboardActionsForRole("DAM Admin").map((action) => action.href)).toEqual(["/admin", "/review", "/my-tasks", "/requests"]);
    expect(dashboardActionsForRole("DAM Admin")[0]).toMatchObject({ title: "Support Zone" });
    expect(dashboardCopyForRole("Reviewer").eyebrow).toBe("DAM workspace");
    expect(dashboardCopyForRole("DAM Admin").eyebrow).toBe("DAM workspace");
  });

  it("keeps direct route permissions strict", () => {
    const nonAdminRoles: DemoRole[] = ["Viewer", "Contributor", "Reviewer"];
    const roleAwareWorkRoutes = ["/my-tasks", "/my-tasks?filter=requests", "/tasks"];
    const adminOnlyDeliveryRoutes = ["/packages", "/packages/share-photos", "/distribution-sets", "/distribution-sets/sabbath"];

    expect(canAccessRoute("Viewer", "/upload")).toBe(false);
    expect(canAccessRoute("Contributor", "/upload")).toBe(true);
    expect(canAccessRoute("Contributor", "/review")).toBe(false);
    expect(canAccessRoute("Contributor", "/recent-uploads")).toBe(true);
    expect(canAccessRoute("Reviewer", "/review")).toBe(true);
    expect(canAccessRoute("Reviewer", "/admin/users")).toBe(false);
    expect(canAccessRoute("DAM Admin", "/admin/users")).toBe(true);
    expect(canAccessRoute("DAM Admin", "/governance/rights-consent")).toBe(true);

    for (const route of roleAwareWorkRoutes) {
      for (const role of ["Viewer", "Contributor", "Reviewer", "DAM Admin"] as const) {
        expect(canAccessRoute(role, route)).toBe(true);
      }
    }

    for (const route of adminOnlyDeliveryRoutes) {
      for (const role of nonAdminRoles) {
        expect(canAccessRoute(role, route)).toBe(false);
      }
      expect(canAccessRoute("DAM Admin", route)).toBe(true);
    }
  });

  it("filters mobile nav away from routes each role should not use", () => {
    expect(mobileHrefsFor("Viewer")).toEqual(["/library", "/collections", "/requests", "/help"]);
    expect(mobileHrefsFor("Contributor")).toEqual(["/library", "/upload", "/my-tasks", "/recent-uploads", "/requests"]);
    expect(mobileHrefsFor("Reviewer")).toEqual(["/library", "/collections", "/upload", "/review", "/my-tasks"]);
    expect(mobileHrefsFor("DAM Admin")).toEqual(["/library", "/collections", "/upload", "/review", "/my-tasks"]);
  });

  it("hides bottom nav outside true mobile widths", () => {
    const css = readFileSync(new URL("../app/dam-enterprise.css", import.meta.url), "utf8");
    const mobileBlock = css.slice(css.indexOf("@media (max-width: 767px)"));

    expect(css).toContain(".dam-mobile-topbar,\n.dam-mobile-bottom-nav {\n  display: none;\n}");
    expect(mobileBlock).toContain(".dam-mobile-bottom-nav");
    expect(mobileBlock).toContain("display: grid");
  });

  it("keeps desktop sidebar on a white rail with black text", () => {
    const css = [
      readFileSync(new URL("../app/globals.css", import.meta.url), "utf8"),
      readFileSync(new URL("../app/dam-enterprise.css", import.meta.url), "utf8")
    ].join("\n");

    expect(css).toContain("background: #ffffff !important;");
    expect(css).toContain("color: #111111 !important;");
    expect(css).toContain("box-shadow: inset 3px 0 0 #111111 !important;");
    expect(css).toContain("background: #f3f5f4 !important;");
  });
});
