import { safePathSlugText } from "@/lib/persisted-record-safety";
import type { DamFilenameDateSource, DamGeneratedFilenames, DamRendition, StockMediaAsset } from "@/lib/types";

type DamFilenameInput = Pick<
  StockMediaAsset,
  | "capturedDate"
  | "eventDate"
  | "fileModifiedDate"
  | "importDate"
  | "eventName"
  | "collection"
  | "sourceAlbum"
  | "importBatch"
  | "title"
  | "id"
  | "resourceSpaceId"
  | "originalFilename"
  | "damFilenames"
  | "fileExtension"
  | "mediaType"
>;

type DateCandidate = {
  source: DamFilenameDateSource;
  value?: string;
};

const renditionOrder: DamRendition[] = ["orig", "web", "social", "thumb", "print"];
const genericCollectionPattern = /^(resource(space)? export|media library|media archive|unknown|needs review|not provided|n\/a)$/i;

function normalizeDatePart(value?: string) {
  const text = String(value || "").trim();
  if (!text) return "";
  const compact = text.match(/\b(\d{4})(\d{2})(\d{2})\b/);
  if (compact) return `${compact[1]}${compact[2]}${compact[3]}`;
  const separated = text.match(/\b(\d{4})[-:/](\d{2})[-:/](\d{2})\b/);
  if (separated) return `${separated[1]}${separated[2]}${separated[3]}`;
  const parsed = Date.parse(text);
  if (Number.isNaN(parsed)) return "";
  return new Date(parsed).toISOString().slice(0, 10).replace(/-/g, "");
}

function bestDatePart(input: DamFilenameInput) {
  const candidates: DateCandidate[] = [
    { source: "captured_date", value: input.capturedDate },
    { source: "event_date", value: input.eventDate },
    { source: "file_modified_date", value: input.fileModifiedDate },
    { source: "import_date", value: input.importDate }
  ];
  for (const candidate of candidates) {
    const datePart = normalizeDatePart(candidate.value);
    if (datePart) return { datePart, dateSource: candidate.source };
  }
  return { datePart: "undated", dateSource: "undated" as const };
}

function meaningfulCollection(value?: string) {
  const text = String(value || "").trim();
  if (!text || genericCollectionPattern.test(text)) return "";
  return text;
}

function collectionSlugForAsset(input: DamFilenameInput) {
  const label =
    meaningfulCollection(input.eventName) ||
    meaningfulCollection(input.collection) ||
    meaningfulCollection(input.sourceAlbum) ||
    meaningfulCollection(input.importBatch) ||
    "needs-triage";
  return safePathSlugText(label, 64) || "needs-triage";
}

function extensionFromFilename(value?: string) {
  const match = String(value || "").trim().match(/\.([a-z0-9]{2,5})$/i);
  return match?.[1]?.toLowerCase() || "";
}

function originalExtension(input: DamFilenameInput) {
  const extension = String(input.fileExtension || "").replace(/^\./, "").trim().toLowerCase() || extensionFromFilename(input.originalFilename);
  return safePathSlugText(extension, 8) || (input.mediaType === "photo" ? "jpg" : "bin");
}

function derivativeExtension(input: DamFilenameInput) {
  if (input.mediaType === "photo") return "jpg";
  return originalExtension(input);
}

function permanentSequence(input: DamFilenameInput) {
  const idText = String(input.resourceSpaceId || input.id || "").trim();
  const numeric = idText.match(/\d+/g)?.at(-1);
  if (numeric) return numeric.slice(-6).padStart(6, "0");
  const slug = safePathSlugText(idText, 24);
  return slug || "000001";
}

function subjectSlugForAsset(input: DamFilenameInput) {
  const title = String(input.title || "").trim();
  const original = String(input.originalFilename || "").replace(/\.[a-z0-9]{2,5}$/i, "");
  const candidate = title && !/^resource \w+$/i.test(title) ? title : original;
  return safePathSlugText(candidate, 72);
}

function filename(baseName: string, rendition: DamRendition, extension: string) {
  return `${baseName}-${rendition}.${extension}`;
}

export function buildDamFilenames(input: DamFilenameInput, options: { includeSubject?: boolean } = {}): DamGeneratedFilenames {
  const { datePart, dateSource } = bestDatePart(input);
  const collectionSlug = collectionSlugForAsset(input);
  const sequence = permanentSequence(input);
  const subjectSlug = options.includeSubject ? subjectSlugForAsset(input) : "";
  const baseName = [datePart, collectionSlug, subjectSlug, sequence].filter(Boolean).join("-");
  const originalExt = originalExtension(input);
  const derivativeExt = derivativeExtension(input);
  const names = Object.fromEntries(
    renditionOrder.map((rendition) => [
      rendition,
      filename(baseName, rendition, rendition === "orig" ? originalExt : derivativeExt)
    ])
  ) as Record<DamRendition, string>;

  return {
    baseName,
    original: names.orig,
    web: names.web,
    social: names.social,
    thumb: names.thumb,
    print: names.print,
    datePart,
    dateSource,
    collectionSlug,
    sequence,
    originalExtension: originalExt,
    derivativeExtension: derivativeExt,
    ...(subjectSlug ? { subjectSlug } : {})
  };
}

export function damFilenameForRendition(asset: DamFilenameInput, rendition: DamRendition) {
  const names = asset.damFilenames || buildDamFilenames(asset);
  return names[rendition === "orig" ? "original" : rendition];
}
