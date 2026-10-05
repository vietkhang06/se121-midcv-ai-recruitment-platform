package com.platform.recruitment;

import com.platform.recruitment.auth.JwtTokenProvider;
import com.platform.recruitment.common.GlobalExceptionHandler;
import com.platform.recruitment.common.PageResponse;
import com.platform.recruitment.config.JwtAuthenticationFilter;
import com.platform.recruitment.config.SecurityConfig;
import com.platform.recruitment.job.JobController;
import com.platform.recruitment.job.JobResponse;
import com.platform.recruitment.job.JobService;
import com.platform.recruitment.user.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = JobController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class, GlobalExceptionHandler.class})
public class PaginationApiIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private JobService jobService;

    @MockBean
    private JwtTokenProvider tokenProvider;

    @MockBean
    private UserRepository userRepository;

    @Test
    @DisplayName("GET /api/v1/jobs trả định dạng PageResponse chuẩn")
    void testGetPublishedJobs_PaginationSuccess() throws Exception {
        PageResponse<JobResponse> mockResponse = PageResponse.<JobResponse>builder()
                .content(List.of())
                .page(0)
                .size(20)
                .totalElements(0)
                .totalPages(0)
                .first(true)
                .last(true)
                .sort(new PageResponse.SortInfo("createdAt", "desc"))
                .build();

        when(jobService.getPublishedJobs(any(), eq(0), eq(20), eq("createdAt"), eq("desc")))
                .thenReturn(mockResponse);

        mockMvc.perform(get("/api/v1/jobs?page=0&size=20&sort=createdAt&direction=desc")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.page").value(0))
                .andExpect(jsonPath("$.data.size").value(20))
                .andExpect(jsonPath("$.data.totalElements").value(0))
                .andExpect(jsonPath("$.data.first").value(true))
                .andExpect(jsonPath("$.data.last").value(true))
                .andExpect(jsonPath("$.data.sort.field").value("createdAt"))
                .andExpect(jsonPath("$.data.sort.direction").value("desc"));
    }

    @Test
    @DisplayName("GET /api/v1/jobs với page âm trả về 400 Bad Request")
    void testGetPublishedJobs_NegativePage_ReturnsBadRequest() throws Exception {
        when(jobService.getPublishedJobs(any(), eq(-1), anyInt(), anyString(), anyString()))
                .thenThrow(new com.platform.recruitment.common.CustomException(
                        com.platform.recruitment.common.ErrorCode.VALIDATION_ERROR, "Số trang (page) không được nhỏ hơn 0."));

        mockMvc.perform(get("/api/v1/jobs?page=-1&size=20")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
    }

    @Test
    @DisplayName("GET /api/v1/jobs với size > 100 trả về 400 Bad Request")
    void testGetPublishedJobs_OverMaxSize_ReturnsBadRequest() throws Exception {
        when(jobService.getPublishedJobs(any(), anyInt(), eq(150), anyString(), anyString()))
                .thenThrow(new com.platform.recruitment.common.CustomException(
                        com.platform.recruitment.common.ErrorCode.VALIDATION_ERROR, "Kích thước trang (size) không được vượt quá 100."));

        mockMvc.perform(get("/api/v1/jobs?page=0&size=150")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
    }
}
