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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidate_id", nullable = false)
    private CandidateProfile candidate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "applied_cv_id")
    private CV appliedCv;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "applied_cv_version_id")
    private CVVersion appliedCvVersion;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private ApplicationStatus status = ApplicationStatus.SUBMITTED;

    @Builder.Default
    @Column(name = "applied_at")
    private ZonedDateTime appliedAt = ZonedDateTime.now();
}
