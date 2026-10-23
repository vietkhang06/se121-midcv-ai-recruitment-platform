package com.platform.recruitment.ai;

import com.platform.recruitment.candidate.CandidateProfile;
import com.platform.recruitment.candidate.CandidateProfileRepository;
import com.platform.recruitment.common.ResourceNotFoundException;
import com.platform.recruitment.cv.CV;
import com.platform.recruitment.cv.CVRepository;
import com.platform.recruitment.cv.CVSection;
import com.platform.recruitment.cv.CVSectionRepository;
import com.platform.recruitment.cv.CVVersion;
import com.platform.recruitment.cv.CVVersionRepository;
import com.platform.recruitment.github.*;
import com.platform.recruitment.job.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProcessingLifecycleService {

    private final AiWorkerClient aiWorkerClient;
    private final JobRepository jobRepository;
    private final JobRequirementRepository jobRequirementRepository;
    private final CVRepository cvRepository;
    private final CVVersionRepository cvVersionRepository;
    private final CVSectionRepository cvSectionRepository;
    private final CandidateProfileRepository candidateProfileRepository;
    private final GitHubProfileRepository gitHubProfileRepository;
    private final GitHubRepositoryRepository gitHubRepositoryRepository;
    private final GitHubAssessmentRepository gitHubAssessmentRepository;
    @Autowired(required = false)
    private com.platform.recruitment.auth.OAuthService oauthService;

    @Autowired(required = false)
    private GitHubRepositoryLanguageRepository gitHubRepositoryLanguageRepository;

    @Autowired(required = false)
    private GitHubRepositoryTopicRepository gitHubRepositoryTopicRepository;

    @Autowired(required = false)
    private com.platform.recruitment.company.RecruiterProfileRepository recruiterProfileRepository;

    private com.platform.recruitment.user.User authenticatedActor() {
        var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof com.platform.recruitment.user.User actor)) {
            throw new com.platform.recruitment.common.UnauthorizedAccessException("Authentication is required");
        }
        return actor;
    }

    @Deprecated
    @Transactional
    public void processJobDescription(UUID jobId) {
        processJobDescription(authenticatedActor(), jobId);
    }

    @Transactional
    public void processJobDescription(com.platform.recruitment.user.User actor, UUID jobId) {
        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job", "id", jobId));

        if (actor == null) throw new com.platform.recruitment.common.UnauthorizedAccessException("Authentication is required");
        if (actor.getRole() != com.platform.recruitment.user.Role.ADMIN) {
            if (actor.getRole() != com.platform.recruitment.user.Role.HR || recruiterProfileRepository == null) {
                throw new com.platform.recruitment.common.UnauthorizedAccessException("Recruiter access is required");
            }
            var recruiter = recruiterProfileRepository.findByUserId(actor.getId())
                    .orElseThrow(() -> new com.platform.recruitment.common.UnauthorizedAccessException("Recruiter profile not found"));
            if (job.getCompany() == null || recruiter.getCompany() == null
                    || !job.getCompany().getId().equals(recruiter.getCompany().getId())) {
                throw new com.platform.recruitment.common.UnauthorizedAccessException("Job belongs to another company");
            }
        }
        log.info("Processing JD extraction lifecycle for job_id: {}", jobId);
        Map<String, Object> result = aiWorkerClient.extractJd(jobId, job.getTitle(), job.getIndustry(), job.getDescription());

        // Idempotency: Clear existing draft requirements before persisting extracted requirements
        jobRequirementRepository.deleteAll(jobRequirementRepository.findByJobId(jobId));

        List<Map<String, Object>> reqSkills = (List<Map<String, Object>>) result.get("required_skills");
        if (reqSkills != null) {
            for (Map<String, Object> req : reqSkills) {
                JobRequirement jr = JobRequirement.builder()
                        .job(job)
                        .skillName((String) req.get("normalized_name"))
                        .requirementType(RequirementType.REQUIRED)
                        .minYearsExp(req.get("min_years_exp") != null ? ((Number) req.get("min_years_exp")).intValue() : 0)
                        .build();
                jobRequirementRepository.save(jr);
            }
        }

        List<Map<String, Object>> prefSkills = (List<Map<String, Object>>) result.get("preferred_skills");
        if (prefSkills != null) {
            for (Map<String, Object> pref : prefSkills) {
                JobRequirement jr = JobRequirement.builder()
                        .job(job)
                        .skillName((String) pref.get("normalized_name"))
                        .requirementType(RequirementType.PREFERRED)
                        .minYearsExp(pref.get("min_years_exp") != null ? ((Number) pref.get("min_years_exp")).intValue() : 0)
                        .build();
                jobRequirementRepository.save(jr);
            }
        }
        log.info("Successfully persisted extracted JD requirements for job_id: {}", jobId);
    }

    /**
     * @deprecated Candidate CV extraction is unified via native Documents and PipelineWorker.
     * This legacy hook operates in-process with zero calls to the legacy external ai-worker.
     */
    @Deprecated
    @Transactional
    public void processCvDocument(UUID cvId) {
        processCvDocument(authenticatedActor(), cvId);
    }

    @Deprecated
    @Transactional
    public void processCvDocument(com.platform.recruitment.user.User actor, UUID cvId) {
        CV cv = cvRepository.findById(cvId)
                .orElseThrow(() -> new ResourceNotFoundException("CV", "id", cvId));

        if (actor == null || actor.getRole() != com.platform.recruitment.user.Role.CANDIDATE
                || cv.getCandidate() == null || cv.getCandidate().getUser() == null
                || !cv.getCandidate().getUser().getId().equals(actor.getId())) {
            throw new com.platform.recruitment.common.UnauthorizedAccessException("Candidate does not own this CV");
        }
        if ("CONFIRMED".equalsIgnoreCase(cv.getStatus()) || "PROCESSING".equalsIgnoreCase(cv.getStatus())) {
            throw new com.platform.recruitment.common.CustomException(
                    com.platform.recruitment.common.ErrorCode.INVALID_STATE_TRANSITION,
                    "Cannot reprocess a confirmed CV or an active extraction through the legacy endpoint");
        }
        // Create or fetch latest CVVersion
        List<CVVersion> versions = cvVersionRepository.findByCvIdOrderByVersionNumberDesc(cvId);
        CVVersion version;
        if (versions.isEmpty()) {
            version = CVVersion.builder()
                    .cv(cv)
                    .versionNumber(1)
                    .title(cv.getTitle() + " v1.0")
                    .rawTextContent(cv.getRawText())
                    .build();
            version = cvVersionRepository.save(version);
        } else {
            version = versions.get(0);
        }

        log.info("Processing legacy CV extraction lifecycle in-process (no external ai-worker) for cv_id: {}, version_id: {}", cvId, version.getId());

        List<CVSection> existingSections = cvSectionRepository.findByCvVersionId(version.getId());
        if (existingSections == null || existingSections.isEmpty()) {
            if (cv.getRawText() != null && !cv.getRawText().isBlank()) {
                persistSectionIfPresent(version, "SUMMARY", cv.getRawText().substring(0, Math.min(cv.getRawText().length(), 500)));
            }
        }

        cv.setStatus("PARSED");
        cvRepository.save(cv);
        log.info("Successfully completed in-process CV parsing without legacy aiWorkerClient for version_id: {}", version.getId());
    }

    private void persistSectionIfPresent(CVVersion version, String sectionType, Object data) {
        if (data != null) {
            String content = data.toString().trim();
            if (!content.isEmpty() && !"[]".equals(content) && !"null".equalsIgnoreCase(content)) {
                CVSection section = CVSection.builder()
                        .cvVersion(version)
                        .sectionType(sectionType)
                        .content(content)
                        .build();
                cvSectionRepository.save(section);
            }
        }
    }

    @Transactional
    public void processCandidateGithub(UUID candidateId) {
        CandidateProfile candidate = candidateProfileRepository.findByUserId(candidateId)
                .or(() -> candidateProfileRepository.findById(candidateId))
                .orElseThrow(() -> new ResourceNotFoundException("CandidateProfile", "id/userId", candidateId));

        if (candidate.getGithubUrl() == null || candidate.getGithubUrl().isBlank()) {
            log.info("No GitHub URL present for candidate_id: {}", candidateId);
            return;
        }

        log.info("Processing GitHub analysis lifecycle for candidate_id: {}", candidateId);
        Map<String, Object> result = aiWorkerClient.analyzeGithub(candidateId, candidate.getGithubUrl());

        String statusStr = (String) result.getOrDefault("status", "SYNCED");
        String activitySignalStr = (String) result.getOrDefault("activity_signal", "LIMITED_OBSERVABLE_ACTIVITY");
        GitHubActivitySignal signal = GitHubActivitySignal.MODERATE;
        try {
            signal = GitHubActivitySignal.valueOf(activitySignalStr);
        } catch (Exception ignored) {}

        GitHubProfile profile = gitHubProfileRepository.findByCandidateId(candidate.getId())
                .orElseGet(() -> GitHubProfile.builder()
                        .candidate(candidate)
                        .username((String) result.getOrDefault("username", "candidate"))
                        .githubUrl(candidate.getGithubUrl())
                        .build());

        profile.setStatus(statusStr);
        profile.setOwnershipStatus(oauthService != null && oauthService.isGithubOwned(candidate.getUser().getId(), profile.getUsername()) ? "OWNED" : "UNVERIFIED_PUBLIC");
        profile.setActivitySignal(signal);
        profile.setPublicReposCount(result.get("public_repos_count") != null ? ((Number) result.get("public_repos_count")).intValue() : 0);
        if (result.get("latest_activity_at") != null) {
            try {
                profile.setLatestActivityAt(ZonedDateTime.parse((String) result.get("latest_activity_at")));
            } catch (Exception ignored) {}
        }
        profile.setCalculatedAt(ZonedDateTime.now());
        profile.setSyncedAt(ZonedDateTime.now());
        GitHubProfile savedProfile = gitHubProfileRepository.save(profile);

        // Persist GitHub Assessment
        GitHubAssessment assessment = gitHubAssessmentRepository.findByGithubProfileId(savedProfile.getId())
                .orElseGet(() -> GitHubAssessment.builder().githubProfile(savedProfile).build());

        assessment.setSummaryNotes((String) result.get("summary_notes"));
        assessment.setLanguageRankSummary((String) result.get("language_rank_summary"));
        assessment.setOverallSupportingRating((String) result.getOrDefault("overall_supporting_rating", "UNAVAILABLE"));
        gitHubAssessmentRepository.save(assessment);

        // Persist Observable Public Repositories, Languages, and Topics
        if (result.get("repositories") instanceof List<?> repoList && !repoList.isEmpty()) {
            List<GitHubRepository> existingRepos = gitHubRepositoryRepository.findByGithubProfileId(savedProfile.getId());
            if (!existingRepos.isEmpty()) {
                gitHubRepositoryRepository.deleteAll(existingRepos);
            }

            for (Object obj : repoList) {
                if (obj instanceof Map<?, ?> repoMap) {
                    String name = (String) repoMap.get("name");
                    String repoUrl = (String) repoMap.get("repo_url");
                    String desc = (String) repoMap.get("description");
                    String lang = (String) repoMap.get("primary_language");
                    int stars = repoMap.get("stars_count") != null ? ((Number) repoMap.get("stars_count")).intValue() : 0;
                    int forks = repoMap.get("forks_count") != null ? ((Number) repoMap.get("forks_count")).intValue() : 0;
                    boolean archived = Boolean.TRUE.equals(repoMap.get("is_archived"));

                    ZonedDateTime updatedAt = null;
                    if (repoMap.get("updated_at_github") != null) {
                        try {
                            updatedAt = ZonedDateTime.parse((String) repoMap.get("updated_at_github"));
                        } catch (Exception ignored) {}
                    }

                    GitHubRepository repoEntity = GitHubRepository.builder()
                            .githubProfile(savedProfile)
                            .name(name != null ? name : "unnamed-repo")
                            .repoUrl(repoUrl != null ? repoUrl : "")
                            .description(desc)
                            .primaryLanguage(lang != null ? lang : "Other")
                            .starsCount(stars)
                            .forksCount(forks)
                            .isArchived(archived)
                            .updatedAtGithub(updatedAt)
                            .build();
                    GitHubRepository savedRepo = gitHubRepositoryRepository.save(repoEntity);

                    // Persist exact Language distribution by bytes
                    if (gitHubRepositoryLanguageRepository != null && repoMap.get("languages") instanceof List<?> langList) {
                        for (Object langObj : langList) {
                            if (langObj instanceof Map<?, ?> langMap) {
                                String lname = (String) langMap.get("language_name");
                                long bytesCnt = langMap.get("bytes_count") != null ? ((Number) langMap.get("bytes_count")).longValue() : 0L;
                                BigDecimal ratio = langMap.get("percentage_ratio") != null ? BigDecimal.valueOf(((Number) langMap.get("percentage_ratio")).doubleValue()) : BigDecimal.ZERO;

                                GitHubRepositoryLanguage repoLang = GitHubRepositoryLanguage.builder()
                                        .repository(savedRepo)
                                        .languageName(lname != null ? lname : "Other")
                                        .bytesCount(bytesCnt)
                                        .percentageRatio(ratio)
                                        .build();
                                gitHubRepositoryLanguageRepository.save(repoLang);
                            }
                        }
                    }

                    // Persist Topics
                    if (gitHubRepositoryTopicRepository != null && repoMap.get("topics") instanceof List<?> topicList) {
                        for (Object topicObj : topicList) {
                            if (topicObj instanceof String topicStr && !topicStr.isBlank()) {
                                GitHubRepositoryTopic topicEntity = GitHubRepositoryTopic.builder()
                                        .repository(savedRepo)
                                        .topicName(topicStr.trim())
                                        .build();
                                gitHubRepositoryTopicRepository.save(topicEntity);
                            }
                        }
                    }
                }
            }
        }

        log.info("Successfully persisted GitHub analysis and repositories for candidate_id: {}", candidateId);
    }
}
