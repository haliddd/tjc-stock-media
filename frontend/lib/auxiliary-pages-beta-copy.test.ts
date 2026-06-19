import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const brandHubPage = readFileSync(new URL("../components/dam/enterprise/BrandHubPage.tsx", import.meta.url), "utf8");
const packageBuilderPage = readFileSync(new URL("../components/dam/enterprise/PackageBuilderPage.tsx", import.meta.url), "utf8");
const insightsPage = readFileSync(new URL("../components/dam/enterprise/InsightsPage.tsx", import.meta.url), "utf8");
const pageBarrel = readFileSync(new URL("../components/dam/EnterpriseDamPages.tsx", import.meta.url), "utf8");
const auxiliaryPages = [brandHubPage, packageBuilderPage, insightsPage].join("\n");

describe("auxiliary DAM beta page copy", () => {
  it("keeps Brand Hub and Package Builder in review-note and gate-check language", () => {
    expect(brandHubPage).toContain(">Review note<");
    expect(brandHubPage).toContain(">Check gates<");
    expect(brandHubPage).toContain("mapped media");
    expect(brandHubPage).toContain("file access stays gated");
    expect(brandHubPage).toContain("Local catalog snapshot");
    expect(brandHubPage).not.toMatch(/approved media|approved copies|Approved downloads|Portal Ready|publishing/i);
    expect(packageBuilderPage).toContain("Operating limits");
    expect(packageBuilderPage).toContain("Review-cleared");
    expect(packageBuilderPage).toContain("Review gate inspector");
    expect(packageBuilderPage).toContain("No generated files, source copies, hosted URLs, external sends, or ResourceSpace writeback");
    expect(packageBuilderPage).toContain("Package Draft only");
  });

  it("keeps Insights clipboard-only and source-honest", () => {
    expect(insightsPage).toContain(">Copy summary<");
    expect(insightsPage).toContain("summary copied to clipboard");
    expect(insightsPage).toContain("Usage panels only show recorded events when connected.");
    expect(insightsPage).toContain("Local catalog snapshot");
    expect(insightsPage).toContain("Last read");
    expect(pageBarrel).toContain("export { EnterpriseInsightsPage } from \"./enterprise/InsightsPage\";");
    expect(pageBarrel).not.toMatch(/EnterpriseInsightsPage[\s\S]*from "\.\/enterprise\/EnterpriseDamRedesign"/);
    expect(insightsPage).not.toContain("link.download");
    expect(insightsPage).not.toContain("URL.createObjectURL");
  });

  it("does not present old prototype delivery labels", () => {
    expect(auxiliaryPages).not.toMatch(/Prepare handoff|Handoff draft|Check delivery|delivery readiness|delivery gates|Insights preview samples|Sample data until|Share with your team/i);
    expect(auxiliaryPages).not.toMatch(/ZIP|public link|download job|download rights|Downloads allowed|Downloaded/i);
    expect(auxiliaryPages).not.toMatch(/Access placeholder only|draft placeholder|not wired|Beta limits|Internal beta|Local beta|Premium-ready|Beta-strong|Not enterprise-ready/i);
    expect(auxiliaryPages).not.toMatch(/Last sync|synced|published|downloadable|production-ready/i);
  });
});
