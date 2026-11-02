"""Generate synthetic fixtures from declared source text, independently of extraction outputs."""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from generate_synthetic_fixtures import build_pdf_stream


def main():
    destination = Path(__file__).resolve().parents[2] / "test-fixtures" / "labelled-ocr"
    destination.mkdir(parents=True, exist_ok=True)
    font_path = Path("C:/Windows/Fonts/arial.ttf")
    if not font_path.exists():
        font_path = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")
    font = ImageFont.truetype(str(font_path), 30)
    en = "SYNTHETIC CV - ALEX SAMPLE\nSoftware developer and test engineer\nEmail: alex.sample@example.com\nSkills: Python, Docker, PostgreSQL\nExperience: Example Lab, 2021-2024\nBuilt an API with automated tests.\nEducation: Example Institute, Bachelor 2021"
    vi = "HỒ SƠ GIẢ LẬP - NGUYỄN AN\nKỹ sư phần mềm và kiểm thử\nEmail: nguyen.an@example.com\nKỹ năng: Java, Spring Boot, PostgreSQL\nKinh nghiệm: Công ty Ví Dụ, 2021-2024\nXây dựng hệ thống quản lý có kiểm thử.\nHọc vấn: Trường Giả Lập, Cử nhân 2021"
    samples = []
    for sample_id, text, kind, degraded in [
        ("en-image", en, "PNG", False), ("vi-image", vi, "PNG", False),
        ("bilingual-scan", en + "\n" + vi, "PDF", False), ("vi-blurred", vi, "PNG", True),
    ]:
        image = Image.new("RGB", (1500, 1250), "white")
        ImageDraw.Draw(image).multiline_text((65, 70), text, font=font, fill="black", spacing=15)
        if degraded:
            image = image.rotate(0.8, fillcolor="white").filter(ImageFilter.GaussianBlur(0.7))
        file = f"{sample_id}.{'pdf' if kind == 'PDF' else 'png'}"
        image.save(destination / file, resolution=150)
        samples.append({"id": sample_id, "file": file, "file_type": kind, "ground_truth": text,
                        "label_source": "Literal rendering input in generate_labelled_ocr_benchmark.py", "degraded": degraded})
    lines = en.splitlines()
    stream = "BT /F1 12 Tf 50 740 Td " + " ".join(
        ("0 -18 Td " if index else "") + "(" + line.replace("(", "\\(").replace(")", "\\)") + ") Tj"
        for index, line in enumerate(lines)) + " ET"
    (destination / "en-native.pdf").write_bytes(build_pdf_stream(stream))
    samples.append({"id": "en-native", "file": "en-native.pdf", "file_type": "PDF", "ground_truth": en,
                    "label_source": "Literal PDF drawing input; not extracted text"})
    manifest = {"version": "1.0", "provenance": "Synthetic fixtures authored for Gia Khang O03 on 2026-11-01; no real CV or expert-labelled accuracy claim.",
                "font": font_path.name, "samples": samples}
    (destination / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
