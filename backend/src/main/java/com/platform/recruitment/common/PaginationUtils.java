package com.platform.recruitment.common;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.util.Set;

public class PaginationUtils {

    public static final int DEFAULT_PAGE = 0;
    public static final int DEFAULT_SIZE = 20;
    public static final int MAX_SIZE = 100;

    public static Pageable createPageable(int page, int size, String sortField, String direction,
                                          Set<String> allowedSortFields, String defaultSortField) {
        if (page < 0) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR, "Số trang (page) không được nhỏ hơn 0.");
        }
        if (size <= 0) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR, "Kích thước trang (size) phải lớn hơn 0.");
        }
        if (size > MAX_SIZE) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR, "Kích thước trang (size) không được vượt quá " + MAX_SIZE + ".");
        }

        String field = (sortField == null || sortField.trim().isEmpty()) ? defaultSortField : sortField.trim();
        if (allowedSortFields != null && !allowedSortFields.isEmpty() && !allowedSortFields.contains(field)) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR,
                    "Trường sắp xếp không hợp lệ: '" + field + "'. Cho phép: " + allowedSortFields);
        }

        Sort.Direction sortDirection;
        if (direction == null || direction.trim().isEmpty() || direction.equalsIgnoreCase("desc")) {
            sortDirection = Sort.Direction.DESC;
        } else if (direction.equalsIgnoreCase("asc")) {
            sortDirection = Sort.Direction.ASC;
        } else {
            throw new CustomException(ErrorCode.VALIDATION_ERROR,
                    "Hướng sắp xếp không hợp lệ: '" + direction + "'. Chỉ chấp nhận 'asc' hoặc 'desc'.");
        }

        return PageRequest.of(page, size, Sort.by(sortDirection, field));
    }
}
