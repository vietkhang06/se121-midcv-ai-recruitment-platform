package com.platform.recruitment.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Id;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class OAuthEntityMappingTest {

    @Test
    void oauthNaturalHashKeysMatchTheCharPrimaryKeysInFlywayMigrations() throws Exception {
        assertHashPrimaryKey(OAuthLoginState.class, "stateHash", "state_hash");
        assertHashPrimaryKey(OAuthLoginTicket.class, "ticketHash", "ticket_hash");
        assertHashPrimaryKey(OAuthPendingRegistration.class, "ticketHash", "ticket_hash");
    }

    @Test
    void providerIdentityUsesItsExistingCompositeNaturalKey() throws Exception {
        assertIdColumn(OAuthAccount.class, "provider", "provider");
        assertIdColumn(OAuthAccount.class, "providerSubject", "provider_subject");
        assertNotNull(OAuthAccount.class.getAnnotation(jakarta.persistence.IdClass.class));
    }

    private static void assertHashPrimaryKey(Class<?> entityType, String fieldName, String columnName) throws Exception {
        Field field = entityType.getDeclaredField(fieldName);
        assertNotNull(field.getAnnotation(Id.class), entityType.getSimpleName() + " must use its hash as the assigned natural id");
        assertIdColumn(entityType, fieldName, columnName);
        JdbcTypeCode jdbcType = field.getAnnotation(JdbcTypeCode.class);
        assertNotNull(jdbcType, entityType.getSimpleName() + " must map PostgreSQL CHAR(64) explicitly");
        assertEquals(SqlTypes.CHAR, jdbcType.value());
        assertEquals(64, field.getAnnotation(Column.class).length());
    }

    private static void assertIdColumn(Class<?> entityType, String fieldName, String columnName) throws Exception {
        Field field = entityType.getDeclaredField(fieldName);
        assertNotNull(field.getAnnotation(Id.class));
        assertEquals(columnName, field.getAnnotation(Column.class).name());
    }
}
