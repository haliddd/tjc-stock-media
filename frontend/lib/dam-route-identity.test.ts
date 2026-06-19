import { describe, expect, it } from "vitest";
import { isDamShellRouteActive } from "@/lib/dam-route-identity";

const navItems = [
  { label: "Media Library", href: "/library", activeHrefs: ["/"] },
  { label: "Albums & Events", href: "/collections" },
  { label: "Requests", href: "/requests" },
  { label: "My Work", href: "/my-tasks", activeHrefs: ["/tasks"] },
  { label: "Help Center", href: "/help", activeHrefs: ["/guide"] },
  { label: "My Uploads", href: "/recent-uploads", activeHrefs: ["/library?view=recent-uploads"] },
  { label: "Review Uploads", href: "/review", activeHrefs: ["/review?queue=pending", "/review?queue=rights-review"] },
  {
    label: "Admin Zone",
    href: "/admin",
    activeHrefs: [
      "/admin/users",
      "/admin/roles",
      "/admin/taxonomy",
      "/admin/settings",
      "/governance",
      "/governance/rights-consent",
      "/governance/metadata-health",
      "/governance/policy-center",
      "/governance/audit-log",
      "/governance/integrations"
    ]
  }
];

function activeLabels(pathname: string, currentSearch = "", currentHash = "") {
  return navItems
    .filter((item) => isDamShellRouteActive({ pathname, currentSearch, currentHash, href: item.href, activeHrefs: item.activeHrefs }))
    .map((item) => item.label);
}

describe("DAM route identity", () => {
  it("keeps Requests, Help Center, Albums & Events, My Work, and upload history distinct", () => {
    expect(activeLabels("/requests/REQ-1024")).toEqual(["Requests"]);
    expect(activeLabels("/")).toEqual(["Media Library"]);
    expect(activeLabels("/collections")).toEqual(["Albums & Events"]);
    expect(activeLabels("/my-tasks")).toEqual(["My Work"]);
    expect(activeLabels("/tasks")).toEqual(["My Work"]);
    expect(activeLabels("/help")).toEqual(["Help Center"]);
    expect(activeLabels("/guide")).toEqual(["Help Center"]);
    expect(activeLabels("/recent-uploads")).toEqual(["My Uploads"]);
    expect(activeLabels("/library", "view=recent-uploads")).toEqual(["My Uploads"]);
    expect(activeLabels("/requests", "view=my-tasks")).toEqual(["Requests"]);
  });

  it("keeps Help Center active for policy help pages without a global Policy Center item", () => {
    expect(activeLabels("/help", "section=policies", "policies")).toEqual(["Help Center"]);
    expect(activeLabels("/guide", "section=policies", "policies")).toEqual(["Help Center"]);
    expect(activeLabels("/requests")).not.toContain("Help Center");
    expect(activeLabels("/my-tasks")).not.toContain("Help Center");
    expect(activeLabels("/recent-uploads")).not.toContain("Help Center");
  });

  it("keeps all review queues under Review Uploads", () => {
    expect(activeLabels("/review", "queue=missing-evidence")).toEqual(["Review Uploads"]);
    expect(activeLabels("/review", "queue=metadata")).toEqual(["Review Uploads"]);
    expect(activeLabels("/review", "queue=rights-review")).toEqual(["Review Uploads"]);
  });

  it("keeps all admin and governance routes under one Admin Zone sidebar item", () => {
    expect(activeLabels("/governance")).toEqual(["Admin Zone"]);
    expect(activeLabels("/governance/rights-consent", "", "rights-consent")).toEqual(["Admin Zone"]);
    expect(activeLabels("/governance/metadata-health")).toEqual(["Admin Zone"]);
    expect(activeLabels("/governance/policy-center")).toEqual(["Admin Zone"]);
    expect(activeLabels("/governance/audit-log")).toEqual(["Admin Zone"]);
    expect(activeLabels("/governance/integrations")).toEqual(["Admin Zone"]);
    expect(activeLabels("/admin")).toEqual(["Admin Zone"]);
    expect(activeLabels("/admin/users")).toEqual(["Admin Zone"]);
    expect(activeLabels("/admin/roles")).toEqual(["Admin Zone"]);
    expect(activeLabels("/admin/taxonomy")).toEqual(["Admin Zone"]);
    expect(activeLabels("/admin/settings", "", "integrations")).toEqual(["Admin Zone"]);
  });
});
