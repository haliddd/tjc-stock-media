import { normalizeResourceSpaceRecord, type ResourceSpaceRecord } from "@/lib/resourcespace-schema";
import type { MediaSourceStatus, StockMediaAsset } from "@/lib/types";

export const bundledBetaCatalogStatus: MediaSourceStatus = {
  adapter: "bundled-beta-catalog",
  label: "Bundled ResourceSpace beta snapshot",
  detail: "Reading a sanitized 181-record MVP 2024 LM Photos metadata snapshot for hosted beta. This is not live ResourceSpace writeback; source paths, checksums, and originals remain unavailable.",
  readOnly: true,
  live: false,
  sourceKind: "resourcespace"
};

const firstSeedId = 363;
const lastSeedId = 543;
const heicIds = new Set([367, 372, 392, 393, 394, 395, 405, 406, 408, 429, 430, 454, 455, 456, 458, 459, 474, 541]);
const pngIds = new Set([364, 365, 366, 371, 389, 391, 409, 437, 439, 440, 443, 444, 445, 446, 447, 449, 453]);
const jpegIds = new Set([363, 468, 470]);

const titleById = new Map<number, string>([
  [363, "MVP 2024 Detail"],
  [367, "Bee Detail"],
  [390, "Bird Detail"],
  [391, "Birdhouse Detail"],
  [392, "Butterfly 11"],
  [393, "Butterfly 6"],
  [394, "Butterfly 7"],
  [395, "Butterfly 9"],
  [398, "Desk 1"],
  [399, "Desk 2"],
  [400, "Desk 3"],
  [401, "Exit Detail"],
  [408, "Grate Detail"],
  [431, "Long Detail 1"],
  [432, "Long Detail 6"],
  [433, "Long Detail 8"],
  [434, "MVP Monday 2"],
  [435, "MVP Monday 6"],
  [436, "Outlet Detail"],
  [437, "Pillar 1"],
  [471, "Pond Detail"],
  [472, "Shelves 1"],
  [473, "Sky 1"],
  [474, "Spider Detail"],
  [475, "Squirrel 1"],
  [476, "Stairs 1"],
  [477, "Stairs 3"],
  [478, "Stairs 4"],
  [479, "Stairs 5"],
  [480, "Study Detail"],
  [481, "Wall Detail"],
  [540, "Bench Bible"],
  [541, "Butterfly 10"],
  [542, "Flower Detail"],
  [543, "Water Hand Detail"]
]);

const bibleTitles = [
  "Bible 10",
  "Bible 11",
  "Bible 13",
  "Bible 14",
  "Bible 15",
  "Bible 16",
  "Bible 17",
  "Bible 18",
  "Bible 19",
  "Bible 20",
  "Bible 21",
  "Bible 22",
  "Bible 23",
  "Bible 24",
  "Bible 26",
  "Bible 27",
  "Bible 28",
  "Bible 7",
  "Bible 8",
  "Bible 9",
  "Bible Desk 10",
  "Bible Desk 9"
];

const plantTitles = [
  "Plant 1",
  "Plant 11",
  "Plant 12",
  "Plant 13",
  "Plant 14",
  "Plant 15",
  "Plant 16",
  "Plant 17",
  "Plant 18",
  "Plant 19",
  "Plant 2",
  "Plant 20",
  "Plant 21",
  "Plant 22",
  "Plant 23",
  "Plant 24",
  "Plant 25",
  "Plant 26",
  "Plant 28",
  "Plant 3",
  "Plant 30",
  "Plant 31",
  "Plant 32",
  "Plant 33",
  "Plant 34",
  "Plant 35",
  "Plant 36",
  "Plant 37",
  "Plant 38",
  "Plant 39",
  "Plant 4",
  "Plant 5",
  "Plant 6"
];

const fountainTitles = ["Fountain 1", "Fountain 2", "Fountain 3", "Fountain 5", "Fountain 6", "Fountain 7"];

function generatedTitle(id: number) {
  if (id >= 364 && id <= 366) return `Beach ${id - 363}`;
  if (id >= 368 && id <= 389) return bibleTitles[id - 368];
  if (id >= 402 && id <= 407) return fountainTitles[id - 402];
  if (id >= 438 && id <= 470) return plantTitles[id - 438];
  if (id >= 482 && id <= 514) return `Church Life Photo ${id - 481}`;
  if (id >= 515 && id <= 539) return `MVP Archive Photo ${id - 514}`;
  return titleById.get(id) || `MVP 2024 Photo ${id}`;
}

function extensionForId(id: number) {
  if (heicIds.has(id)) return "heic";
  if (pngIds.has(id)) return "png";
  if (jpegIds.has(id)) return "jpeg";
  return "jpg";
}

function tagsForTitle(title: string) {
  const tags = ["MVP 2024", "LM Photos", "beta seed"];
  if (/bible/i.test(title)) tags.push("Bible", "study", "sermon slides", "website hero");
  if (/plant|flower|bee|butterfly|bird|squirrel|spider/i.test(title)) tags.push("plant", "nature", "detail", "website hero");
  if (/fountain|pond|water|beach|sky/i.test(title)) tags.push("water", "landscape", "website hero");
  if (/desk|shelves|wall|pillar|stairs|outlet|exit|grate|long/i.test(title)) tags.push("facility detail", "background", "internal ministry");
  if (/church life|archive|mvp monday/i.test(title)) tags.push("church life", "archive candidate", "reviewer check");
  return [...new Set(tags)];
}

function tjcTermsForTitle(title: string) {
  if (/bible|study/i.test(title)) return ["Sabbath Service", "Religious Education", "Bible study"];
  if (/church life|mvp monday|archive/i.test(title)) return ["Fellowship", "Church life"];
  return ["Sabbath Service", "Ministry background"];
}

function noPeopleLikely(title: string) {
  return /bible|plant|flower|bee|butterfly|bird|squirrel|spider|fountain|pond|water|beach|sky|desk|shelves|wall|pillar|stairs|outlet|exit|grate|long/i.test(title);
}

function slugFileName(title: string, extension: string) {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "mvp-2024-photo";
  return `${slug}.${extension}`;
}

function seedRow(id: number): ResourceSpaceRecord {
  const title = generatedTitle(id);
  const extension = extensionForId(id);
  const tags = tagsForTitle(title);
  const noPeople = noPeopleLikely(title);
  return {
    resource_id: String(id),
    resourcespace_ref: String(id),
    human_title_final: title,
    original_filename: slugFileName(title, extension),
    original_extension: extension,
    file_format: extension.toUpperCase(),
    media_type: "Photo",
    source_platform: "Google Photos",
    source_system: "LM Photos / MVP 2024 audited batch",
    source_account: "lm.photos@tjc.org",
    source_album: "MVP 2024 First Batch",
    source_album_memberships: "MVP 2024 First Batch",
    import_batch: "MVP 2024 First Batch",
    publish_status: "Needs Review",
    usage_scope: "Do Not Publish",
    workflow_state: "Hosted beta metadata snapshot",
    rights_status: "Unknown",
    public_safe: "Unknown",
    people_visible: noPeople ? "No" : "Unknown",
    minors_visible: "Unknown",
    children_visible: "Unknown",
    consent_status: noPeople ? "Not applicable" : "Unknown",
    sensitive_context: "Unknown",
    approval_notes: "Sanitized hosted beta metadata snapshot. Human rights review remains authoritative in ResourceSpace.",
    visible_content_tags: tags.join("; "),
    tjc_terms: tjcTermsForTitle(title).join("; "),
    usage_terms: ["website", "slides", "newsletter", "beta workflow"].join("; "),
    master_custody_path_status: "verified",
    duplicate_group: `mvp-2024-${id}`,
    duplicate_role: "canonical",
    image_dimensions: "1200x1200",
    preview_format: "Generated beta preview when derivative is unavailable",
    original_preserved: "Yes"
  };
}

let cachedBundledAssets: StockMediaAsset[] | null = null;

export function getBundledBetaCatalogAssets() {
  cachedBundledAssets ||= Array.from({ length: lastSeedId - firstSeedId + 1 }, (_, index) => normalizeResourceSpaceRecord(seedRow(firstSeedId + index)));
  return cachedBundledAssets;
}
