package com.platform.recruitment;

import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.common.ErrorCode;
import com.platform.recruitment.common.PageResponse;
import com.platform.recruitment.common.PaginationUtils;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

public class PaginationUtilsTest {

    private static final Set<String> ALLOWED_FIELDS = Set.of("createdAt", "title", "status");

    @Test
    @DisplayName("1. Trang đầu (Page 0) tạo Pageable hợp lệ")
    void testFirstPage() {
        Pageable p = PaginationUtils.createPageable(0, 10, "createdAt", "desc", ALLOWED_FIELDS, "createdAt");
        assertEquals(0, p.getPageNumber());
        assertEquals(10, p.getPageSize());
        assertEquals(Sort.Direction.DESC, p.getSort().getOrderFor("createdAt").getDirection());
    }

    @Test
    @DisplayName("2. Trang giữa (Middle page) tạo Pageable hợp lệ")
    void testMiddlePage() {
        Pageable p = PaginationUtils.createPageable(5, 20, "title", "asc", ALLOWED_FIELDS, "createdAt");
        assertEquals(5, p.getPageNumber());
        assertEquals(20, p.getPageSize());
        assertEquals(Sort.Direction.ASC, p.getSort().getOrderFor("title").getDirection());
    }

    @Test
    @DisplayName("3. Trang cuối và PageResponse metadata")
    void testLastPageResponse() {
        List<String> items = List.of("Item A", "Item B");
        Pageable p = PageRequest.of(2, 2, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<String> page = new PageImpl<>(items, p, 6);

        PageResponse<String> res = PageResponse.of(page, "createdAt", "desc");
        assertEquals(2, res.getPage());
        assertEquals(2, res.getSize());
        assertEquals(6, res.getTotalElements());
        assertEquals(3, res.getTotalPages());
        assertFalse(res.isFirst());
        assertTrue(res.isLast());
        assertEquals("createdAt", res.getSort().getField());
        assertEquals("desc", res.getSort().getDirection());
    }

    @Test
    @DisplayName("4. Không có dữ liệu (Empty page)")
    void testEmptyPageResponse() {
        Pageable p = PageRequest.of(0, 20);
        Page<String> emptyPage = new PageImpl<>(List.of(), p, 0);

        PageResponse<String> res = PageResponse.of(emptyPage, "createdAt", "desc");
        assertTrue(res.getContent().isEmpty());
        assertEquals(0, res.getTotalElements());
        assertEquals(0, res.getTotalPages());
        assertTrue(res.isFirst());
        assertTrue(res.isLast());
    }

    @Test
    @DisplayName("5. Page không hợp lệ (< 0) ném VALIDATION_ERROR")
    void testInvalidPage() {
        CustomException ex = assertThrows(CustomException.class, () ->
                PaginationUtils.createPageable(-1, 20, "createdAt", "desc", ALLOWED_FIELDS, "createdAt"));
        assertEquals(ErrorCode.VALIDATION_ERROR, ex.getErrorCode());
        assertTrue(ex.getMessage().contains("Số trang"));
    }

    @Test
    @DisplayName("6. Size không hợp lệ (<= 0 hoặc > max 100) ném VALIDATION_ERROR")
    void testInvalidSize() {
        CustomException exZero = assertThrows(CustomException.class, () ->
                PaginationUtils.createPageable(0, 0, "createdAt", "desc", ALLOWED_FIELDS, "createdAt"));
        assertEquals(ErrorCode.VALIDATION_ERROR, exZero.getErrorCode());

        CustomException exOverMax = assertThrows(CustomException.class, () ->
                PaginationUtils.createPageable(0, 101, "createdAt", "desc", ALLOWED_FIELDS, "createdAt"));
        assertEquals(ErrorCode.VALIDATION_ERROR, exOverMax.getErrorCode());
        assertTrue(exOverMax.getMessage().contains("100"));
    }

    @Test
    @DisplayName("7. Sort tăng dần (asc)")
    void testSortAscending() {
        Pageable p = PaginationUtils.createPageable(0, 20, "title", "asc", ALLOWED_FIELDS, "createdAt");
        assertEquals(Sort.Direction.ASC, p.getSort().getOrderFor("title").getDirection());
    }

    @Test
    @DisplayName("8. Sort giảm dần (desc)")
    void testSortDescending() {
        Pageable p = PaginationUtils.createPageable(0, 20, "createdAt", "desc", ALLOWED_FIELDS, "createdAt");
        assertEquals(Sort.Direction.DESC, p.getSort().getOrderFor("createdAt").getDirection());
    }

    @Test
    @DisplayName("9. Field sort không được phép ném VALIDATION_ERROR")
    void testDisallowedSortField() {
        CustomException ex = assertThrows(CustomException.class, () ->
                PaginationUtils.createPageable(0, 20, "creditCardNumber", "desc", ALLOWED_FIELDS, "createdAt"));
        assertEquals(ErrorCode.VALIDATION_ERROR, ex.getErrorCode());
        assertTrue(ex.getMessage().contains("Trường sắp xếp không hợp lệ"));
    }

    @Test
    @DisplayName("10. Direction không hợp lệ (không phải asc/desc) ném VALIDATION_ERROR")
    void testInvalidDirection() {
        CustomException ex = assertThrows(CustomException.class, () ->
                PaginationUtils.createPageable(0, 20, "createdAt", "sideways", ALLOWED_FIELDS, "createdAt"));
        assertEquals(ErrorCode.VALIDATION_ERROR, ex.getErrorCode());
        assertTrue(ex.getMessage().contains("Hướng sắp xếp không hợp lệ"));
    }
}
