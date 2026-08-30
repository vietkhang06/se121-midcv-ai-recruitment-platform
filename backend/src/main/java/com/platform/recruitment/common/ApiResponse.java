package com.platform.recruitment.common;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.ZonedDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApiResponse<T> {

    private boolean success;
    private String message;
    private T data;
    private ErrorDetails error;
    private ZonedDateTime timestamp;

    public static <T> ApiResponse<T> success(T data) {
        return ApiResponse.<T>builder()
                .success(true)
                .message("Success")
                .data(data)
                .timestamp(ZonedDateTime.now())
                .build();
    }

    public static <T> ApiResponse<T> success(String message, T data) {
        return ApiResponse.<T>builder()
                .success(true)
                .message(message)
                .data(data)
                .timestamp(ZonedDateTime.now())
                .build();
    }

    public static <T> ApiResponse<T> error(ErrorCode errorCode, String message, Object details) {
        return ApiResponse.<T>builder()
                .success(false)
                .message(message)
                .error(new ErrorDetails(errorCode.name(), message, details))
                .timestamp(ZonedDateTime.now())
                .build();
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class ErrorDetails {
        private String code;
        private String message;
        private Object details;
    }
}
