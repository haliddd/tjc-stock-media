import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const routeExpectations = [
  ["Home", "../app/page.tsx", "EnterprisePortalHomePage"],
  ["Library", "../app/library/page.tsx", "EnterpriseLibraryPage"],
  ["Collections", "../app/collections/page.tsx", "EnterpriseCollectionsPage"],
  ["Asset Detail", "../app/assets/[id]/page.tsx", "EnterpriseAssetDetailPage"],
  ["Upload", "../app/upload/page.tsx", "EnterpriseUploadPage"],
  ["Recent Uploads", "../app/recent-uploads/page.tsx", "RecentUploadsPage"],
  ["Review", "../app/review/page.tsx", "EnterpriseReviewPage"],
  ["My Work", "../app/my-tasks/page.tsx", "MyTasksPage"],
  ["Requests", "../app/requests/page.tsx", "RequestsPage"],
  ["Help", "../app/help/page.tsx", "EnterpriseHelpPage"],
  ["Admin", "../app/admin/page.tsx", "EnterpriseAdminPage"],
  ["Brand Hub", "../app/brand-hub/page.tsx", "EnterpriseBrandHubPage"],
  ["Packages", "../app/packages/page.tsx", "EnterprisePackageBuilderPage"],
  ["Insights", "../app/insights/page.tsx", "EnterpriseInsightsPage"]
] as const;

function readFixture(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("primary DAM route wiring", () => {
  it("routes every redesigned primary page through the EnterpriseDamPages barrel", () => {
    for (const [name, routePath, exportName] of routeExpectations) {
      const source = readFixture(routePath);
      expect(source, name).toContain(`import { ${exportName} } from "@/components/dam/EnterpriseDamPages";`);
      expect(source, name).toContain(`<${exportName}`);
    }
  });

  it("exports redesigned Upload and Help surfaces instead of the old prototype module", () => {
    const barrel = readFixture("../components/dam/EnterpriseDamPages.tsx");
    expect(barrel).toContain("export { UploadPage as EnterpriseUploadPage } from \"../UploadPage\";");
    expect(barrel).toContain("export { GuidePage as EnterpriseHelpPage } from \"../GuidePage\";");
    expect(barrel).not.toMatch(/Enterprise(Upload|Help)Page[\s\S]*from "\.\/enterprise\/EnterpriseDamRedesign"/);
  });
});
