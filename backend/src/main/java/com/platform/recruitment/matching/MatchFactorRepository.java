package com.platform.recruitment.matching;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MatchFactorRepository extends JpaRepository<MatchFactor, UUID> {
    List<MatchFactor> findByMatchResultId(UUID matchResultId);
}
