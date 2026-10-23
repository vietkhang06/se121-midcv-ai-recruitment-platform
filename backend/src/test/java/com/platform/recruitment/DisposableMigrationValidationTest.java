package com.platform.recruitment;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationVersion;
import org.flywaydb.core.api.MigrationInfo;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;

import javax.sql.DataSource;
import org.postgresql.ds.PGSimpleDataSource;
import jakarta.persistence.EntityManagerFactory;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

/**
 * Explicit smoke validation for a user-created disposable PostgreSQL database.
 * The test is disabled unless invoked with the secure local helper script.
 */
class DisposableMigrationValidationTest {

    @Test
    @EnabledIfEnvironmentVariable(named = "MIDCV_MIGRATION_TEST_MODE", matches = "FRESH|UPGRADE")
    void migrationsReachV27AndHibernateValidatesTheMappedSchema() {
        String mode = requiredEnvironment("MIDCV_MIGRATION_TEST_MODE");
        DataSource dataSource = createDataSource();

        if ("UPGRADE".equals(mode)) {
            Flyway.configure()
                    .dataSource(dataSource)
                    .locations("classpath:db/migration")
                    .target(MigrationVersion.fromVersion("20"))
                    .load()
                    .migrate();
            assertCurrentVersion(dataSource, "20");
        }

        try (ConfigurableApplicationContext context = new SpringApplicationBuilder(RecruitmentApplication.class)
                .web(WebApplicationType.NONE)
                .properties(
                        "spring.datasource.url=" + requiredEnvironment("DATABASE_URL"),
                        "spring.datasource.username=" + requiredEnvironment("DATABASE_USERNAME"),
                        "spring.datasource.password=" + requiredEnvironment("DATABASE_PASSWORD"),
                        "spring.flyway.enabled=true",
                        "spring.flyway.validate-on-migrate=true",
                        "spring.jpa.hibernate.ddl-auto=validate",
                        "app.worker-enabled=false",
                        "spring.main.banner-mode=off")
                .run()) {
            assertNotNull(context.getBean(EntityManagerFactory.class));
        }

        assertCurrentVersion(dataSource, "27");
    }

    private static DataSource createDataSource() {
        PGSimpleDataSource dataSource = new PGSimpleDataSource();
        dataSource.setURL(requiredEnvironment("DATABASE_URL"));
        dataSource.setUser(requiredEnvironment("DATABASE_USERNAME"));
        dataSource.setPassword(requiredEnvironment("DATABASE_PASSWORD"));
        return dataSource;
    }

    private static String requiredEnvironment(String name) {
        String value = System.getenv(name);
        if (value == null || value.isBlank()) {
            throw new IllegalStateException("Missing required local environment variable: " + name);
        }
        return value;
    }

    private static void assertCurrentVersion(DataSource dataSource, String expectedVersion) {
        MigrationInfo current = Flyway.configure()
                .dataSource(dataSource)
                .locations("classpath:db/migration")
                .load()
                .info()
                .current();
        assertNotNull(current, "Flyway must report an applied migration");
        assertEquals(expectedVersion, current.getVersion().getVersion());
    }
}
