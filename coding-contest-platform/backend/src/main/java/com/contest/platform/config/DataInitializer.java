package com.contest.platform.config;

import com.contest.platform.model.*;
import com.contest.platform.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;

@Component
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    @Autowired private ContestRepository contestRepository;
    @Autowired private ProblemRepository problemRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private TeamRepository teamRepository;
    @Autowired private TestCaseRepository testCaseRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        Contest contest = contestRepository.findAll().stream().findFirst().orElse(null);
        if (contest == null) {
            contest = new Contest();
            contest.setName("Final Round Championship");
            contest.setStartTime(Instant.now().minus(15, ChronoUnit.MINUTES));
            contest.setEndTime(Instant.now().plus(165, ChronoUnit.MINUTES));
            contest.setStatus(ContestStatus.RUNNING);
            contest = contestRepository.save(contest);
        }
        String contestId = contest.getId();

        // Only seed default problems if none exist in the database (preserves admin-added questions across restarts)
        if (problemRepository.count() == 0) {
            log.info("Database empty. Seeding default Year 1-4 problems and test cases...");
            // --- YEAR 1 ---
            addProblem(contestId, "1_1", 1, 1, "1. The Signal Cipher", "Easy", 
                "During deep space reconnaissance, Starship Aethelgard intercepts a garbled broadcast.", 
                "Given an alphanumeric string S, calculate the frequency of each unique character. If the total length of S is odd, output all characters that appear an odd number of times, sorted alphabetically. If the total length of S is even, output all characters that appear an even number of times (>0), sorted alphabetically.", 
                "A single line containing the string S.", "The sorted string of matching characters, or 'EMPTY'.", "1 <= length(S) <= 1000", "aabbcc", "abc");
            addTc("1_1", 1, "aabbcc", "abc", true);
            addTc("1_1", 2, "abc", "abc", false);
            addTc("1_1", 3, "abbccc", "b", false);

            addProblem(contestId, "1_2", 1, 2, "2. Array Subsegment Energy", "Medium", 
                "Find the contiguous subsegment of battery cells with maximum energy.", 
                "Given an array of integers, find the contiguous subarray with the largest sum and return its sum.", 
                "Line 1: N\nLine 2: N space-separated integers", "A single integer.", "1 <= N <= 10^5", "5\n-2 1 -3 4 -1 2 1 -5 4", "6");
            addTc("1_2", 1, "5\n-2 1 -3 4 -1 2 1 -5 4", "6", true);
            addTc("1_2", 2, "3\n1 2 3", "6", false);

            // --- YEAR 2 ---
            addProblem(contestId, "2_1", 2, 1, "1. The Reactor Grid", "Medium", 
                "The antimatter reactor is overheating across an N x M grid.", 
                "Given an N x M matrix, find the minimum path sum from (0,0) to (N-1, M-1) moving only Right or Down. Return -1 if no path.", 
                "N M\nN lines of M integers", "Integer", "1 <= N, M <= 500", "3 3\n1 3 1\n1 5 1\n4 2 1", "7");
            addTc("2_1", 1, "3 3\n1 3 1\n1 5 1\n4 2 1", "7", true);
            addTc("2_1", 2, "2 2\n1 -1\n-1 1", "-1", false);

            addProblem(contestId, "2_2", 2, 2, "2. Asteroid Orbit Sync", "Medium", 
                "Autonomous mining probes must harvest resources.", 
                "Given N time intervals [start, end], find the maximum number of mutually compatible intervals.", 
                "N\nN lines of start end", "Integer", "1 <= N <= 10^5", "4\n1 3\n2 5\n3 6\n5 7", "2");
            addTc("2_2", 1, "4\n1 3\n2 5\n3 6\n5 7", "2", true);
            addTc("2_2", 2, "3\n1 2\n2 3\n3 4", "3", false);

            // --- YEAR 3 ---
            addProblem(contestId, "3_1", 3, 1, "1. The Quantum Nexus", "Hard", 
                "A quantum relay network consists of N optical nodes.", 
                "Find the shortest latency path from Node 1 to Node N in a weighted graph.", 
                "N M\nM lines of u v w", "Integer", "1 <= N <= 10^5", "4 4\n1 2 2\n2 4 5\n1 3 1\n3 4 3", "4");
            addTc("3_1", 1, "4 4\n1 2 2\n2 4 5\n1 3 1\n3 4 3", "4", true);
            addTc("3_1", 2, "3 1\n1 2 5", "-1", false);

            addProblem(contestId, "3_2", 3, 2, "2. Subspace Knapsack", "Hard", 
                "Maximize value of items within a weight capacity.", 
                "Given N items with weights and values, find max value for knapsack of capacity W.", 
                "N W\nN lines of w v", "Integer", "1 <= N <= 1000", "3 50\n10 60\n20 100\n30 120", "220");
            addTc("3_2", 1, "3 50\n10 60\n20 100\n30 120", "220", true);
            addTc("3_2", 2, "2 10\n10 50\n5 30", "50", false);

            // --- YEAR 4 ---
            addProblem(contestId, "4_1", 4, 1, "1. Galactic Core Protocol", "Hard", 
                "To ignite the stellar warp drive, N critical subroutines must be initiated.", 
                "Compute lexicographically smallest topological sort. If cycle, output DEADLOCK.", 
                "N M\nM lines of u v", "String", "1 <= N <= 10^5", "4 3\n1 2\n2 3\n3 4", "1 2 3 4");
            addTc("4_1", 1, "4 3\n1 2\n2 3\n3 4", "1 2 3 4", true);
            addTc("4_1", 2, "2 2\n1 2\n2 1", "DEADLOCK", false);

            addProblem(contestId, "4_2", 4, 2, "2. Max Flow Pipeline", "Expert", 
                "Maximize energy flow through the network.", 
                "Given a flow network, compute maximum flow from source to sink.", 
                "N M\nM lines of u v c", "Integer", "1 <= N <= 500", "4 5\n1 2 20\n1 3 10\n2 3 5\n2 4 10\n3 4 20", "25");
            addTc("4_2", 1, "4 5\n1 2 20\n1 3 10\n2 3 5\n2 4 10\n3 4 20", "25", true);
            addTc("4_2", 2, "2 1\n1 2 100", "100", false);
        } else {
            log.info("Database already contains {} problems. Preserving existing problem sets.", problemRepository.count());
        }


        // Seed / Force Refresh Admin Account
        User admin = userRepository.findByUsername("admin").orElseGet(() -> {
            User u = new User();
            u.setUsername("admin");
            u.setCreatedAt(Instant.now());
            return u;
        });
        admin.setPasswordHash(passwordEncoder.encode("admin123"));
        admin.setRole(Role.ADMIN);
        userRepository.save(admin);
        log.info("Admin user guaranteed with credentials: admin / admin123");

        // Seed / Force Refresh Team 1 Account
        User team1User = userRepository.findByUsername("team1").orElseGet(() -> {
            User u = new User();
            u.setUsername("team1");
            u.setCreatedAt(Instant.now());
            return u;
        });
        team1User.setPasswordHash(passwordEncoder.encode("password123"));
        team1User.setRole(Role.TEAM);
        userRepository.save(team1User);
        log.info("Team 1 user guaranteed with credentials: team1 / password123");

        Team team1 = teamRepository.findById("team1").orElseGet(() -> {
            Team t = new Team();
            t.setId("team1");
            t.setName("Team Alpha (Aethelgard)");
            t.setMembers(Arrays.asList("Alice", "Bob"));
            t.setPreferredLanguage("JAVA");
            t.setCurrentProblem(1);
            t.setYear(1);
            t.setStatus(TeamStatus.ACTIVE);
            return t;
        });
        team1.setContestId(contestId);
        teamRepository.save(team1);
    }

    private void addProblem(String contestId, String id, int year, int sequence, String title, String difficulty,
                            String story, String desc, String inFormat, String outFormat, String constraints,
                            String sampleIn, String sampleOut) {
        Problem p = new Problem();
        p.setId(id);
        p.setContestId(contestId);
        p.setYear(year);
        p.setSequence(sequence);
        p.setTitle(title);
        p.setDifficulty(difficulty);
        p.setStory(story);
        p.setDescription(desc);
        p.setInputFormat(inFormat);
        p.setOutputFormat(outFormat);
        p.setConstraints(constraints);
        p.setSampleInput(sampleIn);
        p.setSampleOutput(sampleOut);
        p.setSampleExplanation("Sample explanation here.");
        p.setTimeLimitMs(2000);
        p.setMemoryLimitMb(256);
        problemRepository.save(p);
    }

    private void addTc(String probId, int order, String input, String expectedOutput, boolean sample) {
        TestCase tc = new TestCase();
        tc.setProblemId(probId);
        tc.setOrder(order);
        tc.setInput(input);
        tc.setExpectedOutput(expectedOutput);
        tc.setSample(sample);
        testCaseRepository.save(tc);
    }
}
