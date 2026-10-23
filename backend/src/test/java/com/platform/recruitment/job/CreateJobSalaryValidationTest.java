package com.platform.recruitment.job;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import static org.junit.jupiter.api.Assertions.*;

class CreateJobSalaryValidationTest {
    private static jakarta.validation.ValidatorFactory factory;
    private static Validator validator;
    @BeforeAll static void setup() { factory = Validation.buildDefaultValidatorFactory(); validator = factory.getValidator(); }
    @AfterAll static void close() { factory.close(); }

    private CreateJobRequest request(String min, String max, boolean negotiable) {
        CreateJobRequest request = new CreateJobRequest();
        request.setTitle("Engineer"); request.setIndustry("Technology"); request.setSeniority("Mid"); request.setDescription("Role");
        request.setMinSalary(min == null ? null : new BigDecimal(min)); request.setMaxSalary(max == null ? null : new BigDecimal(max)); request.setSalaryNegotiable(negotiable);
        return request;
    }

    @Test void acceptsVndRangeAndUnknown() {
        assertTrue(validator.validate(request("15000000", "30000000", false)).isEmpty());
        assertTrue(validator.validate(request(null, null, false)).isEmpty());
    }
    @Test void rejectsNegativeAndInvertedRanges() {
        assertFalse(validator.validate(request("-1", "5", false)).isEmpty());
        assertFalse(validator.validate(request("30", "15", false)).isEmpty());
    }
    @Test void negotiableMustNotCarryNumericAmounts() {
        assertTrue(validator.validate(request(null, null, true)).isEmpty());
        assertFalse(validator.validate(request("0", "0", true)).isEmpty());
    }
}
