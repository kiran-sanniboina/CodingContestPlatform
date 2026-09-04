package com.contest.judge;

import lombok.Data;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;

@RestController
public class RunController {

    private static final Logger log = LoggerFactory.getLogger(RunController.class);

    @Autowired
    private CompilationService compilationService;

    @Autowired
    private ExecutionService executionService;

    @PostMapping({"/run", "/api/run", "/run/"})
    public ResponseEntity<?> runSample(@RequestBody RunRequest request) {
        log.info("Received dry-run sample request for problem {}", request.getProblemId());
        Path tempDir = null;
        try {
            tempDir = Files.createTempDirectory("judge-run-");
            String lang = request.getLanguage() != null ? request.getLanguage().toUpperCase() : "JAVA";
            int mem = request.getMemoryLimitMb() > 0 ? request.getMemoryLimitMb() : 256;
            int time = request.getTimeLimitMs() > 0 ? request.getTimeLimitMs() : 3000;

            // 1. Compile step (if required)
            if (lang.contains("JAVA")) {
                ExecutionResult compRes = compilationService.compileJava(tempDir, request.getSourceCode());
                if (compRes.getVerdict() != Verdict.ACCEPTED) {
                    return ResponseEntity.ok(createResponse(Verdict.COMPILATION_ERROR, compRes.getStdout(), compRes.getStderr(), 0));
                }
            } else if (lang.contains("CPP") || lang.contains("C++")) {
                ExecutionResult compRes = compilationService.compileCpp(tempDir, request.getSourceCode());
                if (compRes.getVerdict() != Verdict.ACCEPTED) {
                    return ResponseEntity.ok(createResponse(Verdict.COMPILATION_ERROR, compRes.getStdout(), compRes.getStderr(), 0));
                }
            } else if (lang.contains("PYTHON")) {
                Files.writeString(tempDir.resolve("main.py"), request.getSourceCode());
            }

            // 2. Execution step against sample input
            long start = System.currentTimeMillis();
            ExecutionResult execRes;
            String input = request.getInput() != null ? request.getInput() : "";
            String expected = request.getExpectedOutput() != null ? request.getExpectedOutput() : "";

            if (lang.contains("JAVA")) {
                execRes = executionService.runJavaTest(tempDir, input, expected, mem, time);
            } else if (lang.contains("CPP") || lang.contains("C++")) {
                execRes = executionService.runCppTest(tempDir, input, expected, mem, time);
            } else if (lang.contains("PYTHON")) {
                execRes = executionService.runPythonTest(tempDir, input, expected, mem, time);
            } else {
                return ResponseEntity.ok(createResponse(Verdict.SYSTEM_ERROR, "", "Unsupported language: " + lang, 0));
            }
            long elapsed = System.currentTimeMillis() - start;

            return ResponseEntity.ok(createResponse(execRes.getVerdict(), execRes.getStdout(), execRes.getStderr(), (int) elapsed));

        } catch (Exception e) {
            log.error("Sample execution error", e);
            return ResponseEntity.ok(createResponse(Verdict.SYSTEM_ERROR, "", e.getMessage(), 0));
        } finally {
            if (tempDir != null) {
                try {
                    Files.walk(tempDir)
                            .sorted((a, b) -> b.compareTo(a))
                            .forEach(p -> {
                                try { Files.deleteIfExists(p); } catch (Exception ignored) {}
                            });
                } catch (Exception ignored) {}
            }
        }
    }

    private Map<String, Object> createResponse(Verdict verdict, String stdout, String stderr, int executionTimeMs) {
        Map<String, Object> resp = new HashMap<>();
        resp.put("verdict", verdict.name());
        resp.put("status", verdict.name());
        resp.put("stdout", stdout != null ? stdout : "");
        resp.put("stderr", stderr != null ? stderr : "");
        resp.put("executionTimeMs", executionTimeMs);
        return resp;
    }

    @Data
    public static class RunRequest {
        private String problemId;
        private String language;
        private String sourceCode;
        private String input;
        private String expectedOutput;
        private int timeLimitMs = 3000;
        private int memoryLimitMb = 256;

        public String getProblemId() { return problemId; }
        public void setProblemId(String problemId) { this.problemId = problemId; }

        public String getLanguage() { return language; }
        public void setLanguage(String language) { this.language = language; }

        public String getSourceCode() { return sourceCode; }
        public void setSourceCode(String sourceCode) { this.sourceCode = sourceCode; }

        public String getInput() { return input; }
        public void setInput(String input) { this.input = input; }

        public String getExpectedOutput() { return expectedOutput; }
        public void setExpectedOutput(String expectedOutput) { this.expectedOutput = expectedOutput; }

        public int getTimeLimitMs() { return timeLimitMs; }
        public void setTimeLimitMs(int timeLimitMs) { this.timeLimitMs = timeLimitMs; }

        public int getMemoryLimitMb() { return memoryLimitMb; }
        public void setMemoryLimitMb(int memoryLimitMb) { this.memoryLimitMb = memoryLimitMb; }
    }
}
