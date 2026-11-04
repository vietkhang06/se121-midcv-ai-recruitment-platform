#!/usr/bin/env python3
"""Safe PostgreSQL + uploads backup/verification/recovery for MidCV production.

Restore is deliberately non-destructive: it only creates a NEW database and a
NEW Docker volume. It never drops, truncates, or overwrites the configured source.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tarfile
import tempfile
import uuid
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath
from typing import BinaryIO, Iterable

ROOT = Path(__file__).resolve().parents[1]
MANIFEST_NAME = "midcv-backup-manifest.json"
FORMAT_VERSION = 1
RECOVERY_NAME = re.compile(r"^midcv_recovery_[a-z0-9_]{1,48}$")


class BackupError(RuntimeError):
    pass


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def sha256_stream(stream: BinaryIO) -> str:
    digest = hashlib.sha256()
    for chunk in iter(lambda: stream.read(1024 * 1024), b""):
        digest.update(chunk)
    return digest.hexdigest()


def _safe_member_name(name: str) -> str:
    # tar may prefix every path with ./; normalize it before checking traversal.
    while name.startswith("./"):
        name = name[2:]
    path = PurePosixPath(name)
    if path.is_absolute() or any(part in ("", ".", "..") for part in path.parts):
        if name in ("", "."):
            return ""
        raise BackupError(f"Unsafe path in uploads archive: {name!r}")
    if "\\" in name or "\x00" in name:
        raise BackupError(f"Unsafe path in uploads archive: {name!r}")
    return path.as_posix()


def uploads_archive_manifest(archive_path: Path) -> dict[str, dict[str, object]]:
    """Return file checksums and reject links/special files/path traversal."""
    files: dict[str, dict[str, object]] = {}
    seen: set[str] = set()
    try:
        with tarfile.open(archive_path, mode="r:gz") as archive:
            for member in archive.getmembers():
                rel = _safe_member_name(member.name)
                if not rel:
                    if member.isdir():
                        continue
                    raise BackupError("Uploads archive contains a non-directory root entry")
                if rel in seen:
                    raise BackupError(f"Duplicate path in uploads archive: {rel}")
                seen.add(rel)
                if member.isdir():
                    continue
                if not member.isfile():
                    raise BackupError(f"Links and special files are not allowed in uploads archive: {rel}")
                source = archive.extractfile(member)
                if source is None:
                    raise BackupError(f"Cannot read archived file: {rel}")
                with source:
                    digest = sha256_stream(source)
                files[rel] = {"size": int(member.size), "sha256": digest}
    except (tarfile.TarError, OSError) as exc:
        raise BackupError(f"Cannot inspect uploads archive: {exc}") from exc
    return dict(sorted(files.items()))


def load_env_values(path: Path) -> dict[str, str]:
    """Read only simple KEY=VALUE entries needed by this script; never eval shell."""
    if not path.is_file():
        raise BackupError(f"Environment file not found: {path}")
    values: dict[str, str] = {}
    for line_no, raw in enumerate(path.read_text(encoding="utf-8-sig").splitlines(), 1):
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()
        if value.startswith("'") and value.endswith("'") and len(value) >= 2:
            value = value[1:-1]
        elif value.startswith('"') and value.endswith('"') and len(value) >= 2:
            value = value[1:-1]
        if key and re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", key):
            values[key] = value
    return values


def run_checked(command: list[str], *, cwd: Path = ROOT, stdin: BinaryIO | None = None,
                stdout: BinaryIO | int | None = None, description: str) -> subprocess.CompletedProcess:
    try:
        completed = subprocess.run(command, cwd=cwd, stdin=stdin, stdout=stdout, stderr=subprocess.PIPE, check=False)
    except FileNotFoundError as exc:
        raise BackupError(f"Required executable not found: {command[0]}") from exc
    if completed.returncode != 0:
        stderr = completed.stderr.decode("utf-8", errors="replace") if completed.stderr else ""
        raise BackupError(f"{description} failed (exit {completed.returncode}). {stderr[-3000:]}")
    return completed


def docker_compose_prefix(env_file: Path, compose_file: Path) -> list[str]:
    docker = shutil.which("docker")
    if not docker:
        raise BackupError("Docker CLI is not installed or not on PATH.")
    return [docker, "compose", "--env-file", str(env_file), "-f", str(compose_file)]


def resolve_files(args: argparse.Namespace) -> tuple[Path, Path, dict[str, str]]:
    env_file = (ROOT / args.env_file).resolve()
    compose_file = (ROOT / args.compose_file).resolve()
    values = load_env_values(env_file)
    for key in ("POSTGRES_DB", "POSTGRES_VOLUME_NAME", "UPLOADS_VOLUME_NAME"):
        if not values.get(key):
            raise BackupError(f"{key} is missing or empty in {env_file}")
    return env_file, compose_file, values


def backup(args: argparse.Namespace) -> Path:
    env_file, compose_file, values = resolve_files(args)
    compose = docker_compose_prefix(env_file, compose_file)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    output_root = (ROOT / args.output_dir).resolve()
    output_root.mkdir(parents=True, exist_ok=True)
    destination = output_root / f"midcv_backup_{timestamp}"
    destination.mkdir(mode=0o700)
    db_path = destination / "database.dump"
    uploads_path = destination / "uploads.tar.gz"

    print("[1/4] Creating PostgreSQL custom-format dump...")
    with db_path.open("wb") as stream:
        run_checked(compose + ["exec", "-T", "db", "sh", "-ec",
            'pg_dump --format=custom --no-owner --no-acl -U "$POSTGRES_USER" -d "$POSTGRES_DB"'],
            stdout=stream, description="pg_dump")
    print("[2/4] Archiving persistent uploads volume...")
    with uploads_path.open("wb") as stream:
        run_checked([shutil.which("docker") or "docker", "run", "--rm", "-v",
                     f"{values['UPLOADS_VOLUME_NAME']}:/source:ro", "alpine:3.20", "sh", "-ec",
                     "cd /source && tar -czf - ."], stdout=stream,
                    description="uploads archive")
    print("[3/4] Calculating archive and per-file SHA-256...")
    file_manifest = uploads_archive_manifest(uploads_path)
    if not file_manifest:
        print("WARNING: uploads volume contains no regular files.")
    manifest = {
        "format_version": FORMAT_VERSION,
        "created_at_utc": datetime.now(timezone.utc).isoformat(),
        "source_database": values["POSTGRES_DB"],
        "source_uploads_volume": values["UPLOADS_VOLUME_NAME"],
        "database_dump": {"file": db_path.name, "size": db_path.stat().st_size, "sha256": sha256_file(db_path)},
        "uploads_archive": {"file": uploads_path.name, "size": uploads_path.stat().st_size,
                            "sha256": sha256_file(uploads_path), "file_count": len(file_manifest),
                            "files": file_manifest},
    }
    manifest_path = destination / MANIFEST_NAME
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    try:
        os.chmod(destination, 0o700)
        for item in destination.iterdir():
            os.chmod(item, 0o600)
    except OSError:
        pass
    print("[4/4] Backup created:", destination)
    print("Verify with: python scripts/midcv_backup.py --env-file .env.production verify --backup-dir", destination.relative_to(ROOT))
    return destination


def read_manifest(backup_dir: Path) -> dict[str, object]:
    manifest_path = backup_dir / MANIFEST_NAME
    if manifest_path.is_symlink() or not manifest_path.is_file():
        raise BackupError(f"Manifest not found or is an unsafe symbolic link: {manifest_path}")
    try:
        value = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as exc:
        raise BackupError(f"Invalid backup manifest: {exc}") from exc
    if value.get("format_version") != FORMAT_VERSION:
        raise BackupError(f"Unsupported manifest format version: {value.get('format_version')}")
    return value


def verify_backup(backup_dir: Path) -> dict[str, object]:
    manifest = read_manifest(backup_dir)
    db = manifest.get("database_dump", {})
    uploads = manifest.get("uploads_archive", {})
    if not isinstance(db, dict) or not isinstance(uploads, dict):
        raise BackupError("Manifest is missing database_dump/uploads_archive objects")
    if db.get("file") != "database.dump" or uploads.get("file") != "uploads.tar.gz":
        raise BackupError("Backup manifest contains unexpected artifact names")
    db_path = backup_dir / "database.dump"
    uploads_path = backup_dir / "uploads.tar.gz"
    for path in (db_path, uploads_path):
        if path.is_symlink() or not path.is_file() or path.resolve().parent != backup_dir.resolve():
            raise BackupError(f"Backup artifact is missing or has an unsafe name: {path.name}")
    if db_path.stat().st_size != int(db.get("size", -1)) or sha256_file(db_path) != db.get("sha256"):
        raise BackupError("PostgreSQL dump size/SHA-256 does not match the manifest")
    if uploads_path.stat().st_size != int(uploads.get("size", -1)) or sha256_file(uploads_path) != uploads.get("sha256"):
        raise BackupError("Uploads archive size/SHA-256 does not match the manifest")
    actual_files = uploads_archive_manifest(uploads_path)
    expected_files = uploads.get("files")
    if not isinstance(expected_files, dict) or actual_files != expected_files:
        raise BackupError("Per-file uploads checksum manifest does not match the archive")
    if len(actual_files) != int(uploads.get("file_count", -1)):
        raise BackupError("Uploads file count does not match the manifest")
    return manifest


def verify(args: argparse.Namespace) -> None:
    backup_dir = (ROOT / args.backup_dir).resolve()
    manifest = verify_backup(backup_dir)
    env_file, compose_file, _ = resolve_files(args)
    compose = docker_compose_prefix(env_file, compose_file)
    db_path = backup_dir / str(manifest["database_dump"]["file"])
    with db_path.open("rb") as stream:
        run_checked(compose + ["exec", "-T", "db", "pg_restore", "--list"],
                    stdin=stream, stdout=subprocess.DEVNULL, description="pg_restore --list")
    print("PASS: archive hashes, per-file SHA-256 and PostgreSQL dump catalog are valid.")
    print(f"Database: {manifest['source_database']} | Upload files: {manifest['uploads_archive']['file_count']}")


def restore(args: argparse.Namespace) -> None:
    backup_dir = (ROOT / args.backup_dir).resolve()
    manifest = verify_backup(backup_dir)
    env_file, compose_file, values = resolve_files(args)
    compose = docker_compose_prefix(env_file, compose_file)
    target_db = args.target_db
    target_volume = args.target_uploads_volume
    if not RECOVERY_NAME.fullmatch(target_db or "") or not RECOVERY_NAME.fullmatch(target_volume or ""):
        raise BackupError("Recovery names must start with midcv_recovery_ and contain only lowercase letters, digits, underscores.")
    if target_db == values["POSTGRES_DB"] or target_db == manifest["source_database"]:
        raise BackupError("Target database must be NEW and different from the configured source database.")
    if target_volume == values["UPLOADS_VOLUME_NAME"] or target_volume == manifest["source_uploads_volume"]:
        raise BackupError("Target uploads volume must be NEW and different from the configured source volume.")

    docker = shutil.which("docker") or "docker"
    exists = subprocess.run([docker, "volume", "inspect", target_volume], cwd=ROOT,
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)
    if exists.returncode == 0:
        raise BackupError(f"Target volume already exists; refusing to overwrite it: {target_volume}")
    db_path = backup_dir / str(manifest["database_dump"]["file"])
    uploads_path = backup_dir / str(manifest["uploads_archive"]["file"])

    print("[1/4] Creating a NEW recovery database (source database is untouched)...")
    run_checked(compose + ["exec", "-T", "db", "sh", "-ec",
        f'createdb --template=template0 -U "$POSTGRES_USER" {target_db}'], description="createdb recovery")
    print("[2/4] Restoring database dump into recovery database...")
    with db_path.open("rb") as stream:
        run_checked(compose + ["exec", "-T", "db", "sh", "-ec",
            f'pg_restore --exit-on-error --no-owner --no-acl -U "$POSTGRES_USER" -d {target_db}'],
            stdin=stream, description="pg_restore recovery")
    print("[3/4] Creating a NEW uploads volume and extracting verified files...")
    recovery_marker = str(uuid.uuid4())
    run_checked([docker, "volume", "create", "--label", f"midcv.recovery-run={recovery_marker}", target_volume],
                stdout=subprocess.DEVNULL, description="create recovery volume")
    marker_result = run_checked(
        [docker, "volume", "inspect", "--format", "{{ index .Labels \"midcv.recovery-run\" }}", target_volume],
        stdout=subprocess.PIPE, description="verify recovery volume ownership marker",
    )
    actual_marker = marker_result.stdout.decode("utf-8", errors="replace").strip()
    if actual_marker != recovery_marker:
        raise BackupError(
            f"Recovery volume {target_volume} was not created by this restore run; refusing to write into it."
        )
    with uploads_path.open("rb") as stream:
        run_checked([docker, "run", "--rm", "-i", "-v", f"{target_volume}:/restore",
                     "alpine:3.20", "sh", "-ec", "tar -xzf - -C /restore && chown -R 10001:10001 /restore"],
                    stdin=stream, description="restore uploads volume")
    print("[4/4] Re-reading the restored volume and checking each file checksum...")
    with tempfile.TemporaryDirectory(prefix="midcv-restore-check-") as temp_dir:
        restored_archive = Path(temp_dir) / "restored.tar.gz"
        with restored_archive.open("wb") as stream:
            run_checked([docker, "run", "--rm", "-v", f"{target_volume}:/source:ro", "alpine:3.20",
                         "sh", "-ec", "cd /source && tar -czf - ."], stdout=stream,
                        description="archive restored volume for checksum verification")
        restored_manifest = uploads_archive_manifest(restored_archive)
        expected = manifest["uploads_archive"]["files"]
        if restored_manifest != expected:
            raise BackupError("Restored uploads volume failed per-file SHA-256 verification")
    print("PASS: recovery artifacts created and upload checksums verified.")
    print(f"Recovery database: {target_db}")
    print(f"Recovery uploads volume: {target_volume}")
    print("The production backend has NOT been switched to these recovery targets.")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--env-file", default=".env.production", help="Compose env file (default: .env.production)")
    parser.add_argument("--compose-file", default="docker-compose.production.yml", help="Compose file")
    sub = parser.add_subparsers(dest="command", required=True)
    backup_cmd = sub.add_parser("backup", help="Create PostgreSQL + uploads backup")
    backup_cmd.add_argument("--output-dir", default="backups")
    verify_cmd = sub.add_parser("verify", help="Verify archive checksums and PostgreSQL dump catalog")
    verify_cmd.add_argument("--backup-dir", required=True)
    restore_cmd = sub.add_parser("restore", help="Restore to a NEW database and NEW uploads volume only")
    restore_cmd.add_argument("--backup-dir", required=True)
    restore_cmd.add_argument("--target-db", required=True)
    restore_cmd.add_argument("--target-uploads-volume", required=True)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        if args.command == "backup":
            backup(args)
        elif args.command == "verify":
            verify(args)
        elif args.command == "restore":
            restore(args)
        return 0
    except BackupError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
