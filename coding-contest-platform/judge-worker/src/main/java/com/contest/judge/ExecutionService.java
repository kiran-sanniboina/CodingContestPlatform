package com.contest.judge;
import org.springframework.stereotype.Service;
import java.nio.file.Path;
import java.nio.file.Files;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class ExecutionService {
    private final DockerExecutor dockerExecutor;
    private final OutputComparator outputComparator;

    public ExecutionService(DockerExecutor dockerExecutor, OutputComparator outputComparator) {
        this.dockerExecutor = dockerExecutor;
        this.outputComparator = outputComparator;
    }

    public ExecutionResult runJavaTest(Path workDir, String input, String expectedOutput, int memoryLimitMb, int timeoutMs) {
        return runTest(workDir, input, expectedOutput, memoryLimitMb, timeoutMs, "eclipse-temurin:21-jdk", new String[]{"sh", "-c", "java Main < input.txt"});
    }

    public ExecutionResult runCppTest(Path workDir, String input, String expectedOutput, int memoryLimitMb, int timeoutMs) {
        return runTest(workDir, input, expectedOutput, memoryLimitMb, timeoutMs, "gcc:13", new String[]{"sh", "-c", "./main < input.txt"});
    }

    public ExecutionResult runPythonTest(Path workDir, String input, String expectedOutput, int memoryLimitMb, int timeoutMs) {
        return runTest(workDir, input, expectedOutput, memoryLimitMb, timeoutMs, "python:3-alpine", new String[]{"sh", "-c", "python3 main.py < input.txt"});
    }

    private ExecutionResult runTest(Path workDir, String input, String expectedOutput, int memoryLimitMb, int timeoutMs, String image, String[] cmd) {
        try {
            Files.writeString(workDir.resolve("input.txt"), input);
            ExecutionResult res = dockerExecutor.execute(image, workDir.toAbsolutePath().toString(), cmd, memoryLimitMb, timeoutMs);
            
            if (res.getVerdict() != Verdict.ACCEPTED) {
                return res;
            }
            if (!outputComparator.compare(expectedOutput, res.getStdout())) {
                res.setVerdict(Verdict.WRONG_ANSWER);
            }
            return res;
        } catch (Exception e) {
            log.error("Execution error", e);
            return new ExecutionResult(Verdict.SYSTEM_ERROR, "", e.getMessage());
        }
    }
}
