#!/usr/bin/env python3
"""Create a Shared Drive-style staging mirror and manifest for a media batch."""

from __future__ import annotations

import argparse
import csv
import hashlib
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path


MEDIA_EXTENSIONS = {
    ".jpg": "Photo",
    ".jpeg": "Photo",
    ".png": "Photo",
    ".heic": "Photo",
    ".heif": "Photo",
    ".gif": "Photo",
    ".webp": "Photo",
    ".tif": "Photo",
    ".tiff": "Photo",
    ".arw": "Photo",
    ".mp4": "Video",
    ".mov": "Video",
    ".m4v": "Video",
    ".avi": "Video",
    ".mkv": "Video",
    ".mp3": "Audio",
    ".m4a": "Audio",
    ".wav": "Audio",
    ".aac": "Audio",
    ".aiff": "Audio",
    ".flac": "Audio",
}


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


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def derive_year(*values: str) -> str:
    for value in values:
        match = re.search(r"(?<!\d)((?:19|20)\d{2})(?!\d)", value)
        if match:
            return match.group(1)
    return "Unknown_Date"


def safe_folder(value: str) -> str:
    cleaned = value.replace("/", "-").replace(":", "-").strip()
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned or "Unknown_Album"


def media_root_folder(media_type: str) -> str:
    return {
        "Photo": "01_Photos",
        "Video": "02_Videos",
        "Audio": "03_Audio",
    }.get(media_type, "90_Source_Archives")


def hardlink_or_copy(source: Path, destination: Path, mode: str) -> tuple[str, str]:
    if destination.exists():
        if sha256(destination) == sha256(source):
            return "already_staged", ""
        return "collision", f"destination exists with different checksum: {destination}"

    destination.parent.mkdir(parents=True, exist_ok=True)
    if mode == "manifest-only":
        return "manifest_only", ""
    if mode == "copy":
        shutil.copy2(source, destination)
        return "copied", ""

    try:
        os.link(source, destination)
        return "hardlinked", ""
    except OSError as exc:
        shutil.copy2(source, destination)
        return "copied_after_hardlink_failed", str(exc)


def iter_media_files(source_dir: Path) -> list[Path]:
    files = []
    for path in source_dir.rglob("*"):
        if path.is_file() and path.suffix.lower() in MEDIA_EXTENSIONS:
            files.append(path)
    return sorted(files, key=lambda p: str(p.relative_to(source_dir)).lower())


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source_dir", type=Path)
    parser.add_argument("manifest_csv", type=Path)
    parser.add_argument("staging_root", type=Path)
    parser.add_argument("--batch-id", default="LM Photos Completion Run")
    parser.add_argument("--source-system", default="Google Photos album export")
    parser.add_argument("--source-account", default="lm.photo@tjc.org")
    parser.add_argument("--source-album", default="")
    parser.add_argument("--mode", choices=["hardlink", "copy", "manifest-only"], default="hardlink")
    args = parser.parse_args()

    if not args.source_dir.is_dir():
        print(f"FAIL: source directory not found: {args.source_dir}", file=sys.stderr)
        return 1

    run_headroom_guard("stage-batch-masters")

    source_album = args.source_album or args.source_dir.name
    source_album_safe = safe_folder(source_album)
    source_album_path = str(args.source_dir)
    files = iter_media_files(args.source_dir)
    args.manifest_csv.parent.mkdir(parents=True, exist_ok=True)

    total_bytes = 0
    staged = 0
    errors = 0
    fieldnames = [
        "import_manifest_row_id",
        "batch_id",
        "canonical_asset_id",
        "source_system",
        "source_account",
        "source_album",
        "source_album_path",
        "relative_path",
        "original_filename",
        "original_extension",
        "original_file_size_bytes",
        "checksum_sha256",
        "media_type",
        "master_drive_path",
        "stage_status",
        "stage_error",
    ]

    with args.manifest_csv.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for index, path in enumerate(files, start=1):
            relative_path = path.relative_to(args.source_dir)
            checksum = sha256(path)
            canonical_asset_id = f"tjc-{checksum[:16]}"
            year = derive_year(source_album, str(relative_path), path.name)
            extension = path.suffix.lower().lstrip(".")
            media_type = MEDIA_EXTENSIONS[path.suffix.lower()]
            drive_relative = Path("TJC Stock Media Library") / media_root_folder(media_type) / year / source_album_safe / relative_path
            destination = args.staging_root / drive_relative
            status, error = hardlink_or_copy(path, destination, args.mode)
            if status not in {"manifest_only", "collision"} and destination.exists() and sha256(destination) != checksum:
                status = "verification_failed"
                error = "staged checksum does not match source checksum"
            if status not in {"manifest_only", "collision", "verification_failed"}:
                staged += 1
            if status in {"collision", "verification_failed"}:
                errors += 1
            size_bytes = path.stat().st_size
            total_bytes += size_bytes
            writer.writerow(
                {
                    "import_manifest_row_id": f"{args.batch_id}:{index}",
                    "batch_id": args.batch_id,
                    "canonical_asset_id": canonical_asset_id,
                    "source_system": args.source_system,
                    "source_account": args.source_account,
                    "source_album": source_album,
                    "source_album_path": source_album_path,
                    "relative_path": str(relative_path),
                    "original_filename": path.name,
                    "original_extension": extension,
                    "original_file_size_bytes": size_bytes,
                    "checksum_sha256": checksum,
                    "media_type": media_type,
                    "master_drive_path": str(drive_relative),
                    "stage_status": status,
                    "stage_error": error,
                }
            )

    print(f"Manifest: {args.manifest_csv}")
    print(f"Media files: {len(files)}")
    print(f"Media bytes: {total_bytes}")
    print(f"Staged: {staged}")
    print(f"Errors: {errors}")
    return 2 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
