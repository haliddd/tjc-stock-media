import { enterpriseRoutes, enterpriseNavItems } from "@/lib/dam/enterprise-route-surface";

export const BUILD_READINESS_CONTRACT = "small-team-beta-readiness-2026-06-17";

function cleanBuildValue(value: string | undefined) {
  return typeof value === "string" ? value.replace(/[^A-Za-z0-9._/-]/g, "").slice(0, 80) : "";
}

function commitSha() {
  return cleanBuildValue(
    process.env.VERCEL_GIT_COMMIT_SHA
    || process.env.GIT_COMMIT_SHA
    || process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA
  );
}

function branchName() {
  return cleanBuildValue(
    process.env.VERCEL_GIT_COMMIT_REF
    || process.env.GIT_BRANCH
    || process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF
  );
}

export function publicBuildInfo() {
  const homeRoute = enterpriseRoutes.find((route) => route.path === "/");
  const uploadRoute = enterpriseRoutes.find((route) => route.path === "/upload");
  const sha = commitSha();
  return {
    app: "tjc-stock-media",
    readinessContract: BUILD_READINESS_CONTRACT,
    deploymentProvider: process.env.VERCEL === "1" ? "vercel" : "local",
    commitSha: sha || null,
    commitShort: sha ? sha.slice(0, 12) : null,
    branch: branchName() || null,
    routeSurface: {
      routeCount: enterpriseRoutes.length,
      navItemCount: enterpriseNavItems.length,
      homePage: homeRoute?.pageExport || null,
      uploadPage: uploadRoute?.pageExport || null
    }
  };
}
