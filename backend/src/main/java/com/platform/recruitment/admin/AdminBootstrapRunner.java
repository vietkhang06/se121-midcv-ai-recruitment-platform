package com.platform.recruitment.admin;

import com.platform.recruitment.user.Role;
import com.platform.recruitment.user.User;
import com.platform.recruitment.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Safe Admin Bootstrapping Mechanism.
 * Ensures that production migrations never contain hardcoded plaintext or hash credentials.
 * An administrator account is only seeded if environment variables ADMIN_INITIAL_EMAIL
 * and ADMIN_INITIAL_PASSWORD are provided and no existing ADMIN exists.
 */
@Component
public class AdminBootstrapRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminBootstrapRunner.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.bootstrap.email:${ADMIN_INITIAL_EMAIL:}}")
    private String initialAdminEmail;

    @Value("${app.admin.bootstrap.password:${ADMIN_INITIAL_PASSWORD:}}")
    private String initialAdminPassword;

    public AdminBootstrapRunner(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (userRepository.existsByRole(Role.ADMIN)) {
            log.debug("Authoritative ADMIN user already present. Skipping admin bootstrap.");
            return;
        }

        if (initialAdminEmail == null || initialAdminEmail.isBlank() ||
            initialAdminPassword == null || initialAdminPassword.isBlank()) {
            log.info("No ADMIN account found in database. Configure ADMIN_INITIAL_EMAIL and ADMIN_INITIAL_PASSWORD to bootstrap.");
            return;
        }

        String email = initialAdminEmail.trim();
        if (!email.contains("@") || !email.contains(".")) {
            log.warn("Invalid ADMIN_INITIAL_EMAIL format configured. Skipping admin bootstrap.");
            return;
        }

        if (userRepository.existsByEmail(email)) {
            User existing = userRepository.findByEmail(email).orElseThrow();
            existing.setRole(Role.ADMIN);
            existing.setIsActive(true);
            existing.setEmailVerified(true);
            userRepository.save(existing);
            log.info("Promoted existing user to initial ADMIN role successfully.");
            return;
        }

        User admin = User.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(initialAdminPassword))
                .role(Role.ADMIN)
                .isActive(true)
                .emailVerified(true)
                .build();

        userRepository.save(admin);
        log.info("Successfully bootstrapped initial system ADMIN account.");
    }
}
