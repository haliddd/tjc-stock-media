"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { workspaceCopyForPath } from "@/components/dam/shell/damShellNav";

const FIRST_LEVEL_PATHS = new Set([
  "/",
  "/collections",
  "/review",
  "/packages",
  "/upload",
  "/insights",
  "/admin",
  "/guide"
]);

const ROOT_LABELS: Record<string, string> = {
  admin: "Admin",
  assets: "Library",
  collections: "Collections",
  guide: "Help",
  insights: "Insights",
  packages: "Packages",
  review: "Review Queue",
  upload: "Upload"
};

const DETAIL_LABELS: Record<string, string> = {
  assets: "Asset Detail",
  collections: "Collection Detail",
  packages: "Package Detail",
  review: "Review Detail"
};

function humanizeSegment(segment: string) {
  return decodeURIComponent(segment)
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function nestedBreadcrumbForPath(pathname: string, currentTitle: string) {
  const assetMatch = pathname.match(/^\/assets\/([^/]+)/);
  if (assetMatch) {
    return ["Library", decodeURIComponent(assetMatch[1]), "Asset Detail"];
  }

  const segments = pathname.split("/").filter(Boolean);
  if (!segments.length) return null;

  const [root, ...rest] = segments;
  const rootLabel = ROOT_LABELS[root] || humanizeSegment(root);
  const detailLabel = DETAIL_LABELS[root];
  const middle = rest.map(humanizeSegment);
  const lastMiddle = middle[middle.length - 1];

  if (!middle.length) return [rootLabel, currentTitle];
  if (!detailLabel) return [rootLabel, ...middle];
  if (lastMiddle === detailLabel) return [rootLabel, ...middle];
  return [rootLabel, ...middle, detailLabel];
}

export function DamCommandHeader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  if (FIRST_LEVEL_PATHS.has(pathname)) return null;

  const workspace = workspaceCopyForPath(pathname, searchParams.toString());
  const nestedBreadcrumb = nestedBreadcrumbForPath(pathname, workspace.title);

  return (
    <header className="dam-command-header sticky top-0 z-30 border-b border-[#d8e2dc] bg-[#fbfdfb]/95 px-3 backdrop-blur md:px-5">
      <div className="mx-auto flex h-full w-full max-w-[1760px] items-center">
        {nestedBreadcrumb ? (
          <nav className="dam-nested-breadcrumb" aria-label="Breadcrumb">
            <ol>
              {nestedBreadcrumb.map((item, index) => (
                <li key={`${item}-${index}`}>
                  {index ? <span className="dam-nested-breadcrumb-separator" aria-hidden="true">/</span> : null}
                  <span aria-current={index === nestedBreadcrumb.length - 1 ? "page" : undefined}>{item}</span>
                </li>
              ))}
            </ol>
          </nav>
        ) : (
          <span className="dam-app-page-label truncate" aria-current="page">{workspace.title}</span>
        )}
      </div>
    </header>
  );
}
