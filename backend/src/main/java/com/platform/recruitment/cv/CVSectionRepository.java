package com.platform.recruitment.cv;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CVSectionRepository extends JpaRepository<CVSection, UUID> {
    List<CVSection> findByCvVersionId(UUID cvVersionId);
}
