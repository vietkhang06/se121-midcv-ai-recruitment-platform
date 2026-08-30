# SYSTEM ARCHITECTURE SPECIFICATION (REVISED)

Tài liệu này đặc tả Kiến trúc Tổng thể (System Architecture) của **AI Recruitment Platform**, mô hình C4, luồng dữ liệu 3 chỉ số điểm ($S_{\text{core}}$, $S_{\text{github}}$, $S_{\text{overall}}$) và giao diện minh chứng phía HR.

---

## 1. CONTAINER DIAGRAM VÀ LUỒNG ĐỔI SÁNH 3 ĐIỂM SỐ

```mermaid
graph TB
    subgraph Client Tier
        FE["Frontend Application<br/>[Next.js 14+ / React 19]<br/>Port 3000"]
    end
    
    subgraph Application Tier
        API["Backend Core Service<br/>[Java Spring Boot 3 Modular Monolith]<br/>Port 8080"]
        ScoringEngine["Deterministic Scoring Engine<br/>[Computes S_core, S_github, S_overall]"]
        AI_Worker["AI Parsing Service<br/>[Python FastAPI Worker]<br/>Port 8000"]
        GH_Worker["GitHub Assessment Worker<br/>[Spring Async Worker]"]
    end
    
    subgraph Data Tier
        DB[("PostgreSQL 16 + Pgvector<br/>[Stores match_results & match_factors]")]
    end
    
    FE -->|Request Candidate Ranking & Inspector| API
    API -->|Extract CV/JD Entities| AI_Worker
    API -->|Fetch Public GitHub Data| GH_Worker
    
    AI_Worker -->|Parsed Entities & Vectors| API
    GH_Worker -->|Public Repos & Activity| API
    
    API -->|Pass Raw Data| ScoringEngine
    ScoringEngine -->|Persist 3-Part Scores & Factors| DB
    DB-->>API-->|Return 3-Part Scores Payload| FE
```

---

## 2. CHUẨN TRÌNH BÀY GIAO DIỆN BÁO CÁO HR (HR SCORE BREAKDOWN UI SPECIFICATION)

Giao diện HR Candidate Detail hiển thị minh bạch 3 chỉ số điểm riêng biệt ở Header, tránh tạo ra một "điểm số bí ẩn" (Mystery Score):

```text
+---------------------------------------------------------------------------------------------------+
| CANDIDATE: TRAN VAN A | JOB: SENIOR JAVA SPRING BOOT DEVELOPER                                    |
|                                                                                                   |
| [ OVERALL MATCH SCORE: 88.6% ]                                                                    |
| ├── CORE JD-CV MATCH SCORE: 88.0%  (Weight: 85% | Status: ACTIVE)                                   |
| └── GITHUB SUPPORTING SIGNAL: 92.0% (Weight: 15% | Status: SYNCED)                                  |
+---------------------------------------------------------------------------------------------------+
| TAB 1: CORE MATCHING REPORT (JD ↔ CV)           | TAB 2: GITHUB SUPPORTING ASSESSMENT             |
| ----------------------------------------------- | ----------------------------------------------- |
| • Required Skills: Java (✓), Spring Boot (✓)    | • Repository Language Distribution:             |
| • Experience: 3 Years (Req: 2 Years - ĐẠT)     |   1. Java (45%) | 2. TypeScript (30%)          |
| • Evidence Snippet (Page 1 CV):                 | • Activity Signal: HIGH                         |
|   "Built Spring Boot microservices..."          | • Latest Observable Activity: 14 days ago       |
|                                                 | • Notable Repos: 'spring-boot-ecommerce'        |
+---------------------------------------------------------------------------------------------------+
```
