package com.platform.recruitment.cv;

import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.common.ErrorCode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Objects;
import java.util.UUID;

/** Content revision checked while the CV parent row is locked. No mutable timestamps involved. */
public final class DraftRevision {
    private DraftRevision() {}

    public static String of(CVVersion version) {
        if (version == null) return null;
        try {
            String input = version.getId() + "\u0000" + version.getStatus() + "\u0000"
                    + version.getTitle() + "\u0000" + version.getStructuredJsonContent();
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(input.getBytes(StandardCharsets.UTF_8)));
        } catch (java.security.NoSuchAlgorithmException impossible) {
            throw new IllegalStateException(impossible);
        }
    }

    public static void requireCurrent(CVVersion current, UUID expectedVersion, String expectedRevision) {
        if ((expectedVersion != null && (current == null || !expectedVersion.equals(current.getId())))
                || (expectedRevision != null && !Objects.equals(expectedRevision, of(current)))) {
            throw new CustomException(ErrorCode.CONCURRENT_MODIFICATION,
                    "CV changed since it was loaded. Reload and review before saving or confirming.");
        }
    }
}
