import fs from "node:fs";
import path from "node:path";
import { mapMetadataRowToAsset } from "@/lib/asset-mapper";
import { repoRoot } from "@/lib/env";
import type { MediaSourceStatus, StockMediaAsset } from "@/lib/types";

export const exportedMetadataStatus: MediaSourceStatus = {
  adapter: "exported-metadata",
  label: "ResourceSpace metadata export",
  detail: "Reading latest local ResourceSpace CSV export. UI remains read-only for approval writes until API credentials are configured.",
  readOnly: true,
  live: false,
  sourceKind: "resourcespace"
};

function parseCsv(input: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((csvRow) => csvRow.length > 1);
}

export function latestMetadataExportPath() {
  const exportDir = path.join(repoRoot(), ".runtime", "exports");
  if (!fs.existsSync(exportDir)) return null;
  const files = fs
    .readdirSync(exportDir)
    .filter((file) => /^resourcespace-metadata-\d{8}-\d{6}\.csv$/.test(file))
    .sort();
  const latest = files.at(-1);
  return latest ? path.join(exportDir, latest) : null;
}

export async function getAssetsFromExport(): Promise<StockMediaAsset[] | null> {
  const csvPath = latestMetadataExportPath();
  if (!csvPath) return null;

  const csv = fs.readFileSync(csvPath, "utf8");
  const rows = parseCsv(csv);
  const [header, ...data] = rows;
  if (!header?.includes("resource_id")) return null;

  return data
    .map((row) =>
      Object.fromEntries(header.map((key, index) => [key, row[index] || ""])) as Record<string, string>
    )
    .filter((row) => row.resource_id || row.resourcespace_ref)
    .map(mapMetadataRowToAsset);
}
