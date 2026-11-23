package com.platform.recruitment.job;

import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.common.ErrorCode;

import java.time.LocalDate;
import java.time.ZoneId;

public final class JobDeadline {
    private static final ZoneId RECRUITMENT_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private JobDeadline() {}

    public static LocalDate today() {
        return LocalDate.now(RECRUITMENT_ZONE);
    }

    public static void requireOpen(LocalDate deadline) {
        if (deadline != null && deadline.isBefore(today())) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR,
                    "The application deadline has passed (Asia/Ho_Chi_Minh).");
        }
    }
}
