package com.platform.recruitment.company;

import com.platform.recruitment.common.BaseEntity;
import com.platform.recruitment.user.User;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "recruiter_profiles")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecruiterProfile extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(name = "phone")
    private String phone;
}
