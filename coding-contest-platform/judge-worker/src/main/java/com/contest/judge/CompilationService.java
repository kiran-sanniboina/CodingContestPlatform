package com.contest.judge;
import org.springframework.stereotype.Service;
import java.nio.file.Files;
import java.nio.file.Path;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class CompilationService {
    private final DockerExecutor dockerExecutor;

    public CompilationService(DockerExecutor dockerExecutor) {
        this.dockerExecutor = dockerExecutor;
    }

    public ExecutionResult compileJava(Path workDir, String sourceCode) {
        try {
            Files.writeString(workDir.resolve("Main.java"), sourceCode);
            return dockerExecutor.execute("eclipse-temurin:21-jdk", workDir.toAbsolutePath().toString(), 
                new String[]{"javac", "Main.java"}, 512, 10000);
        } catch (Exception e) {
            log.error("Compilation error", e);
            return new ExecutionResult(Verdict.SYSTEM_ERROR, "", e.getMessage());
        }
    }

    public ExecutionResult compileCpp(Path workDir, String sourceCode) {
        try {
            Files.writeString(workDir.resolve("main.cpp"), sourceCode);
            return dockerExecutor.execute("gcc:13", workDir.toAbsolutePath().toString(), 
                new String[]{"g++", "-std=c++20", "main.cpp", "-o", "main"}, 512, 10000);
        } catch (Exception e) {
            log.error("Compilation error", e);
            return new ExecutionResult(Verdict.SYSTEM_ERROR, "", e.getMessage());
        }
    }
}
