FROM python:3.11-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive

WORKDIR /app

# Install native dependencies: Tesseract OCR with English and Vietnamese traineddata, and system libs for Pillow / PyMuPDF
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    tesseract-ocr \
    tesseract-ocr-eng \
    tesseract-ocr-vie \
    libreoffice-writer \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Verify tesseract executable and bilingual language data during build
RUN tesseract --version && tesseract --list-langs

# Copy requirements and install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy worker application
COPY . .

EXPOSE 8000

# The health endpoint always returns HTTP 200 so orchestrators must inspect the JSON readiness state.
HEALTHCHECK --interval=30s --timeout=8s --start-period=60s --retries=5 \
    CMD python -c "import json,urllib.request,sys; data=json.load(urllib.request.urlopen('http://127.0.0.1:8000/internal/ai/health', timeout=5)); sys.exit(0 if data.get('status') == 'UP' else 1)"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
