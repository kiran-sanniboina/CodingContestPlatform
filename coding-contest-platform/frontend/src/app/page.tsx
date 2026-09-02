"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { 
  Play, Send, Terminal, Clock, Lock, CheckCircle2, RefreshCw, 
  LogOut, Trophy, History, ShieldCheck, ChevronRight, RotateCcw, AlertOctagon, XCircle
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/api";

const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

interface Problem {
  id: string;
  sequence: number;
  title: string;
  difficulty: string;
  story: string;
  description: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  sampleInput: string;
  sampleOutput: string;
  sampleExplanation: string;
  timeLimitMs: number;
  memoryLimitMb: number;
  unlocked: boolean;
}

interface Team {
  id: string;
  name: string;
  preferredLanguage: string;
  currentProblem: number;
}

const STARTER_CODE: Record<string, string> = {
  JAVA: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNext()) return;
        String s = sc.next();
        
        // Write your solution here
        
    }
}`,
  CPP: `#include <iostream>
#include <string>
#include <vector>
#include <algorithm>

using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    
    // Write your solution here
    
    return 0;
}`,
  PYTHON: `import sys

def main():
    input_data = sys.stdin.read().strip()
    if not input_data:
        return
        
    # Write your solution here

if __name__ == "__main__":
    main()
`
};

export default function ContestDashboard() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [activeProblemId, setActiveProblemId] = useState<string>("1");
  const [team, setTeam] = useState<Team | null>(null);
  const [language, setLanguage] = useState<string>("JAVA");
  const [code, setCode] = useState<string>(STARTER_CODE.JAVA);
  const [activeTab, setActiveTab] = useState<"testcase" | "result">("testcase");
  const [submitting, setSubmitting] = useState(false);
  const [running, setRunning] = useState(false);
  const [resultMsg, setResultMsg] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<string>("00:00:00");
  const [contestEnd, setContestEnd] = useState<number | null>(null);
  const [serverOffset, setServerOffset] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const activeProblem = problems.find((p) => p.id === activeProblemId) || problems[0];

  // 1-second real-time countdown timer
  useEffect(() => {
    if (!contestEnd) return;

    const tick = () => {
      const now = Date.now() + serverOffset;
      const diff = contestEnd - now;
      if (diff <= 0) {
        setTimeLeft("00:00:00 (ENDED)");
        return;
      }
      const hrs = String(Math.floor(diff / (1000 * 60 * 60))).padStart(2, "0");
      const mins = String(Math.floor((diff / (1000 * 60)) % 60)).padStart(2, "0");
      const secs = String(Math.floor((diff / 1000) % 60)).padStart(2, "0");
      setTimeLeft(`${hrs}:${mins}:${secs}`);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [contestEnd, serverOffset]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    fetchContestData();
    const interval = setInterval(fetchContestData, 6000);
    return () => clearInterval(interval);
  }, []);

  const fetchContestData = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      // 1. Fetch Team Profile
      const teamRes = await fetch(`${API_BASE_URL}/api/contest/team`, {
        headers: { Authorization: "Bearer " + token },
      });
      if (teamRes.ok) {
        const teamData = await teamRes.json();
        setTeam(teamData);
      }

      // 2. Fetch Problems
      const probRes = await fetch(`${API_BASE_URL}/api/contest/problems`, {
        headers: { Authorization: "Bearer " + token },
      });
      if (probRes.ok) {
        const probData: Problem[] = await probRes.json();
        setProblems(probData);
      }

      // 3. Fetch Timer Info & Sync Server Offset
      const contestRes = await fetch(`${API_BASE_URL}/api/contest/current`);
      if (contestRes.ok) {
        const data = await contestRes.json();
        if (data.contest && data.contest.endTime) {
          const end = new Date(data.contest.endTime).getTime();
          const serverNow = data.serverTime ? new Date(data.serverTime).getTime() : Date.now();
          setServerOffset(serverNow - Date.now());
          setContestEnd(end);
        }
      }
    } catch (err) {
      console.error("Failed to load contest state:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    setCode(STARTER_CODE[newLang] || "");
  };

  const handleResetCode = () => {
    if (confirm("Reset editor to starter code template?")) {
      setCode(STARTER_CODE[language] || "");
    }
  };

  // Real execution against sample test case
  const handleRunSample = async () => {
    if (!activeProblem || !activeProblem.unlocked) return;
    const token = localStorage.getItem("token");
    if (!token) return router.push("/login");

    setRunning(true);
    setActiveTab("result");
    setResultMsg({ status: "RUNNING", message: "Executing inside Docker sandbox against sample input..." });

    try {
      const res = await fetch(`${API_BASE_URL}/api/submissions/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({
          problemId: activeProblem.id,
          language: language,
          sourceCode: code,
          input: activeProblem.sampleInput,
          expectedOutput: activeProblem.sampleOutput,
        }),
      });

      if (res.ok) {
        const runData = await res.json();
        setResultMsg(runData);
      } else {
        const errText = await res.text();
        setResultMsg({
          verdict: "SYSTEM_ERROR",
          error: "Failed to execute sample test: " + errText,
        });
      }
    } catch (err) {
      setResultMsg({
        verdict: "SYSTEM_ERROR",
        error: "Network error connecting to runner backend.",
      });
    } finally {
      setRunning(false);
    }
  };

  // Submit to official Judge Worker
  const handleSubmit = async () => {
    const token = localStorage.getItem("token");
    if (!token) return router.push("/login");

    if (!activeProblem || !activeProblem.unlocked) {
      alert("This problem is currently locked! Solve previous problems first.");
      return;
    }

    setSubmitting(true);
    setActiveTab("result");
    setResultMsg({ status: "QUEUED", message: "Submission queued for Docker Judge Worker..." });

    try {
      const res = await fetch(`${API_BASE_URL}/api/submissions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({
          problemId: activeProblem.id,
          language: language,
          sourceCode: code,
        }),
      });

      if (res.ok) {
        const submission = await res.json();
        setResultMsg({ status: "COMPILING", message: "Compiling inside isolated Docker sandbox..." });

        const submissionId = submission.id;
        const pollInterval = setInterval(async () => {
          try {
            const pollRes = await fetch(`${API_BASE_URL}/api/submissions/${submissionId}`, {
              headers: { Authorization: "Bearer " + token },
            });
            if (pollRes.ok) {
              const subData = await pollRes.json();
              if (subData.status !== "QUEUED" && subData.status !== "COMPILING" && subData.status !== "RUNNING") {
                clearInterval(pollInterval);
                setResultMsg(subData);
                setSubmitting(false);
                fetchContestData(); // Refresh unlocks
              } else {
                setResultMsg(subData);
              }
            }
          } catch (e) {
            console.error("Poll error:", e);
          }
        }, 1500);
      } else {
        const err = await res.json();
        setResultMsg({ status: "ERROR", message: err.error || "Submission rejected." });
        setSubmitting(false);
      }
    } catch (err) {
      setResultMsg({ status: "ERROR", message: "Server connection failed." });
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-black text-gray-400 font-mono">
        <RefreshCw className="animate-spin mr-2" size={20} /> Loading Contest Environment...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-black text-white font-sans overflow-hidden">
      
      {/* Top Navbar */}
      <header className="h-14 border-b border-[#262626] bg-[#0a0a0a] flex items-center justify-between px-4 z-20 select-none flex-shrink-0">
        
        {/* Brand & Problem Tabs */}
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2 font-bold tracking-wider text-sm">
            <span className="bg-white text-black px-2 py-0.5 rounded font-black text-xs">CONTEST</span>
            <span className="hidden lg:inline text-gray-200">FINAL ROUND</span>
          </div>

          <div className="flex items-center gap-1 bg-[#141414] p-1 rounded-md border border-[#222]">
            {problems.map((p) => {
              const isCurrent = p.id === activeProblemId;
              const isSolved = (team?.currentProblem ?? 1) > p.sequence;
              const isUnlocked = p.unlocked;

              return (
                <button
                  key={p.id}
                  onClick={() => isUnlocked && setActiveProblemId(p.id)}
                  disabled={!isUnlocked}
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded transition-all ${
                    isCurrent
                      ? "bg-white text-black shadow-sm font-bold"
                      : isUnlocked
                      ? "text-gray-300 hover:bg-[#222] hover:text-white"
                      : "text-gray-600 cursor-not-allowed opacity-50"
                  }`}
                >
                  <span>Q{p.sequence}</span>
                  {isSolved ? (
                    <CheckCircle2 size={12} className={isCurrent ? "text-green-800" : "text-green-500"} />
                  ) : !isUnlocked ? (
                    <Lock size={11} className="text-gray-500" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Buttons in Header (Run & Submit) */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRunSample}
            disabled={running || submitting || !activeProblem?.unlocked}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#1a1a1a] hover:bg-[#262626] border border-[#333] rounded text-xs font-semibold text-gray-200 transition-all active:scale-95 disabled:opacity-50"
          >
            <Play size={13} className={running ? "animate-spin text-gray-400" : "text-gray-300 fill-current"} />
            <span>{running ? "Running..." : "Run Sample"}</span>
          </button>

          <button
            onClick={handleSubmit}
            disabled={submitting || running || !activeProblem?.unlocked}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-white text-black hover:bg-gray-200 rounded text-xs font-bold transition-all shadow active:scale-95 disabled:opacity-50 disabled:bg-[#222] disabled:text-gray-500"
          >
            {submitting ? (
              <RefreshCw size={13} className="animate-spin text-black" />
            ) : (
              <Send size={13} className="text-black" />
            )}
            <span>Submit</span>
          </button>
        </div>

        {/* Timer, Nav Links & Team */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 font-mono text-xs bg-[#141414] border border-[#333] px-3 py-1.5 rounded">
            <Clock size={13} className="text-gray-400" />
            <span className="text-gray-200 font-semibold">{timeLeft}</span>
          </div>

          <Link href="/leaderboard" className="text-xs text-gray-400 hover:text-white flex items-center gap-1 px-2.5 py-1.5 rounded hover:bg-[#1a1a1a] transition-colors">
            <Trophy size={14} className="text-yellow-500" /> <span className="hidden md:inline">Leaderboard</span>
          </Link>

          <Link href="/submissions" className="text-xs text-gray-400 hover:text-white flex items-center gap-1 px-2.5 py-1.5 rounded hover:bg-[#1a1a1a] transition-colors">
            <History size={14} /> <span className="hidden md:inline">Submissions</span>
          </Link>

          <div className="h-4 w-px bg-[#262626]"></div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-300 bg-[#161616] px-2.5 py-1 rounded border border-[#262626]">
              {team?.name || "Team"}
            </span>
            <button onClick={handleLogout} title="Logout" className="text-gray-500 hover:text-red-400 p-1 rounded transition-colors">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Split Layout */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Column: Problem Details */}
        <div className="w-1/2 flex flex-col border-r border-[#262626] bg-[#050505] overflow-y-auto">
          {activeProblem ? (
            <div className="p-6 max-w-3xl space-y-6">
              
              {/* Problem Title & Difficulty */}
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-xl font-bold tracking-tight text-white">{activeProblem.title}</h1>
                  <span className={`text-xs px-2.5 py-0.5 rounded font-semibold ${
                    activeProblem.difficulty === "Easy" ? "text-green-400 bg-green-950/40 border border-green-800/40" :
                    activeProblem.difficulty === "Medium" ? "text-yellow-400 bg-yellow-950/40 border border-yellow-800/40" :
                    "text-red-400 bg-red-950/40 border border-red-800/40"
                  }`}>
                    {activeProblem.difficulty}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Clock size={12} /> {activeProblem.timeLimitMs / 1000}s Time Limit</span>
                  <span className="flex items-center gap-1"><Terminal size={12} /> {activeProblem.memoryLimitMb}MB RAM Limit</span>
                </div>
              </div>

              {/* Story Narrative Banner */}
              {activeProblem.story && (
                <div className="bg-[#0e0e0e] border-l-2 border-white p-3.5 rounded-r text-xs text-gray-300 leading-relaxed italic font-serif">
                  "{activeProblem.story}"
                </div>
              )}

              {/* Problem Statement */}
              <div className="text-sm text-gray-300 leading-relaxed space-y-3">
                <h3 className="text-xs uppercase tracking-wider font-semibold text-gray-400">Problem Statement</h3>
                <p className="whitespace-pre-line leading-relaxed">{activeProblem.description}</p>
              </div>

              {/* Input / Output Format */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="bg-[#0e0e0e] border border-[#222] p-3.5 rounded">
                  <h4 className="font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Input Format</h4>
                  <p className="text-gray-300 whitespace-pre-line font-mono">{activeProblem.inputFormat}</p>
                </div>
                <div className="bg-[#0e0e0e] border border-[#222] p-3.5 rounded">
                  <h4 className="font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Output Format</h4>
                  <p className="text-gray-300 whitespace-pre-line font-mono">{activeProblem.outputFormat}</p>
                </div>
              </div>

              {/* Constraints */}
              {activeProblem.constraints && (
                <div className="text-xs space-y-2">
                  <h3 className="uppercase tracking-wider font-semibold text-gray-400">Constraints</h3>
                  <pre className="bg-[#0e0e0e] border border-[#222] p-3 rounded text-gray-300 font-mono leading-relaxed">
                    {activeProblem.constraints}
                  </pre>
                </div>
              )}

              {/* Sample Testcases */}
              {activeProblem.sampleInput && (
                <div className="text-xs space-y-2">
                  <h3 className="uppercase tracking-wider font-semibold text-gray-400">Sample Example</h3>
                  <div className="bg-[#0e0e0e] border border-[#222] rounded overflow-hidden">
                    <div className="p-3 border-b border-[#222]">
                      <span className="text-gray-500 font-mono block mb-1">Input:</span>
                      <pre className="text-gray-200 font-mono whitespace-pre-wrap">{activeProblem.sampleInput}</pre>
                    </div>
                    <div className="p-3 border-b border-[#222] bg-[#0a0a0a]">
                      <span className="text-gray-500 font-mono block mb-1">Expected Output:</span>
                      <pre className="text-gray-200 font-mono whitespace-pre-wrap">{activeProblem.sampleOutput}</pre>
                    </div>
                    {activeProblem.sampleExplanation && (
                      <div className="p-3 bg-[#080808] text-gray-400 italic">
                        <span className="font-semibold text-gray-300 not-italic">Explanation: </span>
                        {activeProblem.sampleExplanation}
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="p-8 text-gray-500 text-sm">Select an unlocked problem from the top tabs.</div>
          )}
        </div>

        {/* Right Column: Code Editor & Execution Console */}
        <div className="w-1/2 flex flex-col bg-[#080808]">
          
          {/* Editor Header Bar */}
          <div className="h-10 border-b border-[#262626] bg-[#0c0c0c] flex items-center justify-between px-4 select-none flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-medium">Language:</span>
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="bg-[#171717] border border-[#333] text-xs rounded px-2 py-1 outline-none text-white font-mono hover:border-gray-500 transition-colors"
              >
                <option value="JAVA">Java 21 (Temurin)</option>
                <option value="CPP">C++ 20 (GCC 13)</option>
                <option value="PYTHON">Python 3</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleResetCode}
                title="Reset starter template"
                className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1 transition-colors"
              >
                <RotateCcw size={12} /> Reset Template
              </button>
            </div>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1 relative bg-black min-h-[200px]">
            <Editor
              height="100%"
              theme="vs-dark"
              language={language === "JAVA" ? "java" : language === "CPP" ? "cpp" : "python"}
              value={code}
              onChange={(val) => setCode(val || "")}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                lineHeight: 1.6,
                padding: { top: 12 },
                scrollBeyondLastLine: false,
                overviewRulerLanes: 0,
                renderLineHighlight: "all",
              }}
            />
          </div>

          {/* Bottom Console Drawer */}
          <div className="h-60 border-t border-[#262626] bg-[#0a0a0a] flex flex-col flex-shrink-0">
            
            {/* Drawer Tabs */}
            <div className="h-9 border-b border-[#262626] flex items-center justify-between px-3 bg-[#0f0f0f] select-none flex-shrink-0">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setActiveTab("testcase")}
                  className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                    activeTab === "testcase" ? "bg-[#222] text-white" : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  Sample Testcase
                </button>
                <button
                  onClick={() => setActiveTab("result")}
                  className={`px-3 py-1 text-xs font-medium rounded transition-all flex items-center gap-1.5 ${
                    activeTab === "result" ? "bg-[#222] text-white" : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  <span>Execution Verdict</span>
                  {(submitting || running) && <RefreshCw size={10} className="animate-spin text-gray-400" />}
                </button>
              </div>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 p-3.5 overflow-y-auto font-mono text-xs space-y-3">
              {activeTab === "testcase" ? (
                <div className="space-y-2">
                  <div className="text-gray-500 text-[11px] uppercase">Default Sample Input:</div>
                  <pre className="bg-[#141414] border border-[#262626] p-2.5 rounded text-gray-300 whitespace-pre-wrap">
                    {activeProblem?.sampleInput || "No input sample provided."}
                  </pre>
                </div>
              ) : (
                <div>
                  {resultMsg ? (
                    <div className="space-y-3">
                      
                      {/* Verdict Banner */}
                      <div className="flex items-center gap-3">
                        {(() => {
                          const status = resultMsg.verdict || resultMsg.status;
                          return (
                            <span className={`px-2.5 py-1 rounded font-bold text-xs flex items-center gap-1.5 ${
                              status === "ACCEPTED" ? "bg-green-950/80 text-green-400 border border-green-800" :
                              status === "WRONG_ANSWER" ? "bg-red-950/80 text-red-400 border border-red-800" :
                              status === "COMPILATION_ERROR" ? "bg-orange-950/80 text-orange-400 border border-orange-800" :
                              status === "RUNTIME_ERROR" ? "bg-red-950/80 text-red-400 border border-red-800" :
                              status === "TIME_LIMIT_EXCEEDED" ? "bg-yellow-950/80 text-yellow-400 border border-yellow-800" :
                              status === "QUEUED" || status === "COMPILING" || status === "RUNNING" ? "bg-blue-950/80 text-blue-400 border border-blue-800 animate-pulse" :
                              "bg-gray-800 text-gray-300"
                            }`}>
                              {status === "ACCEPTED" && <CheckCircle2 size={13} />}
                              {status === "WRONG_ANSWER" && <XCircle size={13} />}
                              {(status === "COMPILATION_ERROR" || status === "RUNTIME_ERROR") && <AlertOctagon size={13} />}
                              {status ? status.replace(/_/g, " ") : "EVALUATING"}
                            </span>
                          );
                        })()}

                        {resultMsg.executionTimeMs !== undefined && (
                          <span className="text-gray-400 text-xs">
                            Runtime: <strong className="text-white">{resultMsg.executionTimeMs}ms</strong>
                          </span>
                        )}

                        {resultMsg.passedTests !== undefined && (
                          <span className="text-gray-400 text-xs">
                            Tests Passed: <strong className="text-white">{resultMsg.passedTests}</strong> / {resultMsg.totalTests}
                          </span>
                        )}

                        {resultMsg.submittedAt && (
                          <span className="text-gray-400 text-xs flex items-center gap-1">
                            <Clock size={11} className="text-gray-500" />
                            Submitted: <strong className="text-gray-200 font-mono">{new Date(resultMsg.submittedAt).toLocaleTimeString()}</strong>
                          </span>
                        )}
                      </div>

                      {/* Compilation or Runtime Error Display */}
                      {resultMsg.error && (
                        <div className="bg-[#1a0f0f] border border-red-900/60 rounded p-3 text-red-300 space-y-1">
                          <div className="text-[11px] uppercase tracking-wider font-bold text-red-400 flex items-center gap-1">
                            <AlertOctagon size={12} /> Error Output:
                          </div>
                          <pre className="text-xs font-mono text-red-200 whitespace-pre-wrap leading-relaxed">{resultMsg.error}</pre>
                        </div>
                      )}

                      {/* General Message */}
                      {resultMsg.message && (
                        <div className="text-gray-300">{resultMsg.message}</div>
                      )}

                      {/* Test Case Failure Details */}
                      {resultMsg.failedTest && (
                        <div className="text-red-400">
                          Failed on hidden test case: <strong className="text-red-300">{resultMsg.failedTest}</strong>
                        </div>
                      )}

                      {/* Output Comparison for Sample Runs */}
                      {resultMsg.stdout !== undefined && (
                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <div className="bg-[#121212] border border-[#262626] rounded p-2.5">
                            <div className="text-gray-500 text-[10px] uppercase font-bold mb-1">Your Output:</div>
                            <pre className="text-gray-200 font-mono whitespace-pre-wrap">{resultMsg.stdout || "<no output>"}</pre>
                          </div>
                          <div className="bg-[#121212] border border-[#262626] rounded p-2.5">
                            <div className="text-gray-500 text-[10px] uppercase font-bold mb-1">Expected Output:</div>
                            <pre className="text-gray-200 font-mono whitespace-pre-wrap">{resultMsg.expectedOutput || "<none>"}</pre>
                          </div>
                        </div>
                      )}

                    </div>
                  ) : (
                    <div className="text-gray-500 italic">Click 'Run Sample' to test your logic or 'Submit' to run full hidden test suite.</div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Actions Bar */}
            <div className="h-12 border-t border-[#262626] bg-[#0c0c0c] flex items-center justify-between px-4 select-none flex-shrink-0">
              <div className="text-xs text-gray-500">
                Docker Execution Engine ({activeProblem?.timeLimitMs / 1000}s limit)
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleRunSample}
                  disabled={running || submitting || !activeProblem?.unlocked}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#1a1a1a] hover:bg-[#262626] border border-[#333] rounded text-xs font-semibold text-gray-300 transition-all active:scale-95 disabled:opacity-50"
                >
                  <Play size={12} className="fill-current" /> {running ? "Running..." : "Run Sample"}
                </button>

                <button
                  onClick={handleSubmit}
                  disabled={submitting || running || !activeProblem?.unlocked}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-white text-black hover:bg-gray-200 rounded text-xs font-bold transition-all shadow active:scale-95 disabled:opacity-50 disabled:bg-[#222] disabled:text-gray-500"
                >
                  {submitting ? (
                    <RefreshCw size={12} className="animate-spin" />
                  ) : (
                    <Send size={12} />
                  )}
                  Submit Code
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
