package com.platform.recruitment.config;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.slf4j.MDC;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.util.UUID;

@Component
@org.springframework.core.annotation.Order(org.springframework.core.Ordered.HIGHEST_PRECEDENCE)
public class RequestIdFilter extends OncePerRequestFilter {
    @Override protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain) throws ServletException, IOException {
        String supplied = request.getHeader("X-Request-ID");
        String id = supplied != null && supplied.matches("[A-Za-z0-9_-]{1,64}") ? supplied : UUID.randomUUID().toString();
        response.setHeader("X-Request-ID", id);
        try (MDC.MDCCloseable ignored = MDC.putCloseable("request_id", id)) { chain.doFilter(request,response); }
    }
}
