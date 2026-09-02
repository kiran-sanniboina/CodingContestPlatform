package com.contest.platform.controller;

import com.contest.platform.model.*;
import com.contest.platform.repository.*;
import lombok.Data;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/internal/judge")
public class JudgeController {

    private static final Logger log = LoggerFactory.getLogger(JudgeController.class);
    
    @Autowired
    private SubmissionRepository submissionRepository;

    @Autowired
    private TeamRepository teamRepository;

    @Autowired
    private ProblemRepository problemRepository;

    @Autowired
    private TestCaseRepository testCaseRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Value("${judge.secret}")
    private String judgeSecret;

    private boolean validateSecret(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return false;
        return authHeader.substring(7).equals(judgeSecret);
    }

    @GetMapping("/next-job")
    public ResponseEntity<?> getNextJob(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (!validateSecret(authHeader)) return ResponseEntity.status(403).build();

        Optional<Submission> nextJob = submissionRepository.findFirstByStatus(SubmissionStatus.QUEUED);
        if (nextJob.isPresent()) {
            Submission s = nextJob.get();
            s.setStatus(SubmissionStatus.COMPILING);
            submissionRepository.save(s);
            log.info("Dispatched submission {} to judge worker", s.getId());
            return ResponseEntity.ok(s);
        }
        return ResponseEntity.noContent().build();
    }

    @GetMapping({"/submission/{id}", "/submissions/{id}"})
    public ResponseEntity<?> getSubmission(@RequestHeader(value = "Authorization", required = false) String authHeader, @PathVariable String id) {
        if (!validateSecret(authHeader)) return ResponseEntity.status(403).build();

        Optional<Submission> submission = submissionRepository.findById(id);
        return submission.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/problems/{id}/testcases")
    public ResponseEntity<?> getProblemTestCases(@RequestHeader(value = "Authorization", required = false) String authHeader, @PathVariable String id) {
        if (!validateSecret(authHeader)) return ResponseEntity.status(403).build();

        List<TestCase> tcs = testCaseRepository.findByProblemId(id);
        return ResponseEntity.ok(tcs);
    }

    @PostMapping("/result")
    public ResponseEntity<?> postResult(@RequestHeader(value = "Authorization", required = false) String authHeader, @RequestBody JudgeResult result) {
        if (!validateSecret(authHeader)) return ResponseEntity.status(403).build();

        Optional<Submission> submissionOpt = submissionRepository.findById(result.getSubmissionId());
        if (submissionOpt.isPresent()) {
            Submission s = submissionOpt.get();
            s.setStatus(result.getVerdict());
            s.setPassedTests(result.getPassedTests());
            s.setTotalTests(result.getTotalTests());
            s.setExecutionTimeMs(result.getExecutionTimeMs());
            s.setFailedTest(result.getFailedTest());
            submissionRepository.save(s);
            
            log.info("Verdict for submission {}: {} (Passed {}/{})", s.getId(), s.getStatus(), s.getPassedTests(), s.getTotalTests());

            // Sequential unlock check
            if (s.getStatus() == SubmissionStatus.ACCEPTED) {
                Optional<Team> teamOpt = teamRepository.findById(s.getTeamId());
                Optional<Problem> problemOpt = problemRepository.findById(s.getProblemId());
                if (teamOpt.isPresent() && problemOpt.isPresent()) {
                    Team team = teamOpt.get();
                    Problem problem = problemOpt.get();
                    if (problem.getSequence() != null && problem.getSequence().equals(team.getCurrentProblem())) {
                        team.setCurrentProblem(team.getCurrentProblem() + 1);
                        teamRepository.save(team);
                        log.info("Team {} unlocked problem {}", team.getId(), team.getCurrentProblem());
                        messagingTemplate.convertAndSend("/topic/unlocks", team);
                    }
                }
            }

            // Broadcast submission result
            messagingTemplate.convertAndSend("/topic/submissions", s);
            
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }

    @Data
    public static class JudgeResult {
        private String submissionId;
        private SubmissionStatus verdict;
        private Integer passedTests;
        private Integer totalTests;
        private Long executionTimeMs;
        private String failedTest;

        public String getSubmissionId() { return submissionId; }
        public void setSubmissionId(String submissionId) { this.submissionId = submissionId; }

        public SubmissionStatus getVerdict() { return verdict; }
        public void setVerdict(SubmissionStatus verdict) { this.verdict = verdict; }

        public Integer getPassedTests() { return passedTests; }
        public void setPassedTests(Integer passedTests) { this.passedTests = passedTests; }

        public Integer getTotalTests() { return totalTests; }
        public void setTotalTests(Integer totalTests) { this.totalTests = totalTests; }

        public Long getExecutionTimeMs() { return executionTimeMs; }
        public void setExecutionTimeMs(Long executionTimeMs) { this.executionTimeMs = executionTimeMs; }

        public String getFailedTest() { return failedTest; }
        public void setFailedTest(String failedTest) { this.failedTest = failedTest; }
    }
}
