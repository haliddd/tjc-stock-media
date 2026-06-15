import { describe, expect, it } from "vitest";
import { isDamShellRouteActive } from "@/lib/dam-route-identity";

const navItems = [
  { label: "Library", href: "/" },
  { label: "Requests", href: "/requests" },
  { label: "My Tasks", href: "/my-tasks", activeHrefs: ["/tasks"] },
  { label: "Help Center", href: "/help", activeHrefs: ["/guide"] },
  { label: "Policy Center", href: "/help?section=policies#policies", activeHrefs: ["/guide?section=policies#policies"] },
  { label: "Recent Uploads", href: "/recent-uploads" }
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
});
