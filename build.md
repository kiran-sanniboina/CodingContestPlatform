# Coding Contest Platform — Complete Build & Deployment Guide

## 0. Project goal

Build a contest platform for a final-round programming competition with:

- 30–50 teams
- 3-hour contest
- 5 story-based programming problems
- Sequential unlocking: Q2 becomes available only after Q1 is accepted, etc.
- One preferred language per team
- Initial supported languages: Java 21, C++20, Python 3
- Monaco code editor
- Deterministic code judging
- Docker-based execution sandbox
- AI-assisted error explanation (optional and never authoritative)
- Live submission results
- Live leaderboard
- Admin controls
- MongoDB persistence
- Render for trusted web services
- Separate Ubuntu VPS for untrusted code execution

## 1. Architecture decisions

### Production architecture

```text
                         CONTESTANTS
                              |
                           HTTPS/WSS
                              |
                              v
                    +--------------------+
                    | Render             |
                    | Next.js Frontend   |
                    +---------+----------+
                              |
                              v
                    +--------------------+
                    | Render             |
                    | Spring Boot API    |
                    +----+----------+----+
                         |          |
                         |          +------------------+
                         v                             |
                  +-------------+                      |
                  | MongoDB     |                      |
                  | source of   |                      |
                  | truth       |                      |
                  +-------------+                      |
                                                       |
                                           Secure Judge API
                                                       |
                                                       v
                                          +---------------------+
                                          | Separate Ubuntu VPS |
                                          | Judge Worker         |
                                          | Docker               |
                                          +----------+----------+
                                                     |
                                                     v
                                          +---------------------+
                                          | Temporary Sandbox   |
                                          | Java/C++/Python     |
                                          | No network          |
                                          | CPU/RAM/time limits |
                                          +---------------------+
```

### Important rule

The AI model does NOT decide whether a submission is accepted.

```text
Code -> Docker -> Hidden Tests -> Exact Verdict -> Unlock
                                     |
                                     +-> Optional AI explanation
```

AI is an assistant for explanations, not the source of truth.

## 2. Why the judge is separate

Contestant code is untrusted. Never execute it directly inside the Spring Boot process or on the Render web service.

The judge VPS is an isolated execution boundary.

The judge must:

- run code only inside Docker
- disable network access
- enforce CPU limits
- enforce memory limits
- enforce process/PID limits
- enforce execution timeout
- run as non-root
- use temporary workspaces
- remove the workspace/container after judging
- never expose MongoDB credentials to contestant code
- never expose hidden test files to the browser

## 3. Development architecture

Everything can be developed on the laptop first.

```text
Laptop
├── frontend (Next.js)
├── backend (Spring Boot)
├── MongoDB (Docker)
├── judge-worker
└── Docker sandbox
```

Use Docker Compose for local dependencies.

Do not deploy until the complete end-to-end flow works locally.

## 4. Repository structure

```text
coding-contest-platform/
|
├── frontend/
|   ├── app/
|   ├── components/
|   ├── hooks/
|   ├── lib/
|   ├── services/
|   ├── types/
|   ├── public/
|   ├── package.json
|   ├── tsconfig.json
|   └── next.config.ts
|
├── backend/
|   ├── src/main/java/com/contest/platform/
|   |   ├── auth/
|   |   |   ├── controller/
|   |   |   ├── service/
|   |   |   ├── model/
|   |   |   ├── repository/
|   |   |   └── dto/
|   |   |
|   |   ├── contest/
|   |   ├── team/
|   |   ├── problem/
|   |   ├── submission/
|   |   ├── judge/
|   |   ├── leaderboard/
|   |   ├── websocket/
|   |   ├── ai/
|   |   ├── admin/
|   |   ├── common/
|   |   └── config/
|   |
|   ├── src/main/resources/
|   |   ├── application.yml
|   |   └── application-prod.yml
|   ├── src/test/
|   ├── pom.xml
|   └── Dockerfile
|
├── judge-worker/
|   ├── src/main/java/com/contest/judge/
|   |   ├── JudgeApplication.java
|   |   ├── JudgeWorker.java
|   |   ├── JudgeClient.java
|   |   ├── DockerExecutor.java
|   |   ├── CompilationService.java
|   |   ├── ExecutionService.java
|   |   ├── TestCaseRunner.java
|   |   ├── OutputComparator.java
|   |   ├── Verdict.java
|   |   ├── SubmissionJob.java
|   |   ├── ResourceLimits.java
|   |   └── SecurityValidator.java
|   ├── problems/
|   |   ├── q1/
|   |   ├── q2/
|   |   ├── q3/
|   |   ├── q4/
|   |   └── q5/
|   ├── Dockerfile
|   └── pom.xml
|
├── infrastructure/
|   ├── docker-compose.yml
|   ├── nginx/
|   ├── judge-images/
|   |   ├── java21/
|   |   ├── cpp20/
|   |   └── python3/
|   └── scripts/
|
├── docs/
|   ├── architecture.md
|   ├── api.md
|   ├── security.md
|   └── contest-runbook.md
|
├── .env.example
├── .gitignore
└── README.md
```

## 5. Technology stack

### Frontend

- Next.js
- TypeScript
- React
- Tailwind CSS
- Monaco Editor
- WebSocket/STOMP client or native WebSocket client

### Backend

- Java 21
- Spring Boot
- Spring Web
- Spring Security
- Spring Data MongoDB
- Bean Validation
- WebSocket support
- Jackson
- Actuator for health checks

### Database

- MongoDB

### Judge

- Java 21
- Docker Engine
- Java 21 runtime/compiler
- GCC for C++20
- Python 3
- Linux process/resource controls

### Reverse proxy

- Nginx if the chosen deployment arrangement needs it

### Optional

- Redis for queueing after the MVP
- AI model API for explanations

## 6. Backend Maven dependencies

Use Spring Initializr and add:

- Spring Web
- Spring Security
- Spring Data MongoDB
- Validation
- WebSocket
- Spring Boot Actuator
- Lombok (optional)
- Spring Boot DevTools (development only)

For JWT, use a maintained JWT library appropriate to the current Spring Boot version. Keep secrets in environment variables.

## 7. Frontend packages

Initial packages:

```text
next
react
react-dom
typescript
@monaco-editor/react
tailwindcss
```

Add only packages actually required by the UI.

## 8. MongoDB collections

### users

```json
{
  "_id": "...",
  "username": "...",
  "passwordHash": "...",
  "role": "TEAM",
  "createdAt": "..."
}
```

Roles:

- ADMIN
- TEAM

### teams

```json
{
  "_id": "...",
  "name": "Team Alpha",
  "members": [],
  "preferredLanguage": "JAVA",
  "currentProblem": 1,
  "contestId": "...",
  "status": "ACTIVE"
}
```

### contests

```json
{
  "_id": "...",
  "name": "Final Round",
  "startTime": "...",
  "endTime": "...",
  "status": "NOT_STARTED"
}
```

Statuses:

- NOT_STARTED
- RUNNING
- FINISHED

### problems

```json
{
  "_id": "...",
  "contestId": "...",
  "sequence": 1,
  "title": "...",
  "story": "...",
  "description": "...",
  "inputFormat": "...",
  "outputFormat": "...",
  "constraints": "...",
  "timeLimitMs": 2000,
  "memoryLimitMb": 256
}
```

### submissions

```json
{
  "_id": "...",
  "teamId": "...",
  "problemId": "...",
  "language": "JAVA",
  "sourceCode": "...",
  "status": "QUEUED",
  "passedTests": 0,
  "totalTests": 50,
  "executionTimeMs": 0,
  "failedTest": null,
  "submittedAt": "..."
}
```

Statuses:

- QUEUED
- COMPILING
- RUNNING
- ACCEPTED
- WRONG_ANSWER
- COMPILATION_ERROR
- RUNTIME_ERROR
- TIME_LIMIT_EXCEEDED
- MEMORY_LIMIT_EXCEEDED
- SYSTEM_ERROR

### contest_events

Record important events:

- LOGIN
- PROBLEM_OPENED
- DRAFT_SAVED
- SUBMISSION_CREATED
- SUBMISSION_ACCEPTED
- PROBLEM_UNLOCKED
- CONTEST_STARTED
- CONTEST_FINISHED
- ADMIN_ACTION

## 9. Contest rules

Server is authoritative.

The browser must never decide:

- current contest time
- whether a problem is unlocked
- whether a submission is accepted
- leaderboard position

### Sequential unlock

Initial state:

```text
currentProblem = 1
```

Team may submit only to the current unlocked problem.

When the judge returns ACCEPTED:

```text
if accepted problem == team.currentProblem:
    team.currentProblem += 1
```

This update must be atomic and protected against duplicate judge callbacks.

A team cannot skip directly from Q1 to Q3.

## 10. Contest timer

Store:

```text
startTime
endTime
```

in MongoDB.

Frontend displays:

```text
remaining = endTime - serverTime
```

Never use only the browser's local clock.

At endTime:

- reject new submissions
- mark contest finished
- stop unlocking
- preserve all results
- show final state

## 11. Language selection

Recommended first version:

```text
JAVA
CPP
PYTHON
```

Allow the team to select its preferred language before the contest starts.

Lock the language when the contest begins.

Store the language on the team and submission.

## 12. Problem and hidden-test design

For each problem keep:

```text
q1/
├── 001.in
├── 001.out
├── 002.in
├── 002.out
└── ...
```

Public samples can be shown in the frontend.

Hidden tests must remain only on the judge side.

Recommended minimum:

- 3–5 visible samples
- 20–100 hidden tests depending on problem
- edge cases
- minimum values
- maximum values
- duplicate values where relevant
- sorted/reverse-sorted inputs where relevant
- adversarial cases
- overflow cases
- performance cases

Do not expose hidden input/output files through frontend APIs.

## 13. Judge API

Use a small internal API between the Render backend and judge VPS.

Recommended endpoints:

```text
GET  /internal/judge/health
GET  /internal/judge/next-job
POST /internal/judge/result
```

Protect every endpoint with a strong secret or equivalent machine-to-machine authentication.

### next-job response

```json
{
  "submissionId": "...",
  "problemId": "...",
  "language": "JAVA"
}
```

The judge can then retrieve the submission through a protected backend endpoint, or the job can contain the necessary data.

For the 2-day MVP, prefer passing a submission ID and having the judge retrieve the data from a protected API.

## 14. Recommended judge pull model

The judge VPS periodically asks:

```text
GET /internal/judge/next-job
```

If no job exists:

```text
204 No Content
```

If a job exists:

```json
{
  "submissionId": "1024"
}
```

Then:

```text
Judge
  -> GET submission
  -> execute
  -> POST result
```

This avoids needing to expose a public inbound judge service.

## 15. Judge worker lifecycle

Pseudo-flow:

```text
START
 |
 v
Authenticate with backend
 |
 v
Request next job
 |
 +-- no job --> wait --> request again
 |
 v
Get submission
 |
 v
Validate language/problem
 |
 v
Create temporary workspace
 |
 v
Create restricted Docker container
 |
 v
Copy source code
 |
 v
Compile
 |
 +-- compilation error --> report CE
 |
 v
Run tests
 |
 +-- timeout --> TLE
 +-- memory limit --> MLE
 +-- crash --> RE
 +-- output mismatch --> WA
 |
 v
All tests passed
 |
 v
Report ACCEPTED
 |
 v
Delete container/workspace
 |
 v
Next job
```

## 16. Docker sandbox requirements

Never run contestant code directly on the host.

Each submission gets a temporary container.

Required controls:

```text
--network none
--memory <limit>
--cpus <limit>
--pids-limit <limit>
--read-only
--tmpfs /tmp
--cap-drop ALL
--security-opt no-new-privileges
--user non-root
```

Use an appropriate writable temporary directory only where required.

The exact Docker configuration must be validated on the target VPS before the contest.

## 17. Compile and execute model

For Java:

```text
Main.java
  |
  v
javac Main.java
  |
  v
java Main
```

Compile once per submission.

Then execute the compiled program against each test input.

Do not recompile for every test.

For C++:

```text
main.cpp
  |
  v
g++ -std=c++20
  |
  v
./main
```

For Python:

```text
main.py
  |
  v
python3 main.py
```

## 18. Test execution

For every hidden test:

```text
input -> program -> stdout
```

Compare:

```text
expected output
       vs
actual output
```

Normalize only permitted formatting differences, such as trailing newline/line-ending differences.

Do not create an overly permissive comparator.

## 19. Verdict rules

### ACCEPTED

All hidden tests pass.

### WRONG_ANSWER

Program executes but output differs.

### COMPILATION_ERROR

Compiler exits unsuccessfully.

### RUNTIME_ERROR

Program crashes or exits abnormally.

### TIME_LIMIT_EXCEEDED

Execution exceeds the problem limit.

### MEMORY_LIMIT_EXCEEDED

Container exceeds memory limit.

### SYSTEM_ERROR

Judge infrastructure fails. Do not count a system error as a contestant failure.

## 20. Judge result callback

Worker sends:

```json
{
  "submissionId": "1024",
  "verdict": "ACCEPTED",
  "passedTests": 50,
  "totalTests": 50,
  "executionTimeMs": 1420,
  "failedTest": null
}
```

Backend:

1. Authenticates judge.
2. Verifies submission exists.
3. Rejects duplicate/fake result transitions.
4. Saves result.
5. If ACCEPTED and this is the team's current problem, atomically unlocks the next problem.
6. Publishes a WebSocket event.
7. Updates leaderboard data.

## 21. WebSocket flow

```text
Judge
  |
  v
Spring Boot
  |
  v
WebSocket
  |
  v
Contestant browser
```

Events:

```text
SUBMISSION_QUEUED
SUBMISSION_RUNNING
SUBMISSION_RESULT
PROBLEM_UNLOCKED
LEADERBOARD_UPDATED
CONTEST_FINISHED
```

## 22. AI explanation module

AI is optional.

Only call the model when useful, especially for:

- compilation errors
- wrong answers
- runtime errors
- time-limit failures

Send the model:

- problem statement
- language
- contestant code
- verdict
- relevant compiler/runtime output
- failed test metadata
- expected vs actual output where appropriate

Never send secret test cases wholesale if that would reveal contest information.

AI response should be explanatory, not authoritative.

Example:

```text
Judge: WRONG_ANSWER
AI:
The accumulator uses int, which overflows for
the maximum input. Use long instead.
```

For an ACCEPTED submission, no AI call is necessary.

## 23. Frontend modules

### Authentication

- Login
- Session handling
- Role-aware routing

### Contest dashboard

- Team name
- Members
- Preferred language
- Contest timer
- Current problem

### Problem viewer

- Story
- Statement
- Input
- Output
- Constraints
- Samples

### Editor

- Monaco
- Language mode
- Starter code
- Autosave

### Submission panel

- Run
- Submit
- Status
- Execution time
- Test count
- Error information
- Optional AI explanation

### Problem navigation

```text
Q1 ✓
Q2 unlocked
Q3 locked
Q4 locked
Q5 locked
```

### Leaderboard

Show:

- rank
- team
- highest solved problem
- solved count
- time
- penalties if used

## 24. Backend modules

### auth

Authentication and authorization.

### team

Team and member management.

### contest

Contest lifecycle and timer.

### problem

Problem metadata and access control.

### submission

Submission creation and history.

### judge

Communication with judge VPS and result handling.

### leaderboard

Ranking and caching.

### websocket

Real-time updates.

### ai

Optional AI explanation service.

### admin

Contest and problem management.

### common

Exception handling, security utilities, API responses, validation.

## 25. Admin capabilities

Minimum admin panel:

```text
Dashboard
Teams
Problems
Submissions
Leaderboard
Contest Control
System Health
```

Contest controls:

- Start
- End
- Extend
- Freeze leaderboard if required

Submission controls:

- View
- Rejudge later
- Inspect verdict

Problem controls:

- Create
- Edit
- Publish/unpublish

## 26. API design

Suggested public APIs:

```text
POST /api/auth/login
GET  /api/contest
GET  /api/contest/problems
GET  /api/problems/{id}
GET  /api/submissions
POST /api/submissions/run
POST /api/submissions/submit
GET  /api/submissions/{id}
GET  /api/leaderboard
POST /api/drafts
```

Admin APIs:

```text
POST /api/admin/contest/start
POST /api/admin/contest/end
POST /api/admin/contest/extend
POST /api/admin/problems
PUT  /api/admin/problems/{id}
GET  /api/admin/submissions
GET  /api/admin/teams
```

Internal judge APIs:

```text
GET  /internal/judge/health
GET  /internal/judge/next-job
GET  /internal/judge/submissions/{id}
POST /internal/judge/result
```

## 27. Local Docker Compose

Local services:

```text
frontend
backend
mongodb
judge-worker
```

Redis is optional at first.

Use:

```bash
docker compose up --build
```

Then verify:

```text
Frontend -> http://localhost:3000
Backend  -> http://localhost:8080
MongoDB  -> internal Docker network
Judge    -> internal Docker network
```

## 28. Environment variables

Example:

```text
MONGODB_URI=
JWT_SECRET=
JUDGE_SHARED_SECRET=
BACKEND_INTERNAL_URL=
AI_API_KEY=
CONTEST_ENV=
```

Never commit real secrets.

`.env` must be in `.gitignore`.

Commit only:

```text
.env.example
```

## 29. Build sequence

### Step 1 — Repository

Create repository and folders.

### Step 2 — Backend

Generate Spring Boot project.

Add:

- Web
- Security
- MongoDB
- Validation
- WebSocket
- Actuator

Start application.

### Step 3 — MongoDB

Run MongoDB locally.

Connect Spring Boot.

Create collections/indexes.

### Step 4 — Authentication

Implement ADMIN and TEAM.

Test unauthorized access.

### Step 5 — Contest

Implement start/end and server-authoritative timer.

### Step 6 — Teams

Implement teams, members and preferred language.

### Step 7 — Problems

Create five ordered problems.

### Step 8 — Unlocking

Implement backend-enforced sequential access.

Write tests attempting to bypass locked problems.

### Step 9 — Frontend

Build login and contestant dashboard.

### Step 10 — Monaco

Add editor and starter code.

### Step 11 — Submission

Save source code and submission status.

### Step 12 — Judge CLI

Before connecting it to Spring Boot, make a standalone judge work:

```text
source code
-> Docker
-> compile
-> run
-> compare
-> verdict
```

### Step 13 — Java

Make Java 21 judging reliable.

### Step 14 — C++

Add C++20.

### Step 15 — Python

Add Python 3.

### Step 16 — Judge API

Connect worker to Spring Boot.

### Step 17 — WebSockets

Push results to browser.

### Step 18 — Unlock

ACCEPTED Q1 -> Q2 unlocked.

### Step 19 — Leaderboard

Implement ranking.

### Step 20 — AI

Add optional explanation endpoint.

### Step 21 — Admin

Implement minimum controls.

### Step 22 — Security

Test sandbox and API security.

### Step 23 — Deployment

Deploy frontend/backend/database to Render and judge worker to VPS.

### Step 24 — Load test

Simulate 30–50 teams.

### Step 25 — Full rehearsal

Run a complete 3-hour mock contest.

## 30. Deployment

### Render

Deploy:

```text
Next.js frontend
Spring Boot backend
MongoDB/managed MongoDB connection
```

If using a separately hosted MongoDB service, keep credentials in Render environment variables.

### Judge VPS

Install:

```text
Ubuntu
Docker Engine
Git
```

Clone the repository.

Build judge worker.

Run worker using Docker or a process supervisor.

Store hidden test cases on the judge VPS or in another private judge-only store.

Never expose them through the public frontend.

## 31. Production communication

Recommended flow:

```text
Browser
  |
  v
Render Next.js
  |
  v
Render Spring Boot
  |
  +--> MongoDB
  |
  +--> Judge VPS HTTPS
            |
            v
        Judge Worker
            |
            v
          Docker
            |
            v
       Hidden Tests
            |
            v
         Verdict
            |
            v
        Spring Boot
            |
       +----+----+
       |         |
       v         v
   MongoDB    WebSocket
                 |
                 v
              Browser
```

## 32. Security checklist

Before the contest, verify all of these:

### Authentication

- Passwords hashed
- JWT/session secret protected
- Admin routes protected
- Team routes protected
- No IDOR between teams

### Contest

- Server controls time
- Contest rejects submissions after end
- Locked problems cannot be submitted
- Team cannot alter `currentProblem`
- Team cannot alter another team's data
- Duplicate judge callbacks are harmless

### Judge

- No contestant code executes on host
- Docker network disabled
- Non-root execution
- CPU limit
- Memory limit
- PID limit
- Timeout
- Restricted filesystem
- Container removed after execution
- Temporary files removed
- Hidden tests inaccessible from public API
- Judge authentication enabled

### API

- Rate limiting where appropriate
- Request validation
- Maximum source-code size
- Maximum draft size
- CORS restricted
- HTTPS only in production
- Database not publicly exposed
- Judge result endpoint authenticated

## 33. Load testing

Simulate:

```text
50 teams
```

Test bursts:

```text
10 simultaneous submissions
25 simultaneous submissions
50 simultaneous submissions
100 queued submissions
```

Measure:

- API latency
- MongoDB latency
- judge queue time
- compile time
- execution time
- VPS CPU
- VPS RAM
- Docker container count
- WebSocket stability

Start with one judge worker, then add workers only if needed.

## 34. Failure scenarios to test

Force:

```text
Infinite loop
Large memory allocation
Huge stdout
Compilation failure
Runtime crash
Malformed program
Very slow algorithm
Maximum input
Minimum input
Concurrent submissions
Duplicate result callback
Network loss between judge and backend
Judge worker restart
Backend restart
MongoDB restart
Contest end during judging
```

A judge infrastructure failure should produce SYSTEM_ERROR and allow rejudge/recovery rather than incorrectly penalizing the team.

## 35. Contest-day operating procedure

### Before contest

1. Verify VPS.
2. Verify Docker.
3. Verify judge worker.
4. Verify MongoDB.
5. Verify backend health.
6. Verify frontend.
7. Verify WebSocket.
8. Verify all five problems.
9. Verify hidden tests.
10. Submit known-correct solutions for all languages.
11. Submit known-wrong solutions.
12. Test TLE.
13. Test runtime error.
14. Test compilation error.
15. Confirm timer.
16. Confirm team accounts.
17. Confirm language locks.
18. Take database backup.
19. Take a copy of hidden tests.
20. Run a rehearsal.

### During contest

Monitor:

```text
API
Database
Judge workers
Queue
CPU
RAM
Submission failures
```

### After contest

1. Stop submissions.
2. Preserve database.
3. Export leaderboard.
4. Export submission results.
5. Preserve audit logs.
6. Keep judge logs.
7. Announce results.

## 36. Two-day implementation plan

### Day 1

```text
Hour 0–2
Repository + project setup

Hour 2–5
Spring Boot + MongoDB + authentication

Hour 5–8
Contest + teams + problems + unlocking

Hour 8–12
Next.js + Monaco + contestant dashboard
```

### Day 2

```text
Hour 0–5
Judge worker + Docker + Java

Hour 5–7
C++ + Python

Hour 7–9
Judge API + WebSocket + unlocking

Hour 9–11
Leaderboard + admin basics + AI explanations

Hour 11–16
Security + load testing + deployment

Hour 16–24
Full mock contest + bug fixing
```

The schedule is aggressive. If a feature threatens the core judge, remove the feature rather than weakening the judge.

## 37. AI-agent development strategy

Use separate AI-agent tasks instead of asking one agent to build everything at once.

Recommended agents/workstreams:

```text
Agent A -> Backend
Agent B -> Frontend
Agent C -> Judge
Agent D -> QA/security/review
```

Every agent should work from the architecture in this file.

After each major milestone:

1. Build.
2. Run tests.
3. Review diff.
4. Commit.
5. Move to the next milestone.

Do not let an agent rewrite working architecture unnecessarily.

## 38. AI-agent judge prompt

Give the judge agent a tightly constrained requirement:

```text
Build a Java 21 judge worker for an online programming contest.

The worker receives a submission ID from an authenticated backend.
It must retrieve the submission, validate the language, create a temporary
Docker sandbox, execute contestant code only inside that sandbox, disable
network access, enforce CPU/memory/PID/time limits, compile once, execute
against private hidden tests, compare output, classify the result as
ACCEPTED, WRONG_ANSWER, COMPILATION_ERROR, RUNTIME_ERROR,
TIME_LIMIT_EXCEEDED, MEMORY_LIMIT_EXCEEDED or SYSTEM_ERROR, report the
result to the backend, and destroy all temporary resources.

Never execute contestant code directly on the host.

Write tests for correct code, wrong answers, infinite loops, crashes,
compilation failures, excessive memory and excessive output.
```

Have another agent independently review the resulting judge for sandbox and resource-isolation weaknesses.

## 39. What NOT to build initially

For the first contest-ready version, do not add:

- Kubernetes
- Microservices
- Kafka
- Complex distributed caching
- AI-based acceptance
- AI-generated hidden tests
- Dynamic problem generation
- 10+ programming languages
- Advanced analytics
- Complex notification systems

Keep:

```text
Next.js
Spring Boot
MongoDB
Judge Worker
Docker
```

as the core.

Add Redis only when the direct judge flow works and load testing shows that a queue is useful.

## 40. Final execution flow

The complete official submission flow is:

```text
1. Team logs in
       |
2. Server verifies contest is RUNNING
       |
3. Team opens current problem
       |
4. Team writes code in Monaco
       |
5. Optional RUN
       |
       +--> Judge VPS -> Docker -> sample tests -> result
       |
6. Team presses SUBMIT
       |
7. Spring Boot creates submission
       |
8. Submission status = QUEUED
       |
9. Judge Worker requests next job
       |
10. Worker retrieves submission
       |
11. Worker creates restricted Docker sandbox
       |
12. Source is copied into sandbox
       |
13. Program is compiled
       |
14. If compile fails -> COMPILATION_ERROR
       |
15. Program runs against hidden tests
       |
16. Outputs are compared
       |
17. Verdict is produced
       |
18. Worker destroys sandbox
       |
19. Worker sends result to Spring Boot
       |
20. Backend validates the result
       |
21. Backend saves verdict in MongoDB
       |
22. If ACCEPTED:
          currentProblem -> currentProblem + 1
       |
23. WebSocket sends result
       |
24. Browser shows verdict
       |
25. If failed and AI is enabled:
          AI explains the failure
       |
26. Team continues with the newly unlocked problem
```

## 41. Final architecture summary

```text
FRONTEND
Next.js + TypeScript
Monaco + Tailwind
        |
        | HTTPS / WebSocket
        v
BACKEND
Java 21 + Spring Boot
Spring Security
Spring Data MongoDB
        |
        +--------------------+
        |                    |
        v                    v
MONGODB                JUDGE VPS
Source of truth             |
                            v
                       Judge Worker
                            |
                            v
                          Docker
                            |
                  +---------+---------+
                  |         |         |
                Java      C++      Python
                  |         |         |
                  +---------+---------+
                            |
                       Hidden Tests
                            |
                         Verdict
                            |
                            v
                       Spring Boot
                            |
                 +----------+----------+
                 |                     |
                 v                     v
              MongoDB              WebSocket
                                       |
                                       v
                                  Contestant
```

The fundamental design principle is:

**The web application manages the contest. The judge server executes untrusted code. MongoDB stores authoritative state. Docker provides execution isolation. AI explains failures but never determines correctness.**
