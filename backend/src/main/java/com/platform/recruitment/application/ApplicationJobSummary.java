package com.platform.recruitment.application;

import com.platform.recruitment.company.CompanyVerification;
import com.platform.recruitment.job.Job;
import com.platform.recruitment.job.JobStatus;

import java.math.BigDecimal;
import java.time.ZonedDateTime;
import java.time.LocalDate;
import java.util.UUID;

/** Current listing metadata. Matching continues to use the pinned JD version. */
public record ApplicationJobSummary(
        UUID id, String title, String companyName, Boolean companyVerified,
        String industry, String employmentType, JobStatus status, String location,
        BigDecimal salaryMin, BigDecimal salaryMax, Boolean salaryNegotiable,
        String salaryCurrency, ZonedDateTime publishedAt, LocalDate applicationDeadline, Integer vacancyCount) {
    public static ApplicationJobSummary from(Job job) {
        var company = job.getCompany();
        return new ApplicationJobSummary(
                job.getId(), job.getTitle(), company == null ? null : company.getName(),
                company == null ? null : company.getVerificationStatus() == CompanyVerification.VERIFIED,
                job.getIndustry(), job.getEmploymentType(), job.getStatus(), job.getLocation(),
                job.getMinSalary(), job.getMaxSalary(), job.getSalaryNegotiable(),
                job.getSalaryCurrency(), job.getPublishedAt(), job.getApplicationDeadline(), job.getVacancyCount());
    }
}
