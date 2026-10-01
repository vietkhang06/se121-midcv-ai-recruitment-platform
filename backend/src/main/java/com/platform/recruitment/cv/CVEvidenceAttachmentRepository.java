package com.platform.recruitment.cv;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CVEvidenceAttachmentRepository extends JpaRepository<CVEvidenceAttachment, UUID> {

    List<CVEvidenceAttachment> findByCvId(UUID cvId);

    Optional<CVEvidenceAttachment> findByCvIdAndId(UUID cvId, UUID id);

    Optional<CVEvidenceAttachment> findByCvIdAndItemTypeAndItemId(UUID cvId, String itemType, String itemId);

    void deleteByCvIdAndId(UUID cvId, UUID id);

    void deleteByCvId(UUID cvId);
}
