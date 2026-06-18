import { describe, expect, it } from "vitest";
import { isDamShellRouteActive } from "@/lib/dam-route-identity";

const navItems = [
  { label: "Library", href: "/" },
  { label: "Requests", href: "/requests" },
  { label: "My Tasks", href: "/my-tasks", activeHrefs: ["/tasks"] },
  { label: "Help Center", href: "/help", activeHrefs: ["/guide"] },
  { label: "Policy Center", href: "/governance/policy-center", activeHrefs: ["/help?section=policies#policies", "/guide?section=policies#policies"] },
  { label: "Recent Uploads", href: "/recent-uploads" },
  { label: "Review Queue", href: "/review" },
  { label: "Rights & Consent", href: "/governance/rights-consent", activeHrefs: ["/review?queue=rights-review"] },
  { label: "Metadata Health", href: "/governance/metadata-health" },
  { label: "Audit Log", href: "/governance/audit-log", activeHrefs: ["/admin#audit-logs"] },
  { label: "Integrations", href: "/governance/integrations" },
  { label: "Control Center", href: "/admin" },
  { label: "Users & Roles", href: "/admin/users", activeHrefs: ["/admin/roles"] },
  { label: "Taxonomy", href: "/admin/taxonomy" },
  { label: "Settings", href: "/admin/settings" }
];

function activeLabels(pathname: string, currentSearch = "", currentHash = "") {
  return navItems
    .filter((item) => isDamShellRouteActive({ pathname, currentSearch, currentHash, href: item.href, activeHrefs: item.activeHrefs }))
    .map((item) => item.label);
}

describe("DAM route identity", () => {
  it("keeps Requests, My Tasks, Help Center, and Recent Uploads distinct", () => {
    expect(activeLabels("/requests/REQ-1024")).toEqual(["Requests"]);
    expect(activeLabels("/my-tasks")).toEqual(["My Tasks"]);
    expect(activeLabels("/tasks")).toEqual(["My Tasks"]);
    expect(activeLabels("/help")).toEqual(["Help Center"]);
    expect(activeLabels("/guide")).toEqual(["Help Center"]);
    expect(activeLabels("/recent-uploads")).toEqual(["Recent Uploads"]);
  });

  it("does not let bare Help Center steal policy or workflow routes", () => {
    expect(activeLabels("/help", "section=policies", "policies")).toEqual(["Policy Center"]);
    expect(activeLabels("/guide", "section=policies", "policies")).toEqual(["Policy Center"]);
    expect(activeLabels("/requests")).not.toContain("Help Center");
    expect(activeLabels("/my-tasks")).not.toContain("Help Center");
  });

  it("keeps normal review queues under Review Queue while rights review maps to Rights & Consent", () => {
    expect(activeLabels("/review", "queue=missing-evidence")).toEqual(["Review Queue"]);
    expect(activeLabels("/review", "queue=metadata")).toEqual(["Review Queue"]);
    expect(activeLabels("/review", "queue=rights-review")).toEqual(["Rights & Consent"]);
  });

  it("keeps governance and admin sidebar identity exact", () => {
    expect(activeLabels("/governance")).toEqual([]);
    expect(activeLabels("/governance/rights-consent", "", "rights-policies")).toEqual(["Rights & Consent"]);
    expect(activeLabels("/governance/metadata-health")).toEqual(["Metadata Health"]);
    expect(activeLabels("/governance/policy-center")).toEqual(["Policy Center"]);
    expect(activeLabels("/governance/audit-log")).toEqual(["Audit Log"]);
    expect(activeLabels("/governance/integrations")).toEqual(["Integrations"]);
    expect(activeLabels("/admin")).toEqual(["Control Center"]);
    expect(activeLabels("/admin/users")).toEqual(["Users & Roles"]);
    expect(activeLabels("/admin/roles")).toEqual(["Users & Roles"]);
    expect(activeLabels("/admin/taxonomy")).toEqual(["Taxonomy"]);
    expect(activeLabels("/admin/settings", "", "integrations")).toEqual(["Settings"]);
  });
});
