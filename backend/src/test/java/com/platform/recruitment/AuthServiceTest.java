package com.platform.recruitment;

import com.platform.recruitment.auth.*;
import com.platform.recruitment.candidate.CandidateProfileRepository;
import com.platform.recruitment.company.CompanyRepository;
import com.platform.recruitment.company.RecruiterProfileRepository;
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
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtTokenProvider tokenProvider;

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
                .build();
        candidateUser.setId(UUID.randomUUID());
    }

    @Test
    void testRegisterCandidate_Success() {
        RegisterCandidateRequest request = new RegisterCandidateRequest();
        request.setEmail("candidate@example.com");
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
        when(tokenProvider.generateAccessToken(any(), any(), any())).thenReturn("fake_access_token");
        when(tokenProvider.generateRefreshToken(any())).thenReturn("fake_refresh_token");

        JwtResponse response = authService.registerCandidate(request);

        assertNotNull(response);
        assertEquals("candidate@example.com", response.getEmail());
        assertEquals(Role.CANDIDATE, response.getRole());
        assertEquals("fake_access_token", response.getAccessToken());

        verify(userRepository, times(1)).save(any());
        verify(candidateProfileRepository, times(1)).save(any());
    }

    @Test
    void testLogin_Success() {
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
}
