package com.platform.recruitment.admin.repository;

import com.platform.recruitment.admin.model.ReportStatus;
import com.platform.recruitment.admin.model.ReportTargetType;
import com.platform.recruitment.admin.model.SystemReport;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface SystemReportRepository extends JpaRepository<SystemReport, UUID> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("SELECT r FROM SystemReport r WHERE r.id=:id")
    java.util.Optional<SystemReport> findByIdForUpdate(@org.springframework.data.repository.query.Param("id") UUID id);
    long countByStatus(ReportStatus status);
    Page<SystemReport> findByStatus(ReportStatus status, Pageable pageable);
    Page<SystemReport> findByTargetType(ReportTargetType targetType, Pageable pageable);
    Page<SystemReport> findByStatusAndTargetType(ReportStatus status, ReportTargetType targetType, Pageable pageable);
}
