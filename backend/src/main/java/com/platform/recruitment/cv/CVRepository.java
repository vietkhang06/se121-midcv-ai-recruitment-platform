package com.platform.recruitment.cv;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CVRepository extends JpaRepository<CV, UUID> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM CV c WHERE c.id = :id")
    Optional<CV> findByIdForUpdate(@Param("id") UUID id);

    List<CV> findByCandidateId(UUID candidateId);
    org.springframework.data.domain.Page<CV> findByCandidateId(UUID candidateId, org.springframework.data.domain.Pageable pageable);
    Optional<CV> findByIdAndCandidateId(UUID id, UUID candidateId);
    long countByCandidateId(UUID candidateId);

    @Query("SELECT COUNT(c) FROM CV c WHERE c.candidate.id = :candidateId AND (c.status IS NULL OR c.status != 'FAILED')")
    long countActiveByCandidateId(@Param("candidateId") UUID candidateId);
}
