package com.platform.recruitment.taxonomy;

import com.platform.recruitment.common.ApiResponse;
import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.common.ErrorCode;
import com.platform.recruitment.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/v1/taxonomy")
@RequiredArgsConstructor
public class TaxonomyController {

    private final TaxonomyService taxonomyService;
    private final FavoriteSkillService favoriteSkillService;

    public static final List<String> TAXONOMY_CATEGORIES = List.of(
        "BACKEND", "FRONTEND", "DATABASE", "DEVOPS", "DATA_AI",
        "PRODUCT", "MANAGEMENT", "DESIGN", "MARKETING", "SALES",
        "FINANCE", "ACCOUNTING", "HR", "SECURITY", "HEALTHCARE",
        "SUPPLY_CHAIN", "MANUFACTURING", "ENGINEERING", "EDUCATION",
        "LEGAL", "CUSTOMER_SUPPORT", "RETAIL", "HOSPITALITY",
        "AGRICULTURE", "ENERGY", "MEDIA", "REAL_ESTATE", "SOFT_SKILL"
    );

    public static final List<Map<String, String>> INDUSTRY_CATALOG = List.of(
        Map.of("id", "IND_TECH", "canonicalName", "Software Engineering & IT", "vi", "Công nghệ thông tin & Phần mềm", "en", "Software Engineering & IT"),
        Map.of("id", "IND_DATA_AI", "canonicalName", "Data & Artificial Intelligence", "vi", "Dữ liệu & Trí tuệ nhân tạo (AI/ML)", "en", "Data & Artificial Intelligence"),
        Map.of("id", "IND_DEVOPS_CLOUD", "canonicalName", "Cloud Computing & DevOps", "vi", "Điện toán đám mây & DevOps", "en", "Cloud Computing & DevOps"),
        Map.of("id", "IND_SECURITY", "canonicalName", "Cybersecurity & IT Ops", "vi", "An toàn thông tin & Mạng", "en", "Cybersecurity & IT Operations"),
        Map.of("id", "IND_PRODUCT", "canonicalName", "Product & Project Management", "vi", "Quản lý sản phẩm & Dự án", "en", "Product & Project Management"),
        Map.of("id", "IND_DESIGN", "canonicalName", "UI/UX & Digital Design", "vi", "Thiết kế giao diện UI/UX & Đồ họa", "en", "UI/UX & Digital Design"),
        Map.of("id", "IND_MARKETING", "canonicalName", "Marketing & Communications", "vi", "Tiếp thị, Truyền thông & Quảng cáo", "en", "Marketing & Communications"),
        Map.of("id", "IND_SALES", "canonicalName", "Sales & Business Development", "vi", "Kinh doanh & Phát triển thị trường", "en", "Sales & Business Development"),
        Map.of("id", "IND_FINANCE", "canonicalName", "Finance, Banking & Fintech", "vi", "Tài chính, Ngân hàng & Fintech", "en", "Finance, Banking & Fintech"),
        Map.of("id", "IND_ACCOUNTING", "canonicalName", "Accounting & Audit", "vi", "Kế toán, Kiểm toán & Thuế", "en", "Accounting & Audit"),
        Map.of("id", "IND_HR", "canonicalName", "Human Resources & Talent", "vi", "Nhân sự & Tuyển dụng", "en", "Human Resources & Talent"),
        Map.of("id", "IND_BIZ_OPS", "canonicalName", "Business Operations & Consulting", "vi", "Vận hành doanh nghiệp & Tư vấn", "en", "Business Operations & Consulting"),
        Map.of("id", "IND_LOGISTICS", "canonicalName", "Supply Chain & Logistics", "vi", "Chuỗi cung ứng, Mua hàng & Logistics", "en", "Supply Chain & Logistics"),
        Map.of("id", "IND_MANUFACTURING", "canonicalName", "Manufacturing & QA", "vi", "Sản xuất, Kỹ thuật công nghiệp & QA", "en", "Manufacturing & Quality Assurance"),
        Map.of("id", "IND_CONSTRUCTION", "canonicalName", "Civil Engineering & Architecture", "vi", "Xây dựng, Kiến trúc & Nội thất", "en", "Civil Engineering & Architecture"),
        Map.of("id", "IND_ELECTRONICS", "canonicalName", "Electrical & Automation", "vi", "Điện, Điện tử & Tự động hóa", "en", "Electrical, Electronics & Automation"),
        Map.of("id", "IND_HEALTHCARE", "canonicalName", "Healthcare & Life Sciences", "vi", "Y tế, Dược phẩm & Công nghệ sinh học", "en", "Healthcare & Life Sciences"),
        Map.of("id", "IND_EDUCATION", "canonicalName", "Education & Research", "vi", "Giáo dục, Đào tạo & Nghiên cứu", "en", "Education & Research"),
        Map.of("id", "IND_LEGAL", "canonicalName", "Legal & Compliance", "vi", "Pháp lý & Tuân thủ", "en", "Legal & Compliance"),
        Map.of("id", "IND_CUSTOMER_SERVICE", "canonicalName", "Customer Success & Support", "vi", "Chăm sóc khách hàng & Customer Success", "en", "Customer Success & Support"),
        Map.of("id", "IND_RETAIL", "canonicalName", "Retail & E-commerce", "vi", "Bán lẻ & Thương mại điện tử", "en", "Retail & E-commerce"),
        Map.of("id", "IND_HOSPITALITY", "canonicalName", "Hospitality & Tourism", "vi", "Du lịch, Khách sạn & Nhà hàng", "en", "Hospitality & Tourism"),
        Map.of("id", "IND_AGRICULTURE", "canonicalName", "Agriculture & Environment", "vi", "Nông nghiệp & Môi trường", "en", "Agriculture & Environment"),
        Map.of("id", "IND_ENERGY", "canonicalName", "Energy & Sustainability", "vi", "Năng lượng & Phát triển bền vững", "en", "Energy & Sustainability"),
        Map.of("id", "IND_MEDIA", "canonicalName", "Media & Entertainment", "vi", "Truyền thông đa phương tiện & Giải trí", "en", "Media & Entertainment"),
        Map.of("id", "IND_REAL_ESTATE", "canonicalName", "Real Estate & Property", "vi", "Bất động sản & Quản lý tài sản", "en", "Real Estate & Property Management"),
        Map.of("id", "IND_CROSS_DOMAIN", "canonicalName", "Cross-Domain Competencies", "vi", "Kỹ năng chuyên môn dùng chung", "en", "Cross-Domain Competencies")
    );

    @GetMapping("/skills/search")
    public ResponseEntity<ApiResponse<Map<String, Object>>> searchSkills(
            @RequestParam(value = "query", defaultValue = "") String query,
            @RequestParam(value = "category", required = false) String category,
            @RequestParam(value = "limit", defaultValue = "10") int limit) {

        List<TaxonomyService.TaxonomySearchResult> results = (category != null && !category.isBlank())
                ? taxonomyService.searchSkills(query, category, limit)
                : taxonomyService.searchSkills(query, limit);

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("query", query);
        data.put("category", category);
        data.put("total", results.size());
        data.put("skills", results);

        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @GetMapping("/categories")
    public ResponseEntity<ApiResponse<List<String>>> getCategories() {
        return ResponseEntity.ok(ApiResponse.success(TAXONOMY_CATEGORIES));
    }

    @GetMapping("/industries")
    public ResponseEntity<ApiResponse<List<Map<String, String>>>> getIndustries() {
        return ResponseEntity.ok(ApiResponse.success(INDUSTRY_CATALOG));
    }

    // ============================================================
    // AUTHENTICATED USER FAVORITE SKILLS (MAX 10 ENFORCED SERVER-SIDE)
    // ============================================================

    @GetMapping("/favorites")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getFavoriteSkills(
            @AuthenticationPrincipal User currentUser) {
        if (currentUser == null) {
            throw new CustomException(ErrorCode.AUTHENTICATION_FAILED, "Yêu cầu đăng nhập để xem kỹ năng yêu thích.");
        }

        List<TaxonomyService.TaxonomySearchResult> favorites = favoriteSkillService.getFavoriteSkills(currentUser.getId());
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("userId", currentUser.getId());
        data.put("total", favorites.size());
        data.put("maxLimit", FavoriteSkillService.MAX_FAVORITES_PER_USER);
        data.put("favorites", favorites);

        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @PostMapping("/favorites/{skillId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> addFavoriteSkill(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID skillId) {
        if (currentUser == null) {
            throw new CustomException(ErrorCode.AUTHENTICATION_FAILED, "Yêu cầu đăng nhập để lưu kỹ năng yêu thích.");
        }

        TaxonomyService.TaxonomySearchResult added = favoriteSkillService.addFavoriteSkill(currentUser.getId(), skillId);
        List<TaxonomyService.TaxonomySearchResult> currentFavorites = favoriteSkillService.getFavoriteSkills(currentUser.getId());

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("addedSkill", added);
        data.put("total", currentFavorites.size());
        data.put("maxLimit", FavoriteSkillService.MAX_FAVORITES_PER_USER);
        data.put("favorites", currentFavorites);

        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @DeleteMapping("/favorites/{skillId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> removeFavoriteSkill(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID skillId) {
        if (currentUser == null) {
            throw new CustomException(ErrorCode.AUTHENTICATION_FAILED, "Yêu cầu đăng nhập để gỡ kỹ năng yêu thích.");
        }

        favoriteSkillService.removeFavoriteSkill(currentUser.getId(), skillId);
        List<TaxonomyService.TaxonomySearchResult> currentFavorites = favoriteSkillService.getFavoriteSkills(currentUser.getId());

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("removedSkillId", skillId);
        data.put("total", currentFavorites.size());
        data.put("maxLimit", FavoriteSkillService.MAX_FAVORITES_PER_USER);
        data.put("favorites", currentFavorites);

        return ResponseEntity.ok(ApiResponse.success(data));
    }
}
