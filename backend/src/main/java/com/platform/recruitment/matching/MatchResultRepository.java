package com.platform.recruitment.matching;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MatchResultRepository extends JpaRepository<MatchResult, UUID> {
    Optional<MatchResult> findByApplicationId(UUID applicationId);
    Optional<MatchResult> findByApplicationJobIdAndApplicationCandidateId(UUID jobId, UUID candidateId);
    List<MatchResult> findByApplicationJobId(UUID jobId);
}
