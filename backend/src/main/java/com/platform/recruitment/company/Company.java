package com.platform.recruitment.company;

import com.platform.recruitment.common.BaseEntity;
import com.platform.recruitment.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.ZonedDateTime;

@Entity
@Table(name = "companies")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Company extends BaseEntity {

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "tax_code")
    private String taxCode;

    @Column(name = "website")
    private String website;

    @Column(name = "size")
    private String size;

    @Column(name = "industry")
    private String industry;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "verification_status")
    private CompanyVerification verificationStatus = CompanyVerification.PENDING;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "operational_status", nullable = false)
    private CompanyOperationalStatus operationalStatus = CompanyOperationalStatus.ACTIVE;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by")
    private User reviewedBy;

    @Column(name = "reviewed_at")
    private ZonedDateTime reviewedAt;

    @Column(name = "review_notes", columnDefinition = "TEXT")
    private String reviewNotes;

    @Builder.Default
    @Version
    @Column(name = "version", nullable = false)
    private Long version = 0L;

    public boolean isOperational() {
        return this.operationalStatus == CompanyOperationalStatus.ACTIVE;
    }

    public boolean isSuspended() {
        return this.operationalStatus == CompanyOperationalStatus.SUSPENDED;
    }
}
