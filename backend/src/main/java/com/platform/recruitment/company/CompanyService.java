package com.platform.recruitment.company;

import com.platform.recruitment.common.ResourceNotFoundException;
import com.platform.recruitment.common.UnauthorizedAccessException;
import com.platform.recruitment.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CompanyService {

    private final CompanyRepository companyRepository;
    private final RecruiterProfileRepository recruiterProfileRepository;

    @Transactional(readOnly = true)
    public Company getMyCompany(User recruiterUser) {
        RecruiterProfile recruiter = recruiterProfileRepository.findByUserId(recruiterUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("RecruiterProfile", "userId", recruiterUser.getId()));

        Company company = recruiter.getCompany();
        if (company == null) {
            throw new ResourceNotFoundException("Company not linked to recruiter profile");
        }
        return company;
    }

    @Transactional
    public Company updateVerificationStatus(UUID companyId, CompanyVerification newStatus) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Company", "id", companyId));

        company.setVerificationStatus(newStatus);
        return companyRepository.save(company);
    }

    @Transactional
    public Company updateMyCompany(User recruiterUser, Company updateData) {
        RecruiterProfile recruiter = recruiterProfileRepository.findByUserId(recruiterUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("RecruiterProfile", "userId", recruiterUser.getId()));

        Company company = recruiter.getCompany();
        if (company == null) {
            company = new Company();
            company.setName(updateData.getName() != null ? updateData.getName() : "My Company");
            company.setVerificationStatus(CompanyVerification.PENDING);
            company = companyRepository.save(company);
            recruiter.setCompany(company);
            recruiterProfileRepository.save(recruiter);
        }

        if (updateData.getName() != null) company.setName(updateData.getName());
        if (updateData.getTaxCode() != null) company.setTaxCode(updateData.getTaxCode());
        if (updateData.getWebsite() != null) company.setWebsite(updateData.getWebsite());
        if (updateData.getSize() != null) company.setSize(updateData.getSize());
        if (updateData.getIndustry() != null) company.setIndustry(updateData.getIndustry());
        if (updateData.getDescription() != null) company.setDescription(updateData.getDescription());

        return companyRepository.save(company);
    }
}
