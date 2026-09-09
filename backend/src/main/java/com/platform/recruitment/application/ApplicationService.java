package com.platform.recruitment.application;

import com.platform.recruitment.candidate.CandidateProfile;
import com.platform.recruitment.candidate.CandidateProfileRepository;
import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.common.DuplicateApplicationException;
import com.platform.recruitment.common.ErrorCode;
import com.platform.recruitment.common.ResourceNotFoundException;
import com.platform.recruitment.common.UnauthorizedAccessException;
import com.platform.recruitment.company.RecruiterProfile;
import com.platform.recruitment.company.RecruiterProfileRepository;
import com.platform.recruitment.cv.CV;
import com.platform.recruitment.cv.CVRepository;
import com.platform.recruitment.job.Job;
import com.platform.recruitment.job.JobRepository;
import com.platform.recruitment.job.JobStatus;
import com.platform.recruitment.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

import com.platform.recruitment.cv.CVVersion;
import com.platform.recruitment.cv.CVVersionRepository;
import com.platform.recruitment.matching.MatchingEngineService;

@Service
@RequiredArgsConstructor
public class ApplicationService {

    private final ApplicationRepository applicationRepository;
    private final ApplicationCVSnapshotRepository snapshotRepository;
    private final JobRepository jobRepository;
    private final CandidateProfileRepository candidateProfileRepository;
    private final RecruiterProfileRepository recruiterProfileRepository;
    private final CVRepository cvRepository;
    private final CVVersionRepository cvVersionRepository;
    private final MatchingEngineService matchingEngineService;

    @Transactional
    public ApplicationResponse submitApplication(User candidateUser, SubmitApplicationRequest request) {
        CandidateProfile candidate = candidateProfileRepository.findByUserId(candidateUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("CandidateProfile", "userId", candidateUser.getId()));

        Job job = jobRepository.findById(request.getJobId())
                .orElseThrow(() -> new ResourceNotFoundException("Job", "id", request.getJobId()));

        // Business Rule Enforcement: Candidate can ONLY apply to PUBLISHED jobs
        if (job.getStatus() != JobStatus.PUBLISHED) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR, 
                    String.format("Cannot submit application for job '%s' with status '%s'. Only PUBLISHED jobs accept applications.", 
                            job.getTitle(), job.getStatus()));
        }

        CV cv = cvRepository.findById(request.getCvId())
                .orElseThrow(() -> new ResourceNotFoundException("CV", "id", request.getCvId()));

        // Ownership check: Candidate must own the selected CV
        if (!cv.getCandidate().getId().equals(candidate.getId())) {
            throw new UnauthorizedAccessException("Candidate does not own the selected CV");
        }

        // Duplicate Application Check
        if (applicationRepository.existsByJobIdAndCandidateId(job.getId(), candidate.getId())) {
            throw new DuplicateApplicationException("Candidate has already submitted an application for this job");
        }

        // Get or initialize CVVersion
        List<CVVersion> versions = cvVersionRepository.findByCvIdOrderByVersionNumberDesc(cv.getId());
        CVVersion appliedVersion;
        if (versions.isEmpty()) {
            appliedVersion = cvVersionRepository.save(CVVersion.builder()
                    .cv(cv)
                    .versionNumber(1)
                    .title(cv.getTitle() + " v1.0")
                    .rawTextContent(cv.getRawText())
                    .build());
        } else {
            appliedVersion = versions.get(0);
        }

        // Atomic Transaction: Create Application + Immutable ApplicationCVSnapshot
        Application application = Application.builder()
                .job(job)
                .candidate(candidate)
                .appliedCv(cv)
                .appliedCvVersion(appliedVersion)
                .status(ApplicationStatus.SUBMITTED)
                .build();
        Application savedApplication = applicationRepository.save(application);

        String rawTextContent = cv.getRawText() != null ? cv.getRawText() : "";
        String jsonSnapshotContent = String.format("{\"cvId\":\"%s\",\"title\":\"%s\",\"path\":\"%s\"}", 
                cv.getId(), cv.getTitle(), cv.getCreationPath());

        ApplicationCVSnapshot snapshot = ApplicationCVSnapshot.builder()
                .application(savedApplication)
                .cvTitle(cv.getTitle())
                .rawTextSnapshot(rawTextContent)
                .structuredJsonSnapshot(jsonSnapshotContent)
                .build();
        snapshotRepository.save(snapshot);

        // Immediate matching persistence (match_results, match_factors, evidences)
        try {
            matchingEngineService.calculateAndPersistMatchResult(job.getId(), candidate.getId());
        } catch (Exception ignored) {
        }

        return mapToResponse(savedApplication, snapshot);
    }

    @Transactional(readOnly = true)
    public List<ApplicationResponse> getApplicationsForJob(User recruiterUser, UUID jobId) {
        RecruiterProfile recruiter = recruiterProfileRepository.findByUserId(recruiterUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("RecruiterProfile", "userId", recruiterUser.getId()));

        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job", "id", jobId));

        // Ownership Check: Recruiter can only view applications for jobs belonging to their company
        if (!job.getCompany().getId().equals(recruiter.getCompany().getId())) {
            throw new UnauthorizedAccessException("Recruiter does not own the company for this job posting");
        }

        List<Application> applications = applicationRepository.findByJobId(jobId);
        return applications.stream()
                .map(app -> {
                    ApplicationCVSnapshot snap = snapshotRepository.findByApplicationId(app.getId()).orElse(null);
                    return mapToResponse(app, snap);
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ApplicationResponse> getCandidateApplications(User candidateUser) {
        CandidateProfile candidate = candidateProfileRepository.findByUserId(candidateUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("CandidateProfile", "userId", candidateUser.getId()));

        List<Application> applications = applicationRepository.findByCandidateId(candidate.getId());
        return applications.stream()
                .map(app -> {
                    ApplicationCVSnapshot snap = snapshotRepository.findByApplicationId(app.getId()).orElse(null);
                    return mapToResponse(app, snap);
                })
                .toList();
    }

    public ApplicationResponse mapToResponse(Application app, ApplicationCVSnapshot snap) {
        ApplicationResponse.SnapshotInfo snapshotInfo = null;
        if (snap != null) {
            snapshotInfo = ApplicationResponse.SnapshotInfo.builder()
                    .cvTitle(snap.getCvTitle())
                    .rawTextSnapshot(snap.getRawTextSnapshot())
                    .snapshotCreatedAt(snap.getSnapshotCreatedAt())
                    .build();
        }

        return ApplicationResponse.builder()
                .id(app.getId())
                .jobId(app.getJob().getId())
                .jobTitle(app.getJob().getTitle())
                .candidateId(app.getCandidate().getId())
                .candidateName(app.getCandidate().getFullName())
                .appliedCvId(app.getAppliedCv() != null ? app.getAppliedCv().getId() : null)
                .status(app.getStatus())
                .appliedAt(app.getAppliedAt())
                .snapshot(snapshotInfo)
                .build();
    }
}
