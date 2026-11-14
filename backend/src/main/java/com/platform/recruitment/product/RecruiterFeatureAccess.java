package com.platform.recruitment.product;

import com.platform.recruitment.company.Company;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.stereotype.Component;

/** Effective access to recruiter matching details; never changes the persisted subscription. */
@Component
public class RecruiterFeatureAccess {
  private final boolean developmentOverride;

  public RecruiterFeatureAccess(
      Environment environment,
      @Value("${app.testing.standard-recruiter-full-access:false}") boolean enabled) {
    this.developmentOverride = enabled
        && environment.acceptsProfiles(Profiles.of("dev"))
        && !environment.acceptsProfiles(Profiles.of("prod"));
  }

  public boolean hasProFeatures(Company company) {
    return company != null && (company.hasActiveRecruiterPro() || developmentOverride);
  }

  public boolean isDevelopmentOverride(Company company) {
    return company != null && !company.hasActiveRecruiterPro() && developmentOverride;
  }
}
