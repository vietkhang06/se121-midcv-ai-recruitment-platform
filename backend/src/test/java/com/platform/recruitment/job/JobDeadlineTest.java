package com.platform.recruitment.job;

import com.platform.recruitment.common.CustomException;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.ZoneId;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class JobDeadlineTest {
    @Test
    void allowsLegacyJobsAndInclusiveVietnamDate() {
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        assertDoesNotThrow(() -> JobDeadline.requireOpen(null));
        assertDoesNotThrow(() -> JobDeadline.requireOpen(today));
        assertDoesNotThrow(() -> JobDeadline.requireOpen(today.plusDays(1)));
        assertThrows(CustomException.class, () -> JobDeadline.requireOpen(today.minusDays(1)));
    }
}
