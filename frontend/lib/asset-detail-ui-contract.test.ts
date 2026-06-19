import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const assetDetailPage = readFileSync(new URL("../components/dam/enterprise/AssetDetailPage.tsx", import.meta.url), "utf8");

describe("asset detail UI contract", () => {
  it("keeps normal role actions focused on permission and issue reporting", () => {
    expect(assetDetailPage).toContain("function RoleSafeAssetDetailPage");
    expect(assetDetailPage).toContain("Request permission");
    expect(assetDetailPage).toContain("Report issue");
    expect(assetDetailPage).toContain("Related media");
    expect(assetDetailPage).not.toContain("Request use copy");
  });

  it("does not show approved-copy actions unless access and derivative readiness both pass", () => {
    expect(assetDetailPage).toContain("const canRequestApprovedCopy = Boolean(reusePacket.access.downloadApprovedCopy.allowed && !limitedDerivative);");
    expect(assetDetailPage).not.toContain("Download blocked");
    expect(assetDetailPage).not.toContain("Pending replacement/sync");
    expect(assetDetailPage).not.toContain("No source-system writeback");
  });
});
