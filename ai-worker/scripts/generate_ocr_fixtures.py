import os
import sys
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont
from pypdf import PdfReader, PdfWriter

def get_font(size=24):
    candidate_paths = [
        "C:\\Windows\\Fonts\\arial.ttf",
        "C:\\Windows\\Fonts\\tahoma.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSans.ttf",
    ]
    for p in candidate_paths:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return ImageFont.load_default()

def create_image_cv(lines, width=1200, height=1500, font_size=28, line_spacing=45):
    img = Image.new("RGB", (width, height), color="white")
    draw = ImageDraw.Draw(img)
    font = get_font(font_size)
    
    y = 80
    for line in lines:
        draw.text((80, y), line, fill="black", font=font)
        y += line_spacing
    return img

def build_pdf_stream(stream_content: str) -> bytes:
    stream_bytes = stream_content.encode("latin1", errors="replace")
    pdf_content = (
        b"%PDF-1.4\n"
        b"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n"
        b"2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n"
        b"3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n"
        b"4 0 obj << /Length " + str(len(stream_bytes)).encode("latin1") + b" >> stream\n"
        + stream_bytes + b"\nendstream\nendobj\n"
        b"5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n"
        b"xref\n0 6\n"
        b"0000000000 65535 f \n"
        b"0000000009 00000 n \n"
        b"0000000058 00000 n \n"
        b"0000000115 00000 n \n"
        b"0000000244 00000 n \n"
        b"0000000350 00000 n \n"
        b"trailer << /Size 6 /Root 1 0 R >>\nstartxref\n430\n%%EOF\n"
    )
    return pdf_content

def generate_all_ocr_fixtures(out_dir: str):
    os.makedirs(out_dir, exist_ok=True)
    
    # 1. cv_english.png
    eng_lines = [
        "Johnathan Smith",
        "Senior Software Engineer",
        "Email: john.smith@techcorp.io | Phone: +1-555-0199",
        "",
        "SUMMARY",
        "Accomplished Software Engineer with over 6 years of experience.",
        "Specialized in backend distributed systems, RESTful microservices, and databases.",
        "",
        "TECHNICAL SKILLS",
        "Languages & Frameworks: Java, Python, Spring Boot, FastAPI, Node.js",
        "Databases & Cloud: PostgreSQL, Docker, Kubernetes, AWS",
        "",
        "PROFESSIONAL EXPERIENCE",
        "Lead Software Engineer - Apex Cloud Solutions (2021 - 2024)",
        "- Architected high-throughput transaction pipelines processing 1M events daily.",
        "- Engineered microservices utilizing Spring Boot and PostgreSQL with 99.99% reliability.",
        "",
        "EDUCATION",
        "State University of Technology - Bachelor of Science in Computer Science (2018)"
    ]
    img_eng = create_image_cv(eng_lines)
    img_eng.save(os.path.join(out_dir, "cv_english.png"), "PNG")
    
    # 2. cv_vietnamese.png
    vie_lines = [
        "Nguyễn Văn A",
        "Kỹ sư phần mềm cao cấp",
        "Email: nguyen.van.a@example.com | Điện thoại: 0912 345 678",
        "",
        "TỔNG QUAN NGHỀ NGHIỆP",
        "Kỹ sư phần mềm với hơn 5 năm kinh nghiệm chuyên sâu về kiến trúc ứng dụng web.",
        "Có kinh nghiệm tối ưu hóa hiệu năng cơ sở dữ liệu và xây dựng hệ thống chịu tải cao.",
        "",
        "KỸ NĂNG CHUYÊN MÔN",
        "Ngôn ngữ & Công nghệ: Java, Spring Boot, Hibernate, TypeScript",
        "Cơ sở dữ liệu: PostgreSQL, Redis, MySQL",
        "Công cụ: Docker, Git, CI/CD, Linux",
        "",
        "KINH NGHIỆM LÀM VIỆC",
        "Kỹ sư phần mềm - Công ty Cổ phần Công nghệ ABC (2020 - 2024)",
        "- Phát triển hệ thống quản lý nhân sự và tuyển dụng doanh nghiệp.",
        "- Áp dụng kiến trúc microservices với Spring Boot và PostgreSQL.",
        "",
        "HỌC VẤN",
        "Đại học Bách Khoa - Kỹ sư Công nghệ Thông tin (2019)"
    ]
    img_vie = create_image_cv(vie_lines)
    img_vie.save(os.path.join(out_dir, "cv_vietnamese.png"), "PNG")
    
    # 3. cv_bilingual.jpg
    bilingual_lines = [
        "Nguyễn Văn A",
        "Senior Software Engineer / Kỹ sư phần mềm",
        "Email: nguyen.vana.eng@example.com | Phone: +84 988 123 456",
        "",
        "PROFESSIONAL PROFILE / TỔNG QUAN",
        "Dedicated Software Engineer passionate about backend development and cloud architecture.",
        "Kỹ sư phần mềm đam mê xây dựng hệ sinh thái microservices mở rộng linh hoạt.",
        "",
        "CORE COMPETENCIES / KỸ NĂNG",
        "Core: Java, Spring Boot, Python, PostgreSQL, Docker, Kubernetes",
        "Bilingual communication in Vietnamese and English",
        "",
        "WORK HISTORY / KINH NGHIỆM LÀM VIỆC",
        "Senior Software Engineer at Global FinTech Vietnam (2021 - 2024)",
        "- Developed core banking integration APIs using Spring Boot.",
        "- Tối ưu hóa truy vấn cơ sở dữ liệu PostgreSQL cho 500.000 người dùng hàng ngày.",
        "",
        "EDUCATION / HỌC VẤN",
        "Đại học Bách Khoa - Bachelor of Computer Engineering (2020)"
    ]
    img_bi = create_image_cv(bilingual_lines)
    img_bi.save(os.path.join(out_dir, "cv_bilingual.jpg"), "JPEG", quality=95)
    
    # 4. cv_scanned.pdf (Pure Scanned PDF: image on page with NO text layer)
    scanned_pdf_path = os.path.join(out_dir, "cv_scanned.pdf")
    img_vie.save(scanned_pdf_path, "PDF", resolution=150.0)
    
    # 5. cv_text_layer.pdf (Native PDF text layer, searchable)
    text_layer_stream = (
        "BT\n/F1 12 Tf\n"
        "50 720 Td\n(Nguyen Van A) Tj\n"
        "0 -20 Td\n(Senior Software Engineer) Tj\n"
        "0 -20 Td\n(Email: nva.software@example.com | Phone: 0901 234 567) Tj\n"
        "0 -25 Td\n(SUMMARY) Tj\n"
        "0 -15 Td\n(Experienced Software Engineer specializing in backend systems and distributed data pipelines.) Tj\n"
        "0 -25 Td\n(SKILLS) Tj\n"
        "0 -15 Td\n(Java, Spring Boot, PostgreSQL, Docker, Microservices, Kubernetes) Tj\n"
        "0 -25 Td\n(EXPERIENCE) Tj\n"
        "0 -15 Td\n(Senior Software Engineer - TechVanguard Inc (2020 - 2024)) Tj\n"
        "0 -15 Td\n(Engineered distributed services using Spring Boot and PostgreSQL.) Tj\n"
        "0 -25 Td\n(EDUCATION) Tj\n"
        "0 -15 Td\n(Dai hoc Bach Khoa - Bachelor of Science in Information Technology (2019)) Tj\n"
        "ET"
    )
    text_pdf_path = os.path.join(out_dir, "cv_text_layer.pdf")
    with open(text_pdf_path, "wb") as f:
        f.write(build_pdf_stream(text_layer_stream))
    
    # 6. cv_hybrid.pdf (Page 1 has native text layer; Page 2 is scanned image with no text layer)
    # Page 2 image
    p2_img = create_image_cv([
        "Nguyễn Văn A - Trang 2 Phụ Lục",
        "Chứng chỉ & Dự án tiêu biểu:",
        "- AWS Certified Solutions Architect Associate",
        "- Dự án Hệ thống thanh toán trực tuyến",
        "Đại học Bách Khoa chứng thực tốt nghiệp xuất sắc"
    ], width=1200, height=1500, font_size=28, line_spacing=45)
    
    p2_buf = BytesIO()
    p2_img.save(p2_buf, "PDF", resolution=150.0)
    p2_buf.seek(0)
    
    writer = PdfWriter()
    # Add page 1 from text_layer
    r1 = PdfReader(text_pdf_path)
    writer.add_page(r1.pages[0])
    
    # Add page 2 from scanned image
    r2 = PdfReader(p2_buf)
    writer.add_page(r2.pages[0])
    
    hybrid_pdf_path = os.path.join(out_dir, "cv_hybrid.pdf")
    with open(hybrid_pdf_path, "wb") as f:
        writer.write(f)
    
    print(f"Generated 6 OCR fixtures in {out_dir}:")
    for f in os.listdir(out_dir):
        print(f" - {f}")

if __name__ == "__main__":
    out_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "test-fixtures", "ocr"))
    if len(sys.argv) > 1:
        out_dir = sys.argv[1]
    generate_all_ocr_fixtures(out_dir)
