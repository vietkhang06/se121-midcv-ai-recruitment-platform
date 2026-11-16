package com.platform.recruitment.config;

import java.nio.charset.StandardCharsets;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("prod")
public class ProductionSecretGuard {
    public ProductionSecretGuard(@Value("${jwt.secret}") String secret) {
        if (secret == null || secret.getBytes(StandardCharsets.UTF_8).length < 32
                || secret.equals("d9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8")
                || secret.toLowerCase(java.util.Locale.ROOT).contains("change_me")
                || secret.toLowerCase(java.util.Locale.ROOT).contains("change-me")) {
            throw new IllegalStateException("Production requires an independently generated JWT_SECRET of at least 32 UTF-8 bytes");
        }
    }
}
