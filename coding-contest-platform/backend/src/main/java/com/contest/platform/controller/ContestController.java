package com.contest.platform.controller;

import com.contest.platform.model.*;
import com.contest.platform.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api/contest")
public class ContestController {
    
    @Autowired
    private ContestRepository contestRepository;

    @Autowired
    private ProblemRepository problemRepository;

    @Autowired
    private TeamRepository teamRepository;

    @GetMapping("/current")
    public ResponseEntity<?> getCurrentContest() {
        Contest contest = contestRepository.findAll().stream().findFirst().orElse(null);
        Map<String, Object> response = new HashMap<>();
        response.put("contest", contest);
        response.put("serverTime", Instant.now());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/team")
    public ResponseEntity<?> getTeamProfile() {
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
        return ResponseEntity.ok(team);
    }

    @PostMapping("/team/language")
    public ResponseEntity<?> setPreferredLanguage(@RequestBody Map<String, String> body) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        String lang = body.get("language");
        if (lang != null) {
            Optional<Team> teamOpt = teamRepository.findById(username);
            if (teamOpt.isPresent()) {
                Team team = teamOpt.get();
                team.setPreferredLanguage(lang.toUpperCase());
                teamRepository.save(team);
                return ResponseEntity.ok(team);
            }
        }
        return ResponseEntity.badRequest().build();
    }

    @GetMapping("/problems")
    public ResponseEntity<?> getProblems() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        Team team = teamRepository.findById(username).orElse(null);
        int currentUnlocked = (team != null && team.getCurrentProblem() != null) ? team.getCurrentProblem() : 1;
        int teamYear = (team != null && team.getYear() != null) ? team.getYear() : 1;

        List<Problem> problems = problemRepository.findByYearOrderBySequenceAsc(teamYear);
        if (problems.isEmpty()) {
            problems = problemRepository.findAll();
            problems.sort(Comparator.comparing(Problem::getSequence, Comparator.nullsLast(Comparator.naturalOrder())));
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (Problem p : problems) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", p.getId());
            map.put("sequence", p.getSequence());
            map.put("title", p.getTitle());
            map.put("difficulty", p.getDifficulty());
            map.put("year", p.getYear());
            map.put("timeLimitMs", p.getTimeLimitMs());
            map.put("memoryLimitMb", p.getMemoryLimitMb());
            
            boolean isUnlocked = p.getSequence() <= currentUnlocked;
            map.put("unlocked", isUnlocked);
            
            if (isUnlocked) {
                map.put("story", p.getStory());
                map.put("description", p.getDescription());
                map.put("inputFormat", p.getInputFormat());
                map.put("outputFormat", p.getOutputFormat());
                map.put("constraints", p.getConstraints());
                map.put("sampleInput", p.getSampleInput());
                map.put("sampleOutput", p.getSampleOutput());
                map.put("sampleExplanation", p.getSampleExplanation());
            } else {
                map.put("story", "Locked. Solve Question " + (p.getSequence() - 1) + " to unlock this challenge.");
                map.put("description", "Locked.");
            }
            result.add(map);
        }

        return ResponseEntity.ok(result);
    }
}
