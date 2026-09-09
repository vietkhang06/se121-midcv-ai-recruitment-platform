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
    private GitHubRepositoryLanguageRepository gitHubRepositoryLanguageRepository;

    @Autowired(required = false)
    private GitHubRepositoryTopicRepository gitHubRepositoryTopicRepository;

    @Transactional
    public void processJobDescription(UUID jobId) {
        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job", "id", jobId));

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

    @Transactional
    public void processCvDocument(UUID cvId) {
        CV cv = cvRepository.findById(cvId)
                .orElseThrow(() -> new ResourceNotFoundException("CV", "id", cvId));

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

        log.info("Processing CV extraction lifecycle for cv_id: {}, version_id: {}", cvId, version.getId());
        Map<String, Object> result = aiWorkerClient.extractCv(cvId, version.getId(), cv.getFileType(), cv.getRawText());

        // Idempotency: Create CVSections linked to this exact CVVersion
        CVSection skillsSection = CVSection.builder()
                .cvVersion(version)
                .sectionType("SKILLS")
                .content(result.get("skills") != null ? result.get("skills").toString() : "")
                .build();
        cvSectionRepository.save(skillsSection);

        cv.setStatus("PARSED");
        cvRepository.save(cv);
        log.info("Successfully persisted extracted CV sections for version_id: {}", version.getId());
    }

    @Transactional
    public void processCandidateGithub(UUID candidateId) {
        CandidateProfile candidate = candidateProfileRepository.findByUserId(candidateId)
                .orElseThrow(() -> new ResourceNotFoundException("CandidateProfile", "userId", candidateId));

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
