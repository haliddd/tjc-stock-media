import { NextRequest, NextResponse } from "next/server";
import { searchAssets } from "@/lib/catalog";
import { readCatalogSearchRequest } from "@/lib/catalog-search-request";
import { createDamRouteSession } from "@/lib/dam-route-session";
import { publicSnapshotBrowseEnabled } from "@/lib/env";
import { canReview } from "@/lib/permissions";
import { localBetaRoleOverrideFromRequest } from "@/lib/request-identity";
import { usageAnalyticsDiagnostics } from "@/lib/usage-analytics";
import type { SearchResult } from "@/lib/types";

export const dynamic = "force-dynamic";

function searchResultForRole(session: ReturnType<typeof createDamRouteSession>, result: SearchResult) {
  const role = session.role;
  const envelope = session.sourceEnvelope(result.source);
  if (canReview(role)) {
    return {
      ...result,
      assets: session.assetsPayload(result.assets),
      ...envelope
    };
  }

  return {
    assets: session.assetsPayload(result.assets),
    total: result.total,
    pagination: result.pagination,
    ...envelope,
    counts: {
      currentlyShown: result.counts.currentlyShown,
      totalMatching: result.counts.totalMatching,
      totalRendered: result.counts.totalRendered,
      matching: result.counts.matching,
      rendered: result.counts.rendered
    },
    appliedIntent: result.appliedIntent,
    discovery: result.discovery,
    savedViews: session.savedViewsPayload(result.savedViews),
    collections: result.collections
  };
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const session = createDamRouteSession(request, localBetaRoleOverrideFromRequest(request));
  const role = session.role;
  const accessRole = publicSnapshotBrowseEnabled() && role === "Viewer" ? "Reviewer" : role;
  const searchRequest = readCatalogSearchRequest(params);
  if (searchRequest.error) {
    return NextResponse.json({ error: searchRequest.error.message }, { status: searchRequest.error.status });
  }
  const input = searchRequest.input;
  const result = await searchAssets({ role, accessRole, ...input });
  const usageAnalytics = usageAnalyticsDiagnostics();
  if (canReview(role)) {
    result.usageAnalytics = {
      enabled: usageAnalytics.enabled,
      totalEvents: usageAnalytics.totalEvents,
      topSearches: usageAnalytics.topSearches,
      topAssets: usageAnalytics.topAssets,
      dailyEvents: usageAnalytics.dailyEvents
    };
  }
  session.recordUsage({
    type: "search_query",
    route: "/api/assets/search",
    query: input.query || input.intent || input.view || input.collection || "default",
    metadata: {
      rendered: result.pagination.rangeEnd - result.pagination.rangeStart + (result.pagination.rangeStart ? 1 : 0),
      total: result.total,
      filterCount: input.filters.length,
      intent: input.intent || result.appliedIntent?.matchedDiscoveryIntent || null
    }
  });
  input.filters.forEach((filter) => {
    session.recordUsage({
      type: "filter_click",
      route: "/api/assets/search",
      query: input.query || input.intent || input.view || input.collection || "default",
      metadata: { filter, total: result.total }
    });
  });
  if (result.total === 0) {
    session.recordUsage({
      type: "search_zero_result",
      route: "/api/assets/search",
      query: input.query || input.intent || input.view || input.collection || "default",
      metadata: { filterCount: input.filters.length, intent: input.intent || result.appliedIntent?.matchedDiscoveryIntent || null }
    });
  }
  return NextResponse.json(searchResultForRole(session, result));
}
