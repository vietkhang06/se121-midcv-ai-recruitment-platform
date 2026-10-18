package com.platform.recruitment.matching;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.platform.recruitment.application.Application;
import com.platform.recruitment.candidate.CandidateProfile;
import com.platform.recruitment.user.Role;
import com.platform.recruitment.user.User;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Proxy;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class CandidateRankingFetchContractTest {

    @Test
    void serviceUsesFetchQueryAndSerializesTheWhitelistedDto() throws Exception {
        UUID jobId = UUID.randomUUID();
        User user = User.builder().email("synthetic@example.test").role(Role.CANDIDATE).build();
        CandidateProfile candidate = CandidateProfile.builder().fullName("Synthetic Candidate").user(user).build();
        candidate.setId(UUID.randomUUID());
        Application application = Application.builder().candidate(candidate).build();
        application.setId(UUID.randomUUID());
        MatchResult result = MatchResult.builder()
                .application(application)
                .requiredSkillsMissing(0)
                .overallScore(BigDecimal.valueOf(88))
                .coreScore(BigDecimal.valueOf(90))
                .build();
        result.setId(UUID.randomUUID());

        final boolean[] fetchQueryCalled = {false};
        MatchResultRepository repository = (MatchResultRepository) Proxy.newProxyInstance(
                MatchResultRepository.class.getClassLoader(),
                new Class<?>[]{MatchResultRepository.class},
                (proxy, method, args) -> {
                    if (method.getName().equals("findByApplicationJobIdWithCandidate")) {
                        fetchQueryCalled[0] = true;
                        return List.of(result);
                    }
                    throw new UnsupportedOperationException("Unexpected repository call: " + method.getName());
                });

        var page = new CandidateRankingService(repository)
                .getRankedCandidatesPage(jobId, null, 0, 20, null, null);
        String json = new ObjectMapper().writeValueAsString(page);

        assertTrue(fetchQueryCalled[0]);
        assertEquals(1, page.getContent().size());
        assertEquals("Synthetic Candidate", page.getContent().get(0).getCandidateName());
        assertTrue(json.contains("overallScore"));
        assertFalse(json.contains("\"application\""));
    }
}
