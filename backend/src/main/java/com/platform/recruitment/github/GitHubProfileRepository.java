package com.platform.recruitment.github;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface GitHubProfileRepository extends JpaRepository<GitHubProfile, UUID> {
    Optional<GitHubProfile> findByCandidateId(UUID candidateId);
}
