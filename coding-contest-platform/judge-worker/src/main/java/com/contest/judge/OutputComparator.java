package com.contest.judge;
import org.springframework.stereotype.Component;

@Component
public class OutputComparator {
    public boolean compare(String expected, String actual) {
        if (expected == null || actual == null) return false;
        String[] expectedLines = expected.trim().split("\\r?\\n");
        String[] actualLines = actual.trim().split("\\r?\\n");
        if (expectedLines.length != actualLines.length) return false;
        for (int i = 0; i < expectedLines.length; i++) {
            if (!expectedLines[i].trim().equals(actualLines[i].trim())) {
                return false;
            }
        }
        return true;
    }
}
