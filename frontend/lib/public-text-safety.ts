import { containsPrivateSourceText } from "@/lib/private-source-text";

const operationalTextPattern =
  /ResourceSpace|Shared Drive|pending writes?|API mapping|launch gate|diagnostics?|metadata health|raw totals?|source[- ]of[- ]truth|field refs?|source path|master drive|master\/original path|master files?|original filename|checksum|raw ResourceSpace|ResourceSpace ID|\bRS\s+\d+\b/i;
const scaffoldTextPattern = /\b(MVP 2024|stock media candidate|prototype|demo role|hosted beta fixture|hosted pagination fixture|hosted beta pagination|API smoke|qa\.fixture|qa\.blocker|fixture fallback)\b/i;

export function containsOperationalText(value?: string) {
  return Boolean(value && (operationalTextPattern.test(value) || containsPrivateSourceText(value)));
}

export function containsScaffoldText(value?: string) {
  return Boolean(value && scaffoldTextPattern.test(value));
}

export function safePublicList(values?: string[]) {
  return (values || []).filter((value) => value && !containsOperationalText(value) && !containsScaffoldText(value));
}
