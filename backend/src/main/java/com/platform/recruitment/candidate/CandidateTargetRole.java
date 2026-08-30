package com.platform.recruitment.candidate;

import com.platform.recruitment.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "candidate_target_roles")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CandidateTargetRole extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidate_id", nullable = false)
    private CandidateProfile candidate;

    @Column(name = "role_title", nullable = false)
    private String roleTitle;
}
