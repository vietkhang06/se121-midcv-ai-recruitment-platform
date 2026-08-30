package com.platform.recruitment.cv;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CVRepository extends JpaRepository<CV, UUID> {
    List<CV> findByCandidateId(UUID candidateId);
    Optional<CV> findByIdAndCandidateId(UUID id, UUID candidateId);
}
