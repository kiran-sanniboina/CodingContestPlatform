package com.contest.judge;

import lombok.Data;

@Data
public class JobResult {
    private String submissionId;
    private Verdict verdict;
    private int passedTests;
    private int totalTests;
    private long executionTimeMs;
    private String failedTest;

    public String getSubmissionId() { return submissionId; }
    public void setSubmissionId(String submissionId) { this.submissionId = submissionId; }

    public Verdict getVerdict() { return verdict; }
    public void setVerdict(Verdict verdict) { this.verdict = verdict; }

    public int getPassedTests() { return passedTests; }
    public void setPassedTests(int passedTests) { this.passedTests = passedTests; }

    public int getTotalTests() { return totalTests; }
    public void setTotalTests(int totalTests) { this.totalTests = totalTests; }

    public long getExecutionTimeMs() { return executionTimeMs; }
    public void setExecutionTimeMs(long executionTimeMs) { this.executionTimeMs = executionTimeMs; }

    public String getFailedTest() { return failedTest; }
    public void setFailedTest(String failedTest) { this.failedTest = failedTest; }
}
