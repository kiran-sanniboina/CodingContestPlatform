package com.contest.judge;

public class TestCaseDto {
    private String id;
    private String problemId;
    private Integer order;
    private String input;
    private String expectedOutput;
    private boolean sample;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getProblemId() { return problemId; }
    public void setProblemId(String problemId) { this.problemId = problemId; }

    public Integer getOrder() { return order; }
    public void setOrder(Integer order) { this.order = order; }

    public String getInput() { return input; }
    public void setInput(String input) { this.input = input; }

    public String getExpectedOutput() { return expectedOutput; }
    public void setExpectedOutput(String expectedOutput) { this.expectedOutput = expectedOutput; }

    public boolean isSample() { return sample; }
    public void setSample(boolean sample) { this.sample = sample; }
}