package com.contest.platform.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.List;

@Data
@Document(collection = "teams")
public class Team {
    @Id
    private String id;
    private String name;
    private List<String> members;
    private String preferredLanguage;
    private Integer currentProblem = 1;
    private Integer year = 1;
    private String contestId;
    private TeamStatus status;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public List<String> getMembers() { return members; }
    public void setMembers(List<String> members) { this.members = members; }

    public String getPreferredLanguage() { return preferredLanguage; }
    public void setPreferredLanguage(String preferredLanguage) { this.preferredLanguage = preferredLanguage; }

    public Integer getCurrentProblem() { return currentProblem; }
    public void setCurrentProblem(Integer currentProblem) { this.currentProblem = currentProblem; }

    public Integer getYear() { return year; }
    public void setYear(Integer year) { this.year = year; }

    public String getContestId() { return contestId; }
    public void setContestId(String contestId) { this.contestId = contestId; }

    public TeamStatus getStatus() { return status; }
    public void setStatus(TeamStatus status) { this.status = status; }
}
