package com.contest.judge;

import com.github.dockerjava.api.DockerClient;
import com.github.dockerjava.api.command.CreateContainerResponse;
import com.github.dockerjava.api.command.WaitContainerResultCallback;
import com.github.dockerjava.api.model.HostConfig;
import com.github.dockerjava.core.DefaultDockerClientConfig;
import com.github.dockerjava.core.DockerClientImpl;
import com.github.dockerjava.httpclient5.ApacheDockerHttpClient;
import com.github.dockerjava.transport.DockerHttpClient;
import org.apache.commons.compress.archivers.tar.TarArchiveEntry;
import org.apache.commons.compress.archivers.tar.TarArchiveInputStream;
import org.apache.commons.compress.archivers.tar.TarArchiveOutputStream;
import org.springframework.stereotype.Component;
import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.concurrent.TimeUnit;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import lombok.extern.slf4j.Slf4j;
import com.github.dockerjava.api.async.ResultCallback;
import com.github.dockerjava.api.model.Frame;

@Slf4j
@Component
public class DockerExecutor {
    private final DockerClient dockerClient;
    private final Set<String> pulledImages = ConcurrentHashMap.newKeySet();

    public DockerExecutor() {
        DefaultDockerClientConfig config = DefaultDockerClientConfig.createDefaultConfigBuilder().build();
        DockerHttpClient httpClient = new ApacheDockerHttpClient.Builder()
            .dockerHost(config.getDockerHost())
            .sslConfig(config.getSSLConfig())
            .build();
        this.dockerClient = DockerClientImpl.getInstance(config, httpClient);
    }

    private void ensureImage(String image) {
        if (!pulledImages.contains(image)) {
            try {
                log.info("Ensuring Docker image is available: {}", image);
                dockerClient.pullImageCmd(image).start().awaitCompletion(120, TimeUnit.SECONDS);
                pulledImages.add(image);
                log.info("Image ready: {}", image);
            } catch (Exception e) {
                log.warn("Could not pull image (might already exist locally): {}", e.getMessage());
                pulledImages.add(image);
            }
        }
    }

    public ExecutionResult execute(String image, String workDir, String[] cmd, int memoryLimitMb, int timeoutMs) {
        String containerId = null;
        try {
            ensureImage(image);

            HostConfig hostConfig = HostConfig.newHostConfig()
                .withNetworkMode("none")
                .withMemory(memoryLimitMb * 1024L * 1024L)
                .withPidsLimit(100L)
                .withCapDrop(com.github.dockerjava.api.model.Capability.ALL);

            CreateContainerResponse container = dockerClient.createContainerCmd(image)
                .withHostConfig(hostConfig)
                .withWorkingDir("/workspace")
                .withCmd(cmd)
                .withNetworkDisabled(true)
                .withAttachStdout(true)
                .withAttachStderr(true)
                .exec();

            containerId = container.getId();

            // Archive all files from workDir and copy into /workspace in the container
            File workDirFile = new File(workDir);
            File[] files = workDirFile.listFiles();
            if (files != null && files.length > 0) {
                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                try (TarArchiveOutputStream tos = new TarArchiveOutputStream(baos)) {
                    for (File f : files) {
                        if (f.isFile()) {
                            TarArchiveEntry entry = new TarArchiveEntry(f, f.getName());
                            entry.setSize(f.length());
                            tos.putArchiveEntry(entry);
                            Files.copy(f.toPath(), tos);
                            tos.closeArchiveEntry();
                        }
                    }
                    tos.finish();
                }
                try (ByteArrayInputStream bais = new ByteArrayInputStream(baos.toByteArray())) {
                    dockerClient.copyArchiveToContainerCmd(containerId)
                        .withTarInputStream(bais)
                        .withRemotePath("/workspace")
                        .exec();
                }
            }

            dockerClient.startContainerCmd(containerId).exec();

            WaitContainerResultCallback callback = new WaitContainerResultCallback();
            dockerClient.waitContainerCmd(containerId).exec(callback);

            boolean completed = callback.awaitCompletion(timeoutMs, TimeUnit.MILLISECONDS);
            if (!completed) {
                try {
                    dockerClient.killContainerCmd(containerId).exec();
                } catch (Exception ignored) {}
                return new ExecutionResult(Verdict.TIME_LIMIT_EXCEEDED, "", "Time Limit Exceeded");
            }

            int exitCode = dockerClient.inspectContainerCmd(containerId).exec().getState().getExitCodeLong().intValue();

            StringBuilder stdout = new StringBuilder();
            StringBuilder stderr = new StringBuilder();

            dockerClient.logContainerCmd(containerId)
                .withStdOut(true)
                .withStdErr(true)
                .exec(new ResultCallback.Adapter<Frame>() {
                    @Override
                    public void onNext(Frame frame) {
                        if (frame.getStreamType() == com.github.dockerjava.api.model.StreamType.STDOUT) {
                            stdout.append(new String(frame.getPayload()));
                        } else if (frame.getStreamType() == com.github.dockerjava.api.model.StreamType.STDERR) {
                            stderr.append(new String(frame.getPayload()));
                        }
                    }
                }).awaitCompletion();

            // If execution succeeded (or compiled), copy files back from container to host workDir
            if (exitCode == 0) {
                try (InputStream is = dockerClient.copyArchiveFromContainerCmd(containerId, "/workspace").exec();
                     TarArchiveInputStream tis = new TarArchiveInputStream(is)) {
                    TarArchiveEntry entry;
                    while ((entry = tis.getNextEntry()) != null) {
                        if (!entry.isDirectory()) {
                            Path outPath = Paths.get(workDir, entry.getName().replace("workspace/", ""));
                            Files.createDirectories(outPath.getParent());
                            Files.copy(tis, outPath, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
                        }
                    }
                } catch (Exception e) {
                    log.debug("No files extracted or extraction error: {}", e.getMessage());
                }
            }

            return new ExecutionResult(
                exitCode == 0 ? Verdict.ACCEPTED : Verdict.RUNTIME_ERROR, 
                stdout.toString(), 
                stderr.toString(), 
                exitCode
            );

        } catch (Exception e) {
            log.error("Docker execution error", e);
            return new ExecutionResult(Verdict.SYSTEM_ERROR, "", e.getMessage());
        } finally {
            if (containerId != null) {
                try {
                    dockerClient.removeContainerCmd(containerId).withForce(true).exec();
                } catch (Exception e) {
                    log.error("Failed to remove container", e);
                }
            }
        }
    }
}
