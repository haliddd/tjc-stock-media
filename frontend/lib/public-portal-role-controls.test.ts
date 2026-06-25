import { describe, expect, it } from "vitest";
import { publicPortalActionLabel, publicPortalRoleControls, publicPortalRoleSummary } from "@/lib/public-portal-role-controls";
import type { DemoRole } from "@/lib/types";

type ControlId = ReturnType<typeof publicPortalRoleControls>[number]["id"];

function controlFor(role: DemoRole, id: ControlId) {
  const control = publicPortalRoleControls(role).find((item) => item.id === id);
  if (!control) throw new Error(`Missing ${id} control for ${role}`);
  return control;
}

function stateFor(role: DemoRole, id: ControlId) {
  return controlFor(role, id).state;
}

describe("public portal role controls", () => {
  it("keeps public action labels role-safe", () => {
    expect(publicPortalActionLabel("Viewer")).toBe("Request media");
    expect(publicPortalActionLabel("Contributor")).toBe("Share photos");
    expect(publicPortalActionLabel("Reviewer")).toBe("Share photos");
    expect(publicPortalActionLabel("DAM Admin")).toBe("Share photos");
  });

  it("keeps Viewer in safe public-use lane", () => {
    expect(publicPortalRoleSummary("Viewer").title).toBe("Viewer lane");
    expect(stateFor("Viewer", "search")).toBe("available");
    expect(stateFor("Viewer", "download")).toBe("gated");
    expect(stateFor("Viewer", "upload")).toBe("blocked");
    expect(stateFor("Viewer", "review")).toBe("blocked");
    expect(stateFor("Viewer", "source")).toBe("blocked");
    expect(stateFor("Viewer", "original")).toBe("blocked");
    expect(stateFor("Viewer", "mutation")).toBe("blocked");
    expect(stateFor("Viewer", "resourcespace")).toBe("blocked");
    expect(controlFor("Viewer", "resourcespace").detail).toBe("ResourceSpace admin stays locked.");
  });

  it("lets Contributors submit intake without review or admin controls", () => {
    expect(stateFor("Contributor", "upload")).toBe("available");
    expect(stateFor("Contributor", "review")).toBe("blocked");
    expect(stateFor("Contributor", "source")).toBe("blocked");
    expect(stateFor("Contributor", "original")).toBe("blocked");
    expect(stateFor("Contributor", "mutation")).toBe("blocked");
    expect(stateFor("Contributor", "resourcespace")).toBe("blocked");
    expect(controlFor("Contributor", "original").detail).toBe("Original downloads stay locked.");
  });

  it("lets Reviewers review but keeps mutation, original, and ResourceSpace admin locked", () => {
    expect(stateFor("Reviewer", "upload")).toBe("available");
    expect(stateFor("Reviewer", "review")).toBe("available");
    expect(stateFor("Reviewer", "source")).toBe("available");
    expect(stateFor("Reviewer", "original")).toBe("blocked");
    expect(stateFor("Reviewer", "mutation")).toBe("blocked");
    expect(stateFor("Reviewer", "resourcespace")).toBe("blocked");
    expect(controlFor("Reviewer", "source").detail).toBe("Reviewer-visible metadata only; source files stay locked.");
  });

  it("lets DAM Admin see admin controls while source mutation stays blocked", () => {
    expect(stateFor("DAM Admin", "upload")).toBe("available");
    expect(stateFor("DAM Admin", "review")).toBe("available");
    expect(stateFor("DAM Admin", "source")).toBe("available");
    expect(stateFor("DAM Admin", "original")).toBe("gated");
    expect(stateFor("DAM Admin", "mutation")).toBe("blocked");
    expect(stateFor("DAM Admin", "resourcespace")).toBe("available");
    expect(controlFor("DAM Admin", "original").detail).toBe("Request-only; no live original download.");
    expect(controlFor("DAM Admin", "mutation").detail).toBe("Portal cannot mutate ResourceSpace or source media.");
    expect(controlFor("DAM Admin", "resourcespace").detail).toBe("Admin controls visible; ResourceSpace remains authoritative.");
  });
});
