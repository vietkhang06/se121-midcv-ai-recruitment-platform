package com.platform.recruitment.company;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface CompanyRepository extends JpaRepository<Company, UUID> {
    long countByVerificationStatus(CompanyVerification verificationStatus);
    long countByOperationalStatus(CompanyOperationalStatus operationalStatus);
    Page<Company> findByVerificationStatus(CompanyVerification verificationStatus, Pageable pageable);
    Page<Company> findByOperationalStatus(CompanyOperationalStatus operationalStatus, Pageable pageable);
    Page<Company> findByNameContainingIgnoreCase(String name, Pageable pageable);
    Page<Company> findByNameContainingIgnoreCaseAndVerificationStatus(String name, CompanyVerification verificationStatus, Pageable pageable);
}
