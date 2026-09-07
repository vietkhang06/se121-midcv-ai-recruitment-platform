package com.platform.recruitment.auth;

import com.platform.recruitment.candidate.CandidateProfile;
import com.platform.recruitment.candidate.CandidateProfileRepository;
import com.platform.recruitment.candidate.CandidateTargetIndustry;
import com.platform.recruitment.candidate.CandidateTargetIndustryRepository;
import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.common.ErrorCode;
import com.platform.recruitment.company.*;
import com.platform.recruitment.email.EmailService;
import com.platform.recruitment.user.Role;
import com.platform.recruitment.user.User;
import com.platform.recruitment.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final CandidateProfileRepository candidateProfileRepository;
    private final CandidateTargetIndustryRepository candidateTargetIndustryRepository;
    private final CompanyRepository companyRepository;
    private final RecruiterProfileRepository recruiterProfileRepository;
    private final EmailVerificationTokenRepository emailVerificationTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final EmailService emailService;

    @Transactional(readOnly = true)
    public EmailCheckResponse checkEmail(String email) {
        boolean exists = userRepository.existsByEmail(email);
        return EmailCheckResponse.builder()
                .email(email)
                .exists(exists)
                .status(exists ? "ALREADY_EXISTS" : "AVAILABLE")
                .build();
    }

    @Transactional
    public RegisterResponse registerCandidate(RegisterCandidateRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new CustomException(ErrorCode.EMAIL_ALREADY_EXISTS, "Email is already registered: " + request.getEmail());
        }

        User user = User.builder()
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(Role.CANDIDATE)
                .isActive(true)
                .emailVerified(false)
                .build();
        user = userRepository.save(user);

        String primaryIndustry = request.getTargetIndustry();
        List<String> industries = request.getTargetIndustries();
        if (industries != null && !industries.isEmpty()) {
            primaryIndustry = industries.get(0);
        }

        CandidateProfile candidateProfile = CandidateProfile.builder()
                .user(user)
                .fullName(request.getFullName())
                .age(request.getAge())
                .targetIndustry(primaryIndustry)
                .build();
        candidateProfile = candidateProfileRepository.save(candidateProfile);

        if (industries != null && !industries.isEmpty()) {
            for (int i = 0; i < industries.size(); i++) {
                String indName = industries.get(i);
                if (indName != null && !indName.isBlank()) {
                    CandidateTargetIndustry cti = CandidateTargetIndustry.builder()
                            .candidate(candidateProfile)
                            .industryName(indName.trim())
                            .isPrimary(i == 0)
                            .build();
                    candidateTargetIndustryRepository.save(cti);
                }
            }
        } else if (primaryIndustry != null && !primaryIndustry.isBlank()) {
            CandidateTargetIndustry cti = CandidateTargetIndustry.builder()
                    .candidate(candidateProfile)
                    .industryName(primaryIndustry.trim())
                    .isPrimary(true)
                    .build();
            candidateTargetIndustryRepository.save(cti);
        }

        String token = generateAndSendVerificationToken(user);

        return RegisterResponse.builder()
                .message("Registration successful. Please verify your email before logging in.")
                .email(user.getEmail())
                .emailVerified(false)
                .devVerificationToken(token)
                .build();
    }

    @Transactional
    public RegisterResponse registerRecruiter(RegisterRecruiterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new CustomException(ErrorCode.EMAIL_ALREADY_EXISTS, "Email is already registered: " + request.getEmail());
        }

        User user = User.builder()
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(Role.HR)
                .isActive(true)
                .emailVerified(false)
                .build();
        user = userRepository.save(user);

        Company company = Company.builder()
                .name(request.getCompanyName())
                .taxCode(request.getCompanyTaxCode())
                .website(request.getCompanyWebsite())
                .industry(request.getCompanyIndustry())
                .verificationStatus(CompanyVerification.PENDING)
                .build();
        companyRepository.save(company);

        RecruiterProfile recruiterProfile = RecruiterProfile.builder()
                .user(user)
                .company(company)
                .fullName(request.getFullName())
                .build();
        recruiterProfileRepository.save(recruiterProfile);

        String token = generateAndSendVerificationToken(user);

        return RegisterResponse.builder()
                .message("Registration successful. Please verify your email before logging in.")
                .email(user.getEmail())
                .emailVerified(false)
                .devVerificationToken(token)
                .build();
    }

    @Transactional
    public String verifyEmail(String token) {
        EmailVerificationToken verificationToken = emailVerificationTokenRepository.findByTokenHash(token)
                .orElseThrow(() -> new CustomException(ErrorCode.TOKEN_INVALID, "Invalid verification token."));

        if (verificationToken.getUsedAt() != null) {
            throw new CustomException(ErrorCode.TOKEN_INVALID, "Verification token has already been used.");
        }

        if (verificationToken.getExpiresAt().isBefore(ZonedDateTime.now())) {
            throw new CustomException(ErrorCode.TOKEN_EXPIRED, "Verification token has expired. Please request a new one.");
        }

        User user = verificationToken.getUser();
        user.setEmailVerified(true);
        userRepository.save(user);

        verificationToken.setUsedAt(ZonedDateTime.now());
        emailVerificationTokenRepository.save(verificationToken);

        log.info("Successfully verified email for user: {}", user.getEmail());
        return "Email has been verified successfully. You may now log in.";
    }

    @Transactional
    public String resendVerification(String email) {
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            // Return generic response to prevent account enumeration
            return "If this email is registered and unverified, a verification link has been sent.";
        }

        User user = userOpt.get();
        if (Boolean.TRUE.equals(user.getEmailVerified())) {
            return "Email is already verified. Please proceed to login.";
        }

        // Rate limiting: 60-second cooldown
        Optional<EmailVerificationToken> lastTokenOpt = emailVerificationTokenRepository.findTopByUserIdOrderByCreatedAtDesc(user.getId());
        if (lastTokenOpt.isPresent()) {
            EmailVerificationToken lastToken = lastTokenOpt.get();
            if (lastToken.getCreatedAt() != null && lastToken.getCreatedAt().isAfter(ZonedDateTime.now().minusSeconds(60))) {
                throw new CustomException(ErrorCode.RATE_LIMIT_EXCEEDED, "Please wait 60 seconds before requesting another verification email.");
            }
        }

        generateAndSendVerificationToken(user);
        return "Verification email has been sent successfully.";
    }

    @Transactional(readOnly = true)
    public JwtResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new CustomException(ErrorCode.AUTHENTICATION_FAILED, "Invalid email or password."));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new CustomException(ErrorCode.AUTHENTICATION_FAILED, "Invalid email or password.");
        }

        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new CustomException(ErrorCode.ACCESS_DENIED, "Account is disabled.");
        }

        if (!Boolean.TRUE.equals(user.getEmailVerified())) {
            throw new CustomException(ErrorCode.EMAIL_NOT_VERIFIED, "Email is not verified. Please verify your email before logging in.");
        }

        return buildJwtResponse(user);
    }

    private String generateAndSendVerificationToken(User user) {
        String token = UUID.randomUUID().toString();
        EmailVerificationToken evt = EmailVerificationToken.builder()
                .user(user)
                .tokenHash(token)
                .expiresAt(ZonedDateTime.now().plusHours(24))
                .build();
        emailVerificationTokenRepository.save(evt);

        emailService.sendVerificationEmail(user.getEmail(), token);
        return token;
    }

    private JwtResponse buildJwtResponse(User user) {
        String accessToken = tokenProvider.generateAccessToken(user.getId(), user.getEmail(), user.getRole());
        String refreshToken = tokenProvider.generateRefreshToken(user.getId());

        return JwtResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn(3600L)
                .userId(user.getId())
                .email(user.getEmail())
                .role(user.getRole())
                .build();
    }
}
