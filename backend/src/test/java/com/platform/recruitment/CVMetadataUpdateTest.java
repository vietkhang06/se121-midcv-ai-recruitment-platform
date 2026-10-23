package com.platform.recruitment;

import com.platform.recruitment.candidate.CandidateProfile;
import com.platform.recruitment.candidate.CandidateProfileRepository;
import com.platform.recruitment.cv.*;
import com.platform.recruitment.user.Role;
import com.platform.recruitment.user.User;
import org.junit.jupiter.api.Test;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

class CVMetadataUpdateTest {

    @Test
    void renamingConfirmedCardUpdatesOnlyOuterCvMetadata() {
        CVRepository cvs = mock(CVRepository.class);
        CVVersionRepository versions = mock(CVVersionRepository.class);
        CandidateProfileRepository candidates = mock(CandidateProfileRepository.class);
        User owner = User.builder().role(Role.CANDIDATE).build();
        owner.setId(UUID.randomUUID());
        CandidateProfile profile = CandidateProfile.builder().user(owner).build();
        profile.setId(UUID.randomUUID());
        CV cv = CV.builder().candidate(profile).title("Old card title")
                .creationPath(CVCreationPath.UPLOAD).status("CONFIRMED").build();
        cv.setId(UUID.randomUUID());
        CVVersion confirmedVersion = CVVersion.builder().cv(cv).title("Immutable version title")
                .status("CONFIRMED").structuredJsonContent("{\"summary\":\"Original CV content\"}").build();
        confirmedVersion.setId(UUID.randomUUID());

        when(candidates.findByUserId(owner.getId())).thenReturn(Optional.of(profile));
        when(cvs.findByIdForUpdate(cv.getId())).thenReturn(Optional.of(cv));
        when(cvs.save(cv)).thenReturn(cv);

        CVService service = new CVService(cvs, versions, mock(CVSectionRepository.class), candidates,
                null, null, null);
        UpdateCVMetadataRequest request = new UpdateCVMetadataRequest();
        request.setTitle("  Backend CV  ");

        CVResponse response = service.updateCVMetadata(owner, cv.getId(), request);

        assertEquals("Backend CV", response.getTitle());
        assertEquals("CONFIRMED", cv.getStatus());
        assertEquals("Immutable version title", confirmedVersion.getTitle());
        assertEquals("{\"summary\":\"Original CV content\"}", confirmedVersion.getStructuredJsonContent());
        verify(cvs).save(cv);
        verifyNoInteractions(versions);
    }

    @Test
    void candidateCannotRenameAnotherCandidatesCv() {
        CVRepository cvs = mock(CVRepository.class);
        CandidateProfileRepository candidates = mock(CandidateProfileRepository.class);
        User owner = User.builder().role(Role.CANDIDATE).build();
        owner.setId(UUID.randomUUID());
        CandidateProfile ownerProfile = CandidateProfile.builder().user(owner).build();
        ownerProfile.setId(UUID.randomUUID());
        User other = User.builder().role(Role.CANDIDATE).build();
        other.setId(UUID.randomUUID());
        CandidateProfile otherProfile = CandidateProfile.builder().user(other).build();
        otherProfile.setId(UUID.randomUUID());
        CV cv = CV.builder().candidate(ownerProfile).title("Private CV")
                .creationPath(CVCreationPath.UPLOAD).status("DRAFT").build();
        cv.setId(UUID.randomUUID());
        when(candidates.findByUserId(other.getId())).thenReturn(Optional.of(otherProfile));
        when(cvs.findByIdForUpdate(cv.getId())).thenReturn(Optional.of(cv));

        CVService service = new CVService(cvs, mock(CVVersionRepository.class), mock(CVSectionRepository.class), candidates,
                null, null, null);
        UpdateCVMetadataRequest request = new UpdateCVMetadataRequest();
        request.setTitle("Unauthorized rename");

        assertThrows(com.platform.recruitment.common.UnauthorizedAccessException.class,
                () -> service.updateCVMetadata(other, cv.getId(), request));
        verify(cvs, never()).save(any(CV.class));
    }
}
