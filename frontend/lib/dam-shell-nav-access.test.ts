import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
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
      expect(mobileLabelsFor(role)).toContain("Albums");
      expect(labelsFor(role)).not.toContain("Collections");
      expect(mobileLabelsFor(role)).not.toContain("Collections");
      expect(labelsFor(role)).not.toContain("Delivery Sets");
      expect(mobileLabelsFor(role)).not.toContain("Delivery Sets");
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
      "Requests",
      "Help Center"
    ]);
    expect(mobileLabelsFor("Contributor")).toEqual(["Library", "Albums", "Upload", "Uploads", "Requests"]);
    expect(labelsFor("Contributor")).not.toContain("Review Uploads");
    expect(labelsFor("Contributor")).not.toContain("My Work");
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
      "Admin Zone",
      "Help Center"
    ]);
    expect(mobileLabelsFor("DAM Admin")).toEqual(["Library", "Albums", "Upload", "Review", "Work"]);
    expect(labelsFor("DAM Admin")).not.toContain("My Uploads");
    expect(canSeeDamShellGroup("Admin", "DAM Admin")).toBe(true);
  });

  it("does not promote legacy task or package language in nav", () => {
    const legacyLanguage = /Review Queue|My Tasks|Distribution Sets|package|ResourceSpace|Governance/i;
    for (const role of ["Viewer", "Contributor", "Reviewer", "DAM Admin"] as const) {
      const labels = [...labelsFor(role), ...mobileLabelsFor(role)].join(" ");
      expect(labels).not.toMatch(legacyLanguage);
    }
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
    expect(mobileHrefsFor("Contributor")).toEqual(["/library", "/collections", "/upload", "/recent-uploads", "/requests"]);
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
