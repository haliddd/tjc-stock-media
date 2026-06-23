import { isKnownCollectionId, isKnownSavedViewId } from "@/lib/catalog";
import { normalizeCatalogSort } from "@/lib/catalog-language";
import { isKnownDiscoveryIntent } from "@/lib/catalog-discovery";
import { normalizeBoundedIntField, normalizePublicTextField, normalizeTextField } from "@/lib/request-validation";

export type CatalogSearchRequestInput = {
  query: string;
  filters: string[];
  view?: string;
  collection?: string;
  intent?: string;
  sort?: string;
  limit: number;
  offset: number;
};

export type CatalogSearchRequest =
  | { input: CatalogSearchRequestInput; error?: undefined }
  | { input?: undefined; error: { message: string; status: 400 } };

function normalizeLimit(value: string | null) {
  return normalizeBoundedIntField(value, { min: 1, max: 120, fallback: 72 });
}

function normalizeOffset(value: string | null) {
  return normalizeBoundedIntField(value, { min: 0, max: Number.MAX_SAFE_INTEGER, fallback: 0 });
}

export function readCatalogSearchRequest(params: Pick<URLSearchParams, "get" | "getAll">): CatalogSearchRequest {
  const query = normalizePublicTextField(params.get("q"), "", 200);
  const filters = params
    .getAll("filter")
    .flatMap((value) => value.split("|"))
    .map((value) => normalizePublicTextField(value, "", 80))
    .filter(Boolean)
    .slice(0, 40);
  const view = normalizeTextField(params.get("view"), "", 80) || undefined;
  const collection = normalizeTextField(params.get("collection"), "", 120) || undefined;
  const intent = normalizeTextField(params.get("intent"), "", 40) || undefined;
  const sort = normalizeTextField(params.get("sort"), "", 40) || undefined;

  if (view && !isKnownSavedViewId(view)) return { error: { message: "Unknown saved view.", status: 400 } };
  if (collection && !isKnownCollectionId(collection)) return { error: { message: "Unknown collection.", status: 400 } };
  if (intent && !isKnownDiscoveryIntent(intent)) return { error: { message: "Unknown discovery intent.", status: 400 } };
  if (sort && normalizeCatalogSort(sort) !== sort) return { error: { message: "Unknown sort option.", status: 400 } };

  return {
    input: {
      query,
      filters,
      view,
      collection,
      intent,
      sort,
      limit: normalizeLimit(params.get("limit")),
      offset: normalizeOffset(params.get("offset"))
    }
  };
}
