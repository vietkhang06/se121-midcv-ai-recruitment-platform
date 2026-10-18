package com.platform.recruitment.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class JwtAuthenticationFilterTest {

    private final JwtAuthenticationFilter filter = new JwtAuthenticationFilter(null, null);

    @Test
    void bearerHeaderIsAccepted() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer synthetic-token");

        assertEquals("synthetic-token", filter.getJwtFromRequest(request));
    }

    @Test
    void queryStringTokenIsNotAcceptedForAuthentication() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setParameter("token", "synthetic-token");

        assertNull(filter.getJwtFromRequest(request));
    }
}
