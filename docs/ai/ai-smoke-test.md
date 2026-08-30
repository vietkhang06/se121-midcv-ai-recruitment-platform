# REAL LLM & GITHUB API SMOKE TEST GUIDE

Tài liệu này hướng dẫn chi tiết cách chạy Kịch bản Kiểm thử Khói Thực tế (Manual Smoke Test) với OpenAI API và GitHub REST API.

---

## 1. PHÂN BIỆT RÕ RÀNG (MOCK TEST VS REAL SMOKE TEST)

* **AUTOMATED MOCK TEST:** Bộ kiểm thử tự động offline (`pytest` và `mvn test`) sử dụng dữ liệu Mock deterministic để phục vụ CI/CD ổn định, không phụ thuộc mạng hay tốn chi phí API keys.
* **REAL LLM & GITHUB SMOKE TEST:** Các script kiểm thử khói thủ công chạy trực tiếp với OpenAI API và GitHub API thực tế nhằm kiểm chứng kết nối thật và định dạng dữ liệu live. *(Tuyệt đối không cam kết chứng minh độ chính xác 100% cho môi trường Production).*

---

## 2. HƯỚNG DẪN CHẠY SMOKE TEST THỰC TẾ

### A. Real LLM Smoke Test (OpenAI GPT-4o-mini)
```powershell
# Thiết lập OpenAI API Key trong biến môi trường
$env:OPENAI_API_KEY="sk-proj-your-actual-api-key"

# Chạy script kiểm thử khói LLM thực tế
python ai-worker/scripts/real_llm_smoke_test.py
```

### B. Real GitHub API Smoke Test
```powershell
# Chạy script kiểm thử khói REST API GitHub thực tế
python ai-worker/scripts/github_api_smoke_test.py
```
