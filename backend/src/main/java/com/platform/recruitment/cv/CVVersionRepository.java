package com.platform.recruitment.cv;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CVVersionRepository extends JpaRepository<CVVersion, UUID> {
    List<CVVersion> findByCvIdOrderByVersionNumberDesc(UUID cvId);
}
