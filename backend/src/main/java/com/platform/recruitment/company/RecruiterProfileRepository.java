package com.platform.recruitment.company;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface RecruiterProfileRepository extends JpaRepository<RecruiterProfile, UUID> {
    Optional<RecruiterProfile> findByUserId(UUID userId);
}
