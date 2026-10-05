package com.platform.recruitment.auth;

import com.platform.recruitment.candidate.CandidateProfile;
import com.platform.recruitment.candidate.CandidateProfileRepository;
import com.platform.recruitment.candidate.CandidateTargetIndustry;
import com.platform.recruitment.candidate.CandidateTargetIndustryRepository;
import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.common.ErrorCode;
import com.platform.recruitment.company.Company;
import com.platform.recruitment.company.CompanyRepository;
import com.platform.recruitment.company.CompanyVerification;
import com.platform.recruitment.company.RecruiterProfile;
import com.platform.recruitment.company.RecruiterProfileRepository;
import com.platform.recruitment.email.EmailService;
import com.platform.recruitment.user.Role;
import com.platform.recruitment.user.User;
import com.platform.recruitment.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

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
    public RegisterResponse registerCandidate(
            RegisterCandidateRequest request
    ) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new CustomException(
                    ErrorCode.EMAIL_ALREADY_EXISTS,
                    "Email is already registered: " + request.getEmail()
            );
        }

        User user = User.builder()
                .email(request.getEmail())
                .passwordHash(
                        passwordEncoder.encode(request.getPassword())
                )
                .role(Role.CANDIDATE)
                .isActive(true)
                .emailVerified(false)
                .build();

        User savedUser = userRepository.save(user);

        String primaryIndustry = request.getTargetIndustry();
        List<String> industries = request.getTargetIndustries();

        if (industries != null && !industries.isEmpty()) {
            primaryIndustry = industries.get(0);
        }

        CandidateProfile candidateProfile =
                CandidateProfile.builder()
                        .user(savedUser)
                        .fullName(request.getFullName())
                        .age(request.getAge())
                        .targetIndustry(primaryIndustry)
                        .build();

        CandidateProfile savedCandidateProfile =
                candidateProfileRepository.save(candidateProfile);

        if (industries != null && !industries.isEmpty()) {
            for (int index = 0; index < industries.size(); index++) {
                String industryName = industries.get(index);

                if (industryName == null || industryName.isBlank()) {
                    continue;
                }

                CandidateTargetIndustry targetIndustry =
                        CandidateTargetIndustry.builder()
                                .candidate(savedCandidateProfile)
                                .industryName(industryName.trim())
                                .isPrimary(index == 0)
                                .build();

                candidateTargetIndustryRepository.save(targetIndustry);
            }
        } else if (
                primaryIndustry != null
                        && !primaryIndustry.isBlank()
        ) {
            CandidateTargetIndustry targetIndustry =
                    CandidateTargetIndustry.builder()
                            .candidate(savedCandidateProfile)
                            .industryName(primaryIndustry.trim())
                            .isPrimary(true)
                            .build();

            candidateTargetIndustryRepository.save(targetIndustry);
        }

        String token =
                generateAndScheduleVerificationEmail(savedUser);

        return RegisterResponse.builder()
                .message(
                        "Registration successful. "
                                + "Please verify your email before logging in."
                )
                .email(savedUser.getEmail())
                .emailVerified(false)
                .devVerificationToken(token)
                .build();
    }

    @Transactional
    public RegisterResponse registerRecruiter(
            RegisterRecruiterRequest request
    ) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new CustomException(
                    ErrorCode.EMAIL_ALREADY_EXISTS,
                    "Email is already registered: " + request.getEmail()
            );
        }

        User user = User.builder()
                .email(request.getEmail())
                .passwordHash(
                        passwordEncoder.encode(request.getPassword())
                )
                .role(Role.HR)
                .isActive(true)
                .emailVerified(false)
                .build();

        User savedUser = userRepository.save(user);

        Company company = Company.builder()
                .name(request.getCompanyName())
                .taxCode(request.getCompanyTaxCode())
                .website(request.getCompanyWebsite())
                .industry(request.getCompanyIndustry())
                .verificationStatus(CompanyVerification.PENDING)
                .build();

        /*
         * Phải sử dụng instance mà repository trả về.
         *
         * Trong trường hợp save() thực hiện merge(), savedCompany mới là
         * managed entity. Không tiếp tục gắn biến company ban đầu vào
         * RecruiterProfile vì biến đó có thể vẫn là transient instance.
         */
        Company savedCompany = companyRepository.save(company);

        RecruiterProfile recruiterProfile =
                RecruiterProfile.builder()
                        .user(savedUser)
                        .company(savedCompany)
                        .fullName(request.getFullName())
                        .build();

        recruiterProfileRepository.save(recruiterProfile);

        String token =
                generateAndScheduleVerificationEmail(savedUser);

        return RegisterResponse.builder()
                .message(
                        "Registration successful. "
                                + "Please verify your email before logging in."
                )
                .email(savedUser.getEmail())
                .emailVerified(false)
                .devVerificationToken(token)
                .build();
    }

    @Transactional
    public String verifyEmail(String token) {
        EmailVerificationToken verificationToken =
                emailVerificationTokenRepository
                        .findByTokenHash(token)
                        .orElseThrow(
                                () -> new CustomException(
                                        ErrorCode.TOKEN_INVALID,
                                        "Invalid verification token."
                                )
                        );

        if (verificationToken.getUsedAt() != null) {
            throw new CustomException(
                    ErrorCode.TOKEN_INVALID,
                    "Verification token has already been used."
            );
        }

        if (
                verificationToken.getExpiresAt()
                        .isBefore(ZonedDateTime.now())
        ) {
            throw new CustomException(
                    ErrorCode.TOKEN_EXPIRED,
                    "Verification token has expired. "
                            + "Please request a new one."
            );
        }

        User user = verificationToken.getUser();
        user.setEmailVerified(true);
        userRepository.save(user);

        verificationToken.setUsedAt(ZonedDateTime.now());
        emailVerificationTokenRepository.save(verificationToken);

        log.info(
                "Successfully verified email for userId={}",
                user.getId()
        );

        return "Email has been verified successfully. "
                + "You may now log in.";
    }

    @Transactional
    public String resendVerification(String email) {
        Optional<User> userOptional =
                userRepository.findByEmail(email);

        if (userOptional.isEmpty()) {
            /*
             * Trả response chung để tránh lộ việc email
             * có tồn tại trong hệ thống hay không.
             */
            return "If this email is registered and unverified, "
                    + "a verification link has been sent.";
        }

        User user = userOptional.get();

        if (Boolean.TRUE.equals(user.getEmailVerified())) {
            return "Email is already verified. "
                    + "Please proceed to login.";
        }

        /*
         * Giới hạn gửi lại email: 60 giây.
         */
        Optional<EmailVerificationToken> lastTokenOptional =
                emailVerificationTokenRepository
                        .findTopByUserIdOrderByCreatedAtDesc(
                                user.getId()
                        );

        if (lastTokenOptional.isPresent()) {
            EmailVerificationToken lastToken =
                    lastTokenOptional.get();

            if (
                    lastToken.getCreatedAt() != null
                            && lastToken.getCreatedAt().isAfter(
                                    ZonedDateTime.now()
                                            .minusSeconds(60)
                            )
            ) {
                throw new CustomException(
                        ErrorCode.RATE_LIMIT_EXCEEDED,
                        "Please wait 60 seconds before requesting "
                                + "another verification email."
                );
            }
        }

        generateAndScheduleVerificationEmail(user);

        return "Verification email has been sent successfully.";
    }

    @Transactional(readOnly = true)
    public JwtResponse login(LoginRequest request) {
        User user = userRepository
                .findByEmail(request.getEmail())
                .orElseThrow(
                        () -> new CustomException(
                                ErrorCode.AUTHENTICATION_FAILED,
                                "Invalid email or password."
                        )
                );

        if (
                !passwordEncoder.matches(
                        request.getPassword(),
                        user.getPasswordHash()
                )
        ) {
            throw new CustomException(
                    ErrorCode.AUTHENTICATION_FAILED,
                    "Invalid email or password."
            );
        }

        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new CustomException(
                    ErrorCode.ACCESS_DENIED,
                    "Account is disabled."
            );
        }

        if (!Boolean.TRUE.equals(user.getEmailVerified())) {
            throw new CustomException(
                    ErrorCode.EMAIL_NOT_VERIFIED,
                    "Email is not verified. "
                            + "Please verify your email before logging in."
            );
        }

        return buildJwtResponse(user);
    }

    /**
     * Tạo verification token trong transaction hiện tại và chỉ gửi email
     * sau khi transaction đã commit thành công.
     *
     * Điều này ngăn trường hợp email được gửi nhưng User hoặc token sau đó
     * bị rollback do lỗi database.
     */
    private String generateAndScheduleVerificationEmail(
            User user
    ) {
        String token = UUID.randomUUID().toString();

        EmailVerificationToken verificationToken =
                EmailVerificationToken.builder()
                        .user(user)
                        .tokenHash(token)
                        .expiresAt(
                                ZonedDateTime.now().plusHours(24)
                        )
                        .build();

        emailVerificationTokenRepository.save(verificationToken);

        String recipientEmail = user.getEmail();
        UUID userId = user.getId();

        if (
                TransactionSynchronizationManager
                        .isSynchronizationActive()
        ) {
            TransactionSynchronizationManager
                    .registerSynchronization(
                            new TransactionSynchronization() {
                                @Override
                                public void afterCommit() {
                                    sendVerificationEmailSafely(
                                            userId,
                                            recipientEmail,
                                            token
                                    );
                                }
                            }
                    );
        } else {
            /*
             * Trường hợp helper được gọi ngoài transaction,
             * thường chỉ xuất hiện trong unit test hoặc lời gọi đặc biệt.
             */
            sendVerificationEmailSafely(
                    userId,
                    recipientEmail,
                    token
            );
        }

        return token;
    }

    /**
     * Gửi email nhưng không làm rollback dữ liệu đã commit nếu dịch vụ email
     * tạm thời không khả dụng. Người dùng vẫn có thể dùng chức năng gửi lại.
     */
    private void sendVerificationEmailSafely(
            UUID userId,
            String recipientEmail,
            String token
    ) {
        try {
            emailService.sendVerificationEmail(
                    recipientEmail,
                    token
            );
        } catch (Exception exception) {
            log.error(
                    "Verification email could not be sent for userId={}",
                    userId,
                    exception
            );
        }
    }

    private JwtResponse buildJwtResponse(User user) {
        String accessToken =
                tokenProvider.generateAccessToken(
                        user.getId(),
                        user.getEmail(),
                        user.getRole()
                );

        String refreshToken =
                tokenProvider.generateRefreshToken(
                        user.getId()
                );

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