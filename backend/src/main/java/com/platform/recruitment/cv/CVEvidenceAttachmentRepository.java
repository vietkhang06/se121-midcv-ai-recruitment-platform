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

    @org.springframework.data.jpa.repository.Query("SELECT a FROM CVEvidenceAttachment a WHERE a.cv.id=:cvId AND a.itemType=:itemType AND a.itemId=:itemId AND a.retired=false")
    Optional<CVEvidenceAttachment> findByCvIdAndItemTypeAndItemId(
            @org.springframework.data.repository.query.Param("cvId") UUID cvId,
            @org.springframework.data.repository.query.Param("itemType") String itemType,
            @org.springframework.data.repository.query.Param("itemId") String itemId);

    void deleteByCvIdAndId(UUID cvId, UUID id);

    void deleteByCvId(UUID cvId);
}
