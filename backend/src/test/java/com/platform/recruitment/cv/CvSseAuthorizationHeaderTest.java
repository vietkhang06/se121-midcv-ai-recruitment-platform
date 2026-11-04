package com.platform.recruitment.cv;

import com.platform.recruitment.common.CustomException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class CvSseAuthorizationHeaderTest {
    @Test
    void acceptsBearerHeaderCaseInsensitivelyAndTrimsToken() {
        assertEquals("jwt-token", CVController.requireBearerToken("bEaReR   jwt-token "));
    }

    @Test
    void rejectsMissingOrMalformedBearerHeaderAsAuthenticationFailure() {
        for (String value : new String[]{null, "", "Basic abc", "Bearer ", "Bearer abc def"}) {
            assertThrows(CustomException.class, () -> CVController.requireBearerToken(value));
        }
    }
}
