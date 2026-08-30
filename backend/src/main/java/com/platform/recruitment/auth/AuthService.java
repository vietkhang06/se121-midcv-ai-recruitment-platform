package com.platform.recruitment.auth;

import com.platform.recruitment.candidate.CandidateProfile;
import com.platform.recruitment.candidate.CandidateProfileRepository;
import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.common.ErrorCode;
import com.platform.recruitment.company.*;
import com.platform.recruitment.user.Role;
import com.platform.recruitment.user.User;
import com.platform.recruitment.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final CandidateProfileRepository candidateProfileRepository;
    private final CompanyRepository companyRepository;
    private final RecruiterProfileRepository recruiterProfileRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;

    @Transactional
    public JwtResponse registerCandidate(RegisterCandidateRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR, "Email is already registered: " + request.getEmail());
        }

        User user = User.builder()
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(Role.CANDIDATE)
                .isActive(true)
                .build();
        userRepository.save(user);

        CandidateProfile candidateProfile = CandidateProfile.builder()
                .user(user)
                .fullName(request.getFullName())
                .age(request.getAge())
                .targetIndustry(request.getTargetIndustry())
                .build();
        candidateProfileRepository.save(candidateProfile);

        return buildJwtResponse(user);
    }

    @Transactional
    public JwtResponse registerRecruiter(RegisterRecruiterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR, "Email is already registered: " + request.getEmail());
        }

        User user = User.builder()
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(Role.HR)
                .isActive(true)
                .build();
        userRepository.save(user);

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

        return buildJwtResponse(user);
    }

    @Transactional(readOnly = true)
    public JwtResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new CustomException(ErrorCode.AUTHENTICATION_FAILED, "Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new CustomException(ErrorCode.AUTHENTICATION_FAILED, "Invalid email or password");
        }

        if (!user.getIsActive()) {
            throw new CustomException(ErrorCode.ACCESS_DENIED, "Account is disabled");
        }

        return buildJwtResponse(user);
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
