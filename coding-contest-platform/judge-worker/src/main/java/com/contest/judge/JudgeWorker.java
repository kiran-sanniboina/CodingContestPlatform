package com.contest.judge;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import lombok.extern.slf4j.Slf4j;
import java.nio.file.Path;
import java.nio.file.Files;
import org.springframework.util.FileSystemUtils;

@Slf4j
@Service
public class JudgeWorker {
    private final JudgeClient client;
    private final CompilationService compService;
    private final TestCaseRunner testRunner;
    
    public JudgeWorker(JudgeClient client, CompilationService compService, TestCaseRunner testRunner) {
        this.client = client;
        this.compService = compService;
        this.testRunner = testRunner;
    }

    @Scheduled(fixedDelayString = "${judge.poll-interval-ms:2000}")
    public void poll() {
        SubmissionJob jobRef = client.getNextJob();
        if (jobRef == null || jobRef.getSubmissionId() == null) return;
        
        log.info("Processing submission job: ID={}, Problem={}, Language={}", 
                jobRef.getSubmissionId(), jobRef.getProblemId(), jobRef.getLanguage());
        
        SubmissionJob job = jobRef;
        if (job.getSourceCode() == null || job.getSourceCode().isEmpty()) {
            job = client.getSubmissionDetails(jobRef.getSubmissionId());
        }
        
        if (job == null || job.getSourceCode() == null) {
            log.error("Failed to load submission source code for ID: {}", jobRef.getSubmissionId());
            return; 
        }
        
        Path workDir = null;
        try {
            workDir = Files.createTempDirectory("judge-");
            
            String lang = job.getLanguage() != null ? job.getLanguage().toUpperCase() : "JAVA";
            if (lang.contains("JAVA")) {
                ExecutionResult compRes = compService.compileJava(workDir, job.getSourceCode());
                if (compRes.getVerdict() != Verdict.ACCEPTED) {
                    JobResult res = new JobResult();
                    res.setSubmissionId(job.getSubmissionId());
                    res.setVerdict(Verdict.COMPILATION_ERROR);
                    client.submitResult(res);
                    return;
                }
            } else if (lang.contains("CPP") || lang.contains("C++")) {
                ExecutionResult compRes = compService.compileCpp(workDir, job.getSourceCode());
                if (compRes.getVerdict() != Verdict.ACCEPTED) {
                    JobResult res = new JobResult();
                    res.setSubmissionId(job.getSubmissionId());
                    res.setVerdict(Verdict.COMPILATION_ERROR);
                    client.submitResult(res);
                    return;
                }
            } else if (lang.contains("PYTHON")) {
                Files.writeString(workDir.resolve("main.py"), job.getSourceCode());
            }
            
            JobResult res = testRunner.runTests(job, workDir);
            client.submitResult(res);

        } catch (Exception e) {
            log.error("Judge worker execution failed", e);
            JobResult res = new JobResult();
            res.setSubmissionId(job.getSubmissionId());
            res.setVerdict(Verdict.SYSTEM_ERROR);
            client.submitResult(res);
        } finally {
            if (workDir != null) {
                try {
                    FileSystemUtils.deleteRecursively(workDir);
                } catch(Exception ignored) {}
            }
        }
    }
}
