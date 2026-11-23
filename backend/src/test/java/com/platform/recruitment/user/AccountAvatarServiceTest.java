package com.platform.recruitment.user;

import com.platform.recruitment.common.CustomException;
import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import static org.junit.jupiter.api.Assertions.*;

class AccountAvatarServiceTest {
    @Test
    void normalizesTheCenterOfAnImageToSquareJpeg() throws Exception {
        var source = new BufferedImage(800, 400, BufferedImage.TYPE_INT_RGB);
        var graphics = source.createGraphics();
        graphics.setColor(Color.BLUE);
        graphics.fillRect(0, 0, 800, 400);
        graphics.setColor(Color.GREEN);
        graphics.fillRect(200, 0, 400, 400);
        graphics.dispose();

        var bytes = new ByteArrayOutputStream();
        assertTrue(ImageIO.write(source, "png", bytes));
        var file = new MockMultipartFile("file", "original.png", "image/png", bytes.toByteArray());
        byte[] output = AccountAvatarService.normalize(file);
        assertEquals(0xff, output[0] & 0xff);
        assertEquals(0xd8, output[1] & 0xff);
        var image = ImageIO.read(new ByteArrayInputStream(output));
        assertEquals(384, image.getWidth());
        assertEquals(384, image.getHeight());
        assertTrue(new Color(image.getRGB(0, 0)).getGreen() > 220);
    }

    @Test
    void rejectsSpoofedAndOversizedImages() {
        var spoof = new MockMultipartFile("file", "fake.jpg", "image/jpeg", new byte[]{1, 2, 3, 4});
        assertThrows(CustomException.class, () -> AccountAvatarService.normalize(spoof));
        var tooLarge = new MockMultipartFile("file", "big.png", "image/png", new byte[5 * 1024 * 1024 + 1]);
        assertThrows(CustomException.class, () -> AccountAvatarService.normalize(tooLarge));
    }
}
