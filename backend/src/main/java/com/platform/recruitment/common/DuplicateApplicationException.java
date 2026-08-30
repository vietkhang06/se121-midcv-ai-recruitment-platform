package com.platform.recruitment.common;

public class DuplicateApplicationException extends CustomException {
    public DuplicateApplicationException(String message) {
        super(ErrorCode.DUPLICATE_APPLICATION, message);
    }
}
