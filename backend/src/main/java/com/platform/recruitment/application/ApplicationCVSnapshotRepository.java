package com.platform.recruitment.application;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ApplicationCVSnapshotRepository extends JpaRepository<ApplicationCVSnapshot, UUID> {
    Optional<ApplicationCVSnapshot> findByApplicationId(UUID applicationId);
}
