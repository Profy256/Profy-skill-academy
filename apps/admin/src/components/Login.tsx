"use client";

import { useState } from "react";
import { api, setToken } from "@/lib/api";

interface Props {
  onAuth: () => void;
}

export default function Login({ onAuth }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Both fields are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await api.auth.login(email, password);
      setToken(result.accessToken);
      onAuth();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex" style={{ background: "var(--bg)" }}>
      {/* Left decorative panel */}
      <div className="hidden lg:flex flex-col justify-between w-72 p-8 border-r" style={{ borderColor: "var(--border)" }}>
        <div>
          <div className="font-mono text-xs tracking-widest" style={{ color: "var(--accent)" }}>
            DSK
          </div>
          <div className="font-mono text-xs mt-6 leading-relaxed" style={{ color: "var(--text-3)" }}>
            DERA SKUL
            <br />
            CONTENT MANAGEMENT
            <br />
            SYSTEM v2.4
          </div>
        </div>
        <div className="space-y-3">
          {["Taxonomy Manager", "Lesson Editor", "Review Queue", "Curator Accounts"].map((item) => (
            <div key={item} className="font-mono text-xs flex items-center gap-2">
              <span style={{ color: "var(--text-faint)" }}>—</span>
              <span style={{ color: "var(--text-3)" }}>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="mb-10">
            <div
              className="inline-block font-mono text-xs tracking-widest px-2 py-1 mb-4"
              style={{
                background: "var(--panel)",
                color: "var(--accent)",
                borderRadius: "2px",
                border: "1px solid var(--border)",
              }}
            >
              ADMIN PANEL
            </div>
            <h1 className="font-sans text-2xl font-semibold" style={{ color: "var(--text)" }}>
              Sign in
            </h1>
            <p className="font-mono text-xs mt-1" style={{ color: "var(--text-3)" }}>
              Internal access only — Dera Skul
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-mono text-xs mb-2 tracking-wider" style={{ color: "var(--text-3)" }}>
                EMAIL ADDRESS
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                placeholder="curator@deraskul.com"
                autoComplete="email"
                className="w-full px-3 py-2.5 font-mono text-sm outline-none transition-all"
                style={{
                  background: "var(--panel-2)",
                  border: "1px solid var(--border)",
                  borderRadius: "3px",
                  color: "var(--text)",
                  caretColor: "var(--accent)",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent)";
                  e.currentTarget.style.boxShadow = "0 0 0 2px var(--focus-glow)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>

            <div>
              <label className="block font-mono text-xs mb-2 tracking-wider" style={{ color: "var(--text-3)" }}>
                PASSWORD
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  placeholder="••••••••••"
                  autoComplete="current-password"
                  className="w-full px-3 py-2.5 pr-10 font-mono text-sm outline-none transition-all"
                  style={{
                    background: "var(--panel-2)",
                    border: "1px solid var(--border)",
                    borderRadius: "3px",
                    color: "var(--text)",
                    caretColor: "var(--accent)",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--accent)";
                    e.currentTarget.style.boxShadow = "0 0 0 2px var(--focus-glow)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-sm transition-colors"
                  style={{ color: "var(--text-faint)", background: "none", border: "none", cursor: "pointer" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-faint)")}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="font-mono text-xs" style={{ color: "var(--danger)" }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 font-mono text-xs tracking-widest font-semibold transition-all mt-1"
              style={{
                background: loading ? "var(--accent-note)" : "var(--accent)",
                color: "#000",
                borderRadius: "3px",
                opacity: loading ? 0.8 : 1,
                cursor: loading ? "wait" : "pointer",
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.background = "var(--accent-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = loading ? "var(--accent-note)" : "var(--accent)";
              }}
            >
              {loading ? "SIGNING IN..." : "SIGN IN"}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t" style={{ borderColor: "var(--border)" }}>
            <p className="font-mono text-xs" style={{ color: "var(--text-3)" }}>
              Access issues? Contact <span style={{ color: "var(--text-2)" }}>it@deraskul.com</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
