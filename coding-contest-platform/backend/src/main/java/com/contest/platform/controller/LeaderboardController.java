package com.contest.platform.controller;

import com.contest.platform.model.*;
import com.contest.platform.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/leaderboard")
public class LeaderboardController {

    @Autowired
    private TeamRepository teamRepository;

    @Autowired
    private SubmissionRepository submissionRepository;

    @GetMapping
    public ResponseEntity<?> getLeaderboard() {
        List<Team> teams = teamRepository.findAll();
        List<Map<String, Object>> leaderboard = new ArrayList<>();

        for (Team team : teams) {
            List<Submission> subs = submissionRepository.findByTeamId(team.getId());
            
            boolean[] solvedProblems = new boolean[5];
            int solvedCount = 0;
            long totalExecutionTime = 0;

            for (Submission s : subs) {
                if (s.getStatus() == SubmissionStatus.ACCEPTED && s.getProblemId() != null) {
                    try {
                        String pid = s.getProblemId();
                        int probNum = 1;
                        if (pid.contains("_")) {
                            probNum = Integer.parseInt(pid.split("_")[1]);
                        } else {
                            probNum = Integer.parseInt(pid.replace("q", ""));
                        }
                        if (probNum >= 1 && probNum <= 5 && !solvedProblems[probNum - 1]) {
                            solvedProblems[probNum - 1] = true;
                            solvedCount++;
                            if (s.getExecutionTimeMs() != null) {
                                totalExecutionTime += s.getExecutionTimeMs();
                            }
                        }
                    } catch (Exception ignored) {}
                }
            }

            Map<String, Object> entry = new HashMap<>();
            entry.put("teamId", team.getId());
            entry.put("name", team.getName() != null ? team.getName() : team.getId());
            entry.put("preferredLanguage", team.getPreferredLanguage());
            entry.put("year", team.getYear() != null ? team.getYear() : 1);
            entry.put("solved", solvedCount);
            entry.put("time", totalExecutionTime + "ms");
            entry.put("timeMs", totalExecutionTime);
            entry.put("problems", solvedProblems);

            leaderboard.add(entry);
        }

        // Sort: Most solved first, then lowest time
        leaderboard.sort((a, b) -> {
            int solvedA = (int) a.get("solved");
            int solvedB = (int) b.get("solved");
            if (solvedA != solvedB) {
                return Integer.compare(solvedB, solvedA);
            }
            long timeA = (long) a.get("timeMs");
            long timeB = (long) b.get("timeMs");
            return Long.compare(timeA, timeB);
        });

        // Assign ranks
        for (int i = 0; i < leaderboard.size(); i++) {
            leaderboard.get(i).put("rank", i + 1);
        }

        return ResponseEntity.ok(leaderboard);
    }
}
