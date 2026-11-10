package com.platform.recruitment.product;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.platform.recruitment.common.*;
import java.util.*;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

@Component
public class OccupationCatalog {
  private final Set<String> codes = new HashSet<>();
  private final Set<String> aiEligibleCodes = new HashSet<>();
  private final Set<String> aiEligibleParents = new HashSet<>();
  private final Set<String> itCodes = new HashSet<>();

  public OccupationCatalog(ObjectMapper mapper) throws java.io.IOException {
    try (var stream = new ClassPathResource("taxonomy/occupations.json").getInputStream()) {
      for (var row : mapper.readTree(stream)) {
        String code = row.path("code").asText();
        String parent = row.path("parentCode").asText();
        boolean curated = code.startsWith("MIDCV_IT_") || code.startsWith("MIDCV_REF_");
        codes.add(code);
        if (curated) {
          aiEligibleCodes.add(code);
          if (!parent.isBlank()) aiEligibleParents.add(parent);
        }
        if (row.path("it").asBoolean(false) || code.startsWith("MIDCV_IT_")) itCodes.add(code);
      }
    }
  }

  public void validate(List<String> selected) {
    if (selected != null
        && (selected.size() > 30 || selected.stream().anyMatch(code -> !codes.contains(code))))
      throw new CustomException(
          ErrorCode.VALIDATION_ERROR, "Chọn tối đa 30 vị trí trong danh mục nghề midCV.");
  }

  /**
   * Matching remains multi-industry as required by the project proposal. The curated
   * list from the HR reference screen defines supported professional positions; the
   * expanded IT specializations receive priority but are not the only eligible group.
   */
  public boolean isAiScoringEligible(List<String> selected) {
    if (selected == null || selected.isEmpty()) return false;
    return selected.stream().anyMatch(code -> aiEligibleCodes.contains(code)
        || aiEligibleParents.contains(code));
  }

  public boolean hasItPriority(List<String> selected) {
    return selected != null && selected.stream().anyMatch(code -> itCodes.contains(code)
        || code.startsWith("MIDCV_IT_") || code.startsWith("25") || code.startsWith("35"));
  }
}
