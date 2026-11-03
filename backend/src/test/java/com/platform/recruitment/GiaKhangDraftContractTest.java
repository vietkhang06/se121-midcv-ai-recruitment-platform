package com.platform.recruitment;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.platform.recruitment.common.*;
import com.platform.recruitment.cv.*;
import com.platform.recruitment.job.*;
import com.platform.recruitment.matching.*;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

/** Unit contracts, not PostgreSQL/provider acceptance. All data is synthetic. */
class GiaKhangDraftContractTest {
    CVVersion version(String json) {
        CVVersion version = CVVersion.builder().title("Synthetic CV").status("DRAFT").structuredJsonContent(json).build();
        version.setId(UUID.randomUUID()); return version;
    }

    @Test void staleSaveAndConfirmCannotUseEarlierContentOrVersion() {
        CVVersion version = version("{}");
        String revision = DraftRevision.of(version);
        assertDoesNotThrow(() -> DraftRevision.requireCurrent(version, version.getId(), revision));
        version.setStructuredJsonContent("{\"skills\":[{\"name\":\"Java\"}]}");
        CustomException stale = assertThrows(CustomException.class, () -> DraftRevision.requireCurrent(version, version.getId(), revision));
        assertEquals(ErrorCode.CONCURRENT_MODIFICATION, stale.getErrorCode());
        assertThrows(CustomException.class, () -> DraftRevision.requireCurrent(version, UUID.randomUUID(), DraftRevision.of(version)));
        String saved = DraftRevision.of(version); version.setStatus("CONFIRMED");
        assertThrows(CustomException.class, () -> DraftRevision.requireCurrent(version, version.getId(), saved));
        assertThrows(CustomException.class, () -> DraftRevision.requireCurrent(version, null, null));
        assertThrows(CustomException.class, () -> DraftRevision.requireCurrent(version, version.getId(), ""));
    }

}
