"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, History, RefreshCw, ChevronDown, ChevronUp, Code, Clock, CheckCircle2, XCircle, AlertOctagon, Copy, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/lib/api";

interface Submission {
  id: string;
  problemId: string;
  language: string;
  status: string;
  passedTests: number;
  totalTests: number;
  executionTimeMs: number;
  failedTest: string;
  sourceCode: string;
  submittedAt: string;
}

export default function Submissions() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const router = useRouter();

  const fetchSubmissions = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/submissions`, {
        headers: { Authorization: "Bearer " + token },
      });
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data);
      }
    } catch (err) {
      console.error("Failed to load submissions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
    const interval = setInterval(fetchSubmissions, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatSubmissionTime = (isoString?: string) => {
    if (!isoString) return { time: "Just now", date: "" };
    const dateObj = new Date(isoString);
    if (isNaN(dateObj.getTime())) return { time: "Just now", date: "" };

    const time = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const date = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' });
    return { time, date };
  };

  const getVerdictBadge = (status: string) => {
    switch (status) {
      case "ACCEPTED":
        return "text-green-400 bg-green-950/40 border-green-800/60";
      case "WRONG_ANSWER":
        return "text-red-400 bg-red-950/40 border-red-800/60";
      case "COMPILATION_ERROR":
        return "text-orange-400 bg-orange-950/40 border-orange-800/60";
      case "RUNTIME_ERROR":
        return "text-rose-400 bg-rose-950/40 border-rose-800/60";
      case "TIME_LIMIT_EXCEEDED":
        return "text-yellow-400 bg-yellow-950/40 border-yellow-800/60";
      case "QUEUED":
      case "COMPILING":
      case "RUNNING":
        return "text-blue-400 bg-blue-950/40 border-blue-800/60 animate-pulse";
      default:
        return "text-gray-400 bg-gray-900 border-gray-700";
    }
  };

  return (
    <div className="min-h-screen w-screen bg-black text-white p-8 font-sans flex flex-col items-center">
      <div className="w-full max-w-5xl space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#262626] pb-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-gray-400 hover:text-white flex items-center gap-1.5 text-xs font-semibold bg-[#111] px-3 py-1.5 rounded border border-[#262626] transition-colors">
              <ArrowLeft size={14} /> Back to Problems
            </Link>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <History size={22} className="text-blue-400" /> My Submissions Log
            </h1>
          </div>
          <button 
            onClick={fetchSubmissions}
            className="text-xs text-gray-400 hover:text-white flex items-center gap-1.5 bg-[#111] px-3 py-1.5 rounded border border-[#262626] transition-colors"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh Log
          </button>
        </div>

        {/* Submissions List */}
        <div className="bg-[#0a0a0a] border border-[#262626] rounded-xl overflow-hidden shadow-2xl">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-[#121212] text-gray-400 text-xs font-semibold border-b border-[#262626] uppercase tracking-wider">
                <th className="py-3.5 px-4">Submission Time</th>
                <th className="py-3.5 px-4">Problem</th>
                <th className="py-3.5 px-4">Verdict</th>
                <th className="py-3.5 px-4 text-center">Tests Passed</th>
                <th className="py-3.5 px-4 text-center">Runtime</th>
                <th className="py-3.5 px-4 text-center">Language</th>
                <th className="py-3.5 px-4 text-center">Source Code</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c1c1c] text-gray-300">
              {submissions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-500 font-mono text-xs">
                    No submissions recorded yet. Submit code from the problem editor to see evaluation logs.
                  </td>
                </tr>
              ) : (
                submissions.map((sub) => {
                  const isExpanded = expandedId === sub.id;
                  const { time, date } = formatSubmissionTime(sub.submittedAt);
                  return (
                    <tr key={sub.id} className="hover:bg-[#111] transition-colors group">
                      <td className="py-3.5 px-4 text-xs font-mono">
                        <div className="text-gray-200 font-semibold flex items-center gap-1.5">
                          <Clock size={12} className="text-gray-500" />
                          {time}
                        </div>
                        {date && <div className="text-[10px] text-gray-500 pl-4">{date}</div>}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-white">
                        Question {sub.problemId}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded text-xs font-bold border inline-flex items-center gap-1.5 ${getVerdictBadge(sub.status)}`}>
                          {sub.status === "ACCEPTED" && <CheckCircle2 size={12} />}
                          {sub.status === "WRONG_ANSWER" && <XCircle size={12} />}
                          {sub.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-xs text-gray-300">
                        {sub.passedTests !== null && sub.passedTests !== undefined 
                          ? `${sub.passedTests} / ${sub.totalTests || "?"}` 
                          : "-"}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-xs text-gray-400">
                        {sub.executionTimeMs !== null && sub.executionTimeMs !== undefined 
                          ? `${sub.executionTimeMs}ms` 
                          : "-"}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-xs text-gray-400">
                        {sub.language}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : sub.id)}
                          className={`text-xs flex items-center gap-1 mx-auto px-2.5 py-1 rounded border transition-colors ${
                            isExpanded ? "bg-white text-black border-white font-bold" : "text-gray-400 hover:text-white bg-[#1a1a1a] border-[#2a2a2a]"
                          }`}
                        >
                          <Code size={12} />
                          <span>Code</span>
                          {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Expanded Source Code Viewer Modal / Drawer */}
        {expandedId && (
          <div className="bg-[#0e0e0e] border border-[#2e2e2e] rounded-xl p-5 space-y-3 shadow-2xl">
            {(() => {
              const sub = submissions.find(s => s.id === expandedId);
              if (!sub) return null;
              const { time, date } = formatSubmissionTime(sub.submittedAt);
              return (
                <div>
                  <div className="flex items-center justify-between border-b border-[#222] pb-3 mb-3">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-sm text-white">Source Code for Question {sub.problemId}</span>
                      <span className="text-xs font-mono text-gray-400 bg-[#1a1a1a] px-2 py-0.5 rounded border border-[#333]">
                        {sub.language}
                      </span>
                      <span className="text-xs font-mono text-gray-400 flex items-center gap-1">
                        <Clock size={11} /> {time} {date}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopy(sub.id, sub.sourceCode)}
                        className="text-xs text-gray-300 hover:text-white bg-[#1a1a1a] hover:bg-[#252525] border border-[#333] px-2.5 py-1 rounded flex items-center gap-1 transition-colors"
                      >
                        {copiedId === sub.id ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                        {copiedId === sub.id ? "Copied" : "Copy Code"}
                      </button>
                      <button
                        onClick={() => setExpandedId(null)}
                        className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-[#1a1a1a]"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                  <pre className="p-4 bg-black border border-[#222] rounded-lg text-xs font-mono text-gray-200 overflow-x-auto max-h-96 leading-relaxed">
                    {sub.sourceCode}
                  </pre>
                </div>
              );
            })()}
          </div>
        )}

      </div>
    </div>
  );
}
