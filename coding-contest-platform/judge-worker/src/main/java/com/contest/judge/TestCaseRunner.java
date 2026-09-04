package com.contest.judge;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.Files;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
public class TestCaseRunner {
    private static final Logger log = LoggerFactory.getLogger(TestCaseRunner.class);

    private final ExecutionService executionService;
    private final JudgeClient judgeClient;

    public TestCaseRunner(ExecutionService executionService, JudgeClient judgeClient) {
        this.executionService = executionService;
        this.judgeClient = judgeClient;
    }

    public JobResult runTests(SubmissionJob job, Path workDir) {
        JobResult result = new JobResult();
        result.setSubmissionId(job.getSubmissionId());
        
        String probId = job.getProblemId();
        String lang = job.getLanguage() != null ? job.getLanguage().toUpperCase() : "JAVA";

        // 1. Try to fetch dynamic test cases from backend first
        List<TestCaseDto> dbTestCases = judgeClient.getProblemTestCases(probId);
        if (dbTestCases != null && !dbTestCases.isEmpty()) {
            log.info("Running {} database test cases for problem {}", dbTestCases.size(), probId);
            result.setTotalTests(dbTestCases.size());
            int passed = 0;
            long totalTime = 0;

            for (TestCaseDto tc : dbTestCases) {
                long start = System.currentTimeMillis();
                ExecutionResult execRes;
                
                if (lang.contains("JAVA")) {
                    execRes = executionService.runJavaTest(workDir, tc.getInput(), tc.getExpectedOutput(), job.getMemoryLimitMb(), job.getTimeLimitMs());
                } else if (lang.contains("CPP") || lang.contains("C++")) {
                    execRes = executionService.runCppTest(workDir, tc.getInput(), tc.getExpectedOutput(), job.getMemoryLimitMb(), job.getTimeLimitMs());
                } else if (lang.contains("PYTHON")) {
                    execRes = executionService.runPythonTest(workDir, tc.getInput(), tc.getExpectedOutput(), job.getMemoryLimitMb(), job.getTimeLimitMs());
                } else {
                    result.setVerdict(Verdict.SYSTEM_ERROR);
                    return result;
                }
                long elapsed = System.currentTimeMillis() - start;
                totalTime += elapsed;

                if (execRes.getVerdict() != Verdict.ACCEPTED) {
                    result.setVerdict(execRes.getVerdict());
                    result.setFailedTest("Test #" + tc.getOrder());
                    result.setExecutionTimeMs(totalTime);
                    result.setPassedTests(passed);
                    return result;
                }
                passed++;
            }

            result.setVerdict(Verdict.ACCEPTED);
            result.setPassedTests(passed);
            result.setExecutionTimeMs(totalTime);
            return result;
        }

        // 2. Fallback to filesystem problem directory
        Path problemDir = Paths.get("problems", probId);
        if (!Files.exists(problemDir)) {
            problemDir = Paths.get("problems", "q" + probId);
        }
        if (!Files.exists(problemDir)) {
            problemDir = Paths.get("/app/problems", probId);
        }
        if (!Files.exists(problemDir)) {
            problemDir = Paths.get("/app/problems", "q" + probId);
        }

        if (!Files.exists(problemDir)) {
            log.error("Problem directory or DB test cases not found: {}", probId);
            result.setVerdict(Verdict.SYSTEM_ERROR);
            return result;
        }

        try (Stream<Path> stream = Files.list(problemDir)) {
            List<Path> inFiles = stream.filter(p -> p.toString().endsWith(".in")).sorted().collect(Collectors.toList());
            result.setTotalTests(inFiles.size());
            int passed = 0;
            long totalTime = 0;

            for (Path inFile : inFiles) {
                Path outFile = problemDir.resolve(inFile.getFileName().toString().replace(".in", ".out"));
                if (!Files.exists(outFile)) continue;

                String input = Files.readString(inFile);
                String expected = Files.readString(outFile);

                long start = System.currentTimeMillis();
                ExecutionResult execRes;
                
                if (lang.contains("JAVA")) {
                    execRes = executionService.runJavaTest(workDir, input, expected, job.getMemoryLimitMb(), job.getTimeLimitMs());
                } else if (lang.contains("CPP") || lang.contains("C++")) {
                    execRes = executionService.runCppTest(workDir, input, expected, job.getMemoryLimitMb(), job.getTimeLimitMs());
                } else if (lang.contains("PYTHON")) {
                    execRes = executionService.runPythonTest(workDir, input, expected, job.getMemoryLimitMb(), job.getTimeLimitMs());
                } else {
                    result.setVerdict(Verdict.SYSTEM_ERROR);
                    return result;
                }
                long elapsed = System.currentTimeMillis() - start;
                totalTime += elapsed;

                if (execRes.getVerdict() != Verdict.ACCEPTED) {
                    result.setVerdict(execRes.getVerdict());
                    result.setFailedTest(inFile.getFileName().toString());
                    result.setExecutionTimeMs(totalTime);
                    result.setPassedTests(passed);
                    return result;
                }
                passed++;
            }
            
            result.setVerdict(Verdict.ACCEPTED);
            result.setPassedTests(passed);
            result.setExecutionTimeMs(totalTime);
            return result;
        } catch (Exception e) {
            log.error("Error running tests", e);
            result.setVerdict(Verdict.SYSTEM_ERROR);
            return result;
        }
    }
}
