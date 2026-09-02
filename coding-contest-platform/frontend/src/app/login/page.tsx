"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Key, ArrowRight, ShieldCheck, Lock } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password: password.trim() }),
      });
      
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("token", data.accessToken);
        localStorage.setItem("username", data.username || username);
        localStorage.setItem("role", data.role || "TEAM");

        if (data.role === "ADMIN" || username.toLowerCase() === "admin") {
          router.push("/admin");
        } else {
          router.push("/");
        }
      } else {
        setError("Invalid username or password. Ensure your team credentials are correct.");
      }
    } catch (err) {
      setError("Unable to connect to contest backend. Ensure server is online.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-black text-white flex items-center justify-center p-4 font-sans select-none">
      <div className="w-full max-w-md bg-[#0a0a0a] border border-[#262626] rounded-xl p-8 shadow-2xl space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#171717] border border-[#333] mb-2">
            <ShieldCheck size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            CONTEST ACCESS
          </h1>
          <p className="text-xs text-gray-500 font-mono">
            Final Round Championship — Secure Authentication
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="p-3 rounded text-xs font-mono border bg-red-950/40 text-red-400 border-red-800/40">
            {error}
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="text-gray-400 font-medium">Username / Team ID</label>
            <div className="relative flex items-center">
              <User size={14} className="absolute left-3 text-gray-500" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. team1 or admin"
                required
                className="w-full bg-[#121212] border border-[#262626] rounded-lg pl-9 pr-3 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-white transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-gray-400 font-medium">Password</label>
            <div className="relative flex items-center">
              <Key size={14} className="absolute left-3 text-gray-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full bg-[#121212] border border-[#262626] rounded-lg pl-9 pr-3 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-white transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black font-bold py-2.5 rounded-lg hover:bg-gray-200 transition-all flex items-center justify-center gap-2 active:scale-98 shadow-md disabled:opacity-50"
          >
            {loading ? "Authenticating..." : "Sign In"}
            {!loading && <ArrowRight size={14} />}
          </button>
        </form>

        {/* Informational Footer */}
        <div className="text-center pt-3 border-t border-[#1c1c1c] text-gray-500 text-[11px] flex items-center justify-center gap-1.5">
          <Lock size={12} className="text-gray-600" />
          <span>Team accounts are provisioned by Contest Administrator.</span>
        </div>

      </div>
    </div>
  );
}
