package com.platform.recruitment.user;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    boolean existsByRole(Role role);

    long countByRole(Role role);
    long countByIsActive(Boolean isActive);
    long countByRoleAndIsActive(Role role, Boolean isActive);

    Page<User> findByRole(Role role, Pageable pageable);
    Page<User> findByRoleAndIsActive(Role role, Boolean isActive, Pageable pageable);
    Page<User> findByEmailContainingIgnoreCase(String email, Pageable pageable);
    Page<User> findByEmailContainingIgnoreCaseAndRole(String email, Role role, Pageable pageable);
}
