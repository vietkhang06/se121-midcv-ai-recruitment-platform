package com.platform.recruitment.suspension;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SuspensionRecordRepository extends JpaRepository<SuspensionRecord, UUID> {

    List<SuspensionRecord> findByTargetTypeAndTargetIdAndStatus(
            SuspensionTargetType targetType, UUID targetId, SuspensionStatus status);

    Optional<SuspensionRecord> findFirstByTargetTypeAndTargetIdAndStatusOrderBySuspendedAtDesc(
            SuspensionTargetType targetType, UUID targetId, SuspensionStatus status);

    Page<SuspensionRecord> findByStatus(SuspensionStatus status, Pageable pageable);

    Page<SuspensionRecord> findByTargetType(SuspensionTargetType targetType, Pageable pageable);

    boolean existsByTargetTypeAndTargetIdAndStatus(
            SuspensionTargetType targetType, UUID targetId, SuspensionStatus status);
}
