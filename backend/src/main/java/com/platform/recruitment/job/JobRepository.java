package com.platform.recruitment.job;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface JobRepository extends JpaRepository<Job, UUID> {
    List<Job> findByCompanyId(UUID companyId);
    Page<Job> findByCompanyId(UUID companyId, Pageable pageable);
    List<Job> findByStatus(JobStatus status);
    List<Job> findByStatusAndIndustry(JobStatus status, String industry);
    Page<Job> findByStatusAndIndustry(JobStatus status, String industry, Pageable pageable);
    long countByStatus(JobStatus status);
    Page<Job> findByStatus(JobStatus status, Pageable pageable);
    Page<Job> findByTitleContainingIgnoreCase(String title, Pageable pageable);
    Page<Job> findByTitleContainingIgnoreCaseAndStatus(String title, JobStatus status, Pageable pageable);

    @org.springframework.data.jpa.repository.Query("SELECT j FROM Job j WHERE j.status = :status AND j.company.operationalStatus = :opStatus")
    Page<Job> findByStatusAndCompanyOperationalStatus(
            @org.springframework.data.repository.query.Param("status") JobStatus status,
            @org.springframework.data.repository.query.Param("opStatus") com.platform.recruitment.company.CompanyOperationalStatus opStatus,
            Pageable pageable);

    @org.springframework.data.jpa.repository.Query("SELECT j FROM Job j WHERE j.status = :status AND j.industry = :industry AND j.company.operationalStatus = :opStatus")
    Page<Job> findByStatusAndIndustryAndCompanyOperationalStatus(
            @org.springframework.data.repository.query.Param("status") JobStatus status,
            @org.springframework.data.repository.query.Param("industry") String industry,
            @org.springframework.data.repository.query.Param("opStatus") com.platform.recruitment.company.CompanyOperationalStatus opStatus,
            Pageable pageable);
}
