# 16. ĐẶC TẢ GIAO DIỆN TÍCH HỢP LẬP TRÌNH (API SPECIFICATION)

Tài liệu này đặc tả chi tiết các RESTful Web Services API của Hệ thống Tuyển dụng AI với định dạng JSON Request/Response, Status Codes, Validation và Phân quyền.

---

## 1. DANH SÁCH ENDPOINTS TỔNG QUAN

| Method | Endpoint | Mô tả | Authorization |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Đăng ký tài khoản mới | Public |
| `POST` | `/api/v1/auth/login` | Đăng nhập & Lấy JWT Tokens | Public |
| `GET` | `/api/v1/jobs` | Danh sách công việc (có phân trang/lọc) | Public |
| `GET` | `/api/v1/jobs/{id}` | Chi tiết 1 bài tuyển dụng | Public |
| `POST` | `/api/v1/jobs` | Tạo bài tuyển dụng mới | HR |
| `PUT` | `/api/v1/jobs/{id}` | Cập nhật tin tuyển dụng | HR (Owner) |
| `DELETE`| `/api/v1/jobs/{id}` | Đóng / Xóa tin tuyển dụng | HR (Owner) |
| `POST` | `/api/v1/candidates/cv` | Upload file CV (PDF/DOCX) | Candidate |
| `GET` | `/api/v1/candidates/profile` | Lấy profile cá nhân ứng viên | Candidate |
| `POST` | `/api/v1/jobs/{id}/applications` | Nộp đơn ứng tuyển cho Job | Candidate |
| `GET` | `/api/v1/jobs/{id}/applications` | Xem danh sách đơn ứng tuyển | HR (Owner) |
| `GET` | `/api/v1/applications/{id}` | Chi tiết 1 đơn ứng tuyển | HR / Candidate |
| `POST` | `/api/v1/jobs/{id}/matching` | Kích hoạt chạy/re-run AI Matching | HR (Owner) |
| `GET` | `/api/v1/jobs/{id}/ranking` | Xem Bảng xếp hạng Ứng viên Match Score | HR (Owner) |
| `GET` | `/api/v1/applications/{id}/match-result`| Xem Báo cáo Giải thích AI Matching | HR (Owner) |

---

## 2. CHI TIẾT REQUEST / RESPONSE SCHEMAS

### 2.1 POST `/api/v1/auth/register`
* **Request Body:**
```json
{
  "email": "hr.recruiter@techcorp.com",
  "password": "StrongPassword123!",
  "fullName": "Nguyen Van A",
  "role": "HR"
}
```
* **Response `201 Created`:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "userId": "d290f1ee-6c54-4b01-90e6-d701748f0851",
    "email": "hr.recruiter@techcorp.com",
    "role": "HR"
  }
}
```

### 2.2 POST `/api/v1/auth/login`
* **Request Body:**
```json
{
  "email": "hr.recruiter@techcorp.com",
  "password": "StrongPassword123!"
}
```
* **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
    "refreshToken": "d8e9f012-3456-789a-bcde-f0123456789a",
    "tokenType": "Bearer",
    "expiresIn": 3600
  }
}
```

### 2.3 GET `/api/v1/jobs/{id}/ranking`
* **Headers:** `Authorization: Bearer <HR_JWT_TOKEN>`
* **Query Params:** `minScore=70` (lọc từ 70% trở lên), `page=1`, `size=10`
* **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "jobId": "e391f1ee-6c54-4b01-90e6-d701748f0899",
    "jobTitle": "Senior Java Spring Boot Developer",
    "totalApplications": 24,
    "rankings": [
      {
        "rank": 1,
        "applicationId": "f491f1ee-6c54-4b01-90e6-d701748f0900",
        "candidateName": "Tran Van B",
        "candidateHeadline": "Backend Developer | 3 YOE",
        "matchScore": 91.50,
        "matchingCategory": "HIGH_MATCH",
        "matchingSkills": ["Java", "Spring Boot", "PostgreSQL", "REST API"],
        "missingSkills": ["AWS"],
        "experienceYears": 3,
        "appliedAt": "2026-08-30T08:30:00Z"
      }
    ]
  }
}
```

### 2.4 GET `/api/v1/applications/{id}/match-result`
* **Headers:** `Authorization: Bearer <HR_JWT_TOKEN>`
* **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "applicationId": "f491f1ee-6c54-4b01-90e6-d701748f0900",
    "overallScore": 91.50,
    "subScores": {
      "skillScore": 90.00,
      "experienceScore": 100.00,
      "educationScore": 85.00,
      "semanticScore": 92.50
    },
    "matchedSkills": ["Java", "Spring Boot", "PostgreSQL"],
    "missingSkills": ["AWS"],
    "evidences": [
      {
        "criterion": "Spring Boot & Backend Experience",
        "cvQuoteSnippet": "Developed backend microservices using Java Spring Boot for 500k active users...",
        "pageNumber": 1,
        "confidence": 0.98
      }
    ],
    "aiSummary": "Ứng viên có kỹ năng chuyên sâu về Java Spring Boot và PostgreSQL, đáp ứng vượt số năm kinh nghiệm yêu cầu. Thiếu kỹ năng Cloud AWS nhưng có thể đào tạo nhanh."
  }
}
```
