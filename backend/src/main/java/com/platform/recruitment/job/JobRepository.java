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
    List<Job> findByStatus(JobStatus status);
    List<Job> findByStatusAndIndustry(JobStatus status, String industry);
    long countByStatus(JobStatus status);
    Page<Job> findByStatus(JobStatus status, Pageable pageable);
    Page<Job> findByTitleContainingIgnoreCase(String title, Pageable pageable);
    Page<Job> findByTitleContainingIgnoreCaseAndStatus(String title, JobStatus status, Pageable pageable);
}
