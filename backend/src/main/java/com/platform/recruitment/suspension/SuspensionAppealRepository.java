package com.platform.recruitment.suspension;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SuspensionAppealRepository extends JpaRepository<SuspensionAppeal, UUID> {

    List<SuspensionAppeal> findByAppellantUserIdOrderByCreatedAtDesc(UUID appellantUserId);

    Page<SuspensionAppeal> findByAppellantUserId(UUID appellantUserId, Pageable pageable);

    Page<SuspensionAppeal> findByStatus(AppealStatus status, Pageable pageable);

    List<SuspensionAppeal> findByTargetTypeAndTargetIdAndStatusIn(
            SuspensionTargetType targetType, UUID targetId, List<AppealStatus> statuses);

    boolean existsByTargetTypeAndTargetIdAndStatusIn(
            SuspensionTargetType targetType, UUID targetId, List<AppealStatus> statuses);

    Optional<SuspensionAppeal> findFirstByTargetTypeAndTargetIdAndStatusOrderByCreatedAtDesc(
            SuspensionTargetType targetType, UUID targetId, AppealStatus status);
}
