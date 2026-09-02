package com.contest.platform.repository;
import com.contest.platform.model.Submission;
import com.contest.platform.model.SubmissionStatus;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;
import java.util.Optional;

public interface SubmissionRepository extends MongoRepository<Submission, String> {
    List<Submission> findByTeamId(String teamId);
    Optional<Submission> findFirstByStatus(SubmissionStatus status);
}
