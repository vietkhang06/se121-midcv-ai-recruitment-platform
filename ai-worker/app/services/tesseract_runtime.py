import os
import re
import shutil
import logging
import subprocess
from pathlib import Path
from typing import Optional, Dict, Any, List, Tuple
from PIL import Image

from app.config import settings
from app.services.ocr_exceptions import (
    OcrDependencyMissingException,
    OcrLanguageMissingException,
    OcrMisconfiguredException,
    OcrTimeoutException,
    InvalidDocumentException
)

logger = logging.getLogger(__name__)


class TesseractRuntime:
    """
    Centralized runtime manager for Tesseract OCR 5.x native engine:
    - Resolves and validates tesseract executable and tessdata directory.
    - Inspects engine version and installed languages.
    - Validates required language models ('eng', 'vie').
    - Provides deterministic OCR execution with timeout, PSM control, and error mapping.
    - Supplies structured health status (READY, DISABLED, BINARY_NOT_FOUND, LANGUAGE_MISSING, MISCONFIGURED, UNHEALTHY).
    """

    def __init__(self):
        self._executable: Optional[str] = None
        self._tessdata_prefix: Optional[str] = None
        self._version: Optional[str] = None
        self._installed_languages: List[str] = []
        self._initialized: bool = False
        self._sync_runtime()

    def _sync_runtime(self) -> None:
        """Finds executable, tessdata prefix, and configures pytesseract."""
        self._executable = self._resolve_executable()
        self._tessdata_prefix = self._resolve_tessdata_prefix()

        if self._executable:
            try:
                import pytesseract
                pytesseract.pytesseract.tesseract_cmd = self._executable
            except ImportError:
                pass

        if self._tessdata_prefix:
            os.environ["TESSDATA_PREFIX"] = self._tessdata_prefix

        self._version = self._detect_version()
        self._installed_languages = self._detect_languages()
        self._initialized = True

    def _resolve_executable(self) -> Optional[str]:
        # 1. Configured TESSERACT_CMD
        if settings.TESSERACT_CMD and settings.TESSERACT_CMD.strip():
            candidate = settings.TESSERACT_CMD.strip().strip('"').strip("'")
            if os.path.isfile(candidate) and os.access(candidate, os.X_OK):
                return str(Path(candidate).resolve())
            if os.path.isfile(candidate):
                return str(Path(candidate).resolve())

        # 2. PATH resolution
        path_binary = shutil.which("tesseract")
        if path_binary:
            return str(Path(path_binary).resolve())

        # 3. Known standard paths (Windows / Linux / macOS)
        standard_candidates = [
            r"C:\Program Files\Tesseract-OCR\tesseract.exe",
            r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
            os.path.expandvars(r"%LOCALAPPDATA%\Programs\Tesseract-OCR\tesseract.exe"),
            "/usr/bin/tesseract",
            "/usr/local/bin/tesseract",
            "/opt/homebrew/bin/tesseract"
        ]
        for cand in standard_candidates:
            if cand and os.path.isfile(cand):
                return str(Path(cand).resolve())

        return None

    def _resolve_tessdata_prefix(self) -> Optional[str]:
        # 1. Configured TESSDATA_PREFIX
        if settings.TESSDATA_PREFIX and settings.TESSDATA_PREFIX.strip():
            candidate = settings.TESSDATA_PREFIX.strip().strip('"').strip("'")
            if os.path.isdir(candidate):
                return str(Path(candidate).resolve())

        # 2. Environment variable
        env_prefix = os.environ.get("TESSDATA_PREFIX", "").strip().strip('"').strip("'")
        if env_prefix and os.path.isdir(env_prefix):
            return str(Path(env_prefix).resolve())

        # 3. Known standard locations
        standard_locations = [
            os.path.expandvars(r"%LOCALAPPDATA%\Tesseract-OCR\tessdata"),
            r"C:\Program Files\Tesseract-OCR\tessdata",
            r"C:\Program Files (x86)\Tesseract-OCR\tessdata",
            "/usr/share/tesseract-ocr/5/tessdata",
            "/usr/share/tesseract-ocr/4.00/tessdata",
            "/usr/share/tessdata",
            "/usr/local/share/tessdata"
        ]
        for loc in standard_locations:
            if loc and os.path.isdir(loc):
                return str(Path(loc).resolve())

        return None

    def _detect_version(self) -> Optional[str]:
        if not self._executable:
            return None
        try:
            proc = subprocess.run(
                [self._executable, "--version"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                timeout=5,
                check=False
            )
            output = proc.stdout or proc.stderr
            match = re.search(r"tesseract\s+v?([\d\.]+)", output, re.IGNORECASE)
            if match:
                return match.group(1)
            return output.splitlines()[0].strip() if output else "unknown"
        except Exception as e:
            logger.debug(f"Failed to query Tesseract version: {e}")
            return None

    def _detect_languages(self) -> List[str]:
        if not self._executable:
            return []
        try:
            env = os.environ.copy()
            if self._tessdata_prefix:
                env["TESSDATA_PREFIX"] = self._tessdata_prefix
            proc = subprocess.run(
                [self._executable, "--list-langs"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                env=env,
                timeout=5,
                check=False
            )
            output = proc.stdout or proc.stderr
            lines = [line.strip() for line in output.splitlines() if line.strip()]
            languages = []
            for line in lines:
                if line.startswith("List of available languages") or line.startswith("Error"):
                    continue
                languages.append(line)
            return sorted(languages)
        except Exception as e:
            logger.debug(f"Failed to query Tesseract languages: {e}")
            return []

    def get_required_languages(self) -> List[str]:
        """Parses required languages from config OCR_LANGUAGES (e.g. 'vie+eng' -> ['eng', 'vie'])."""
        raw = settings.OCR_LANGUAGES or "vie+eng"
        langs = [l.strip() for l in raw.replace("+", ",").replace(";", ",").split(",") if l.strip()]
        return sorted(list(set(langs)))

    def get_health(self) -> Dict[str, Any]:
        """
        Determines standardized health status:
        - DISABLED: OCR_ENABLED is False.
        - MISCONFIGURED: Configuration parameters failed validation.
        - BINARY_NOT_FOUND: Tesseract binary cannot be located.
        - UNHEALTHY: Binary exists but fails basic execution.
        - LANGUAGE_MISSING: Missing one or more required language models (e.g. eng, vie).
        - READY: Everything verified and ready for extraction.
        """
        if not settings.OCR_ENABLED:
            return {
                "enabled": False,
                "status": "DISABLED",
                "version": None,
                "executable": None,
                "tessdata_prefix": None,
                "required_languages": self.get_required_languages(),
                "installed_languages": []
            }

        config_errors = settings.validate_ocr_settings(fail_fast=False)
        if config_errors:
            return {
                "enabled": True,
                "status": "MISCONFIGURED",
                "version": None,
                "executable": self._executable,
                "tessdata_prefix": self._tessdata_prefix,
                "required_languages": self.get_required_languages(),
                "installed_languages": self._installed_languages,
                "details": {"config_errors": config_errors}
            }

        # Refresh executable and language detection if needed
        if not self._executable:
            self._sync_runtime()

        if not self._executable or not (os.path.isfile(self._executable) or shutil.which(self._executable)):
            return {
                "enabled": True,
                "status": "BINARY_NOT_FOUND",
                "version": None,
                "executable": None,
                "tessdata_prefix": self._tessdata_prefix,
                "required_languages": self.get_required_languages(),
                "installed_languages": []
            }


        if not self._version:
            self._version = self._detect_version()
            if not self._version:
                return {
                    "enabled": True,
                    "status": "UNHEALTHY",
                    "version": None,
                    "executable": self._executable,
                    "tessdata_prefix": self._tessdata_prefix,
                    "required_languages": self.get_required_languages(),
                    "installed_languages": []
                }

        self._installed_languages = self._detect_languages()
        required = self.get_required_languages()
        missing = [l for l in required if l not in self._installed_languages]

        if missing:
            return {
                "enabled": True,
                "status": "LANGUAGE_MISSING",
                "version": self._version,
                "executable": self._executable,
                "tessdata_prefix": self._tessdata_prefix,
                "required_languages": required,
                "installed_languages": self._installed_languages,
                "missing_languages": missing
            }

        return {
            "enabled": True,
            "status": "READY",
            "version": self._version,
            "executable": self._executable,
            "tessdata_prefix": self._tessdata_prefix,
            "required_languages": required,
            "installed_languages": self._installed_languages,
            "missing_languages": []
        }

    def assert_ready(self, correlation_id: Optional[str] = None) -> None:
        """Validates that Tesseract OCR is operational or raises a domain exception."""
        health = self.get_health()
        status = health.get("status")

        if status == "DISABLED":
            raise OcrMisconfiguredException(
                message="OCR functionality is currently disabled via configuration (OCR_ENABLED=false).",
                details=health,
                correlation_id=correlation_id
            )
        if status == "MISCONFIGURED":
            raise OcrMisconfiguredException(
                message="OCR configuration is invalid.",
                details=health.get("details", {}),
                correlation_id=correlation_id
            )
        if status == "BINARY_NOT_FOUND":
            raise OcrDependencyMissingException(
                message="Tesseract-OCR engine is not installed or not found on system PATH. Please install Tesseract 5.x.",
                details={"executable": health.get("executable")},
                correlation_id=correlation_id
            )
        if status == "LANGUAGE_MISSING":
            raise OcrLanguageMissingException(
                message="AI Worker is missing required OCR language models.",
                details={
                    "required": health.get("required_languages", []),
                    "missing": health.get("missing_languages", []),
                    "installed": health.get("installed_languages", [])
                },
                correlation_id=correlation_id
            )
        if status == "UNHEALTHY":
            raise OcrDependencyMissingException(
                message="Tesseract-OCR executable was found but failed self-health check.",
                details={"executable": health.get("executable")},
                correlation_id=correlation_id
            )

    def ocr_image(
        self,
        image: Image.Image,
        psm: Optional[int] = None,
        timeout_seconds: Optional[int] = None,
        correlation_id: Optional[str] = None
    ) -> Tuple[str, Optional[float]]:
        """
        Executes Tesseract OCR on a PIL Image object.
        Returns: (extracted_text, average_confidence)
        """
        self.assert_ready(correlation_id=correlation_id)

        import pytesseract

        pytesseract.pytesseract.tesseract_cmd = self._executable
        if self._tessdata_prefix:
            os.environ["TESSDATA_PREFIX"] = self._tessdata_prefix

        # Convert to Grayscale if not already single-band
        if image.mode not in ("L", "1"):
            proc_img = image.convert("L")
        else:
            proc_img = image

        chosen_psm = psm if psm is not None else settings.OCR_PSM
        timeout = timeout_seconds if timeout_seconds is not None else settings.OCR_TIMEOUT_SECONDS
        languages = settings.OCR_LANGUAGES or "vie+eng"

        config_str = f"--psm {chosen_psm}"

        avg_conf = None
        # Step 1: Calculate word confidences
        try:
            data = pytesseract.image_to_data(
                proc_img,
                lang=languages,
                config=config_str,
                timeout=timeout,
                output_type=pytesseract.Output.DICT
            )
            confidences = [int(c) for c in data.get("conf", []) if str(c).isdigit() and int(c) >= 0]
            if confidences:
                avg_conf = round(sum(confidences) / len(confidences), 1)
        except pytesseract.TesseractNotFoundError:
            raise OcrDependencyMissingException(
                message="Tesseract-OCR executable not found or not in PATH.",
                correlation_id=correlation_id
            )
        except subprocess.TimeoutExpired:
            raise OcrTimeoutException(
                message=f"OCR word analysis timed out after {timeout} seconds.",
                correlation_id=correlation_id
            )
        except Exception as e:
            logger.debug(f"Confidence calculation skip: {e}")


        # Step 2: Extract text with PSM
        try:
            raw_text = pytesseract.image_to_string(
                proc_img,
                lang=languages,
                config=config_str,
                timeout=timeout
            )
        except subprocess.TimeoutExpired:
            raise OcrTimeoutException(
                message=f"OCR execution timed out after {timeout} seconds.",
                correlation_id=correlation_id
            )
        except pytesseract.TesseractNotFoundError:
            raise OcrDependencyMissingException(
                message="Tesseract-OCR executable not found.",
                correlation_id=correlation_id
            )
        except Exception as err:
            err_str = str(err).lower()
            if "failed loading language" in err_str or "error opening data file" in err_str:
                raise OcrLanguageMissingException(
                    message=f"Tesseract failed loading language: {err}",
                    correlation_id=correlation_id
                )
            if "timeout" in err_str:
                raise OcrTimeoutException(
                    message=f"OCR timed out: {err}",
                    correlation_id=correlation_id
                )
            # Try fallback without custom PSM
            try:
                raw_text = pytesseract.image_to_string(
                    proc_img,
                    lang=languages,
                    timeout=timeout
                )
            except Exception as fallback_err:
                raise InvalidDocumentException(
                    message=f"OCR extraction failed: {fallback_err}",
                    correlation_id=correlation_id
                )

        return raw_text.strip() if raw_text else "", avg_conf


# Singleton runtime instance
tesseract_runtime = TesseractRuntime()
