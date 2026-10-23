package com.platform.recruitment.job;

import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.common.ResourceNotFoundException;
import com.platform.recruitment.common.UnauthorizedAccessException;
import com.platform.recruitment.company.Company;
import com.platform.recruitment.company.CompanyOperationalStatus;
import com.platform.recruitment.company.RecruiterProfile;
import com.platform.recruitment.company.RecruiterProfileRepository;
import com.platform.recruitment.user.User;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Proxy;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class JobPublicAccessTest {
    private final Map<UUID, Job> jobData = new HashMap<>();
    private final Map<UUID, RecruiterProfile> recruiterData = new HashMap<>();
    private final JobRepository jobs = repository(JobRepository.class, jobData);
    private final RecruiterProfileRepository recruiters = repository(RecruiterProfileRepository.class, recruiterData);
    private final JobService service = new JobService(jobs, recruiters);

    @Test
    void publicDetailDoesNotExposeDraftJobs() {
        Job draft = job(JobStatus.DRAFT, company("Employer"));
        jobData.put(draft.getId(), draft);

        assertThrows(ResourceNotFoundException.class, () -> service.getJobById(draft.getId()));
    }

    @Test
    void publicDetailAllowsPublishedJobsOfActiveCompanies() {
        Job published = job(JobStatus.PUBLISHED, company("Employer"));
        jobData.put(published.getId(), published);

        assertEquals(published.getId(), service.getJobById(published.getId()).getId());
    }

    @Test
    void publicDetailDoesNotExposeJobsOfInactiveCompanies() {
        Company inactive = company("Inactive employer");
        inactive.setOperationalStatus(CompanyOperationalStatus.SUSPENDED);
        Job published = job(JobStatus.PUBLISHED, inactive);
        jobData.put(published.getId(), published);

        assertThrows(CustomException.class, () -> service.getJobById(published.getId()));
    }

    @Test
    void recruiterCanReadOnlyJobsOwnedByTheirCompany() {
        Company owner = company("Owner");
        User user = User.builder().build();
        user.setId(UUID.randomUUID());
        RecruiterProfile recruiter = RecruiterProfile.builder().user(user).company(owner).fullName("Recruiter").build();
        Job draft = job(JobStatus.DRAFT, owner);
        recruiterData.put(user.getId(), recruiter);
        jobData.put(draft.getId(), draft);

        assertEquals(draft.getId(), service.getRecruiterJob(user, draft.getId()).getId());

        Job otherJob = job(JobStatus.DRAFT, company("Other"));
        jobData.put(otherJob.getId(), otherJob);
        assertThrows(UnauthorizedAccessException.class, () -> service.getRecruiterJob(user, otherJob.getId()));
    }

    private static <T> T repository(Class<T> type, Map<UUID, ?> rows) {
        return type.cast(Proxy.newProxyInstance(type.getClassLoader(), new Class<?>[]{type}, (proxy, method, args) -> {
            if (method.getName().equals("findById") || method.getName().equals("findByUserId")) {
                return Optional.ofNullable(rows.get(args[0]));
            }
            if (method.getName().equals("toString")) return type.getSimpleName() + " test repository";
            return null;
        }));
    }

    private static Company company(String name) {
        Company company = Company.builder().name(name).build();
        company.setId(UUID.randomUUID());
        return company;
    }

    private static Job job(JobStatus status, Company company) {
        Job job = Job.builder()
                .company(company)
                .title("Backend Engineer")
                .industry("Technology")
                .seniority("Senior")
                .status(status)
                .description("Recruiter-entered description")
                .build();
        job.setId(UUID.randomUUID());
        return job;
    }
}
