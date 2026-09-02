package com.contest.platform.controller;

import com.contest.platform.model.*;
import com.contest.platform.repository.*;
import lombok.Data;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private static final Logger log = LoggerFactory.getLogger(AdminController.class);

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TeamRepository teamRepository;

    @Autowired
    private ProblemRepository problemRepository;

    @Autowired
    private SubmissionRepository submissionRepository;

    @Autowired
    private ContestRepository contestRepository;

    @Autowired
    private TestCaseRepository testCaseRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private boolean isAdmin() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        if ("admin".equalsIgnoreCase(username)) {
            return true;
        }
        Optional<User> userOpt = userRepository.findByUsername(username);
        return userOpt.isPresent() && userOpt.get().getRole() == Role.ADMIN;
    }

    // --- 1. Stats Overview ---
    @GetMapping("/stats")
    public ResponseEntity<?> getStats() {
        if (!isAdmin()) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied. Admin role required."));
        }

        long totalTeams = teamRepository.count();
        long totalProblems = problemRepository.count();
        long totalSubmissions = submissionRepository.count();
        long acceptedSubmissions = submissionRepository.findAll().stream()
                .filter(s -> s.getStatus() == SubmissionStatus.ACCEPTED)
                .count();

        String contestName = contestRepository.findAll().stream()
                .findFirst()
                .map(Contest::getName)
                .orElse("No Active Contest");

        return ResponseEntity.ok(Map.of(
                "totalTeams", totalTeams,
                "totalProblems", totalProblems,
                "totalSubmissions", totalSubmissions,
                "acceptedSubmissions", acceptedSubmissions,
                "activeContest", contestName
        ));
    }

    // --- 2. Team Management ---
    @GetMapping("/teams")
    public ResponseEntity<?> getAllTeams() {
        if (!isAdmin()) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied."));
        }
        List<Team> teams = teamRepository.findAll();
        teams.sort(Comparator.comparing(Team::getId));
        return ResponseEntity.ok(teams);
    }

    @PostMapping("/teams")
    public ResponseEntity<?> createTeam(@RequestBody CreateTeamRequest req) {
        if (!isAdmin()) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied."));
        }

        if (req.getUsername() == null || req.getUsername().trim().isEmpty() ||
            req.getPassword() == null || req.getPassword().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Username and password are required."));
        }

        String username = req.getUsername().trim().toLowerCase();
        if (userRepository.findByUsername(username).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", "User '" + username + "' already exists."));
        }

        // 1. Create User
        User user = new User();
        user.setUsername(username);
        user.setPasswordHash(passwordEncoder.encode(req.getPassword().trim()));
        user.setRole(Role.TEAM);
        user.setCreatedAt(Instant.now());
        userRepository.save(user);

        // 2. Create Team
        Team team = new Team();
        team.setId(username);
        team.setName(req.getName() != null && !req.getName().trim().isEmpty() ? req.getName().trim() : "Team " + username);
        team.setPreferredLanguage(req.getPreferredLanguage() != null ? req.getPreferredLanguage().toUpperCase() : "JAVA");
        team.setCurrentProblem(1);
        team.setYear(req.getYear() != null ? req.getYear() : 1);
        team.setStatus(TeamStatus.ACTIVE);
        Team savedTeam = teamRepository.save(team);

        log.info("Admin created new team: {} ({}) in Year {}", username, team.getName(), team.getYear());
        return ResponseEntity.ok(savedTeam);
    }

    @PostMapping("/teams/{id}/year")
    public ResponseEntity<?> updateTeamYear(@PathVariable String id, @RequestBody Map<String, Integer> body) {
        if (!isAdmin()) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied."));
        }

        Optional<Team> teamOpt = teamRepository.findById(id);
        if (teamOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Team team = teamOpt.get();
        if (body.containsKey("year") && body.get("year") != null) {
            team.setYear(body.get("year"));
            teamRepository.save(team);
            log.info("Admin updated team {} year to {}", id, team.getYear());
        }
        return ResponseEntity.ok(team);
    }

    @DeleteMapping("/teams/{id}")
    public ResponseEntity<?> deleteTeam(@PathVariable String id) {
        if (!isAdmin()) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied."));
        }

        teamRepository.deleteById(id);
        userRepository.findByUsername(id).ifPresent(u -> userRepository.delete(u));
        
        // Remove team submissions
        List<Submission> teamSubs = submissionRepository.findByTeamId(id);
        submissionRepository.deleteAll(teamSubs);

        log.info("Admin deleted team: {}", id);
        return ResponseEntity.ok(Map.of("message", "Team " + id + " deleted successfully."));
    }

    @PostMapping("/teams/{id}/reset")
    public ResponseEntity<?> resetTeamProgress(@PathVariable String id) {
        if (!isAdmin()) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied."));
        }

        Optional<Team> teamOpt = teamRepository.findById(id);
        if (teamOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Team team = teamOpt.get();
        team.setCurrentProblem(1);
        teamRepository.save(team);

        log.info("Admin reset progress for team: {}", id);
        return ResponseEntity.ok(team);
    }

    // --- 3. Problem Management ---
    @GetMapping("/problems")
    public ResponseEntity<?> getAllProblems(@RequestParam(value = "year", required = false) Integer year) {
        if (!isAdmin()) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied."));
        }
        List<Problem> problems;
        if (year != null) {
            problems = problemRepository.findByYearOrderBySequenceAsc(year);
        } else {
            problems = problemRepository.findAll();
            problems.sort(Comparator.comparing(Problem::getYear, Comparator.nullsLast(Comparator.naturalOrder()))
                    .thenComparing(Problem::getSequence, Comparator.nullsLast(Comparator.naturalOrder())));
        }
        return ResponseEntity.ok(problems);
    }

    @PostMapping("/problems")
    public ResponseEntity<?> createOrUpdateProblem(@RequestBody Problem problem) {
        if (!isAdmin()) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied."));
        }

        if (problem.getYear() == null) {
            problem.setYear(1);
        }

        if (problem.getId() == null || problem.getId().trim().isEmpty()) {
            if (problem.getSequence() != null) {
                problem.setId(problem.getYear() + "_" + problem.getSequence());
            } else {
                problem.setId(UUID.randomUUID().toString().substring(0, 8));
            }
        }

        if (problem.getTimeLimitMs() == null || problem.getTimeLimitMs() <= 0) {
            problem.setTimeLimitMs(2000);
        }
        if (problem.getMemoryLimitMb() == null || problem.getMemoryLimitMb() <= 0) {
            problem.setMemoryLimitMb(256);
        }

        Problem saved = problemRepository.save(problem);
        log.info("Admin created/updated problem: {} (Year: {}, Seq: {})", saved.getId(), saved.getYear(), saved.getSequence());
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/problems/{id}")
    public ResponseEntity<?> deleteProblem(@PathVariable String id) {
        if (!isAdmin()) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied."));
        }

        problemRepository.deleteById(id);
        testCaseRepository.deleteByProblemId(id);
        log.info("Admin deleted problem: {}", id);
        return ResponseEntity.ok(Map.of("message", "Problem " + id + " deleted successfully."));
    }

    // --- 4. Test Cases Management ---
    @GetMapping("/problems/{problemId}/testcases")
    public ResponseEntity<?> getTestCases(@PathVariable String problemId) {
        if (!isAdmin()) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied."));
        }

        List<TestCase> tcs = testCaseRepository.findByProblemId(problemId);
        tcs.sort(Comparator.comparingInt(TestCase::getOrder));
        return ResponseEntity.ok(tcs);
    }

    @PostMapping("/problems/{problemId}/testcases")
    public ResponseEntity<?> addTestCase(@PathVariable String problemId, @RequestBody CreateTestCaseRequest req) {
        if (!isAdmin()) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied."));
        }

        List<TestCase> existing = testCaseRepository.findByProblemId(problemId);
        int nextOrder = existing.size() + 1;

        TestCase tc = new TestCase();
        tc.setProblemId(problemId);
        tc.setOrder(nextOrder);
        tc.setInput(req.getInput() != null ? req.getInput() : "");
        tc.setExpectedOutput(req.getExpectedOutput() != null ? req.getExpectedOutput() : "");
        tc.setSample(req.isSample());

        TestCase saved = testCaseRepository.save(tc);
        log.info("Admin added test case to problem {}: ID={}", problemId, saved.getId());
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/problems/{problemId}/testcases/{testCaseId}")
    public ResponseEntity<?> deleteTestCase(@PathVariable String problemId, @PathVariable String testCaseId) {
        if (!isAdmin()) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied."));
        }

        testCaseRepository.deleteById(testCaseId);
        log.info("Admin deleted test case {}", testCaseId);
        return ResponseEntity.ok(Map.of("message", "Test case deleted successfully."));
    }

    // --- 5. All Submissions Log ---
    @GetMapping("/submissions")
    public ResponseEntity<?> getAllSubmissions() {
        if (!isAdmin()) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied."));
        }

        List<Submission> subs = submissionRepository.findAll();
        subs.sort(Comparator.comparing(Submission::getSubmittedAt, Comparator.nullsLast(Comparator.reverseOrder())));
        return ResponseEntity.ok(subs);
    }

    @Data
    public static class CreateTeamRequest {
        private String username;
        private String password;
        private String name;
        private String preferredLanguage;
        private Integer year = 1;

        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }

        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public String getPreferredLanguage() { return preferredLanguage; }
        public void setPreferredLanguage(String preferredLanguage) { this.preferredLanguage = preferredLanguage; }

        public Integer getYear() { return year; }
        public void setYear(Integer year) { this.year = year; }
    }

    @Data
    public static class CreateTestCaseRequest {
        private String input;
        private String expectedOutput;
        private boolean sample;

        public String getInput() { return input; }
        public void setInput(String input) { this.input = input; }

        public String getExpectedOutput() { return expectedOutput; }
        public void setExpectedOutput(String expectedOutput) { this.expectedOutput = expectedOutput; }

        public boolean isSample() { return sample; }
        public void setSample(boolean sample) { this.sample = sample; }
    }
}
