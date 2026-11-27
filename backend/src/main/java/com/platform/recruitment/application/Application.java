package com.platform.recruitment.application;

import com.platform.recruitment.candidate.CandidateProfile;
import com.platform.recruitment.common.BaseEntity;
import com.platform.recruitment.cv.CV;
import com.platform.recruitment.cv.CVVersion;
import com.platform.recruitment.job.Job;
import jakarta.persistence.*;
import lombok.*;

import java.time.ZonedDateTime;

@Entity
@org.hibernate.annotations.DynamicUpdate
@Table(name = "applications")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Application extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_id", nullable = false)
    private Job job;

    @Builder.Default
    @Column(name = "ai_analysis_consent", nullable = false)
    private Boolean aiAnalysisConsent = false;
    @Column(name = "ai_consent_at")
    private ZonedDateTime aiConsentAt;
    @Column(name = "ai_consent_version", length = 32)
    private String aiConsentVersion;
    @Column(name = "cover_letter", columnDefinition = "TEXT")
    private String coverLetter;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidate_id", nullable = false)
    private CandidateProfile candidate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "applied_cv_id")
    private CV appliedCv;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "applied_cv_version_id")
    private CVVersion appliedCvVersion;

    /** JD snapshot selected when the application is submitted; never rewrite for old applications. */
    @Column(name = "applied_jd_version_id")
    private java.util.UUID appliedJdVersionId;

    @Column(name = "ai_scoring_eligible_snapshot", updatable = false)
    private Boolean aiScoringEligibleSnapshot;
    @Builder.Default
    @Column(name = "ai_dispatch_pending", nullable = false)
    private Boolean aiDispatchPending = false;
    @Column(name = "ai_policy_snapshot", columnDefinition = "TEXT", updatable = false)
    private String aiPolicySnapshot;
    @Column(name = "ai_requested_policy_snapshot", columnDefinition = "TEXT")
    private String aiRequestedPolicySnapshot;

    @Column(name = "github_username_snapshot", length = 39, updatable = false)
    private String githubUsernameSnapshot;
    @Column(name = "github_snapshot_contract", length = 32, updatable = false)
    private String githubSnapshotContract;
    @Column(name = "github_scan_snapshot", columnDefinition = "TEXT", insertable = false, updatable = false)
    private String githubScanSnapshot;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private ApplicationStatus status = ApplicationStatus.SUBMITTED;

    @Builder.Default
    @Column(name = "applied_at")
    private ZonedDateTime appliedAt = ZonedDateTime.now();
}
