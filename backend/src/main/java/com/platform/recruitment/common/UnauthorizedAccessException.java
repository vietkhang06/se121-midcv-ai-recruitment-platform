package com.platform.recruitment.common;

public class UnauthorizedAccessException extends CustomException {
    public UnauthorizedAccessException(String message) {
        super(ErrorCode.ACCESS_DENIED, message);
    }
}
