import type { NextRequest } from "next/server";
import { sourceEnvelope, roleSourceEnvelope } from "@/lib/media-source/session";
import {
  requestIdentity,
  resolveClientRoleOverride,
  type ClientRoleOverrideDecision,
  type ClientRoleOverridePolicy,
  type ClientRoleOverrideSource,
  type DamSessionAdapter,
  type RequestIdentityOptions
} from "@/lib/request-identity";
import { assetForRolePayload, catalogCollectionsForRolePayload, catalogDiscoveryForRolePayload, savedViewsForRolePayload } from "@/lib/source-redaction";
import { recordUsageEvent, type UsageEventInput } from "@/lib/usage-analytics";
import type { CatalogCollection, DamUser, DemoRole, MediaSourceStatus, SavedViewSummary, SearchResult, StockMediaAsset } from "@/lib/types";

type RouteUsageInput = Omit<UsageEventInput, "role" | "actor"> & {
  actor?: string;
};

type ResolvedIdentityOptions = RequestIdentityOptions & {
  adapter: DamSessionAdapter;
  overridePolicy: ClientRoleOverridePolicy;
  overrideSource: ClientRoleOverrideSource;
};

export type DamSessionInput = {
  explicitRole?: string | null;
  adapter?: DamSessionAdapter;
  overridePolicy?: ClientRoleOverridePolicy;
  overrideSource?: ClientRoleOverrideSource;
};

export type DamSession = {
  identity: DamUser;
  role: DemoRole;
  adapter: DamSessionAdapter;
  roleOverride: ClientRoleOverrideDecision;
  sourceEnvelope(source: MediaSourceStatus): ReturnType<typeof roleSourceEnvelope>;
  rawSourceEnvelope(source: MediaSourceStatus): ReturnType<typeof sourceEnvelope>;
  assetPayload(asset: StockMediaAsset): StockMediaAsset;
  assetsPayload(assets: StockMediaAsset[]): StockMediaAsset[];
  savedViewsPayload(views: SavedViewSummary[]): SavedViewSummary[];
  collectionsPayload(collections: CatalogCollection[]): CatalogCollection[];
  discoveryPayload(discovery: SearchResult["discovery"]): SearchResult["discovery"];
  recordUsage(event: RouteUsageInput): ReturnType<typeof recordUsageEvent>;
};

function optionsForAdapter(adapter: DamSessionAdapter, input?: string | null | DamSessionInput): ResolvedIdentityOptions {
  if (typeof input === "object" && input !== null) {
    return {
      explicitRole: input.explicitRole ?? null,
      adapter: input.adapter ?? adapter,
      overridePolicy: input.overridePolicy ?? "local-beta",
      overrideSource: input.overrideSource ?? "query"
    };
  }
  return {
    explicitRole: input ?? null,
    adapter,
    overridePolicy: "local-beta",
    overrideSource: adapter === "workflow" ? "body" : "query"
  };
}

function createDamSession(identity: DamUser, adapter: DamSessionAdapter, roleOverride: ClientRoleOverrideDecision): DamSession {
  const role = identity.role;

  return {
    identity,
    role,
    adapter,
    roleOverride,
    sourceEnvelope(source: MediaSourceStatus) {
      return roleSourceEnvelope(role, source);
    },
    rawSourceEnvelope(source: MediaSourceStatus) {
      return sourceEnvelope(source);
    },
    assetPayload(asset: StockMediaAsset) {
      return assetForRolePayload(role, asset);
    },
    assetsPayload(assets: StockMediaAsset[]) {
      return assets.map((asset) => assetForRolePayload(role, asset));
    },
    savedViewsPayload(views: SavedViewSummary[]) {
      return savedViewsForRolePayload(role, views);
    },
    collectionsPayload(collections: CatalogCollection[]) {
      return catalogCollectionsForRolePayload(role, collections);
    },
    discoveryPayload(discovery: SearchResult["discovery"]) {
      return catalogDiscoveryForRolePayload(role, discovery);
    },
    recordUsage(event: RouteUsageInput) {
      return recordUsageEvent({
        ...event,
        role,
        actor: event.actor || identity.id
      });
    }
  };
}

export function createDamRouteSession(request: NextRequest, input?: string | null | DamSessionInput) {
  const options = optionsForAdapter("route", input);
  const identity = requestIdentity(request, options);
  const roleOverride = resolveClientRoleOverride(request, options);
  return createDamSession(identity, options.adapter, roleOverride);
}

export function createDamWorkflowSession(request: NextRequest, input?: string | null | DamSessionInput) {
  const options = optionsForAdapter("workflow", input);
  const identity = requestIdentity(request, options);
  const roleOverride = resolveClientRoleOverride(request, options);
  return createDamSession(identity, options.adapter, roleOverride);
}

export function createDamScriptSession(role: DemoRole = "Viewer") {
  const identity: DamUser = {
    id: `script-test:${role}`,
    name: role,
    role,
    sourceSystem: "local-beta"
  };
  const roleOverride: ClientRoleOverrideDecision = {
    requestedRole: role,
    role,
    source: "script",
    policy: "local-beta",
    allowed: true,
    ignored: false,
    denied: false,
    reasonCode: null
  };
  return createDamSession(identity, "script-test", roleOverride);
}
