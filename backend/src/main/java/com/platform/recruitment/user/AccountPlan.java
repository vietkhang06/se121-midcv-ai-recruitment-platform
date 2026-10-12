package com.platform.recruitment.user;

public enum AccountPlan {
    STANDARD(3),
    PRO(5);

    private final int maxCvLimit;

    AccountPlan(int maxCvLimit) {
        this.maxCvLimit = maxCvLimit;
    }

    public int getMaxCvLimit() {
        return maxCvLimit;
    }
}
