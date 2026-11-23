package com.platform.recruitment.application;

import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.common.ErrorCode;

public enum ApplicationStatus {
    SUBMITTED,
    REVIEWED,
    MATCHED,
    SHORTLISTED,
    INTERVIEWING,
    HIRED,
    REJECTED;

    public void validateTransition(ApplicationStatus target, String note) {
        boolean allowed = switch (this) {
            case SUBMITTED -> target == REVIEWED || target == SHORTLISTED || target == REJECTED;
            case REVIEWED, MATCHED -> target == SHORTLISTED || target == REJECTED;
            case SHORTLISTED -> target == INTERVIEWING || target == REJECTED;
            case INTERVIEWING -> target == HIRED || target == REJECTED;
            case REJECTED -> target == REVIEWED;
            case HIRED -> false;
        };
        if (!allowed) {
            throw new CustomException(
                    ErrorCode.VALIDATION_ERROR,
                    "Không thể chuyển đơn ứng tuyển sang trạng thái đã chọn.");
        }
        if (this == REJECTED && (note == null || note.isBlank())) {
            throw new CustomException(
                    ErrorCode.VALIDATION_ERROR,
                    "Vui lòng ghi lý do mở lại đơn ứng tuyển.");
        }
    }
}
