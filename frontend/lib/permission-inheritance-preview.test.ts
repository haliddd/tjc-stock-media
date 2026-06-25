import { describe, expect, it } from "vitest";
import { buildPermissionInheritancePreview, canAccessPermissionInheritancePreview } from "@/lib/permission-inheritance-preview";

describe("permission inheritance preview", () => {
  it("stays admin-only", () => {
    expect(canAccessPermissionInheritancePreview("Viewer")).toBe(false);
    expect(canAccessPermissionInheritancePreview("Contributor")).toBe(false);
    expect(canAccessPermissionInheritancePreview("Reviewer")).toBe(false);
    expect(canAccessPermissionInheritancePreview("DAM Admin")).toBe(true);
  });

  it("covers DAM-specific inheritance concepts as read-only preview", () => {
    const preview = buildPermissionInheritancePreview();
    const ids = preview.rows.map((row) => row.id);

    expect(preview.readOnly).toBe(true);
    expect(ids).toEqual(expect.arrayContaining([
      "collection",
      "brand-kit",
      "channel",
      "region",
      "rendition",
      "original-download",
      "source-file",
      "public-sharing",
      "restricted-asset",
      "expired-asset",
      "approval-authority"
    ]));
    expect(preview.assignments).toHaveLength(4);
  });
});
