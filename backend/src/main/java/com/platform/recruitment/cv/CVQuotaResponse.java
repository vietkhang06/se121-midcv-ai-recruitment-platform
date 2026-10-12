package com.platform.recruitment.cv;

import com.platform.recruitment.user.AccountPlan;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CVQuotaResponse {
    private AccountPlan plan;
    private long currentCount;
    private int maxLimit;
    private long remainingSlots;
    private boolean canUpload;
}
