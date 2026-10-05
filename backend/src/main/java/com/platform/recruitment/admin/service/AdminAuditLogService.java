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
    public void log(User admin, String action, String targetType, UUID targetId,
                    String previousState, String newState, String reason,
                    String ipAddress, String correlationId) {
        try {
            AdminAuditLog logEntry = AdminAuditLog.builder()
                    .admin(admin)
                    .action(action)
                    .targetType(targetType)
                    .targetId(targetId)
                    .previousState(previousState)
                    .newState(newState)
                    .reason(reason)
                    .ipAddress(ipAddress)
                    .correlationId(correlationId != null ? correlationId : UUID.randomUUID().toString())
                    .build();

            adminAuditLogRepository.save(logEntry);
            log.info("AdminAuditLog: action={}, targetType={}, targetId={}, admin={}", action, targetType, targetId, admin.getEmail());
        } catch (Exception ex) {
            log.error("Failed to write AdminAuditLog: {}", ex.getMessage(), ex);
        }
    }
}
