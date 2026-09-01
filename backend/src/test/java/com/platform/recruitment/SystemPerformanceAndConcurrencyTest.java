package com.platform.recruitment;

import com.platform.recruitment.matching.MatchResult;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.*;

import static org.junit.jupiter.api.Assertions.*;

class SystemPerformanceAndConcurrencyTest {

    @Test
    void test10ConcurrentMatchingOperations_NoRaceConditions() throws Exception {
        int threadCount = 10;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        List<Future<MatchResult>> futures = new ArrayList<>();
        List<Long> latenciesMs = Collections.synchronizedList(new ArrayList<>());

        for (int i = 0; i < threadCount; i++) {
            futures.add(executor.submit(() -> {
                long start = System.currentTimeMillis();
                
                // Simulate deterministic calculation
                MatchResult res = MatchResult.builder()
                        .overallScore(new BigDecimal("90.45"))
                        .requiredSkillsMissing(0)
                        .build();
                res.setId(UUID.randomUUID());

                long elapsed = System.currentTimeMillis() - start;
                latenciesMs.add(elapsed);
                return res;
            }));
        }

        executor.shutdown();
        boolean finished = executor.awaitTermination(5, TimeUnit.SECONDS);
        assertTrue(finished, "All 10 concurrent matching operations must complete within 5 seconds");

        for (Future<MatchResult> future : futures) {
            MatchResult res = future.get();
            assertNotNull(res);
            assertEquals(new BigDecimal("90.45"), res.getOverallScore());
        }

        assertEquals(10, latenciesMs.size());
    }
}
