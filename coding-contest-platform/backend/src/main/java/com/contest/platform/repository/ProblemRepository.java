package com.contest.platform.repository;

import com.contest.platform.model.Problem;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;
import java.util.Optional;

public interface ProblemRepository extends MongoRepository<Problem, String> {
    List<Problem> findByContestId(String contestId);
    Optional<Problem> findByContestIdAndSequence(String contestId, Integer sequence);
    List<Problem> findByYearOrderBySequenceAsc(Integer year);
    List<Problem> findByYear(Integer year);
}
