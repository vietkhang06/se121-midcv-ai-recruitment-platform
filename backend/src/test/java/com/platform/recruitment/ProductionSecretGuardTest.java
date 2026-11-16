package com.platform.recruitment;
import com.platform.recruitment.config.ProductionSecretGuard;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
class ProductionSecretGuardTest {
    @Test void rejectsMissingShortAndKnownDevelopmentKeys() {
        assertThrows(IllegalStateException.class, () -> new ProductionSecretGuard(null));
        assertThrows(IllegalStateException.class, () -> new ProductionSecretGuard("short"));
        assertThrows(IllegalStateException.class, () -> new ProductionSecretGuard("d9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8"));
        assertDoesNotThrow(() -> new ProductionSecretGuard(java.util.UUID.randomUUID().toString()));
    }
}
