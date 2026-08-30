package com.platform.recruitment.application;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ApplicationRepository extends JpaRepository<Application, UUID> {
    List<Application> findByJobId(UUID jobId);
    List<Application> findByCandidateId(UUID candidateId);
    boolean existsByJobIdAndCandidateId(UUID jobId, UUID candidateId);
    Optional<Application> findByJobIdAndCandidateId(UUID jobId, UUID candidateId);
}
