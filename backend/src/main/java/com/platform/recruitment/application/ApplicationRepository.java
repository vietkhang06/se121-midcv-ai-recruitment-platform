package com.platform.recruitment.application;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ApplicationRepository extends JpaRepository<Application, UUID> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("SELECT a FROM Application a WHERE a.id=:id")
    Optional<Application> findByIdForUpdate(@org.springframework.data.repository.query.Param("id") UUID id);
    List<Application> findByJobId(UUID jobId);
    org.springframework.data.domain.Page<Application> findByJobId(UUID jobId, org.springframework.data.domain.Pageable pageable);
    List<Application> findByCandidateId(UUID candidateId);
    org.springframework.data.domain.Page<Application> findByCandidateId(UUID candidateId, org.springframework.data.domain.Pageable pageable);
    boolean existsByJobIdAndCandidateId(UUID jobId, UUID candidateId);
    Optional<Application> findByJobIdAndCandidateId(UUID jobId, UUID candidateId);
    long countByCandidateId(UUID candidateId);
}
