package com.platform.recruitment.user;

import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.common.ErrorCode;
import com.platform.recruitment.common.ResourceNotFoundException;
import java.awt.Color;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.UUID;
import javax.imageio.ImageIO;
import javax.imageio.stream.MemoryCacheImageInputStream;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class AccountAvatarService {
    private static final long MAX_UPLOAD_BYTES = 5L * 1024 * 1024;
    private static final long MAX_PIXELS = 16_000_000;
    private static final int SIZE = 384;
    private final JdbcTemplate db;

    public record Identity(UUID avatarId, String fullName, boolean emailVerified) {}

    public Identity identity(User user) {
        return db.queryForObject("""
                SELECT u.avatar_id, COALESCE(cp.full_name, rp.full_name), u.email_verified
                FROM users u LEFT JOIN candidate_profiles cp ON cp.user_id=u.id
                LEFT JOIN recruiter_profiles rp ON rp.user_id=u.id WHERE u.id=?
                """, (rs, index) -> new Identity(rs.getObject(1, UUID.class), rs.getString(2), rs.getBoolean(3)),
                user.getId());
    }

    @Transactional
    public UUID replace(User user, MultipartFile file) {
        requireProfileOwner(user);
        byte[] jpeg = normalize(file);
        UUID avatarId = UUID.randomUUID();
        // Lock the owner row before changing the image, including when replacing for the first time.
        db.update("UPDATE users SET avatar_id=? WHERE id=?", avatarId, user.getId());
        db.update("""
                INSERT INTO user_avatar_images(user_id,jpeg) VALUES (?,?)
                ON CONFLICT(user_id) DO UPDATE SET jpeg=EXCLUDED.jpeg
                """, user.getId(), jpeg);
        return avatarId;
    }

    @Transactional
    public void remove(User user) {
        requireProfileOwner(user);
        db.update("UPDATE users SET avatar_id=NULL WHERE id=?", user.getId());
        db.update("DELETE FROM user_avatar_images WHERE user_id=?", user.getId());
    }

    public byte[] read(User viewer, UUID avatarId) {
        UUID viewerId = viewer.getId();
        return db.query("""
                SELECT image.jpeg FROM user_avatar_images image JOIN users owner ON owner.id=image.user_id
                WHERE owner.avatar_id=? AND (owner.id=? OR ? OR (owner.is_active AND (
                    EXISTS (SELECT 1 FROM applications a JOIN candidate_profiles cp ON cp.id=a.candidate_id
                             JOIN jobs j ON j.id=a.job_id JOIN recruiter_profiles rp ON rp.company_id=j.company_id
                             WHERE cp.user_id=owner.id AND rp.user_id=?)
                    OR EXISTS (SELECT 1 FROM inbox_conversations t JOIN applications a ON a.id=t.application_id
                               JOIN jobs j ON j.id=a.job_id JOIN recruiter_profiles rp ON rp.user_id=t.recruiter_user_id
                               WHERE t.candidate_user_id=? AND owner.id=t.recruiter_user_id AND rp.company_id=j.company_id)
                    OR EXISTS (SELECT 1 FROM candidate_profile_views v
                               WHERE v.candidate_user_id=? AND owner.id=v.recruiter_user_id)
                )))
                """, (rs, index) -> rs.getBytes(1), avatarId, viewerId, viewer.getRole() == Role.ADMIN,
                viewerId, viewerId, viewerId).stream().findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Avatar", "id", avatarId));
    }

    private static void requireProfileOwner(User user) {
        if ((user.getRole() != Role.CANDIDATE && user.getRole() != Role.HR)
                || user.isSuspended() || user.isDeactivated()) {
            throw new CustomException(ErrorCode.ACCESS_DENIED, "Avatar changes require an active candidate or recruiter account.");
        }
    }

    static byte[] normalize(MultipartFile file) {
        if (file.getSize() > MAX_UPLOAD_BYTES) {
            throw new CustomException(ErrorCode.FILE_SIZE_EXCEEDED, "Avatar must be at most 5 MB.");
        }
        try (var input = new MemoryCacheImageInputStream(new ByteArrayInputStream(file.getBytes()))) {
            var readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) throw invalidImage();
            var reader = readers.next();
            try {
                reader.setInput(input, true, true);
                String format = reader.getFormatName();
                if (!"JPEG".equalsIgnoreCase(format) && !"PNG".equalsIgnoreCase(format)) throw invalidImage();
                int width = reader.getWidth(0);
                int height = reader.getHeight(0);
                if (width < 1 || height < 1 || (long) width * height > MAX_PIXELS) throw invalidImage();

                int side = Math.min(width, height);
                var region = new java.awt.Rectangle((width - side) / 2, (height - side) / 2, side, side);
                var params = reader.getDefaultReadParam();
                params.setSourceRegion(region);
                int sample = Math.max(1, side / (2 * SIZE));
                params.setSourceSubsampling(sample, sample, 0, 0);
                BufferedImage source = reader.read(0, params);

                var result = new BufferedImage(SIZE, SIZE, BufferedImage.TYPE_INT_RGB);
                var graphics = result.createGraphics();
                try {
                    graphics.setColor(Color.WHITE);
                    graphics.fillRect(0, 0, SIZE, SIZE);
                    graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
                    graphics.drawImage(source, 0, 0, SIZE, SIZE, null);
                } finally {
                    graphics.dispose();
                }
                var output = new ByteArrayOutputStream();
                if (!ImageIO.write(result, "jpeg", output)) throw invalidImage();
                return output.toByteArray();
            } finally {
                reader.dispose();
            }
        } catch (IOException | IllegalArgumentException e) {
            throw invalidImage();
        }
    }

    private static CustomException invalidImage() {
        return new CustomException(ErrorCode.INVALID_FILE, "Use a readable JPG or PNG image of up to 16 megapixels.");
    }
}
