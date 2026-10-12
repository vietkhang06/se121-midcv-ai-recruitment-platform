package com.platform.recruitment;

import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.common.ErrorCode;
import com.platform.recruitment.taxonomy.FavoriteSkillService;
import com.platform.recruitment.taxonomy.TaxonomyService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class FavoriteSkillServiceTest {

    @Mock
    private JdbcTemplate jdbc;

    @Mock
    private TaxonomyService taxonomyService;

    private FavoriteSkillService service;

    private final UUID userA = UUID.randomUUID();
    private final UUID userB = UUID.randomUUID();
    private final UUID skill1 = UUID.randomUUID();
    private final UUID skill2 = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        service = new FavoriteSkillService(jdbc, taxonomyService);
    }

    @Test
    @DisplayName("User can add favorite skill when count is under 10")
    void testAddFavoriteSkillSuccess() {
        TaxonomyService.TaxonomySearchResult skill = new TaxonomyService.TaxonomySearchResult(
                skill1, "Java", "java", "BACKEND", "Java programming language", false
        );

        when(jdbc.query(anyString(), any(RowMapper.class), eq(skill1)))
                .thenReturn(List.of(skill));
        when(jdbc.queryForObject(contains("user_id = ? AND skill_id = ?"), eq(Integer.class), eq(userA), eq(skill1)))
                .thenReturn(0);
        when(jdbc.queryForObject(contains("SELECT COUNT(*) FROM user_favorite_skills WHERE user_id = ?"), eq(Integer.class), eq(userA)))
                .thenReturn(5);

        TaxonomyService.TaxonomySearchResult result = service.addFavoriteSkill(userA, skill1);

        assertNotNull(result);
        assertEquals("Java", result.canonicalName());
        verify(jdbc, times(1)).update(contains("INSERT INTO user_favorite_skills"), any(UUID.class), eq(userA), eq(skill1));
    }

    @Test
    @DisplayName("Server enforces strict maximum 10 favorite skills per user")
    void testAddFavoriteSkillLimitExceeded() {
        TaxonomyService.TaxonomySearchResult skill = new TaxonomyService.TaxonomySearchResult(
                skill1, "Java", "java", "BACKEND", "Java programming language", false
        );

        when(jdbc.query(anyString(), any(RowMapper.class), eq(skill1)))
                .thenReturn(List.of(skill));
        when(jdbc.queryForObject(contains("user_id = ? AND skill_id = ?"), eq(Integer.class), eq(userA), eq(skill1)))
                .thenReturn(0);
        when(jdbc.queryForObject(contains("SELECT COUNT(*) FROM user_favorite_skills WHERE user_id = ?"), eq(Integer.class), eq(userA)))
                .thenReturn(10); // Already 10 items

        CustomException ex = assertThrows(CustomException.class, () -> service.addFavoriteSkill(userA, skill1));
        assertEquals(ErrorCode.FAVORITE_SKILLS_LIMIT_EXCEEDED, ex.getErrorCode());
        assertTrue(ex.getMessage().contains("10"));
        verify(jdbc, never()).update(contains("INSERT INTO user_favorite_skills"), any(UUID.class), any(UUID.class), any(UUID.class));
    }

    @Test
    @DisplayName("Duplicate favorite skill does not increment count or throw unexpected error")
    void testAddDuplicateFavoriteSkillReturnsExisting() {
        TaxonomyService.TaxonomySearchResult skill = new TaxonomyService.TaxonomySearchResult(
                skill1, "Java", "java", "BACKEND", "Java programming language", false
        );

        when(jdbc.query(anyString(), any(RowMapper.class), eq(skill1)))
                .thenReturn(List.of(skill));
        when(jdbc.queryForObject(contains("user_id = ? AND skill_id = ?"), eq(Integer.class), eq(userA), eq(skill1)))
                .thenReturn(1); // Already favorited

        TaxonomyService.TaxonomySearchResult result = service.addFavoriteSkill(userA, skill1);
        assertEquals("Java", result.canonicalName());
        verify(jdbc, never()).update(contains("INSERT INTO user_favorite_skills"), any(UUID.class), any(UUID.class), any(UUID.class));
    }

    @Test
    @DisplayName("User can remove favorite skill")
    void testRemoveFavoriteSkill() {
        service.removeFavoriteSkill(userA, skill1);
        verify(jdbc, times(1)).update(contains("DELETE FROM user_favorite_skills"), eq(userA), eq(skill1));
    }

    @Test
    @DisplayName("Non-existent skill throws RESOURCE_NOT_FOUND")
    void testAddNonExistentSkillThrows() {
        when(jdbc.query(anyString(), any(RowMapper.class), eq(skill2)))
                .thenReturn(Collections.emptyList());

        CustomException ex = assertThrows(CustomException.class, () -> service.addFavoriteSkill(userA, skill2));
        assertEquals(ErrorCode.RESOURCE_NOT_FOUND, ex.getErrorCode());
    }
}
