package com.contest.judge;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import lombok.extern.slf4j.Slf4j;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

@Slf4j
@Component
public class JudgeClient {
    private final RestTemplate restTemplate;
    private final String backendUrl;
    private final String judgeSecret;

    public JudgeClient(
            @Value("${backend.internal-url}") String backendUrl,
            @Value("${judge.secret}") String judgeSecret) {
        this.restTemplate = new RestTemplate();
        this.backendUrl = backendUrl;
        this.judgeSecret = judgeSecret;
    }

    private HttpHeaders createHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + judgeSecret);
        headers.set("Content-Type", "application/json");
        return headers;
    }

    public SubmissionJob getNextJob() {
        try {
            HttpEntity<Void> request = new HttpEntity<>(createHeaders());
            ResponseEntity<SubmissionJob> response = restTemplate.exchange(
                    backendUrl + "/internal/judge/next-job",
                    HttpMethod.GET,
                    request,
                    SubmissionJob.class
            );
            if (response.getStatusCode() == HttpStatus.OK) {
                return response.getBody();
            }
        } catch (Exception e) {
            log.debug("No jobs available or error fetching next-job: {}", e.getMessage());
        }
        return null;
    }

    public SubmissionJob getSubmissionDetails(String submissionId) {
        try {
            HttpEntity<Void> request = new HttpEntity<>(createHeaders());
            ResponseEntity<SubmissionJob> response = restTemplate.exchange(
                    backendUrl + "/internal/judge/submission/" + submissionId,
                    HttpMethod.GET,
                    request,
                    SubmissionJob.class
            );
            if (response.getStatusCode() == HttpStatus.OK) {
                return response.getBody();
            }
        } catch (Exception e) {
            log.error("Error fetching details for submission {}", submissionId, e);
        }
        return null;
    }

    public List<TestCaseDto> getProblemTestCases(String problemId) {
        try {
            HttpEntity<Void> request = new HttpEntity<>(createHeaders());
            ResponseEntity<TestCaseDto[]> response = restTemplate.exchange(
                    backendUrl + "/internal/judge/problems/" + problemId + "/testcases",
                    HttpMethod.GET,
                    request,
                    TestCaseDto[].class
            );
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                return Arrays.asList(response.getBody());
            }
        } catch (Exception e) {
            log.warn("Error fetching test cases from backend for problem {}: {}", problemId, e.getMessage());
        }
        return Collections.emptyList();
    }

    public void submitResult(JobResult result) {
        try {
            HttpEntity<JobResult> request = new HttpEntity<>(result, createHeaders());
            restTemplate.exchange(
                    backendUrl + "/internal/judge/result",
                    HttpMethod.POST,
                    request,
                    Void.class
            );
            log.info("Successfully submitted result for submission {}", result.getSubmissionId());
        } catch (Exception e) {
            log.error("Error submitting result for submission {}", result.getSubmissionId(), e);
        }
    }
}
