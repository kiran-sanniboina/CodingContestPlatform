"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Trophy, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

interface TeamRank {
  rank: number;
  teamId: string;
  name: string;
  preferredLanguage: string;
  solved: number;
  time: string;
  problems: boolean[];
}

export default function Leaderboard() {
  const [teams, setTeams] = useState<TeamRank[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/leaderboard`);
      if (res.ok) {
        const data = await res.json();
        setTeams(data);
      }
    } catch (err) {
      console.error("Failed to load leaderboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen w-screen bg-black text-white p-8 font-sans flex flex-col items-center">
      <div className="w-full max-w-5xl space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#262626] pb-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-gray-400 hover:text-white flex items-center gap-1 text-xs font-semibold bg-[#111] px-3 py-1.5 rounded border border-[#262626]">
              <ArrowLeft size={14} /> Back to Problems
            </Link>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Trophy size={22} className="text-yellow-500" /> Contest Leaderboard
            </h1>
          </div>
          <button 
            onClick={fetchLeaderboard}
            className="text-xs text-gray-400 hover:text-white flex items-center gap-1.5 bg-[#111] px-3 py-1.5 rounded border border-[#262626]"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>

        {/* Leaderboard Table */}
        <div className="bg-[#0a0a0a] border border-[#262626] rounded-lg overflow-hidden shadow-2xl">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-[#121212] text-gray-400 text-xs font-semibold border-b border-[#262626] uppercase tracking-wider">
                <th className="py-3.5 px-4 w-16 text-center">Rank</th>
                <th className="py-3.5 px-4">Team</th>
                <th className="py-3.5 px-4 text-center">Language</th>
                <th className="py-3.5 px-4 w-28 text-center">Solved</th>
                <th className="py-3.5 px-4 text-center">Total Penalty</th>
                <th className="py-3.5 px-3 text-center">Q1</th>
                <th className="py-3.5 px-3 text-center">Q2</th>
                <th className="py-3.5 px-3 text-center">Q3</th>
                <th className="py-3.5 px-3 text-center">Q4</th>
                <th className="py-3.5 px-3 text-center">Q5</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c1c1c] text-gray-300">
              {teams.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-gray-500 font-mono text-xs">
                    No teams registered yet. Submissions will populate here live.
                  </td>
                </tr>
              ) : (
                teams.map((team) => (
                  <tr key={team.teamId} className="hover:bg-[#111] transition-colors">
                    <td className="py-3.5 px-4 text-center font-bold font-mono">
                      {team.rank === 1 ? (
                        <span className="text-yellow-400 font-extrabold text-base">🥇 1</span>
                      ) : team.rank === 2 ? (
                        <span className="text-gray-300 font-extrabold text-base">🥈 2</span>
                      ) : team.rank === 3 ? (
                        <span className="text-amber-600 font-extrabold text-base">🥉 3</span>
                      ) : (
                        <span className="text-gray-500">#{team.rank}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-white">
                      {team.name}
                    </td>
                    <td className="py-3.5 px-4 text-center text-xs font-mono text-gray-400">
                      {team.preferredLanguage || "JAVA"}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-green-400 font-mono">
                      {team.solved} / 5
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-xs text-gray-400">
                      {team.time}
                    </td>
                    {team.problems?.map((solved, idx) => (
                      <td key={idx} className="py-3.5 px-3 text-center">
                        {solved ? (
                          <div className="w-5 h-5 rounded-full bg-green-500/20 text-green-400 border border-green-500/40 flex items-center justify-center mx-auto text-[10px] font-bold shadow-[0_0_8px_rgba(34,197,94,0.3)]">
                            ✓
                          </div>
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-[#1c1c1c] border border-[#2a2a2a] mx-auto"></div>
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
