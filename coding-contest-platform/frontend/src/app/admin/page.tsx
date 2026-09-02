"use client";

import { useState, useEffect } from "react";
import { 
  Plus, Trash2, Save, RefreshCw, Settings, Users, FileCode, CheckCircle2, 
  Layers, ShieldAlert, ArrowLeft, Eye, Edit3, Award, GraduationCap, ChevronRight, X, Clock
} from "lucide-react";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/api";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<"teams" | "problems" | "testcases" | "submissions">("problems");
  
  // Teams State
  const [teams, setTeams] = useState<any[]>([]);
  const [newTeam, setNewTeam] = useState({ username: "", password: "", name: "", preferredLanguage: "JAVA", year: 1 });
  const [teamLoading, setTeamLoading] = useState(false);
  
  // Problems State
  const [problems, setProblems] = useState<any[]>([]);
  const [selectedYearSet, setSelectedYearSet] = useState<number | "ALL">("ALL");
  const [editingProblem, setEditingProblem] = useState<any | null>(null);
  
  // Test Cases State
  const [selectedProblem, setSelectedProblem] = useState<any | null>(null);
  const [testCases, setTestCases] = useState<any[]>([]);
  const [newTc, setNewTc] = useState({ input: "", expectedOutput: "", sample: false });
  const [tcLoading, setTcLoading] = useState(false);

  // Submissions State
  const [allSubmissions, setAllSubmissions] = useState<any[]>([]);

  // Overview Stats & Live Contest Timer
  const [stats, setStats] = useState<any>({ totalTeams: 0, totalProblems: 0, totalSubmissions: 0, acceptedSubmissions: 0 });
  const [contestTimer, setContestTimer] = useState<string>("00:00:00");
  const [contestEndTime, setContestEndTime] = useState<number | null>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  // Real-time 1s Contest Timer in Admin Header
  useEffect(() => {
    if (!contestEndTime) return;
    const interval = setInterval(() => {
      const diff = contestEndTime - Date.now();
      if (diff <= 0) {
        setContestTimer("00:00:00 (ENDED)");
        return;
      }
      const hrs = String(Math.floor(diff / (1000 * 60 * 60))).padStart(2, "0");
      const mins = String(Math.floor((diff / (1000 * 60)) % 60)).padStart(2, "0");
      const secs = String(Math.floor((diff / 1000) % 60)).padStart(2, "0");
      setContestTimer(`${hrs}:${mins}:${secs}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [contestEndTime]);

  useEffect(() => {
    fetchStats();
    fetchTeams();
    fetchProblems();
    fetchSubmissions();
    fetchContestTime();
    const interval = setInterval(() => {
      fetchStats();
      fetchSubmissions();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchContestTime = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/contest/current`);
      if (res.ok) {
        const data = await res.json();
        if (data.contest && data.contest.endTime) {
          setContestEndTime(new Date(data.contest.endTime).getTime());
        }
      }
    } catch (e) {}
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setStats(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTeams = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/teams`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setTeams(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchProblems = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/problems`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setProblems(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSubmissions = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/submissions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setAllSubmissions(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeam.username || !newTeam.password) return alert("Username and password are required.");
    setTeamLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(newTeam)
      });
      if (res.ok) {
        setNewTeam({ username: "", password: "", name: "", preferredLanguage: "JAVA", year: 1 });
        fetchTeams();
        fetchStats();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create team.");
      }
    } catch (err) {
      alert("Network error.");
    } finally {
      setTeamLoading(false);
    }
  };

  const handleUpdateTeamYear = async (id: string, year: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/teams/${id}/year`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ year })
      });
      if (res.ok) fetchTeams();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteTeam = async (id: string) => {
    if (!confirm(`Are you sure you want to delete team '${id}'? This will delete their submissions.`)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/teams/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchTeams();
        fetchStats();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetTeamProgress = async (id: string) => {
    if (!confirm(`Reset progress for team '${id}' back to Problem 1?`)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/teams/${id}/reset`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchTeams();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveProblem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/problems`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(editingProblem)
      });
      if (res.ok) {
        setEditingProblem(null);
        fetchProblems();
        fetchStats();
      } else {
        alert("Failed to save problem.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteProblem = async (id: string) => {
    if (!confirm(`Delete problem '${id}' and all its test cases?`)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/problems/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchProblems();
        fetchStats();
        if (selectedProblem?.id === id) {
          setSelectedProblem(null);
          setActiveTab("problems");
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const openTestCaseManager = async (prob: any) => {
    setSelectedProblem(prob);
    setActiveTab("testcases");
    setTcLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/problems/${prob.id}/testcases`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setTestCases(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setTcLoading(false);
    }
  };

  const handleAddTestCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProblem) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/problems/${selectedProblem.id}/testcases`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(newTc)
      });
      if (res.ok) {
        setNewTc({ input: "", expectedOutput: "", sample: false });
        openTestCaseManager(selectedProblem);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteTestCase = async (tcId: string) => {
    if (!selectedProblem) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/problems/${selectedProblem.id}/testcases/${tcId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) openTestCaseManager(selectedProblem);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-[#070707] text-white flex flex-col font-sans">
      
      {/* Top Navbar */}
      <header className="h-16 border-b border-[#222] bg-[#0c0c0c] px-8 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-gray-400 hover:text-white flex items-center gap-1.5 text-xs font-semibold bg-[#181818] border border-[#2e2e2e] px-3 py-1.5 rounded-md transition-colors">
            <ArrowLeft size={14} /> Back to Contest
          </Link>
          <div className="h-4 w-px bg-[#262626]"></div>
          <div className="flex items-center gap-2.5">
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-500 p-1.5 rounded-lg text-white shadow-lg shadow-blue-500/20">
              <ShieldAlert size={18} />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                Contest Master Admin
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-blue-950 text-blue-400 border border-blue-800/50 rounded-full font-bold">Live</span>
              </h1>
            </div>
          </div>
        </div>

        {/* Live Contest Timer Display */}
        <div className="flex items-center gap-2 bg-[#141414] border border-[#333] px-3.5 py-1.5 rounded-lg">
          <Clock size={13} className="text-blue-400 animate-pulse" />
          <span className="text-xs text-gray-400 font-medium">Contest Timer:</span>
          <span className="text-xs font-mono font-bold text-white tracking-wider">{contestTimer}</span>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-2 bg-[#141414] p-1 rounded-lg border border-[#262626]">
          <button
            onClick={() => setActiveTab("problems")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeTab === "problems" ? "bg-white text-black shadow-md" : "text-gray-400 hover:text-white hover:bg-[#202020]"
            }`}
          >
            <Layers size={14} /> 4-Year Sets ({problems.length})
          </button>
          
          <button
            onClick={() => setActiveTab("teams")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeTab === "teams" ? "bg-white text-black shadow-md" : "text-gray-400 hover:text-white hover:bg-[#202020]"
            }`}
          >
            <Users size={14} /> Teams ({teams.length})
          </button>

          <button
            onClick={() => setActiveTab("submissions")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeTab === "submissions" ? "bg-white text-black shadow-md" : "text-gray-400 hover:text-white hover:bg-[#202020]"
            }`}
          >
            <FileCode size={14} /> Submissions ({allSubmissions.length})
          </button>

          {selectedProblem && (
            <button
              onClick={() => setActiveTab("testcases")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-bold transition-all ${
                activeTab === "testcases" ? "bg-blue-600 text-white shadow-md" : "text-blue-400 hover:bg-blue-950/40"
              }`}
            >
              <Settings size={14} /> Test Cases ({selectedProblem.title})
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Link href="/leaderboard" className="text-xs text-yellow-400 hover:underline font-semibold flex items-center gap-1 bg-yellow-950/30 border border-yellow-800/40 px-3 py-1.5 rounded">
            <Award size={14} /> Leaderboard
          </Link>
          <button onClick={() => { fetchStats(); fetchTeams(); fetchProblems(); fetchSubmissions(); fetchContestTime(); }} title="Refresh All Data" className="text-gray-400 hover:text-white p-2 rounded hover:bg-[#1a1a1a]">
            <RefreshCw size={15} />
          </button>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 p-8 max-w-7xl w-full mx-auto space-y-8 overflow-y-auto">
        
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-[#111] border border-[#222] p-4 rounded-xl">
            <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Registered Teams</div>
            <div className="text-2xl font-black mt-1 text-white flex items-center justify-between">
              {stats.totalTeams}
              <Users size={20} className="text-blue-500/50" />
            </div>
          </div>
          <div className="bg-[#111] border border-[#222] p-4 rounded-xl">
            <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Total Problem Sets</div>
            <div className="text-2xl font-black mt-1 text-white flex items-center justify-between">
              4 Sets <span className="text-xs text-gray-400 font-normal">({stats.totalProblems} probs)</span>
              <Layers size={20} className="text-purple-500/50" />
            </div>
          </div>
          <div className="bg-[#111] border border-[#222] p-4 rounded-xl">
            <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Total Submissions</div>
            <div className="text-2xl font-black mt-1 text-white flex items-center justify-between">
              {stats.totalSubmissions}
              <FileCode size={20} className="text-yellow-500/50" />
            </div>
          </div>
          <div className="bg-[#111] border border-[#222] p-4 rounded-xl">
            <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Accepted Solves</div>
            <div className="text-2xl font-black mt-1 text-emerald-400 flex items-center justify-between">
              {stats.acceptedSubmissions}
              <CheckCircle2 size={20} className="text-emerald-500/50" />
            </div>
          </div>
        </div>

        {/* TAB 1: 4-YEAR PROBLEM SETS */}
        {activeTab === "problems" && (
          <div className="space-y-6">
            
            {/* Header & Year Set Tabs */}
            <div className="flex items-center justify-between border-b border-[#222] pb-4">
              <div>
                <h2 className="text-lg font-bold">4-Year Cohort Problem Sets</h2>
                <p className="text-xs text-gray-400 mt-0.5">Each student cohort receives their tailored set of algorithmic challenges.</p>
              </div>

              <div className="flex items-center gap-3">
                {/* Year Track Filter */}
                <div className="flex items-center gap-1 bg-[#141414] p-1 rounded-lg border border-[#2a2a2a]">
                  <button
                    onClick={() => setSelectedYearSet("ALL")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                      selectedYearSet === "ALL" ? "bg-white text-black shadow" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    All Sets
                  </button>
                  {[1, 2, 3, 4].map(y => (
                    <button
                      key={y}
                      onClick={() => setSelectedYearSet(y)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
                        selectedYearSet === y ? "bg-blue-600 text-white shadow" : "text-gray-400 hover:text-white"
                      }`}
                    >
                      <GraduationCap size={13} />
                      Set {y} ({y === 1 ? '1st' : y === 2 ? '2nd' : y === 3 ? '3rd' : '4th'} Yr)
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setEditingProblem({
                    year: typeof selectedYearSet === "number" ? selectedYearSet : 1,
                    sequence: 1,
                    title: "",
                    difficulty: "Medium",
                    story: "",
                    description: "",
                    inputFormat: "",
                    outputFormat: "",
                    constraints: "",
                    sampleInput: "",
                    sampleOutput: "",
                    timeLimitMs: 2000,
                    memoryLimitMb: 256
                  })}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-950 transition-all"
                >
                  <Plus size={14} /> Add Problem to Set
                </button>
              </div>
            </div>

            {/* Problem Cards Grouped by Set */}
            <div className="space-y-6">
              {[1, 2, 3, 4].filter(y => selectedYearSet === "ALL" || selectedYearSet === y).map(yearNum => {
                const yearProblems = problems.filter(p => (p.year || 1) === yearNum);
                return (
                  <div key={yearNum} className="bg-[#0e0e0e] border border-[#222] rounded-xl overflow-hidden">
                    <div className="bg-[#141414] px-6 py-3 border-b border-[#222] flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="bg-blue-600/20 text-blue-400 border border-blue-500/30 px-2.5 py-0.5 rounded text-xs font-black">
                          SET #{yearNum}
                        </span>
                        <h3 className="font-bold text-sm text-gray-200">
                          {yearNum === 1 ? "1st Year Track (Fundamentals & Strings)" :
                           yearNum === 2 ? "2nd Year Track (Data Structures & DP)" :
                           yearNum === 3 ? "3rd Year Track (Graph Algorithms & Trees)" :
                           "4th Year Track (Advanced Flows, Complex Optimization)"}
                        </h3>
                      </div>
                      <span className="text-xs text-gray-500 font-mono">{yearProblems.length} Problems Configured</span>
                    </div>

                    <div className="divide-y divide-[#1a1a1a]">
                      {yearProblems.length === 0 ? (
                        <div className="p-8 text-center text-gray-600 text-xs font-mono">
                          No problems added to Set #{yearNum} yet. Click "Add Problem to Set" above.
                        </div>
                      ) : (
                        yearProblems.map(prob => (
                          <div key={prob.id} className="p-5 hover:bg-[#121212] transition-colors flex items-center justify-between gap-6">
                            <div className="flex items-start gap-4 flex-1">
                              <div className="w-10 h-10 rounded-lg bg-[#181818] border border-[#2e2e2e] flex items-center justify-center font-mono font-bold text-sm text-gray-300 flex-shrink-0">
                                Q{prob.sequence}
                              </div>
                              <div className="space-y-1 flex-1">
                                <div className="flex items-center gap-3">
                                  <h4 className="font-bold text-sm text-white">{prob.title}</h4>
                                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                                    prob.difficulty === "Easy" ? "text-green-400 bg-green-950/40 border border-green-800/40" :
                                    prob.difficulty === "Medium" ? "text-yellow-400 bg-yellow-950/40 border border-yellow-800/40" :
                                    "text-red-400 bg-red-950/40 border border-red-800/40"
                                  }`}>
                                    {prob.difficulty}
                                  </span>
                                  <span className="text-[11px] text-gray-500 font-mono">ID: {prob.id}</span>
                                </div>
                                <p className="text-xs text-gray-400 line-clamp-1">{prob.story || prob.description}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                              <button
                                onClick={() => openTestCaseManager(prob)}
                                className="bg-[#181818] hover:bg-[#252525] text-blue-400 border border-blue-950 px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors"
                              >
                                <Settings size={13} /> Manage Test Cases
                              </button>
                              <button
                                onClick={() => setEditingProblem(prob)}
                                className="bg-[#181818] hover:bg-[#252525] text-gray-200 border border-[#333] px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors"
                              >
                                <Edit3 size={13} /> Edit
                              </button>
                              <button
                                onClick={() => handleDeleteProblem(prob.id)}
                                className="bg-red-950/30 hover:bg-red-900/50 text-red-400 border border-red-900/40 p-1.5 rounded-md text-xs transition-colors"
                                title="Delete Problem"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: TEAMS & YEAR ALLOCATION */}
        {activeTab === "teams" && (
          <div className="space-y-6">
            
            {/* Team Creation Form */}
            <div className="bg-[#0e0e0e] border border-[#222] p-6 rounded-xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#222] pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users size={16} className="text-blue-400" /> Provision & Allocate New Team
                </h3>
                <span className="text-xs text-gray-500">Assign students to their respective year problem sets</span>
              </div>

              <form onSubmit={handleCreateTeam} className="grid grid-cols-5 gap-3 items-end">
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1 font-semibold">Team Username / ID</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. team_alpha"
                    value={newTeam.username}
                    onChange={e => setNewTeam({...newTeam, username: e.target.value})}
                    className="w-full bg-black border border-[#333] px-3 py-2 rounded-lg text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1 font-semibold">Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={newTeam.password}
                    onChange={e => setNewTeam({...newTeam, password: e.target.value})}
                    className="w-full bg-black border border-[#333] px-3 py-2 rounded-lg text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1 font-semibold">Display Team Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Code Ninjas"
                    value={newTeam.name}
                    onChange={e => setNewTeam({...newTeam, name: e.target.value})}
                    className="w-full bg-black border border-[#333] px-3 py-2 rounded-lg text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1 font-semibold">Academic Year Track</label>
                  <select
                    value={newTeam.year}
                    onChange={e => setNewTeam({...newTeam, year: parseInt(e.target.value)})}
                    className="w-full bg-black border border-[#333] px-3 py-2 rounded-lg text-xs text-blue-300 font-bold focus:border-blue-500 focus:outline-none"
                  >
                    <option value={1}>🎓 1st Year (Set 1)</option>
                    <option value={2}>🎓 2nd Year (Set 2)</option>
                    <option value={3}>🎓 3rd Year (Set 3)</option>
                    <option value={4}>🎓 4th Year (Set 4)</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={teamLoading}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 shadow"
                >
                  <Plus size={14} /> {teamLoading ? "Provisioning..." : "Provision Team"}
                </button>
              </form>
            </div>

            {/* Teams Roster Table */}
            <div className="bg-[#0e0e0e] border border-[#222] rounded-xl overflow-hidden">
              <div className="p-4 border-b border-[#222] flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Active Contest Teams ({teams.length})</h3>
                <span className="text-xs text-gray-500">Inline change year tracks dynamically</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#141414] text-gray-400 border-b border-[#222]">
                    <tr>
                      <th className="py-3 px-4">Team ID</th>
                      <th className="py-3 px-4">Display Name</th>
                      <th className="py-3 px-4">Assigned Year Set</th>
                      <th className="py-3 px-4 text-center">Language</th>
                      <th className="py-3 px-4 text-center">Current Unlocked</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1a1a1a]">
                    {teams.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-10 text-gray-600 font-mono">
                          No teams provisioned yet. Use the form above.
                        </td>
                      </tr>
                    ) : (
                      teams.map(t => (
                        <tr key={t.id} className="hover:bg-[#121212] transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-gray-300">{t.id}</td>
                          <td className="py-3.5 px-4 font-semibold text-white">{t.name || t.id}</td>
                          <td className="py-3.5 px-4">
                            <select
                              value={t.year || 1}
                              onChange={e => handleUpdateTeamYear(t.id, parseInt(e.target.value))}
                              className="bg-[#181818] border border-[#333] text-blue-400 font-bold px-2.5 py-1 rounded text-xs focus:outline-none focus:border-blue-500"
                            >
                              <option value={1}>🎓 1st Year (Set 1)</option>
                              <option value={2}>🎓 2nd Year (Set 2)</option>
                              <option value={3}>🎓 3rd Year (Set 3)</option>
                              <option value={4}>🎓 4th Year (Set 4)</option>
                            </select>
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono text-gray-400">{t.preferredLanguage || "JAVA"}</td>
                          <td className="py-3.5 px-4 text-center font-bold text-green-400">
                            <span className="bg-green-950/40 border border-green-800/40 px-2 py-0.5 rounded">
                              Question {t.currentProblem || 1}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-2">
                            <button
                              onClick={() => handleResetTeamProgress(t.id)}
                              className="text-gray-400 hover:text-yellow-400 p-1.5 rounded hover:bg-[#202020] transition-colors"
                              title="Reset to Problem 1"
                            >
                              <RefreshCw size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteTeam(t.id)}
                              className="text-gray-400 hover:text-red-400 p-1.5 rounded hover:bg-[#202020] transition-colors"
                              title="Delete Team"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 3: LIVE SUBMISSIONS LOG WITH TIMESTAMPS */}
        {activeTab === "submissions" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-[#222] pb-4">
              <div>
                <h2 className="text-lg font-bold">Real-Time Submissions Feed</h2>
                <p className="text-xs text-gray-400 mt-0.5">Live stream of code evaluations across all teams and tracks.</p>
              </div>
              <button
                onClick={fetchSubmissions}
                className="bg-[#181818] hover:bg-[#252525] border border-[#333] px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-300 flex items-center gap-1.5"
              >
                <RefreshCw size={13} /> Refresh Submissions
              </button>
            </div>

            <div className="bg-[#0e0e0e] border border-[#222] rounded-xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#141414] text-gray-400 border-b border-[#222]">
                    <tr>
                      <th className="py-3 px-4">Submission Time</th>
                      <th className="py-3 px-4">Team</th>
                      <th className="py-3 px-4">Problem</th>
                      <th className="py-3 px-4">Verdict</th>
                      <th className="py-3 px-4 text-center">Tests</th>
                      <th className="py-3 px-4 text-center">Runtime</th>
                      <th className="py-3 px-4 text-center">Language</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1a1a1a]">
                    {allSubmissions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-12 text-gray-600 font-mono">
                          No submissions recorded yet across any team.
                        </td>
                      </tr>
                    ) : (
                      allSubmissions.map(sub => (
                        <tr key={sub.id} className="hover:bg-[#121212] transition-colors">
                          <td className="py-3.5 px-4 font-mono">
                            <div className="text-gray-200 font-bold flex items-center gap-1.5">
                              <Clock size={12} className="text-blue-400" />
                              {sub.submittedAt ? new Date(sub.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "Just now"}
                            </div>
                            {sub.submittedAt && (
                              <div className="text-[10px] text-gray-500 pl-4">
                                {new Date(sub.submittedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-white font-mono">{sub.teamId}</td>
                          <td className="py-3.5 px-4 font-semibold text-gray-300">Question {sub.problemId}</td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold border inline-flex items-center gap-1 ${
                              sub.status === "ACCEPTED" ? "text-green-400 bg-green-950/40 border-green-800/60" :
                              sub.status === "WRONG_ANSWER" ? "text-red-400 bg-red-950/40 border-red-800/60" :
                              sub.status === "COMPILATION_ERROR" ? "text-orange-400 bg-orange-950/40 border-orange-800/60" :
                              "text-yellow-400 bg-yellow-950/40 border-yellow-800/60"
                            }`}>
                              {sub.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono text-gray-300">
                            {sub.passedTests !== null && sub.passedTests !== undefined ? `${sub.passedTests} / ${sub.totalTests || "?"}` : "-"}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono text-gray-400">
                            {sub.executionTimeMs ? `${sub.executionTimeMs}ms` : "-"}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono text-gray-400">{sub.language}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: TEST CASES MANAGER */}
        {activeTab === "testcases" && selectedProblem && (
          <div className="space-y-6">
            
            <div className="flex items-center justify-between border-b border-[#222] pb-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveTab("problems")}
                  className="bg-[#181818] hover:bg-[#252525] border border-[#333] px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-300 flex items-center gap-1.5"
                >
                  <ArrowLeft size={13} /> Back to Problem Sets
                </button>
                <div className="h-4 w-px bg-[#262626]"></div>
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    Test Cases for <span className="text-blue-400">{selectedProblem.title}</span>
                    <span className="text-[10px] bg-blue-950 text-blue-300 border border-blue-800 px-2 py-0.5 rounded-full font-bold">
                      Set #{selectedProblem.year || 1} - Q{selectedProblem.sequence}
                    </span>
                  </h2>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              
              {/* Add Test Case Form */}
              <div className="bg-[#0e0e0e] border border-[#222] p-6 rounded-xl space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-[#222] pb-2">
                  Add New Verification Test Case
                </h3>

                <form onSubmit={handleAddTestCase} className="space-y-4">
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1 font-semibold">Standard Input (stdin)</label>
                    <textarea
                      required
                      placeholder="Input sent to process stdin..."
                      value={newTc.input}
                      onChange={e => setNewTc({...newTc, input: e.target.value})}
                      className="w-full h-28 bg-black border border-[#333] p-3 rounded-lg text-xs font-mono text-gray-200 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1 font-semibold">Expected Output (stdout)</label>
                    <textarea
                      required
                      placeholder="Exact expected process stdout..."
                      value={newTc.expectedOutput}
                      onChange={e => setNewTc({...newTc, expectedOutput: e.target.value})}
                      className="w-full h-28 bg-black border border-[#333] p-3 rounded-lg text-xs font-mono text-green-400 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer bg-[#141414] p-3 rounded-lg border border-[#222]">
                    <input
                      type="checkbox"
                      checked={newTc.sample}
                      onChange={e => setNewTc({...newTc, sample: e.target.checked})}
                      className="accent-blue-500 rounded"
                    />
                    <span className="text-xs font-semibold text-gray-300">
                      Mark as Sample Case (Visible in student problem description)
                    </span>
                  </label>

                  <button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 shadow"
                  >
                    <Plus size={14} /> Add Test Case
                  </button>
                </form>
              </div>

              {/* Test Cases List */}
              <div className="bg-[#0e0e0e] border border-[#222] p-6 rounded-xl space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-[#222] pb-2 flex items-center justify-between">
                  <span>Configured Test Cases ({testCases.length})</span>
                  {tcLoading && <RefreshCw size={12} className="animate-spin text-blue-400" />}
                </h3>

                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {testCases.length === 0 ? (
                    <div className="p-8 text-center text-gray-600 text-xs font-mono">
                      No test cases configured yet.
                    </div>
                  ) : (
                    testCases.map((tc, idx) => (
                      <div key={tc.id} className="bg-[#141414] border border-[#262626] p-3.5 rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-300">Test #{tc.order || idx + 1}</span>
                            {tc.sample ? (
                              <span className="bg-yellow-950 text-yellow-400 border border-yellow-800/60 text-[9px] px-1.5 py-0.5 rounded font-black uppercase">
                                Sample Case
                              </span>
                            ) : (
                              <span className="bg-gray-800 text-gray-400 text-[9px] px-1.5 py-0.5 rounded font-black uppercase">
                                Hidden Case
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => handleDeleteTestCase(tc.id)}
                            className="text-gray-500 hover:text-red-400 p-1 transition-colors"
                            title="Delete Test Case"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                          <div>
                            <div className="text-gray-500 text-[10px] uppercase font-sans mb-0.5">Input</div>
                            <div className="bg-black p-2 rounded border border-[#222] text-gray-300 whitespace-pre-wrap max-h-20 overflow-y-auto">
                              {tc.input}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-500 text-[10px] uppercase font-sans mb-0.5">Expected Output</div>
                            <div className="bg-black p-2 rounded border border-[#222] text-emerald-400 whitespace-pre-wrap max-h-20 overflow-y-auto">
                              {tc.expectedOutput}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

      </div>

      {/* EDIT / CREATE PROBLEM MODAL */}
      {editingProblem && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-6 z-50 overflow-y-auto backdrop-blur-sm">
          <div className="bg-[#111] border border-[#333] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            
            <div className="px-6 py-4 border-b border-[#222] flex items-center justify-between bg-[#161616]">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <FileCode size={16} className="text-blue-400" />
                {editingProblem.id ? `Edit Problem: ${editingProblem.title}` : "Create New Problem"}
              </h2>
              <button onClick={() => setEditingProblem(null)} className="text-gray-400 hover:text-white p-1">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveProblem} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-gray-400 mb-1 font-semibold">Assign to Year Set</label>
                  <select
                    value={editingProblem.year || 1}
                    onChange={e => setEditingProblem({...editingProblem, year: parseInt(e.target.value)})}
                    className="w-full bg-black border border-[#333] p-2.5 rounded-lg text-blue-300 font-bold focus:border-blue-500 focus:outline-none"
                  >
                    <option value={1}>Set 1 (1st Year Track)</option>
                    <option value={2}>Set 2 (2nd Year Track)</option>
                    <option value={3}>Set 3 (3rd Year Track)</option>
                    <option value={4}>Set 4 (4th Year Track)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 mb-1 font-semibold">Sequence in Set (Q#)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={editingProblem.sequence || 1}
                    onChange={e => setEditingProblem({...editingProblem, sequence: parseInt(e.target.value)})}
                    className="w-full bg-black border border-[#333] p-2.5 rounded-lg text-white font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1 font-semibold">Difficulty</label>
                  <select
                    value={editingProblem.difficulty || "Medium"}
                    onChange={e => setEditingProblem({...editingProblem, difficulty: e.target.value})}
                    className="w-full bg-black border border-[#333] p-2.5 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option>Easy</option>
                    <option>Medium</option>
                    <option>Hard</option>
                    <option>Expert</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-400 mb-1 font-semibold">Problem Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1. The Quantum Nexus"
                  value={editingProblem.title || ""}
                  onChange={e => setEditingProblem({...editingProblem, title: e.target.value})}
                  className="w-full bg-black border border-[#333] p-2.5 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-1 font-semibold">Story / Flavor Lore</label>
                <textarea
                  rows={2}
                  placeholder="Atmospheric narrative introducing the challenge..."
                  value={editingProblem.story || ""}
                  onChange={e => setEditingProblem({...editingProblem, story: e.target.value})}
                  className="w-full bg-black border border-[#333] p-2.5 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-1 font-semibold">Technical Problem Description</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Rigorous mathematical and computational requirements..."
                  value={editingProblem.description || ""}
                  onChange={e => setEditingProblem({...editingProblem, description: e.target.value})}
                  className="w-full bg-black border border-[#333] p-2.5 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 mb-1 font-semibold">Input Format</label>
                  <textarea
                    rows={2}
                    placeholder="Description of input specification..."
                    value={editingProblem.inputFormat || ""}
                    onChange={e => setEditingProblem({...editingProblem, inputFormat: e.target.value})}
                    className="w-full bg-black border border-[#333] p-2.5 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1 font-semibold">Output Format</label>
                  <textarea
                    rows={2}
                    placeholder="Description of exact output format..."
                    value={editingProblem.outputFormat || ""}
                    onChange={e => setEditingProblem({...editingProblem, outputFormat: e.target.value})}
                    className="w-full bg-black border border-[#333] p-2.5 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 mb-1 font-semibold">Constraints</label>
                <input
                  type="text"
                  placeholder="e.g. 1 <= N <= 10^5, 1 <= T <= 100"
                  value={editingProblem.constraints || ""}
                  onChange={e => setEditingProblem({...editingProblem, constraints: e.target.value})}
                  className="w-full bg-black border border-[#333] p-2.5 rounded-lg text-white font-mono focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 mb-1 font-semibold">Sample Input (Visible)</label>
                  <textarea
                    rows={3}
                    placeholder="Raw sample input..."
                    value={editingProblem.sampleInput || ""}
                    onChange={e => setEditingProblem({...editingProblem, sampleInput: e.target.value})}
                    className="w-full bg-black border border-[#333] p-2.5 rounded-lg text-white font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1 font-semibold">Sample Output (Visible)</label>
                  <textarea
                    rows={3}
                    placeholder="Raw sample expected output..."
                    value={editingProblem.sampleOutput || ""}
                    onChange={e => setEditingProblem({...editingProblem, sampleOutput: e.target.value})}
                    className="w-full bg-black border border-[#333] p-2.5 rounded-lg text-green-400 font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#222]">
                <button
                  type="button"
                  onClick={() => setEditingProblem(null)}
                  className="px-4 py-2 bg-[#181818] hover:bg-[#252525] border border-[#333] rounded-lg text-gray-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-lg shadow-blue-950 flex items-center gap-1.5"
                >
                  <Save size={14} /> Save Problem
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
