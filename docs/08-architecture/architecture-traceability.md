# ARCHITECTURE TRACEABILITY MATRIX (PHASE 4 FINAL CORRECTION BASELINE)

Tài liệu này đặc tả Ma trận Truy xuất Kỹ thuật (Architecture Traceability Matrix) liên kết khép kín 100% giữa Requirement $\rightarrow$ Use Case $\rightarrow$ Domain Entity $\rightarrow$ Architecture Component $\rightarrow$ Database Table $\rightarrow$ REST API $\rightarrow$ UI Screen $\rightarrow$ Automated Test Case ID.

---

## MA TRẬN TRUY XUẤT CÁC TÍNH NĂNG VECTOR EMBEDDING, MATCHING & RANKING ENGINE (PHASE 4 FINAL CORRECTION)

| Req ID | Business Requirement | Use Case | Domain Entity | Architecture Component | DB Table | REST API Endpoint | UI Screen ID | Automated Test ID |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `REQ-EMB-01` | Sinh Vector 1536 chiều & Lưu kho Embeddings trung tâm | `UC-EMB-01` | `Embedding` | EmbeddingService | `embeddings` | Internal Engine | System | `EmbeddingServiceTest.testGenerateEmbedding_Validates1536Dimension_PersistsCentralizedStore` |
| `REQ-GATE-01` | Cổng kiểm soát Kỹ năng Bắt buộc (Required Skill Gate) | `UC-MAT-GATE` | `MatchResult` | MatchingEngineService | `match_results` | `POST /api/v1/matching/jobs/{jobId}/candidates/{candidateId}` | `15 AI Inspector` | `GoldenMatchingCasesTest.testCaseK_RequiredMissing_PreferredFull_RequiredMissingRemainsExplicitlyVisible` |
| `REQ-MAT-CORE-01`| Tính điểm Core JD-CV Score $S_{\text{core}}$ (SkillScore 80/20) | `UC-MAT-01` | `MatchResult`, `MatchFactor` | MatchingEngineService | `match_results`, `match_factors` | `POST /api/v1/matching/jobs/{jobId}/candidates/{candidateId}` | `15 AI Inspector (Tab 1)` | `GoldenMatchingCasesTest.testCaseA_BackendJava_HighCore_HighGitHub_85_15_Formula` |
| `REQ-MAT-GH-01` | Tính điểm GitHub Supporting Score $S_{\text{github}}$ (40-35-15-10) | `UC-MAT-02` | `MatchResult`, `GitHubAssessment` | GitHubScoringService | `match_results`, `github_assessments` | Internal Engine | `15 AI Inspector (Tab 2)` | `GoldenMatchingCasesTest.testCaseA_BackendJava_HighCore_HighGitHub_85_15_Formula` |
| `REQ-RANK-SAFE` | An toàn xếp hạng: Ứng viên đủ Required luôn outrank ứng viên thiếu Required | `UC-RNK-SAFE` | `MatchResult`, `Application` | CandidateRankingService | `match_results`, `applications` | `GET /api/v1/matching/jobs/{jobId}/rankings` | `14 Candidate Ranking Dashboard` | `CandidateRankingTest.testRankingSafety_CandidateWithAllRequiredOutranksCandidateMissingRequired_EvenIfPreferredIsFull` |
| `REQ-RECON-01` | Tái tạo Điểm số 100% Minh bạch từ MatchFactor Entries | `UC-MAT-04` | `MatchFactor`, `Evidence` | MatchingEngineService | `match_factors`, `evidences` | Internal Engine | `15 AI Inspector` | `ScoreReconstructionTest.testReconstructCoreScoreFromMatchFactors` |
| `REQ-MAT-SEP` | Phân biệt gắt gao các công nghệ riêng biệt (Java vs JavaScript) | `UC-MAT-05` | `JobRequirement` | RequiredSkillMatcher | `job_requirements` | Internal Engine | System | `GoldenMatchingCasesTest.testCaseD_JavaRequirement_CandidateWithJavaScriptOnly_NotMatched` |
