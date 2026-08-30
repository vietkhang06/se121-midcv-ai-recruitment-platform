# ARCHITECTURE TRACEABILITY MATRIX (PHASE 2 FINAL CORRECTION HARDENED BASELINE)

Tài liệu này đặc tả Ma trận Truy xuất Kỹ thuật (Architecture Traceability Matrix) liên kết khép kín 100% giữa Requirement $\rightarrow$ Use Case $\rightarrow$ Domain Entity $\rightarrow$ Architecture Component $\rightarrow$ Database Table $\rightarrow$ REST API $\rightarrow$ UI Screen $\rightarrow$ Automated Test Case ID.

---

## MA TRẬN TRUY XUẤT CÁC TÍNH NĂNG NỀN TẢNG (PHASE 2 FINAL CORRECTION BASELINE TRACEABILITY)

| Req ID | Business Requirement | Use Case | Domain Entity | Architecture Component | DB Table | REST API Endpoint | UI Screen ID | Automated Test ID |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `REQ-AUTH-01` | Đăng ký Candidate (Prefilled Onboarding) | `UC-ONB-01` | `User`, `CandidateProfile` | AuthService | `users`, `candidate_profiles` | `POST /api/v1/auth/register/candidate` | `05 Register` | `AuthServiceTest.testRegisterCandidate_Success` |
| `REQ-AUTH-02` | Đăng ký HR & Company Verification | `UC-HR-01` | `RecruiterProfile`, `Company` | AuthService | `companies`, `recruiter_profiles` | `POST /api/v1/auth/register/recruiter` | `05 Register HR` | `AuthServiceTest.testRegisterRecruiter_Success` |
| `REQ-AUTH-03` | Đăng nhập & JWT Access/Refresh Token | `UC-AUTH-02`| `User` | JwtTokenProvider, SecurityConfig | `users` | `POST /api/v1/auth/login` | `04 Login` | `AuthServiceTest.testLogin_Success` |
| `REQ-VERIFY-01`| Đăng bài Job yêu cầu Công ty VERIFIED | `UC-JOB-02` | `Job`, `Company` | JobService | `jobs`, `companies` | `POST /api/v1/jobs/{id}/publish` | `11 Create Job` | `CompanyVerificationRuleTest.testPublishJob_PendingCompany_ThrowsException` |
| `REQ-CV-01` | Bảo vệ Quyền sở hữu CV riêng tư | `UC-CV-01` | `CV`, `CandidateProfile` | CVService | `cvs` | `GET /api/v1/candidate/cvs/{id}` | `07 CV Upload` | `CVOwnershipTest.testGetCVById_CandidateAAccessingCandidateBCV_ThrowsUnauthorizedException` |
| `REQ-CV-VER-01`| Cấu trúc Phân đoạn CVSection thuộc về CVVersion | `UC-CV-03` | `CV`, `CVVersion`, `CVSection` | CVService Domain | `cvs`, `cv_versions`, `cv_sections` | `GET /api/v1/candidate/cvs/{id}` | `07 CV Editor` | `CVVersionSectionHierarchyTest.testCVVersion_OwnsSections_CreatingVersion2DoesNotMutateVersion1` |
| `REQ-SNAP-01` | Immutable CV Snapshot Đơn ứng tuyển | `UC-APP-01` | `Application`, `ApplicationCVSnapshot` | ApplicationService | `applications`, `application_cv_snapshots` | `POST /api/v1/candidate/applications` | `03 Job Detail` | `ApplicationSnapshotVersionTest.testApplicationSnapshot_PointsToVersion1_RemainsImmutableWhenVersion2Created` |
| `REQ-STATUS-01`| Chỉ nộp đơn vào Job có trạng thái PUBLISHED | `UC-APP-02` | `Application`, `Job` | ApplicationService | `applications`, `jobs` | `POST /api/v1/candidate/applications` | `03 Job Detail` | `ApplicationUnpublishedJobRuleTest.testSubmitApplication_DraftJob_ThrowsCustomException` |
| `REQ-IND-01` | Candidate Đa ngành & Target Roles | `UC-CAN-01` | `CandidateProfile`, `CandidateTargetIndustry`, `CandidateTargetRole` | CandidateService | `candidate_target_industries`, `candidate_target_roles` | `PUT /api/v1/candidate/profile` | `06 Profile Edit` | `CandidateMultiIndustryRoleTest.testCandidate_MultiTargetIndustriesAndRoles` |
| `REQ-CV-MULTI` | Quản lý Thư viện Multi-CV riêng biệt | `UC-CV-02` | `CV`, `CVVersion` | CVService | `cvs`, `cv_versions` | `GET /api/v1/candidate/cvs` | `07 CV Library` | `CVMultiRecordTest.testCandidate_HoldsMultipleDistinctCVsWithoutCollision` |
| `REQ-GH-PERSIST`| Lưu trữ GitHub Profile, Repos, Languages, Topics | `UC-GH-01` | `GitHubProfile`, `GitHubRepository`, `GitHubRepositoryLanguage`, `GitHubRepositoryTopic`, `GitHubAssessment` | GitHub Module Domain | `github_profiles`, `github_repositories`, `github_repository_languages`, `github_repository_topics`, `github_assessments` | Read Models | `15 AI Inspector (Tab 2)` | `GitHubEntityPersistenceTest.testGitHubModel_LanguagesAndTopicsAndAssessment` |
| `REQ-MAT-PERSIST`| Lưu trữ 3-Tier Scores, MatchFactors & Evidences | `UC-MAT-01` | `MatchResult`, `MatchFactor`, `Evidence` | Matching Module Domain | `match_results`, `match_factors`, `evidences` | Read Models | `15 AI Inspector (Tab 1)` | `MatchingPersistenceTest.testMatchResult_Persists3TierScoresAndFactors` |
| `REQ-EMB-SINGLE`| Lưu trữ Vector Embedding Tập trung Duy nhất (Centralized Store) | `UC-EMB-01` | `Embedding` | Embedding Module Domain | `embeddings` | Internal Engine | System | `AuthoritativeEmbeddingStoreTest.testAuthoritativeEmbeddingStore_AllEntityEmbeddingsCentralizedInSingleTable` |
