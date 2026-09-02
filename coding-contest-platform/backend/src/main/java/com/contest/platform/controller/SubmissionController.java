package com.contest.platform.controller;

import com.contest.platform.model.*;
import com.contest.platform.repository.*;
import lombok.Data;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api/submissions")
public class SubmissionController {

    private static final Logger log = LoggerFactory.getLogger(SubmissionController.class);

    @Autowired
    private SubmissionRepository submissionRepository;

    @Autowired
    private TeamRepository teamRepository;

    @Autowired
    private ProblemRepository problemRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Value("${judge.worker-url:http://contest_judge_worker:8081}")
    private String judgeWorkerUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    @PostMapping("/run")
    public ResponseEntity<?> runSample(@RequestBody RunCodeRequest request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        log.info("Dry-run requested by user '{}' for problem {}", username, request.getProblemId());

        String sampleInput = request.getInput();
        String sampleOutput = request.getExpectedOutput();

        if (sampleInput == null || sampleInput.trim().isEmpty()) {
            if (request.getProblemId() != null) {
                Optional<Problem> probOpt = problemRepository.findById(request.getProblemId());
                if (probOpt.isPresent()) {
                    sampleInput = probOpt.get().getSampleInput();
                    sampleOutput = probOpt.get().getSampleOutput();
                }
            }
        }

        Map<String, Object> judgeReq = new HashMap<>();
        judgeReq.put("problemId", request.getProblemId());
        judgeReq.put("language", request.getLanguage());
        judgeReq.put("sourceCode", request.getSourceCode());
        judgeReq.put("input", sampleInput);
        judgeReq.put("expectedOutput", sampleOutput);
        judgeReq.put("timeLimitMs", 3000);
        judgeReq.put("memoryLimitMb", 256);

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("ngrok-skip-browser-warning", "true");
            headers.set("Bypass-Tunnel-Reminder", "true");
            headers.set("User-Agent", "ContestPlatformBackend");
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(judgeReq, headers);

            String targetUrl = judgeWorkerUrl.replaceAll("/+$", "") + "/run";
            log.info("Sending dry-run request to judge URL: {}", targetUrl);
            ResponseEntity<Map> resp = restTemplate.postForEntity(targetUrl, entity, Map.class);
            return ResponseEntity.status(resp.getStatusCode()).body(resp.getBody());
        } catch (Exception e) {
            log.error("Failed to proxy run request to target judge URL: {}", judgeWorkerUrl, e);
            return ResponseEntity.ok(Map.of(
                "verdict", "SYSTEM_ERROR",
                "error", "Judge execution service unavailable: " + e.getMessage(),
                "stdout", "",
                "stderr", ""
            ));
        }
    }

    @PostMapping
    public ResponseEntity<?> submitCode(@RequestBody SubmitRequest request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        
        Team team = teamRepository.findById(username).orElseGet(() -> {
            Team newTeam = new Team();
            newTeam.setId(username);
            newTeam.setName("Team " + username);
            newTeam.setPreferredLanguage("JAVA");
            newTeam.setCurrentProblem(1);
            newTeam.setYear(1);
            newTeam.setStatus(TeamStatus.ACTIVE);
            return teamRepository.save(newTeam);
        });

        // Enforce sequential unlocking check & year track check
        Optional<Problem> problemOpt = problemRepository.findById(request.getProblemId());
        if (problemOpt.isPresent()) {
            Problem p = problemOpt.get();
            if (p.getYear() != null && team.getYear() != null && !p.getYear().equals(team.getYear())) {
                return ResponseEntity.badRequest().body(Map.of("error", "This problem belongs to a different Year set."));
            }
            if (p.getSequence() != null && p.getSequence() > team.getCurrentProblem()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Question " + p.getSequence() + " is locked! Solve Question " + (p.getSequence() - 1) + " first."));
            }
        }
        
        Submission submission = new Submission();
        submission.setTeamId(team.getId());
        submission.setProblemId(request.getProblemId());
        submission.setLanguage(request.getLanguage() != null ? request.getLanguage().toUpperCase() : "JAVA");
        submission.setSourceCode(request.getSourceCode());
        submission.setStatus(SubmissionStatus.QUEUED);
        submission.setSubmittedAt(Instant.now());
        
        Submission saved = submissionRepository.save(submission);
        log.info("New submission created: {} for Team {} (Problem {})", saved.getId(), team.getId(), request.getProblemId());
        
        messagingTemplate.convertAndSend("/topic/submissions", saved);
        
        return ResponseEntity.ok(saved);
    }
    
    @GetMapping
    public ResponseEntity<List<Submission>> getSubmissions() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        List<Submission> subs = submissionRepository.findByTeamId(username);
        subs.sort(Comparator.comparing(Submission::getSubmittedAt, Comparator.nullsLast(Comparator.reverseOrder())));
        return ResponseEntity.ok(subs);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getSubmissionById(@PathVariable String id) {
        Optional<Submission> sub = submissionRepository.findById(id);
        return sub.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @Data
    public static class RunCodeRequest {
        private String problemId;
        private String language;
        private String sourceCode;
        private String input;
        private String expectedOutput;

        public String getProblemId() { return problemId; }
        public void setProblemId(String problemId) { this.problemId = problemId; }

        public String getLanguage() { return language; }
        public void setLanguage(String language) { this.language = language; }

        public String getSourceCode() { return sourceCode; }
        public void setSourceCode(String sourceCode) { this.sourceCode = sourceCode; }

        public String getInput() { return input; }
        public void setInput(String input) { this.input = input; }

        public String getExpectedOutput() { return expectedOutput; }
        public void setExpectedOutput(String expectedOutput) { this.expectedOutput = expectedOutput; }
    }

    @Data
    public static class SubmitRequest {
        private String problemId;
        private String language;
        private String sourceCode;

        public String getProblemId() { return problemId; }
        public void setProblemId(String problemId) { this.problemId = problemId; }

        public String getLanguage() { return language; }
        public void setLanguage(String language) { this.language = language; }

        public String getSourceCode() { return sourceCode; }
        public void setSourceCode(String sourceCode) { this.sourceCode = sourceCode; }
    }
}
