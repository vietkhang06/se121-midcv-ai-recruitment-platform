package com.platform.recruitment.auth;

public class OAuthFlowException extends RuntimeException {
    private final String reason;
    public OAuthFlowException(String reason, String message) { super(message); this.reason = reason; }
    public String getReason() { return reason; }
}
