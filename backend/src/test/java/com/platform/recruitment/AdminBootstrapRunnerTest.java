package com.platform.recruitment;

import com.platform.recruitment.admin.AdminBootstrapRunner;
import com.platform.recruitment.user.Role;
import com.platform.recruitment.user.User;
import com.platform.recruitment.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AdminBootstrapRunnerTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    private AdminBootstrapRunner bootstrapRunner;

    @BeforeEach
    void setUp() {
        bootstrapRunner = new AdminBootstrapRunner(userRepository, passwordEncoder);
    }

    @Test
    @DisplayName("Skip bootstrap if ADMIN user already exists in DB")
    void testSkipWhenAdminExists() {
        when(userRepository.existsByRole(Role.ADMIN)).thenReturn(true);

        bootstrapRunner.run();

        verify(userRepository, never()).save(any());
        verify(passwordEncoder, never()).encode(any());
    }

    @Test
    @DisplayName("Skip bootstrap when environment variables are not configured")
    void testSkipWhenEnvVariablesEmpty() {
        when(userRepository.existsByRole(Role.ADMIN)).thenReturn(false);
        ReflectionTestUtils.setField(bootstrapRunner, "initialAdminEmail", "");
        ReflectionTestUtils.setField(bootstrapRunner, "initialAdminPassword", "");

        bootstrapRunner.run();

        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Bootstrap new ADMIN user when valid env vars are supplied")
    void testBootstrapNewAdminUser() {
        when(userRepository.existsByRole(Role.ADMIN)).thenReturn(false);
        when(userRepository.existsByEmail("admin@company.com")).thenReturn(false);
        when(passwordEncoder.encode("SecretPass123!")).thenReturn("encoded_hash");

        ReflectionTestUtils.setField(bootstrapRunner, "initialAdminEmail", "admin@company.com");
        ReflectionTestUtils.setField(bootstrapRunner, "initialAdminPassword", "SecretPass123!");

        bootstrapRunner.run();

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());

        User saved = userCaptor.getValue();
        assertEquals("admin@company.com", saved.getEmail());
        assertEquals("encoded_hash", saved.getPasswordHash());
        assertEquals(Role.ADMIN, saved.getRole());
        assertTrue(saved.getIsActive());
        assertTrue(saved.getEmailVerified());
    }

    @Test
    @DisplayName("Promote existing user to ADMIN if email matches")
    void testPromoteExistingUser() {
        User existingUser = User.builder()
                .email("promoted@company.com")
                .role(Role.CANDIDATE)
                .isActive(true)
                .emailVerified(true)
                .build();

        when(userRepository.existsByRole(Role.ADMIN)).thenReturn(false);
        when(userRepository.existsByEmail("promoted@company.com")).thenReturn(true);
        when(userRepository.findByEmail("promoted@company.com")).thenReturn(Optional.of(existingUser));

        ReflectionTestUtils.setField(bootstrapRunner, "initialAdminEmail", "promoted@company.com");
        ReflectionTestUtils.setField(bootstrapRunner, "initialAdminPassword", "SecretPass123!");

        bootstrapRunner.run();

        verify(userRepository).save(existingUser);
        assertEquals(Role.ADMIN, existingUser.getRole());
    }

    @Test
    @DisplayName("Skip bootstrap when ADMIN_INITIAL_EMAIL format is invalid")
    void testSkipWhenInvalidEmailFormat() {
        when(userRepository.existsByRole(Role.ADMIN)).thenReturn(false);
        ReflectionTestUtils.setField(bootstrapRunner, "initialAdminEmail", "invalid-email-format");
        ReflectionTestUtils.setField(bootstrapRunner, "initialAdminPassword", "SecretPass123!");

        bootstrapRunner.run();

        verify(userRepository, never()).save(any());
    }
}
