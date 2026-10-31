package com.platform.recruitment.admin.service;

import com.platform.recruitment.admin.model.AdminAuditLog;
import com.platform.recruitment.admin.repository.AdminAuditLogRepository;
import com.platform.recruitment.user.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminAuditLogService {

    private final AdminAuditLogRepository adminAuditLogRepository;

    @Transactional(propagation = Propagation.REQUIRED)
    public void log(User admin, String action, String targetType, UUID targetId, String previousState, String newState, String reason, String ipAddress, String correlationId) {
        AdminAuditLog entry = AdminAuditLog.builder()
                .admin(admin).action(action).targetType(targetType).targetId(targetId)
                .previousState(previousState).newState(newState).reason(reason).ipAddress(ipAddress)
                .correlationId(correlationId != null ? correlationId : UUID.randomUUID().toString()).build();
        // Audit and business change must commit together; do not swallow persistence failures.
        adminAuditLogRepository.save(entry);
        log.info("AdminAuditLog: action={}, targetType={}, targetId={}, actorId={}",
                action, targetType, targetId, admin.getId());
    }
}
