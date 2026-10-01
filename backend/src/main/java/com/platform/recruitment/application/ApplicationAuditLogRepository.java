package com.platform.recruitment.application;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ApplicationAuditLogRepository extends JpaRepository<ApplicationAuditLog, UUID> {
    List<ApplicationAuditLog> findByApplicationIdOrderByCreatedAtDesc(UUID applicationId);
}
