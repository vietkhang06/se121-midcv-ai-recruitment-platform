package com.platform.recruitment.application;

import com.platform.recruitment.common.BaseEntity;
import com.platform.recruitment.job.Job;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "application_questions")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApplicationQuestion extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_id", nullable = false)
    private Job job;

    @Column(name = "question_text", nullable = false, columnDefinition = "TEXT")
    private String questionText;

    @Builder.Default
    @Column(name = "is_required")
    private Boolean isRequired = true;
}
