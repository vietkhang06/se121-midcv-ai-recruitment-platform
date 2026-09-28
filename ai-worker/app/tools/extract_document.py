import sys
import os
import argparse
import json
from pathlib import Path

# Ensure app package is accessible
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from app.services.document_extraction_service import DocumentExtractionService


def main():
    parser = argparse.ArgumentParser(description="Extract raw text and metadata from CV document using local libraries.")
    parser.add_argument("--file", "-f", required=True, help="Path to CV document (PDF, DOCX, PNG, JPG, etc.)")
    parser.add_argument("--save", "-s", action="store_true", help="Save extracted raw text to test-output/extracted/")
    parser.add_argument("--output-dir", "-o", default=None, help="Custom directory to save raw text")

    args = parser.parse_args()
    file_path = os.path.abspath(args.file)

    if not os.path.exists(file_path):
        error_output = {
            "success": False,
            "error": f"File does not exist: {file_path}"
        }
        print(json.dumps(error_output, indent=2))
        sys.exit(1)

    service = DocumentExtractionService()
    result = service.extract_from_file_path(file_path)

    if not result.success:
        error_output = {
            "success": False,
            "error_code": result.error_code,
            "error_message": result.error_message,
            "document": result.document.model_dump()
        }
        print(json.dumps(error_output, indent=2))
        sys.exit(1)

    # If requested to save output
    if args.save or args.output_dir:
        base_dir = Path(__file__).resolve().parent.parent.parent
        out_dir = Path(args.output_dir) if args.output_dir else (base_dir / "test-output" / "extracted")
        out_dir.mkdir(parents=True, exist_ok=True)
        stem = Path(file_path).stem
        out_file = out_dir / f"{stem}.txt"
        with open(out_file, "w", encoding="utf-8") as f:
            f.write(result.rawText)

    # Print metadata JSON to stdout
    print(json.dumps(result.document.model_dump(), indent=2))
    sys.exit(0)


if __name__ == "__main__":
    main()
