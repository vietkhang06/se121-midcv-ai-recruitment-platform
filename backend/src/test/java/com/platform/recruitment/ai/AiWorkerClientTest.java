package com.platform.recruitment.ai;

import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.common.ErrorCode;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.net.SocketTimeoutException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withException;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class AiWorkerClientTest {

    private static final String BASE_URL = "http://worker.test/internal/ai";

    @Test
    void checkHealthReturnsWorkerResponse() {
        RestClient.Builder builder = RestClient.builder().baseUrl(BASE_URL);
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        AiWorkerClient client = new AiWorkerClient(builder.build());

        server.expect(requestTo(BASE_URL + "/health"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess("{\"status\":\"ok\"}", MediaType.APPLICATION_JSON));

        assertEquals("ok", client.checkHealth().get("status"));
        server.verify();
    }

    @Test
    void timeoutIsReportedAsServiceUnavailableWithoutRetry() {
        RestClient.Builder builder = RestClient.builder().baseUrl(BASE_URL);
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        AiWorkerClient client = new AiWorkerClient(builder.build());
        server.expect(requestTo(BASE_URL + "/structure-cv"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withException(new SocketTimeoutException("synthetic timeout")));

        CustomException error = assertThrows(CustomException.class,
                () -> client.structureCv("synthetic text", null, "test-correlation-id"));

        assertEquals(ErrorCode.SERVICE_UNAVAILABLE, error.getErrorCode());
        server.verify();
    }

    @Test
    void permanentWorkerClientErrorIsNotRetried() {
        RestClient.Builder builder = RestClient.builder().baseUrl(BASE_URL);
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        AiWorkerClient client = new AiWorkerClient(builder.build());
        server.expect(requestTo(BASE_URL + "/structure-cv"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.BAD_REQUEST));

        CustomException error = assertThrows(CustomException.class,
                () -> client.structureCv("synthetic text", null, "test-correlation-id"));

        assertEquals(ErrorCode.CV_PROCESSING_FAILED, error.getErrorCode());
        server.verify();
    }

    @Test
    void transientWorkerServerErrorIsReportedAsServiceUnavailableWithoutRetry() {
        RestClient.Builder builder = RestClient.builder().baseUrl(BASE_URL);
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        AiWorkerClient client = new AiWorkerClient(builder.build());
        server.expect(requestTo(BASE_URL + "/structure-cv"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE));

        CustomException error = assertThrows(CustomException.class,
                () -> client.structureCv("synthetic text", null, "test-correlation-id"));

        assertEquals(ErrorCode.SERVICE_UNAVAILABLE, error.getErrorCode());
        server.verify();
    }

}
