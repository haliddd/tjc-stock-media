#!/usr/bin/env python3
import argparse
import csv
import json
import os
import subprocess
import sys
import zipfile
from collections import Counter
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


def extension_for(name: str) -> str:
    suffix = Path(name).suffix.lower().lstrip(".")
    return suffix or "[no_ext]"


def album_name_from_zip(path: Path) -> str:
    name = path.stem
    for suffix in ("-3-001",):
        if name.endswith(suffix):
            return name[: -len(suffix)]
    return name


def inspect_zip(path: Path) -> dict:
    album_name = album_name_from_zip(path)
    file_count = 0
    uncompressed_bytes = 0
    compressed_bytes = path.stat().st_size
    extensions: Counter[str] = Counter()
    roots: Counter[str] = Counter()
    largest_file = ""
    largest_size = 0

    with zipfile.ZipFile(path) as zf:
        for info in zf.infolist():
            if info.is_dir():
                continue
            file_count += 1
            uncompressed_bytes += info.file_size
            extensions[extension_for(info.filename)] += 1
            root = info.filename.split("/", 1)[0] if "/" in info.filename else ""
            roots[root or "[root]"] += 1
            if info.file_size > largest_size:
                largest_size = info.file_size
                largest_file = info.filename

    return {
        "zip_name": path.name,
        "album_name": album_name,
        "zip_size_bytes": compressed_bytes,
        "uncompressed_bytes": uncompressed_bytes,
        "file_count": file_count,
        "roots": json.dumps(dict(sorted(roots.items())), ensure_ascii=False),
        "extensions": json.dumps(dict(sorted(extensions.items())), ensure_ascii=False),
        "largest_file": largest_file,
        "largest_file_bytes": largest_size,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Inventory LM Photos Google Photos album ZIP files.")
    parser.add_argument("zip_dir", type=Path)
    parser.add_argument("output_csv", type=Path)
    args = parser.parse_args()

    if not args.zip_dir.is_dir():
        print(f"FAIL: ZIP directory not found: {args.zip_dir}", file=sys.stderr)
        return 1

    run_headroom_guard("lm-photos-zip-inventory")

    rows = []
    for path in sorted(args.zip_dir.glob("*.zip"), key=lambda p: (p.name == "Open Album-3-001.zip", p.name.lower())):
        rows.append(inspect_zip(path))

    args.output_csv.parent.mkdir(parents=True, exist_ok=True)
    with args.output_csv.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "zip_name",
                "album_name",
                "zip_size_bytes",
                "uncompressed_bytes",
                "file_count",
                "roots",
                "extensions",
                "largest_file",
                "largest_file_bytes",
            ],
        )
        writer.writeheader()
        writer.writerows(rows)

    total_files = sum(row["file_count"] for row in rows)
    total_zip_bytes = sum(row["zip_size_bytes"] for row in rows)
    total_uncompressed = sum(row["uncompressed_bytes"] for row in rows)
    print(f"ZIPs: {len(rows)}")
    print(f"Files: {total_files}")
    print(f"ZIP bytes: {total_zip_bytes}")
    print(f"Uncompressed bytes: {total_uncompressed}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
