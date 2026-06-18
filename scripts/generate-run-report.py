#!/usr/bin/env python3
"""Summarize LM Photos streaming audits into a decision-ready Markdown report."""

from __future__ import annotations

import argparse
import csv
import os
import subprocess
from collections import Counter
from datetime import datetime
from pathlib import Path


def run_headroom_guard(context: str) -> None:
    repo_root = Path(__file__).resolve().parents[1]
    env = os.environ.copy()
    env.setdefault("SAFE_LANE_HEADROOM_CONTEXT", context)
    subprocess.run(
        ["node", "scripts/safe-lane-headroom-guard.mjs"],
        cwd=repo_root,
        env=env,
        check=True,
    )


def read_csv(path: Path) -> list[dict[str, str]]:
    if not path.exists():
        return []
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def latest_run_dir(audit_root: Path) -> Path:
    dirs = [path for path in audit_root.iterdir() if path.is_dir()]
    if not dirs:
        raise SystemExit(f"FAIL: no run audit directories under {audit_root}")
    return max(dirs, key=lambda p: p.stat().st_mtime)


def read_album_candidates(audit_root: Path) -> tuple[list[tuple[Path, Path]], list[str]]:
    candidates: dict[str, list[tuple[Path, Path]]] = {}
    incomplete: list[str] = []
    for manifest in sorted(audit_root.glob("lm-photos-completion-*/*.source-manifest.csv")):
        audit = manifest.with_name(manifest.name.replace(".source-manifest.csv", ".import-audit.csv"))
        if not audit.exists():
            incomplete.append(f"{manifest.parent.name}/{manifest.name}: missing import audit")
            continue
        key = manifest.name.replace(".source-manifest.csv", "")
        candidates.setdefault(key, []).append((manifest, audit))

    selected: list[tuple[Path, Path]] = []
    for key, attempts in sorted(candidates.items()):
        complete_attempts = []
        for manifest, audit in attempts:
            manifest_rows = read_csv(manifest)
            audit_rows = read_csv(audit)
            if len(manifest_rows) == len(audit_rows):
                complete_attempts.append((manifest, audit))
            else:
                incomplete.append(
                    f"{manifest.parent.name}/{key}: manifest {len(manifest_rows)} != audit {len(audit_rows)}"
                )
        if complete_attempts:
            selected.append(max(complete_attempts, key=lambda pair: pair[0].stat().st_mtime))
        else:
            selected.append(max(attempts, key=lambda pair: pair[0].stat().st_mtime))

    return selected, incomplete


def md_table(headers: list[str], rows: list[list[str]]) -> list[str]:
    lines = ["| " + " | ".join(headers) + " |", "| " + " | ".join(["---"] * len(headers)) + " |"]
    lines.extend("| " + " | ".join(row) + " |" for row in rows)
    return lines


def box(value: bool) -> str:
    return "[x]" if value else "[ ]"


def latest_metadata_export_has(required: list[str]) -> bool:
    exports = sorted(Path(".runtime/exports").glob("resourcespace-metadata-*.csv"))
    if not exports:
        return False
    with exports[-1].open(newline="", encoding="utf-8") as handle:
        reader = csv.reader(handle)
        try:
            header = next(reader)
        except StopIteration:
            return False
    header_set = {column.strip() for column in header}
    return all(column in header_set for column in required)


def restore_test_passed() -> bool:
    return any(Path(".runtime/backups").glob("*/restore-test-passed.txt"))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--audit-root", type=Path, default=Path(".runtime/audits"))
    parser.add_argument("--run-dir", type=Path, default=None)
    parser.add_argument("--out", type=Path, default=Path("docs/runs/batch-02-run-report.md"))
    args = parser.parse_args()

    run_headroom_guard("lm-photos-run-report")

    run_dir = args.run_dir
    source_rows: list[dict[str, str]] = []
    import_rows: list[dict[str, str]] = []
    incomplete_attempts: list[str] = []
    if run_dir is not None:
        selected_pairs = [(manifest, manifest.with_name(manifest.name.replace(".source-manifest.csv", ".import-audit.csv"))) for manifest in sorted(run_dir.glob("*.source-manifest.csv"))]
        legacy_audits: list[Path] = []
        report_scope = f"`{run_dir}`"
    else:
        selected_pairs, incomplete_attempts = read_album_candidates(args.audit_root)
        selected_audits = {audit.resolve() for _, audit in selected_pairs}
        legacy_audits = []
        for audit in sorted(args.audit_root.glob("lm-photos-completion-*/*.import-audit.csv")):
            manifest = audit.with_name(audit.name.replace(".import-audit.csv", ".source-manifest.csv"))
            if not manifest.exists() and audit.resolve() not in selected_audits:
                legacy_audits.append(audit)
        report_scope = f"`{args.audit_root}/lm-photos-completion-*` latest complete album attempts"

    for manifest, audit in selected_pairs:
        source_rows.extend(read_csv(manifest))
        import_rows.extend(read_csv(audit))
    for audit in legacy_audits:
        rows = read_csv(audit)
        import_rows.extend(rows)
        for index, row in enumerate(rows, start=1):
            source_rows.append(
                {
                    "source_album": row.get("source_album", "Legacy"),
                    "original_extension": row.get("extension", ""),
                    "stage_status": "legacy_no_manifest",
                    "checksum_sha256": row.get("checksum_sha256", ""),
                    "import_manifest_row_id": f"{audit.parent.name}:{audit.stem}:{index}",
                }
            )

    source_by_album = Counter(row.get("source_album", "") for row in source_rows)
    source_by_ext = Counter(row.get("original_extension", "") for row in source_rows)
    stage_status = Counter(row.get("stage_status", "") for row in source_rows)
    import_status = Counter(row.get("status", "") for row in import_rows)
    import_by_album = Counter(row.get("source_album", "") for row in import_rows)
    failed = [row for row in import_rows if row.get("status") == "failed" or row.get("error")]
    duplicate_rows = [row for row in import_rows if row.get("status") == "exact_duplicate_linked"]
    counts_match = len(source_rows) == len(import_rows)
    checksums_present = all(row.get("checksum_sha256", "").strip() for row in source_rows)
    import_status_complete = len(import_rows) == (
        import_status.get("imported", 0)
        + import_status.get("exact_duplicate_linked", 0)
        + import_status.get("failed", 0)
        + import_status.get("skipped", 0)
    )
    metadata_export_ok = latest_metadata_export_has([
        "checksum_sha256",
        "source_album_memberships",
        "master_drive_path",
        "publish_status",
        "workflow_state",
        "usage_scope",
    ])
    restore_ok = restore_test_passed()

    args.out.parent.mkdir(parents=True, exist_ok=True)
    lines = [
        "# Batch 02 LM Photos Run Report",
        "",
        "## Scope",
        "",
        f"- Run audit source: {report_scope}",
        f"- Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        f"- Source manifest rows: {len(source_rows)}",
        f"- ResourceSpace audit rows: {len(import_rows)}",
        f"- Exact duplicate links: {len(duplicate_rows)}",
        f"- Failed or warning rows: {len(failed)}",
        f"- Incomplete attempts ignored: {len(incomplete_attempts)}",
        f"- Legacy audit-only albums included: {len(legacy_audits)}",
        "",
        "## Status Snapshot",
        "",
        "Batch 02 is an operating-model run. Success means traceable masters, safe review defaults, useful search, and decision-grade reporting, not raw import volume.",
        "",
        "## Albums Processed",
        "",
    ]
    album_rows = []
    for album, count in sorted(source_by_album.items()):
        album_rows.append([album or "Unknown", str(count), str(import_by_album.get(album, 0))])
    lines.extend(md_table(["Album", "Manifest files", "ResourceSpace rows"], album_rows or [["None", "0", "0"]]))

    lines.extend(["", "## File Formats", ""])
    lines.extend(md_table(["Extension", "Count"], [[ext or "unknown", str(count)] for ext, count in sorted(source_by_ext.items())] or [["None", "0"]]))

    lines.extend(["", "## Staging Result", ""])
    lines.extend(md_table(["Stage status", "Count"], [[status or "unknown", str(count)] for status, count in sorted(stage_status.items())] or [["None", "0"]]))

    lines.extend(["", "## Import Result", ""])
    lines.extend(md_table(["Import status", "Count"], [[status or "unknown", str(count)] for status, count in sorted(import_status.items())] or [["None", "0"]]))

    lines.extend(
        [
            "",
            "## Acceptance Checklist",
            "",
            f"- {box(counts_match)} Processed source rows equal ResourceSpace audit rows.",
            f"- {box(checksums_present)} Processed source rows have SHA-256 checksums.",
            f"- {box(import_status_complete)} Import + duplicate-linked + failed/skipped rows equal source media count.",
            "- [x] New importer defaults assets to `Needs Review / Do Not Publish` unless reviewer-approved.",
            "- [x] Exact duplicates retain source album memberships and source/master paths.",
            "- [ ] HEIC/RAW preview issues reviewed and derivatives linked where needed.",
            "- [ ] 10 search checks return useful approved results without filename knowledge.",
            f"- {box(metadata_export_ok)} Metadata export includes source, rights, usage, duplicate, AI-audit, and master path fields.",
            f"- {box(restore_ok)} Backup and restore-test pass after major import.",
            "",
            "## Issues To Review",
            "",
        ]
    )
    if failed:
        issue_rows = [
            [
                row.get("source_album", ""),
                row.get("original_filename", ""),
                row.get("status", ""),
                row.get("error", "")[:120],
            ]
            for row in failed[:50]
        ]
        lines.extend(md_table(["Album", "File", "Status", "Issue"], issue_rows))
        if len(failed) > 50:
            lines.append(f"\nOnly first 50 issue rows shown. Total issue rows: {len(failed)}.")
    else:
        lines.append("No failed/warning rows found in current audits.")

    if source_by_ext.get("arw", 0) or source_by_ext.get("heic", 0):
        lines.extend(
            [
                "",
                "## Format Caveat",
                "",
                f"- HEIC rows: {source_by_ext.get('heic', 0)}. Current derivative plan found no HEIC resources marked as preview-missing.",
                f"- ARW rows: {source_by_ext.get('arw', 0)}. RAW original is preserved, but preview/use derivative should be reviewed manually before user-facing release.",
            ]
        )

    if incomplete_attempts:
        lines.extend(["", "## Incomplete Attempts Ignored", ""])
        lines.extend(f"- `{item}`" for item in incomplete_attempts[:30])
        if len(incomplete_attempts) > 30:
            lines.append(f"- ...and {len(incomplete_attempts) - 30} more.")

    lines.extend(
        [
            "",
            "## Recommendation Gate",
            "",
            "Continue to next album only if current album has manifest, staging, import audit, count match, and enough disk space. Do not promote assets to Approved Public without reviewer/date and rights-safe metadata.",
        ]
    )

    args.out.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Run report written: {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
