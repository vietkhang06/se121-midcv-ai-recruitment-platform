import hashlib
import json
import tempfile
import unittest
import tarfile
from pathlib import Path

from scripts import midcv_backup


class BackupManifestTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="midcv-backup-unit-")
        self.root = Path(self.temp.name)
        self.archive = self.root / "uploads.tar.gz"

    def tearDown(self):
        self.temp.cleanup()

    def write_archive(self, entries):
        with tarfile.open(self.archive, "w:gz") as tar:
            for name, payload in entries:
                info = tarfile.TarInfo(name)
                if payload is None:
                    info.type = tarfile.DIRTYPE
                    tar.addfile(info)
                elif isinstance(payload, bytes):
                    info.size = len(payload)
                    import io
                    tar.addfile(info, io.BytesIO(payload))
                else:
                    info.type = tarfile.SYMTYPE
                    info.linkname = str(payload)
                    tar.addfile(info)

    def test_manifest_hashes_regular_files(self):
        content = b"midcv-upload-content"
        self.write_archive([("./", None), ("./cv/", None), ("./cv/record.pdf", content)])
        result = midcv_backup.uploads_archive_manifest(self.archive)
        self.assertEqual({
            "cv/record.pdf": {
                "size": len(content),
                "sha256": hashlib.sha256(content).hexdigest(),
            }
        }, result)

    def test_manifest_rejects_parent_directory_traversal(self):
        self.write_archive([("../outside.txt", b"unsafe")])
        with self.assertRaises(midcv_backup.BackupError):
            midcv_backup.uploads_archive_manifest(self.archive)

    def test_manifest_rejects_absolute_paths(self):
        self.write_archive([("/etc/passwd", b"unsafe")])
        with self.assertRaises(midcv_backup.BackupError):
            midcv_backup.uploads_archive_manifest(self.archive)

    def test_manifest_rejects_symbolic_links(self):
        self.write_archive([("cv/link", "../../outside")])
        with self.assertRaises(midcv_backup.BackupError):
            midcv_backup.uploads_archive_manifest(self.archive)

    def test_verify_detects_archive_tampering(self):
        content = b"real-upload"
        self.write_archive([("cv/record.pdf", content)])
        db = self.root / "database.dump"
        db.write_bytes(b"not-a-real-pgdump-but-integrity-test")
        files = midcv_backup.uploads_archive_manifest(self.archive)
        manifest = {
            "format_version": midcv_backup.FORMAT_VERSION,
            "source_database": "midcv",
            "database_dump": {"file": db.name, "size": db.stat().st_size, "sha256": midcv_backup.sha256_file(db)},
            "uploads_archive": {"file": self.archive.name, "size": self.archive.stat().st_size,
                                 "sha256": midcv_backup.sha256_file(self.archive), "file_count": len(files), "files": files},
        }
        (self.root / midcv_backup.MANIFEST_NAME).write_text(json.dumps(manifest), encoding="utf-8")
        verified = midcv_backup.verify_backup(self.root)
        self.assertEqual("midcv", verified["source_database"])
        self.archive.write_bytes(self.archive.read_bytes() + b"tamper")
        with self.assertRaises(midcv_backup.BackupError):
            midcv_backup.verify_backup(self.root)

    def test_manifest_path_normalization_and_rejection(self):
        self.assertEqual("cv/file.pdf", midcv_backup._safe_member_name("./cv/file.pdf"))
        with self.assertRaises(midcv_backup.BackupError):
            midcv_backup._safe_member_name("cv/../../secret")
        with self.assertRaises(midcv_backup.BackupError):
            midcv_backup._safe_member_name("cv\\..\\secret")

    def test_verify_rejects_symbolic_link_artifact(self):
        self.write_archive([("cv/record.pdf", b"payload")])
        external = self.root / "outside.dump"
        external.write_bytes(b"database bytes")
        db_link = self.root / "database.dump"
        try:
            db_link.symlink_to(external)
        except (OSError, NotImplementedError):
            self.skipTest("Symbolic links are not available on this platform")
        files = midcv_backup.uploads_archive_manifest(self.archive)
        manifest = {
            "format_version": midcv_backup.FORMAT_VERSION,
            "database_dump": {"file": "database.dump", "size": external.stat().st_size,
                              "sha256": midcv_backup.sha256_file(external)},
            "uploads_archive": {"file": "uploads.tar.gz", "size": self.archive.stat().st_size,
                                "sha256": midcv_backup.sha256_file(self.archive),
                                "file_count": len(files), "files": files},
        }
        (self.root / midcv_backup.MANIFEST_NAME).write_text(json.dumps(manifest), encoding="utf-8")
        with self.assertRaises(midcv_backup.BackupError):
            midcv_backup.verify_backup(self.root)

    def test_verify_rejects_unexpected_manifest_artifact_name(self):
        self.write_archive([("cv/record.pdf", b"payload")])
        db = self.root / "database.dump"
        db.write_bytes(b"database bytes")
        files = midcv_backup.uploads_archive_manifest(self.archive)
        manifest = {
            "format_version": midcv_backup.FORMAT_VERSION,
            "database_dump": {"file": "../database.dump", "size": db.stat().st_size,
                              "sha256": midcv_backup.sha256_file(db)},
            "uploads_archive": {"file": "uploads.tar.gz", "size": self.archive.stat().st_size,
                                "sha256": midcv_backup.sha256_file(self.archive),
                                "file_count": len(files), "files": files},
        }
        (self.root / midcv_backup.MANIFEST_NAME).write_text(json.dumps(manifest), encoding="utf-8")
        with self.assertRaises(midcv_backup.BackupError):
            midcv_backup.verify_backup(self.root)


if __name__ == "__main__":
    unittest.main()
