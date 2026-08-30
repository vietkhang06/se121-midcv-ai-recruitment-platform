package com.platform.recruitment.job;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface JobRepository extends JpaRepository<Job, UUID> {
    List<Job> findByCompanyId(UUID companyId);
    List<Job> findByStatus(JobStatus status);
    List<Job> findByStatusAndIndustry(JobStatus status, String industry);
}
