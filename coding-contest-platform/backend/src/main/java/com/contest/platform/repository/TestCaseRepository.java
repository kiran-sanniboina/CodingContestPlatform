package com.contest.platform.repository;

import com.contest.platform.model.TestCase;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface TestCaseRepository extends MongoRepository<TestCase, String> {
    List<TestCase> findByProblemId(String problemId);
    void deleteByProblemId(String problemId);
}