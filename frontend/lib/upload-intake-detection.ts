import { fileRequiresAdminIntake } from "@/lib/intake-routing";

export type DetectionConfidence = "high" | "medium" | "low";

export type DetectedBatchMetadata = {
  eventName?: string;
  eventDate?: string;
  ministry?: string;
  location?: string;
  photographer?: string;
  confidence: DetectionConfidence;
  confirmationNeeded: string[];
};

export type IntakeFileLike = Pick<File, "name" | "size" | "type" | "lastModified"> & {
  webkitRelativePath?: string;
};

export type MediaInventory = {
  fileCount: number;
  photoCount: number;
  videoCount: number;
  audioCount: number;
  heicCount: number;
  totalBytes: number;
  largeMediaCount: number;
  extensions: string[];
  folderName?: string;
  originalFilenames: string[];
};

export type DuplicateHint = {
  reason: "same-filename" | "same-size" | "similar-timestamp";
  count: number;
  examples: string[];
};

const datePatterns = [
  /\b(\d{4})[-_. ](\d{1,2})[-_. ](\d{1,2})\b/,
  /\b(\d{1,2})[-_. ](\d{1,2})[-_. ](\d{4})\b/
];

const monthNames: Record<string, string> = {
  jan: "01",
  january: "01",
  feb: "02",
  february: "02",
  mar: "03",
  march: "03",
  apr: "04",
  april: "04",
  may: "05",
  jun: "06",
  june: "06",
  jul: "07",
  july: "07",
  aug: "08",
  august: "08",
  sep: "09",
  sept: "09",
  september: "09",
  oct: "10",
  october: "10",
  nov: "11",
  november: "11",
  dec: "12",
  december: "12"
};

const sourceNoise = /\b(photo|photos|folder|upload|batch|media|album|img|image|images)\b/gi;
const ministryTerms = [
  { pattern: /\b(youth|re|religious education|children)\b/i, value: "Youth / RE" },
  { pattern: /\b(choir|hymn|music)\b/i, value: "Music / Choir" },
  { pattern: /\b(internet|ministry|media)\b/i, value: "Internet Ministry" }
];

const riskRules = [
  { pattern: /\b(youth|children|child|minor|minors|teen|re\b|religious education)\b/i, flag: "Possible youth/minors" },
  { pattern: /\b(baptism|communion|holy communion|footwashing|sacrament|holy spirit)\b/i, flag: "Possible doctrine/sacrament review" },
  { pattern: /\b(choir|hymn|hymns of praise|livestream|worship audio|worship video|song|music)\b/i, flag: "Possible music/hymn rights review" },
  { pattern: /\b(testimony|pastoral|counseling|grief|healing|illness|private)\b/i, flag: "Possible pastoral sensitivity" }
];

function pad(value: string | number) {
  return String(value).padStart(2, "0");
}

function validIsoDate(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return "";
  return `${year}-${pad(month)}-${pad(day)}`;
}

function extractDate(value: string) {
  for (const pattern of datePatterns) {
    const match = value.match(pattern);
    if (!match) continue;
    if (match[1].length === 4) {
      return { date: validIsoDate(Number(match[1]), Number(match[2]), Number(match[3])), raw: match[0] };
    }
    return { date: validIsoDate(Number(match[3]), Number(match[1]), Number(match[2])), raw: match[0] };
  }

  const monthMatch = value.match(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b(?:\s+(\d{1,2}))?(?:,?\s+(\d{4}))?/i);
  if (!monthMatch) return { date: "", raw: "" };
  const year = Number(monthMatch[3] || "");
  const day = Number(monthMatch[2] || "1");
  if (!year) return { date: "", raw: monthMatch[0] };
  return { date: validIsoDate(year, Number(monthNames[monthMatch[1].toLowerCase()]), day), raw: monthMatch[0] };
}

function cleanPart(value: string) {
  return value
    .replace(sourceNoise, " ")
    .replace(/\s+/g, " ")
    .replace(/^[-_\s]+|[-_\s]+$/g, "")
    .trim();
}

function titleCase(value: string) {
  return cleanPart(value)
    .split(/\s+/)
    .map((part) => part.length <= 3 && part === part.toUpperCase() ? part : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function parseIntakeSourceName(value: string): DetectedBatchMetadata {
  const text = cleanPart(value);
  if (!text) return { confidence: "low", confirmationNeeded: ["event name", "date", "source/uploader"] };
  const extracted = extractDate(text);
  const withoutDate = cleanPart(extracted.date && extracted.raw ? text.replace(extracted.raw, " ") : text);
  const parts = withoutDate.split(/\s+-\s+|\s+–\s+|\s+\|\s+|\s+\/\s+/).map(cleanPart).filter(Boolean);
  const detected: DetectedBatchMetadata = {
    eventDate: extracted.date || undefined,
    confidence: "low",
    confirmationNeeded: []
  };

  if (parts.length >= 3) {
    detected.eventName = titleCase(parts[0]);
    detected.location = titleCase(parts[1]);
    detected.photographer = titleCase(parts.slice(2).join(" - "));
  } else if (parts.length === 2) {
    detected.eventName = titleCase(parts[0]);
    detected.photographer = titleCase(parts[1]);
  } else if (parts.length === 1) {
    const tokens = parts[0].split(/\s+/).filter(Boolean);
    if (tokens.length > 2 && detected.eventDate) {
      detected.photographer = titleCase(tokens[tokens.length - 1]);
      detected.eventName = titleCase(tokens.slice(0, -1).join(" "));
    } else {
      detected.eventName = titleCase(parts[0]);
    }
  }

  detected.ministry = ministryTerms.find((term) => term.pattern.test(text))?.value;
  if (!detected.eventName) detected.confirmationNeeded.push("event name");
  if (!detected.eventDate) detected.confirmationNeeded.push("date");
  if (!detected.photographer) detected.confirmationNeeded.push("source/uploader");

  const strongParts = Number(Boolean(detected.eventName)) + Number(Boolean(detected.eventDate)) + Number(Boolean(detected.photographer));
  detected.confidence = strongParts >= 3 && parts.length >= 3 ? "high" : strongParts >= 2 ? "medium" : "low";
  return detected;
}

function extensionFor(name: string) {
  const match = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] || "unknown";
}

function fileIsPhoto(file: Pick<IntakeFileLike, "name" | "type">) {
  const ext = extensionFor(file.name);
  return /^image\//i.test(file.type) || ["jpg", "jpeg", "png", "gif", "webp", "heic", "heif", "tif", "tiff"].includes(ext);
}

function fileIsVideo(file: Pick<IntakeFileLike, "name" | "type">) {
  return /^video\//i.test(file.type) || /\.(mov|mp4|m4v|avi|mkv)$/i.test(file.name);
}

function fileIsAudio(file: Pick<IntakeFileLike, "name" | "type">) {
  return /^audio\//i.test(file.type) || /\.(mp3|wav|m4a|aac|flac)$/i.test(file.name);
}

export function buildMediaInventory(files: IntakeFileLike[]): MediaInventory {
  const extensions = [...new Set(files.map((file) => extensionFor(file.name)))].sort();
  const firstFolder = files
    .map((file) => file.webkitRelativePath || "")
    .find((relativePath) => relativePath.includes("/"))
    ?.split("/")[0];
  return {
    fileCount: files.length,
    photoCount: files.filter(fileIsPhoto).length,
    videoCount: files.filter(fileIsVideo).length,
    audioCount: files.filter(fileIsAudio).length,
    heicCount: files.filter((file) => /\.(heic|heif)$/i.test(file.name)).length,
    totalBytes: files.reduce((sum, file) => sum + Math.max(0, file.size || 0), 0),
    largeMediaCount: files.filter(fileRequiresAdminIntake).length,
    extensions,
    folderName: firstFolder,
    originalFilenames: files.map((file) => file.name).filter(Boolean)
  };
}

export function buildRiskFlags(input: { folderName?: string; filenames?: string[]; notes?: string; tags?: string; eventName?: string; ministry?: string }) {
  const text = [input.folderName, input.eventName, input.ministry, input.notes, input.tags, ...(input.filenames || [])].filter(Boolean).join(" ");
  const flags = riskRules.filter((rule) => rule.pattern.test(text)).map((rule) => rule.flag);
  return [...new Set(flags)];
}

function groupBy<T>(items: T[], key: (item: T) => string) {
  return items.reduce<Record<string, T[]>>((groups, item) => {
    const id = key(item);
    if (!id) return groups;
    groups[id] ||= [];
    groups[id].push(item);
    return groups;
  }, {});
}

export function buildDuplicateHints(files: IntakeFileLike[]): DuplicateHint[] {
  const hints: DuplicateHint[] = [];
  const byName = Object.values(groupBy(files, (file) => file.name.toLowerCase())).filter((group) => group.length > 1);
  const bySize = Object.values(groupBy(files, (file) => file.size > 0 ? String(file.size) : "")).filter((group) => group.length > 1);
  const byTimestamp = Object.values(groupBy(files, (file) => file.lastModified ? String(Math.round(file.lastModified / 60000)) : "")).filter((group) => group.length > 1);
  if (byName.length) hints.push({ reason: "same-filename", count: byName.reduce((sum, group) => sum + group.length, 0), examples: byName.flat().slice(0, 3).map((file) => file.name) });
  if (bySize.length) hints.push({ reason: "same-size", count: bySize.reduce((sum, group) => sum + group.length, 0), examples: bySize.flat().slice(0, 3).map((file) => file.name) });
  if (byTimestamp.length) hints.push({ reason: "similar-timestamp", count: byTimestamp.reduce((sum, group) => sum + group.length, 0), examples: byTimestamp.flat().slice(0, 3).map((file) => file.name) });
  return hints;
}
