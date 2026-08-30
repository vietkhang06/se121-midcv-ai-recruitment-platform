package com.platform.recruitment.common;

public class CompanyNotVerifiedException extends CustomException {
    public CompanyNotVerifiedException(String message) {
        super(ErrorCode.COMPANY_NOT_VERIFIED, message);
    }
}
