package com.platform.recruitment.matching;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface JobMatchingPolicyRepository extends JpaRepository<JobMatchingPolicy, UUID> {
    Optional<JobMatchingPolicy> findByJobId(UUID jobId);
}
