package com.platform.recruitment.common;

import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(CustomException.class)
    public ResponseEntity<ApiResponse<Object>> handleCustomException(CustomException ex) {
        log.error("CustomException: code={}, message={}", ex.getErrorCode(), ex.getMessage());
        HttpStatus status = switch (ex.getErrorCode()) {
            case RESOURCE_NOT_FOUND, APPEAL_NOT_FOUND -> HttpStatus.NOT_FOUND;
            case ACCESS_DENIED, COMPANY_NOT_VERIFIED, EMAIL_NOT_VERIFIED,
                 ACCOUNT_SUSPENDED, COMPANY_SUSPENDED, OPERATION_NOT_ALLOWED_WHILE_SUSPENDED -> HttpStatus.FORBIDDEN;
            case AUTHENTICATION_FAILED -> HttpStatus.UNAUTHORIZED;
            case DUPLICATE_APPLICATION, EMAIL_ALREADY_EXISTS, INVALID_STATE_TRANSITION,
                 CONCURRENT_MODIFICATION, APPEAL_ALREADY_EXISTS, DUPLICATE_FAVORITE_SKILL -> HttpStatus.CONFLICT;
            case RATE_LIMIT_EXCEEDED, CV_QUOTA_EXCEEDED -> HttpStatus.TOO_MANY_REQUESTS;
            case VALIDATION_ERROR, INVALID_FILE, FILE_SIZE_EXCEEDED, TOKEN_EXPIRED,
                 TOKEN_INVALID, INVALID_APPEAL_STATE, FAVORITE_SKILLS_LIMIT_EXCEEDED -> HttpStatus.BAD_REQUEST;
            case CV_TEXT_EXTRACTION_FAILED, CV_STRUCTURING_FAILED, CV_PROCESSING_FAILED -> HttpStatus.UNPROCESSABLE_ENTITY;
            case SERVICE_UNAVAILABLE -> HttpStatus.SERVICE_UNAVAILABLE;
            case FILE_STORAGE_FAILED -> HttpStatus.INTERNAL_SERVER_ERROR;
            default -> HttpStatus.INTERNAL_SERVER_ERROR;
        };

        return new ResponseEntity<>(ApiResponse.error(ex.getErrorCode(), ex.getMessage(), ex.getDetails()), status);
    }

    @ExceptionHandler({org.springframework.orm.ObjectOptimisticLockingFailureException.class,
            org.springframework.dao.PessimisticLockingFailureException.class})
    public ResponseEntity<ApiResponse<Object>> concurrentModification(Exception ex) {
        return ResponseEntity.status(409).body(ApiResponse.error(ErrorCode.CONCURRENT_MODIFICATION,
                "Dữ liệu đang được cập nhật bởi thao tác khác. Vui lòng tải lại.", null));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiResponse<Object>> handleDataIntegrityViolation(DataIntegrityViolationException ex) {
        log.error("DataIntegrityViolationException caught: {}", ex.getMessage());
        return new ResponseEntity<>(
                ApiResponse.error(ErrorCode.DUPLICATE_APPLICATION, "Constraint violation or duplicate record detected.", null),
                HttpStatus.CONFLICT
        );
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Object>> handleValidationException(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach(error -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            errors.put(fieldName, errorMessage);
        });
        log.error("Validation error: {}", errors);

        return new ResponseEntity<>(
                ApiResponse.error(ErrorCode.VALIDATION_ERROR, "Validation failed for request arguments", errors),
                HttpStatus.BAD_REQUEST
        );
    }

    @ExceptionHandler(org.springframework.security.access.AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Object>> handleAccessDenied(org.springframework.security.access.AccessDeniedException ex) {
        var authentication=org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        boolean authenticated=authentication!=null && !(authentication instanceof org.springframework.security.authentication.AnonymousAuthenticationToken);
        return ResponseEntity.status(authenticated?403:401).body(ApiResponse.error(ErrorCode.ACCESS_DENIED,"Yêu cầu xác thực hoặc quyền truy cập phù hợp.",null));
    }

    @ExceptionHandler({org.springframework.web.multipart.support.MissingServletRequestPartException.class,
            org.springframework.web.bind.MissingServletRequestParameterException.class,
            org.springframework.http.converter.HttpMessageNotReadableException.class,
            org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class})
    public ResponseEntity<ApiResponse<Object>> handleMalformedRequest(Exception ex) {
        return ResponseEntity.badRequest().body(ApiResponse.error(ErrorCode.VALIDATION_ERROR,"Yêu cầu thiếu trường bắt buộc hoặc sai định dạng.",null));
    }

    @ExceptionHandler(org.springframework.web.multipart.MaxUploadSizeExceededException.class)
    public ResponseEntity<ApiResponse<Object>> handleMultipartTooLarge(Exception ex) {
        return ResponseEntity.status(413).body(ApiResponse.error(ErrorCode.FILE_SIZE_EXCEEDED,"Tệp hoặc yêu cầu vượt quá giới hạn cho phép.",null));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Object>> handleGenericException(Exception ex) {
        log.error("Unhandled exception: ", ex);
        return new ResponseEntity<>(
                ApiResponse.error(ErrorCode.INTERNAL_SERVER_ERROR, "An unexpected error occurred. Please try again later.", null),
                HttpStatus.INTERNAL_SERVER_ERROR
        );
    }
}
