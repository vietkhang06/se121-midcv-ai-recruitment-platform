package com.platform.recruitment;

import com.platform.recruitment.auth.*;
import com.platform.recruitment.candidate.CandidateProfileRepository;
import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.common.ErrorCode;
import com.platform.recruitment.company.CompanyRepository;
import com.platform.recruitment.company.RecruiterProfileRepository;
import com.platform.recruitment.email.EmailService;
import com.platform.recruitment.user.Role;
import com.platform.recruitment.user.User;
import com.platform.recruitment.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.ZonedDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private CandidateProfileRepository candidateProfileRepository;

    @Mock
    private CompanyRepository companyRepository;

    @Mock
    private RecruiterProfileRepository recruiterProfileRepository;

    @Mock
    private EmailVerificationTokenRepository emailVerificationTokenRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtTokenProvider tokenProvider;

    @Mock
    private EmailService emailService;

    @InjectMocks
    private AuthService authService;

    private User candidateUser;

    @BeforeEach
    void setUp() {
        candidateUser = User.builder()
                .email("candidate@example.com")
                .passwordHash("hashed_password")
                .role(Role.CANDIDATE)
                .isActive(true)
                .emailVerified(true)
                .build();
        candidateUser.setId(UUID.randomUUID());
    }

    @Test
    void testCheckEmail_Available() {
        when(userRepository.existsByEmail("new@example.com")).thenReturn(false);

        EmailCheckResponse response = authService.checkEmail("new@example.com");

        assertNotNull(response);
        assertFalse(response.isExists());
        assertEquals("AVAILABLE", response.getStatus());
    }

    @Test
    void testCheckEmail_AlreadyExists() {
        when(userRepository.existsByEmail("candidate@example.com")).thenReturn(true);

        EmailCheckResponse response = authService.checkEmail("candidate@example.com");

        assertNotNull(response);
        assertTrue(response.isExists());
        assertEquals("ALREADY_EXISTS", response.getStatus());
    }

    @Test
    void testRegisterCandidate_CreatesUnverifiedUserAndToken() {
        RegisterCandidateRequest request = new RegisterCandidateRequest();
        request.setEmail("newcandidate@example.com");
        request.setPassword("Password123!");
        request.setFullName("Nguyen Van Candidate");
        request.setAge(24);
        request.setTargetIndustry("Technology");

        when(userRepository.existsByEmail(any())).thenReturn(false);
        when(passwordEncoder.encode(any())).thenReturn("hashed_password");
        when(userRepository.save(any())).thenAnswer(invocation -> {
            User u = invocation.getArgument(0);
            u.setId(UUID.randomUUID());
            return u;
        });

        RegisterResponse response = authService.registerCandidate(request);

        assertNotNull(response);
        assertEquals("newcandidate@example.com", response.getEmail());
        assertFalse(response.isEmailVerified());
        assertNotNull(response.getDevVerificationToken());

        verify(userRepository, times(1)).save(any());
        verify(candidateProfileRepository, times(1)).save(any());
        verify(emailVerificationTokenRepository, times(1)).save(any());
        verify(emailService, times(1)).sendVerificationEmail(eq("newcandidate@example.com"), anyString());
    }

    @Test
    void testVerifyEmail_Success() {
        String tokenString = "valid-token-123";
        User unverifiedUser = User.builder()
                .email("unverified@example.com")
                .role(Role.CANDIDATE)
                .emailVerified(false)
                .build();
        unverifiedUser.setId(UUID.randomUUID());

        EmailVerificationToken token = EmailVerificationToken.builder()
                .user(unverifiedUser)
                .tokenHash(tokenString)
                .expiresAt(ZonedDateTime.now().plusHours(24))
                .usedAt(null)
                .build();

        when(emailVerificationTokenRepository.findByTokenHash(tokenString)).thenReturn(Optional.of(token));

        String result = authService.verifyEmail(tokenString);

        assertNotNull(result);
        assertTrue(unverifiedUser.getEmailVerified());
        assertNotNull(token.getUsedAt());
        verify(userRepository, times(1)).save(unverifiedUser);
        verify(emailVerificationTokenRepository, times(1)).save(token);
    }

    @Test
    void testVerifyEmail_ExpiredToken_ThrowsException() {
        String tokenString = "expired-token-123";
        User unverifiedUser = User.builder().email("unverified@example.com").build();
        EmailVerificationToken token = EmailVerificationToken.builder()
                .user(unverifiedUser)
                .tokenHash(tokenString)
                .expiresAt(ZonedDateTime.now().minusHours(1))
                .usedAt(null)
                .build();

        when(emailVerificationTokenRepository.findByTokenHash(tokenString)).thenReturn(Optional.of(token));

        CustomException ex = assertThrows(CustomException.class, () -> authService.verifyEmail(tokenString));
        assertEquals(ErrorCode.TOKEN_EXPIRED, ex.getErrorCode());
    }

    @Test
    void testVerifyEmail_ReusedToken_ThrowsException() {
        String tokenString = "reused-token-123";
        User unverifiedUser = User.builder().email("unverified@example.com").build();
        EmailVerificationToken token = EmailVerificationToken.builder()
                .user(unverifiedUser)
                .tokenHash(tokenString)
                .expiresAt(ZonedDateTime.now().plusHours(24))
                .usedAt(ZonedDateTime.now().minusHours(1))
                .build();

        when(emailVerificationTokenRepository.findByTokenHash(tokenString)).thenReturn(Optional.of(token));

        CustomException ex = assertThrows(CustomException.class, () -> authService.verifyEmail(tokenString));
        assertEquals(ErrorCode.TOKEN_INVALID, ex.getErrorCode());
    }

    @Test
    void testVerifyEmail_InvalidToken_ThrowsException() {
        when(emailVerificationTokenRepository.findByTokenHash("non-existent")).thenReturn(Optional.empty());

        CustomException ex = assertThrows(CustomException.class, () -> authService.verifyEmail("non-existent"));
        assertEquals(ErrorCode.TOKEN_INVALID, ex.getErrorCode());
    }

    @Test
    void testLogin_UnverifiedEmail_ThrowsException() {
        candidateUser.setEmailVerified(false);
        LoginRequest request = new LoginRequest();
        request.setEmail("candidate@example.com");
        request.setPassword("Password123!");

        when(userRepository.findByEmail("candidate@example.com")).thenReturn(Optional.of(candidateUser));
        when(passwordEncoder.matches("Password123!", "hashed_password")).thenReturn(true);

        CustomException ex = assertThrows(CustomException.class, () -> authService.login(request));
        assertEquals(ErrorCode.EMAIL_NOT_VERIFIED, ex.getErrorCode());
    }

    @Test
    void testLogin_VerifiedEmail_Success() {
        candidateUser.setEmailVerified(true);
        LoginRequest request = new LoginRequest();
        request.setEmail("candidate@example.com");
        request.setPassword("Password123!");

        when(userRepository.findByEmail("candidate@example.com")).thenReturn(Optional.of(candidateUser));
        when(passwordEncoder.matches("Password123!", "hashed_password")).thenReturn(true);
        when(tokenProvider.generateAccessToken(any(), any(), any())).thenReturn("fake_access_token");
        when(tokenProvider.generateRefreshToken(any())).thenReturn("fake_refresh_token");

        JwtResponse response = authService.login(request);

        assertNotNull(response);
        assertEquals("candidate@example.com", response.getEmail());
        assertEquals("fake_access_token", response.getAccessToken());
    }

    @Test
    void testResendVerification_Success() {
        User unverifiedUser = User.builder()
                .email("unverified@example.com")
                .role(Role.CANDIDATE)
                .emailVerified(false)
                .build();
        unverifiedUser.setId(UUID.randomUUID());

        when(userRepository.findByEmail("unverified@example.com")).thenReturn(Optional.of(unverifiedUser));
        when(emailVerificationTokenRepository.findTopByUserIdOrderByCreatedAtDesc(unverifiedUser.getId())).thenReturn(Optional.empty());

        String message = authService.resendVerification("unverified@example.com");

        assertNotNull(message);
        verify(emailService, times(1)).sendVerificationEmail(eq("unverified@example.com"), anyString());
    }

    @Test
    void testResendVerification_RateLimited() {
        User unverifiedUser = User.builder()
                .email("unverified@example.com")
                .role(Role.CANDIDATE)
                .emailVerified(false)
                .build();
        unverifiedUser.setId(UUID.randomUUID());

        EmailVerificationToken recentToken = EmailVerificationToken.builder()
                .user(unverifiedUser)
                .tokenHash("recent-token")
                .expiresAt(ZonedDateTime.now().plusHours(24))
                .build();
        recentToken.setCreatedAt(ZonedDateTime.now().minusSeconds(10)); // Sent 10 seconds ago

        when(userRepository.findByEmail("unverified@example.com")).thenReturn(Optional.of(unverifiedUser));
        when(emailVerificationTokenRepository.findTopByUserIdOrderByCreatedAtDesc(unverifiedUser.getId())).thenReturn(Optional.of(recentToken));

        CustomException ex = assertThrows(CustomException.class, () -> authService.resendVerification("unverified@example.com"));
        assertEquals(ErrorCode.RATE_LIMIT_EXCEEDED, ex.getErrorCode());
    }
}
