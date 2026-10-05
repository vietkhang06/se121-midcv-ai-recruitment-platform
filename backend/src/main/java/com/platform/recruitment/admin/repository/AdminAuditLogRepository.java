package com.platform.recruitment.admin.repository;

import com.platform.recruitment.admin.model.AdminAuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface AdminAuditLogRepository extends JpaRepository<AdminAuditLog, UUID> {
    Page<AdminAuditLog> findAllByOrderByCreatedAtDesc(Pageable pageable);
    Page<AdminAuditLog> findByTargetTypeOrderByCreatedAtDesc(String targetType, Pageable pageable);
    Page<AdminAuditLog> findByAdminIdOrderByCreatedAtDesc(UUID adminId, Pageable pageable);
}
