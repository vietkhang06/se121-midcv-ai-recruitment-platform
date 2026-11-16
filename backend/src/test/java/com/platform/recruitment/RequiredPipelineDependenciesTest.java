package com.platform.recruitment;

import com.platform.recruitment.matching.MatchingEngineService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.UnsatisfiedDependencyException;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;

class RequiredPipelineDependenciesTest {
    @Test
    void matchingCannotStartWithoutVersionRepository() throws Exception {
        // Supply constructor dependencies, deliberately omit the version repository.
        // This tests actual Spring injection rather than merely inspecting annotations.
        var constructor = MatchingEngineService.class.getConstructors()[0];
        Object[] dependencies = java.util.Arrays.stream(constructor.getParameterTypes())
                .map(type -> mock(type)).toArray();
        Object service = constructor.newInstance(dependencies);
        try (var context = new AnnotationConfigApplicationContext()) {
            context.refresh();
            var error = assertThrows(UnsatisfiedDependencyException.class,
                    () -> context.getAutowireCapableBeanFactory().autowireBean(service));
            assertTrue(error.getMessage().contains("cvVersionRepository"));
        }
    }
}
