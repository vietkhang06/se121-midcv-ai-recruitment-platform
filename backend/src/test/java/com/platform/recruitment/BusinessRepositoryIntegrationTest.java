package com.platform.recruitment;

import com.platform.recruitment.admin.repository.*;
import com.platform.recruitment.admin.service.*;
import com.platform.recruitment.ai.AiClient;
import com.platform.recruitment.application.ApplicationRepository;
import com.platform.recruitment.candidate.CandidateProfileRepository;
import com.platform.recruitment.company.*;
import com.platform.recruitment.cv.CVRepository;
import com.platform.recruitment.job.*;
import com.platform.recruitment.taxonomy.TaxonomyService;
import com.platform.recruitment.user.*;
import java.util.*;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.test.context.ContextConfiguration;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/** Real JPA/SQL on H2; PostgreSQL migration and concurrency acceptance are separate. */
@DataJpaTest(properties={"spring.flyway.enabled=false","spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.datasource.url=jdbc:h2:mem:business-spec;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa","spring.datasource.password=",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect"})
@org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase(replace=org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase.Replace.NONE)
@ContextConfiguration(classes=BusinessRepositoryIntegrationTest.ConfigurationForTest.class)
class BusinessRepositoryIntegrationTest {
    @Configuration @EnableAutoConfiguration
    @EntityScan(basePackageClasses={User.class,Company.class,Job.class})
    @EnableJpaRepositories(basePackageClasses={UserRepository.class,JobRepository.class})
    static class ConfigurationForTest {}
    @Autowired JobRepository jobs; @Autowired UserRepository users; @Autowired EntityManager em;
    Company company(String name,CompanyOperationalStatus status) {
        Company c=Company.builder().name(name).verificationStatus(CompanyVerification.VERIFIED).operationalStatus(status).build();em.persist(c);return c;
    }
    Job job(Company c,String title,JobStatus status) {
        Job j=Job.builder().company(c).title(title).industry("Technology").seniority("Junior").description("Java backend").location("Hồ Chí Minh").status(status).responsibilities(List.of("Maintain REST APIs")).build();return jobs.saveAndFlush(j);
    }
    JobService service() {return new JobService(jobs,mock(RecruiterProfileRepository.class));}
    @Test void serverSearchEscapesPercentAndUnderscoreLiterally() {
        Company c=company("Search fixture",CompanyOperationalStatus.ACTIVE);
        job(c,"100% Java_backend",JobStatus.PUBLISHED);job(c,"100 JavaXbackend",JobStatus.PUBLISHED);
        var result=service().searchPublishedJobs(null,"% Java_",null,0,10,"createdAt","desc");
        assertEquals(1,result.getTotalElements());assertEquals("100% Java_backend",result.getContent().getFirst().getTitle());
    }
    @Test void searchCombinesVisibilityCompanyLocationAndPagination() {
        Company active=company("Open fixture",CompanyOperationalStatus.ACTIVE),suspended=company("Closed fixture",CompanyOperationalStatus.SUSPENDED);
        job(active,"Java one",JobStatus.PUBLISHED);job(active,"Java two",JobStatus.PUBLISHED);job(active,"Java draft",JobStatus.DRAFT);job(suspended,"Java suspended",JobStatus.PUBLISHED);
        var result=service().searchPublishedJobs("technology","Java","Chí Minh",0,1,"title","asc");
        assertEquals(2,result.getTotalElements());assertEquals(2,result.getTotalPages());assertEquals(1,result.getContent().size());
    }
    @Test void responsibilitiesSurviveJpaRoundTrip() {
        var j=job(company("JD fixture",CompanyOperationalStatus.ACTIVE),"JD",JobStatus.DRAFT);UUID id=j.getId();em.clear();
        assertEquals(List.of("Maintain REST APIs"),jobs.findById(id).orElseThrow().getResponsibilities());
    }
    @Test void adminUserFiltersUseOneServerPageAndExactAccountStatus() {
        for(Role role:List.of(Role.CANDIDATE,Role.HR,Role.ADMIN)){
            User u=User.builder().email(role.name().toLowerCase()+"@filter.example.invalid").passwordHash("fixture").role(role).build();
            if(role==Role.HR)u.deactivate();users.saveAndFlush(u);
        }
        var service=new AdminService(users,mock(CandidateProfileRepository.class),mock(RecruiterProfileRepository.class),mock(CompanyRepository.class),jobs,mock(SystemReportRepository.class),mock(AdminAuditLogRepository.class),mock(AdminAuditLogService.class),mock(AiClient.class),mock(TaxonomyService.class),mock(CVRepository.class),mock(ApplicationRepository.class),mock(com.platform.recruitment.company.service.CompanyVerificationService.class));
        var result=service.listUsers("filter.example.invalid",Role.HR,AccountStatus.DEACTIVATED,PageRequest.of(0,1));
        assertEquals(1,result.getTotalElements());assertEquals(AccountStatus.DEACTIVATED,result.getContent().getFirst().getAccountStatus());
        assertEquals(3,service.listUsers("filter.example.invalid",null,null,PageRequest.of(0,2)).getTotalElements());
        assertEquals(1,users.countByAccountStatus(AccountStatus.DEACTIVATED));assertEquals(0,users.countByAccountStatus(AccountStatus.SUSPENDED));
    }
}
