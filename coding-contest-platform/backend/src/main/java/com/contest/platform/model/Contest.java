package com.contest.platform.model;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.Instant;

@Data
@Document(collection = "contests")
public class Contest {
    @Id
    private String id;
    private String name;
    private Instant startTime;
    private Instant endTime;
    private ContestStatus status;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public Instant getStartTime() { return startTime; }
    public void setStartTime(Instant startTime) { this.startTime = startTime; }

    public Instant getEndTime() { return endTime; }
    public void setEndTime(Instant endTime) { this.endTime = endTime; }

    public ContestStatus getStatus() { return status; }
    public void setStatus(ContestStatus status) { this.status = status; }
}
