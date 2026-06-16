import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
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
  it("hides Governance and Admin sidebar links from Reviewer", () => {
    const labels = labelsFor("Reviewer");

    expect(canSeeDamShellGroup("Governance", "Reviewer")).toBe(false);
    expect(canSeeDamShellGroup("Admin", "Reviewer")).toBe(false);
    expect(labels).not.toContain("Rights & Consent");
    expect(labels).not.toContain("Metadata Health");
    expect(labels).not.toContain("Policy Center");
  });

  it("hides Governance and Admin sidebar groups from Viewer and Contributor", () => {
    for (const role of ["Viewer", "Contributor"] as const) {
      expect(canSeeDamShellGroup("Governance", role)).toBe(false);
      expect(canSeeDamShellGroup("Admin", role)).toBe(false);
      expect(labelsFor(role)).not.toContain("Rights & Consent");
      expect(labelsFor(role)).not.toContain("Users & Roles");
    }
  });

  it("keeps Reviewer workflow navigation visible", () => {
    expect(labelsFor("Reviewer")).toEqual(expect.arrayContaining([
      "Library",
      "Collections",
      "Distribution Sets",
      "Upload / Intake",
      "Recent Uploads",
      "Review Queue",
      "Requests",
      "My Tasks",
      "Help Center"
    ]));
  });

  it("keeps governance direct URLs locked for Reviewer", () => {
    expect(canAccessRoute("Reviewer", "/governance/rights-consent")).toBe(false);
    expect(canAccessRoute("Reviewer", "/governance/metadata-health")).toBe(false);
    expect(canAccessRoute("Reviewer", "/governance/policy-center")).toBe(false);
    expect(canAccessRoute("Reviewer", "/governance/audit-log")).toBe(false);
    expect(canAccessRoute("Reviewer", "/admin/users")).toBe(false);
    expect(canAccessRoute("Reviewer", "/admin/taxonomy")).toBe(false);
    expect(canAccessRoute("Reviewer", "/admin/settings")).toBe(false);
  });

  it("keeps Governance and Admin visible and accessible for DAM Admin", () => {
    const labels = labelsFor("DAM Admin");

    expect(canSeeDamShellGroup("Governance", "DAM Admin")).toBe(true);
    expect(canSeeDamShellGroup("Admin", "DAM Admin")).toBe(true);
    expect(labels).toEqual(expect.arrayContaining([
      "Rights & Consent",
      "Metadata Health",
      "Policy Center",
      "Users & Roles",
      "Taxonomy",
      "Integrations",
      "Settings"
    ]));
    expect(canAccessRoute("DAM Admin", "/governance/rights-consent")).toBe(true);
    expect(canAccessRoute("DAM Admin", "/governance/metadata-health")).toBe(true);
    expect(canAccessRoute("DAM Admin", "/governance/policy-center")).toBe(true);
    expect(canAccessRoute("DAM Admin", "/admin/settings")).toBe(true);
  });

  it("filters Reviewer mobile nav away from Governance and Admin routes", () => {
    const labels = mobileLabelsFor("Reviewer");
    const hrefs = mobileHrefsFor("Reviewer");

    expect(labels).toEqual(["Library", "Upload", "Review", "Collections", "Help"]);
    expect(labels).not.toContain("Governance");
    expect(labels).not.toContain("Admin");
    expect(labels).not.toContain("Policy Center");
    expect(labels).not.toContain("Rights & Consent");
    expect(hrefs).not.toEqual(expect.arrayContaining([
      "/governance/rights-consent",
      "/governance/policy-center",
      "/admin/users"
    ]));
  });

  it("keeps Viewer mobile nav out of Review Queue", () => {
    const labels = mobileLabelsFor("Viewer");

    expect(labels).toEqual(["Library", "Collections", "Requests", "My Tasks", "Help"]);
    expect(labels).not.toContain("Review");
    expect(labels).not.toContain("Review Queue");
  });

  it("keeps Contributor mobile Upload visible only through route access", () => {
    expect(canAccessRoute("Contributor", "/upload")).toBe(true);
    expect(mobileLabelsFor("Contributor")).toEqual(["Library", "Upload", "Collections", "Recent Uploads", "Help"]);
  });

  it("keeps DAM Admin mobile nav focused while retaining Governance and Admin access", () => {
    expect(mobileLabelsFor("DAM Admin")).toEqual(["Library", "Upload", "Review", "Collections", "Help"]);
    expect(canSeeDamShellGroup("Governance", "DAM Admin")).toBe(true);
    expect(canSeeDamShellGroup("Admin", "DAM Admin")).toBe(true);
    expect(canAccessRoute("DAM Admin", "/admin/users")).toBe(true);
    expect(canAccessRoute("DAM Admin", "/admin/taxonomy")).toBe(true);
  });

  it("hides bottom nav outside true mobile widths", () => {
    const css = readFileSync(new URL("../app/dam-enterprise.css", import.meta.url), "utf8");

    expect(css).toContain(".dam-mobile-topbar,\n.dam-mobile-bottom-nav {\n  display: none;\n}");
    expect(css).toMatch(/@media \(max-width: 767px\)[\s\S]*\.dam-mobile-bottom-nav\s*\{[\s\S]*display: grid/);
  });
});
