package com.platform.recruitment.matching;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MatchResultRepository extends JpaRepository<MatchResult, UUID> {
    Optional<MatchResult> findByApplicationId(UUID applicationId);
    Optional<MatchResult> findByApplicationJobIdAndApplicationCandidateId(UUID jobId, UUID candidateId);

    @Query("SELECT m FROM MatchResult m JOIN FETCH m.application a JOIN FETCH a.candidate c JOIN FETCH c.user u WHERE a.job.id = :jobId")
    List<MatchResult> findByApplicationJobIdWithCandidate(@Param("jobId") UUID jobId);

    List<MatchResult> findByApplicationJobId(UUID jobId);
}
