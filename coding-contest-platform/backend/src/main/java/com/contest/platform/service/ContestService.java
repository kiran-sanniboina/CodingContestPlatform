package com.contest.platform.service;

import com.contest.platform.model.Contest;
import com.contest.platform.model.Problem;
import com.contest.platform.repository.ContestRepository;
import com.contest.platform.repository.ProblemRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class ContestService {
    @Autowired
    private ContestRepository contestRepository;
    @Autowired
    private ProblemRepository problemRepository;

    public Contest getCurrentContest() {
        return contestRepository.findAll().stream().findFirst().orElse(null);
    }

    public List<Problem> getProblemsForContest(String contestId) {
        return problemRepository.findByContestId(contestId);
    }
}
