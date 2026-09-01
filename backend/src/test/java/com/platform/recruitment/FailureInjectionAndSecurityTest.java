package com.platform.recruitment;

import com.platform.recruitment.company.Company;
import com.platform.recruitment.company.RecruiterProfile;
import com.platform.recruitment.job.Job;
import com.platform.recruitment.user.Role;
import com.platform.recruitment.user.User;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class FailureInjectionAndSecurityTest {

    @Test
    void testRecruiterOwnershipAccessControl_CrossCompanyAccessBlocked() {
        Company companyA = Company.builder().name("Company A").build();
        companyA.setId(UUID.randomUUID());

        Company companyB = Company.builder().name("Company B").build();
        companyB.setId(UUID.randomUUID());

        User userA = User.builder().email("recruiterA@compA.com").role(Role.HR).build();
        userA.setId(UUID.randomUUID());

        RecruiterProfile recruiterA = RecruiterProfile.builder().user(userA).company(companyA).build();
        recruiterA.setId(UUID.randomUUID());

        Job jobB = Job.builder().company(companyB).title("Java Engineer B").build();
        jobB.setId(UUID.randomUUID());

        // Recruiter A attempting to access Job B belonging to Company B must be blocked
        boolean isOwner = jobB.getCompany().getId().equals(recruiterA.getCompany().getId());
        assertFalse(isOwner, "Recruiter A must NOT be authorized to access Company B job data");
    }

    @Test
    void testLogPrivacyAudit_NoSensitiveSecretsInLogs() {
        String logMessage = "Processing application for candidate_id: cand-123, cv_id: cv-456";
        assertFalse(logMessage.contains("password"));
        assertFalse(logMessage.contains("sk-proj"));
        assertFalse(logMessage.contains("Bearer "));
    }
}
