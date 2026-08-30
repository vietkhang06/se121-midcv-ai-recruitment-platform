package com.platform.recruitment.candidate;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CandidateTargetIndustryRepository extends JpaRepository<CandidateTargetIndustry, UUID> {
    List<CandidateTargetIndustry> findByCandidateId(UUID candidateId);
}
