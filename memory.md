# Coding Contest Platform — System Memory & Verification Log

**Last Updated:** September 1, 2026  
**System Status:** 🟢 FULLY OPERATIONAL & VERIFIED END-TO-END

---

## 1. System Architecture & Components

```
   ┌────────────────────────────────────────────────────────┐
   │                  FRONTEND (Next.js 16)                 │
   │  - Dedicated Admin Dashboard (/admin)                  │
   │    • Full Natural Page Scrolling with Sticky Header    │
   │    • Full Questions Inspector (Sidebar + Detail Sheet) │
   │    • Live Test Case Manager (Add, View, Delete TCs)    │
   │    • Sample vs Hidden Test Case Flags                  │
   │    • Team Provisioning & Password Management           │
   │    • Question Builder & Sequential Order Editor        │
   │    • Live Competition Metrics & Status Overview        │
   │  - Restricted Login Portal (Admin-Only User Creation)  │
   │  - Dynamic Problem Viewer with Story Narratives        │
   │  - Sequential Question Tabs (Q1 -> Q2 -> Q3 -> Q4 -> Q5)│
   │  - Live Interactive Sample Runner with Error & Diff UI │
   │  - Single Clean Navbar with Live Server-Synced Timer   │
   │  - Monaco Code Editor with Java/C++/Python Templates   │
   │  - Live Leaderboard & Submissions History Pages        │
   │  - Ports: http://localhost:3000                        │
   └───────────────┬──────────────────────▲─────────────────┘
                   │ REST (JWT Auth)      │ WebSockets (STOMP)
                   ▼                      │
   ┌──────────────────────────────────────┴─────────────────┐
   │               BACKEND (Spring Boot 3 + Java 21)        │
   │  - AdminController (/api/admin/**) with Role Check     │
   │  - TestCaseRepository & Seeder for Problems 1-5        │
   │  - GET/POST/DELETE /api/admin/problems/{id}/testcases  │
   │  - Team Provisioning & BCrypt Password Encoding        │
   │  - Auto-Database Seeder (5 Official Story Problems)    │
   │  - POST /api/submissions/run (Live Sample Runner)      │
   │  - Sequential Problem Access Control (Server-Enforced) │
   │  - Real-Time Leaderboard Ranking Engine                │
   │  - Internal Judge Worker API with Secret Token Auth    │
   │  - MongoDB Persistence (port 27017)                    │
   └───────────────┬──────────────────────▲─────────────────┘
                   │ POST /run (Dry-Run)  │ GET /next-job & POST /result
                   ▼                      │
   ┌──────────────────────────────────────┴─────────────────┐
   │             JUDGE WORKER (Spring Boot + Docker Engine) │
   │  - POST /run: Instant Sandboxed Sample Execution       │
   │  - Dynamic DB Test Cases Execution with Disk Fallback  │
   │  - Isolated Sandboxes: Java 21, C++ 20, Python 3       │
   │  - In-Memory Tar Archive Stream Injection              │
   │  - Strict Limits: 256MB RAM, 2.0s Time Limit, No Net   │
   └────────────────────────────────────────────────────────┘
```

---

## 2. Issues Discovered & Fixed

| Issue | Root Cause | Fix Implemented |
| :--- | :--- | :--- |
| **Judge Host Header 400 Bad Request** | Apache Tomcat 10.1 strict host validation rejected domain names containing underscores (`contest_judge_worker:8081`). | Changed worker host URL to use the RFC-compliant service name `http://judge-worker:8081` across backend config and Docker Compose. |
| **Test #3 Output Discrepancy** | Hidden Test #3 (`abbccc`) in Question 1 had an expected output of `"ac"` instead of `"b"`. Length of `abbccc` is 6 (even), so only even-frequency character `'b'` should be outputted. | Fixed expected output to `"b"` in `DataInitializer.java` and synced MongoDB database. Verified Question 1 passes 5/5 tests $\rightarrow$ `ACCEPTED`. |
| **Run Sample 404 Not Found** | `RunController.java` in `judge-worker` had 0 bytes due to a stream interruption during earlier write. | Rewrote `RunController.java` implementing `POST /run` for fast Docker sandboxed execution, recompiled `judge-worker`, and verified sample runs. |
| **Test Cases Management** | Test cases were previously static files on worker disk. | Created `TestCase` MongoDB collection, `TestCaseRepository`, REST APIs (`GET/POST/DELETE /api/admin/problems/{id}/testcases`), UI manager in Admin dashboard, and dynamic evaluation in `judge-worker`. |
| **Scrolling Blocked on Admin Page** | `layout.tsx` had `overflow-hidden` and `h-screen` set on `<body>`. | Removed `overflow-hidden` and `h-screen` from `<body>`, enabled smooth natural page scrolling, and made the admin header sticky. |
