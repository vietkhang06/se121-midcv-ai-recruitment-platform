package com.platform.recruitment.taxonomy;

import com.platform.recruitment.common.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/taxonomy")
@RequiredArgsConstructor
public class TaxonomyController {

    private final TaxonomyService taxonomyService;

    @GetMapping("/skills/search")
    public ResponseEntity<ApiResponse<Map<String, Object>>> searchSkills(
            @RequestParam(value = "query", defaultValue = "") String query,
            @RequestParam(value = "limit", defaultValue = "10") int limit) {

        List<TaxonomyService.TaxonomySearchResult> results = taxonomyService.searchSkills(query, limit);

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("query", query);
        data.put("total", results.size());
        data.put("skills", results);

        return ResponseEntity.ok(ApiResponse.success(data));
    }
}
