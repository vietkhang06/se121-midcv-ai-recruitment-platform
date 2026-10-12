package com.platform.recruitment.taxonomy;

import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.common.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class FavoriteSkillService {

    public static final int MAX_FAVORITES_PER_USER = 10;

    private final JdbcTemplate jdbc;
    private final TaxonomyService taxonomyService;

    @Transactional(readOnly = true)
    public List<TaxonomyService.TaxonomySearchResult> getFavoriteSkills(UUID userId) {
        if (userId == null) {
            throw new CustomException(ErrorCode.AUTHENTICATION_FAILED, "Người dùng chưa xác thực.");
        }

        String sql = """
            SELECT s.id, s.canonical_name, s.normalized_name, s.category, s.description
            FROM user_favorite_skills ufs
            JOIN taxonomy_skills s ON ufs.skill_id = s.id
            WHERE ufs.user_id = ? AND s.active = true
            ORDER BY ufs.created_at ASC
        """;

        try {
            return jdbc.query(sql, (rs, rowNum) -> new TaxonomyService.TaxonomySearchResult(
                rs.getObject("id", UUID.class),
                rs.getString("canonical_name"),
                rs.getString("normalized_name"),
                rs.getString("category"),
                rs.getString("description"),
                false
            ), userId);
        } catch (Exception e) {
            log.error("Failed to load favorite skills for user {}: {}", userId, e.getMessage());
            return Collections.emptyList();
        }
    }

    @Transactional
    public TaxonomyService.TaxonomySearchResult addFavoriteSkill(UUID userId, UUID skillId) {
        if (userId == null) {
            throw new CustomException(ErrorCode.AUTHENTICATION_FAILED, "Người dùng chưa xác thực.");
        }
        if (skillId == null) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR, "Mã kỹ năng không được để trống.");
        }

        // 1. Verify that the skill exists in taxonomy_skills
        String skillCheckSql = "SELECT id, canonical_name, normalized_name, category, description FROM taxonomy_skills WHERE id = ? AND active = true";
        List<TaxonomyService.TaxonomySearchResult> matches = jdbc.query(skillCheckSql, (rs, rowNum) -> new TaxonomyService.TaxonomySearchResult(
            rs.getObject("id", UUID.class),
            rs.getString("canonical_name"),
            rs.getString("normalized_name"),
            rs.getString("category"),
            rs.getString("description"),
            false
        ), skillId);

        if (matches.isEmpty()) {
            throw new CustomException(ErrorCode.RESOURCE_NOT_FOUND, "Không tìm thấy kỹ năng trong từ điển taxonomy chuẩn.");
        }
        TaxonomyService.TaxonomySearchResult skill = matches.get(0);

        // 2. Check if already favorited by this user
        Integer existingCount = jdbc.queryForObject(
            "SELECT COUNT(*) FROM user_favorite_skills WHERE user_id = ? AND skill_id = ?",
            Integer.class,
            userId, skillId
        );
        if (existingCount != null && existingCount > 0) {
            // Already favorited, return gracefully
            return skill;
        }

        // 3. Enforce the strict 10-item limit per user
        Integer currentTotal = jdbc.queryForObject(
            "SELECT COUNT(*) FROM user_favorite_skills WHERE user_id = ?",
            Integer.class,
            userId
        );

        if (currentTotal != null && currentTotal >= MAX_FAVORITES_PER_USER) {
            throw new CustomException(
                ErrorCode.FAVORITE_SKILLS_LIMIT_EXCEEDED,
                String.format("Bạn đã đạt giới hạn tối đa %d kỹ năng yêu thích. Vui lòng bỏ bớt kỹ năng trước khi thêm mới.", MAX_FAVORITES_PER_USER)
            );
        }

        // 4. Insert into database
        UUID recordId = UUID.randomUUID();
        try {
            jdbc.update(
                "INSERT INTO user_favorite_skills(id, user_id, skill_id, created_at) VALUES (?, ?, ?, now())",
                recordId, userId, skillId
            );
        } catch (DuplicateKeyException e) {
            // Concurrency safety fallback
            log.info("Duplicate favorite skill insertion ignored for user {} skill {}", userId, skillId);
        }

        return skill;
    }

    @Transactional
    public void removeFavoriteSkill(UUID userId, UUID skillId) {
        if (userId == null) {
            throw new CustomException(ErrorCode.AUTHENTICATION_FAILED, "Người dùng chưa xác thực.");
        }
        if (skillId == null) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR, "Mã kỹ năng không được để trống.");
        }

        jdbc.update(
            "DELETE FROM user_favorite_skills WHERE user_id = ? AND skill_id = ?",
            userId, skillId
        );
    }
}
