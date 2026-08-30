package com.platform.recruitment.company;

import com.platform.recruitment.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

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
}
