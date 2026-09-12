"use client";

import { useState } from "react";
import { flaggedLessons as initialFlags, type FlaggedLesson } from "@/lib/mockData";

const REASON_VARS: Record<string, { bg: string; text: string; label: string }> = {
  deleted: { bg: "var(--badge-danger-bg)", text: "var(--badge-danger-text)", label: "Deleted" },
  private: { bg: "var(--badge-info-bg)", text: "var(--badge-info-text)", label: "Private" },
  unavailable: { bg: "var(--badge-warning-bg)", text: "var(--badge-warning-text)", label: "Unavailable" },
  "age-restricted": { bg: "var(--badge-neutral-bg)", text: "var(--badge-neutral-text)", label: "Age Restricted" },
};

type SortKey = "dateFlagged" | "lessonTitle" | "category" | "reason";

function SortArrow({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: "asc" | "desc" }) {
  return (
    <span className="ml-1" style={{ color: sortKey === col ? "var(--accent)" : "var(--text-faint)", fontSize: "10px" }}>
      {sortKey === col ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
    </span>
  );
}

function truncateUrl(url: string, max = 40): string {
  if (url.length <= max) return url;
  return url.slice(0, max) + "…";
}

export default function ReviewDashboard() {
  const [flags, setFlags] = useState<FlaggedLesson[]>(initialFlags);
  const [sortKey, setSortKey] = useState<SortKey>("dateFlagged");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const [replaceUrl, setReplaceUrl] = useState("");
  const [replacedIds, setReplacedIds] = useState<Set<string>>(new Set());
  const [filterReason, setFilterReason] = useState<string>("all");
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sorted = [...flags]
    .filter((f) => filterReason === "all" || f.reason === filterReason)
    .filter((f) => !resolvedIds.has(f.id))
    .sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });

  const handleStartReplace = (id: string, currentUrl: string) => {
    setReplacingId(id);
    setReplaceUrl(currentUrl);
  };

  const handleConfirmReplace = (id: string) => {
    if (!replaceUrl.trim()) return;
    setFlags((prev) => prev.map((f) => (f.id === id ? { ...f, videoUrl: replaceUrl.trim() } : f)));
    setReplacedIds((prev) => new Set([...prev, id]));
    setReplacingId(null);
    setReplaceUrl("");
  };

  const handleMarkResolved = (id: string) => {
    setResolvedIds((prev) => new Set([...prev, id]));
    if (replacingId === id) setReplacingId(null);
  };

  const totalFlagged = flags.filter((f) => !resolvedIds.has(f.id)).length;

  return (
    <div className="h-full flex flex-col" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <div className="px-8 py-5 border-b flex items-center justify-between" style={{ background: "var(--panel)", borderColor: "var(--border)" }}>
        <div>
          <h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>
            Review Queue
          </h2>
          <p className="font-mono text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
            {totalFlagged} lesson{totalFlagged !== 1 ? "s" : ""} flagged for broken or unavailable video
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="font-mono text-xs" style={{ color: "var(--text-3)" }}>
              REASON
            </label>
            <select
              value={filterReason}
              onChange={(e) => setFilterReason(e.target.value)}
              className="font-mono text-xs px-2 py-1.5 outline-none cursor-pointer"
              style={{
                border: "1px solid var(--border)",
                borderRadius: "3px",
                color: "var(--text-2)",
                background: "var(--panel-3)",
              }}
            >
              <option value="all">All reasons</option>
              <option value="deleted">Deleted</option>
              <option value="private">Private</option>
              <option value="unavailable">Unavailable</option>
              <option value="age-restricted">Age Restricted</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 scrollable px-8 py-6">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <div className="font-mono text-xs tracking-widest mb-2" style={{ color: "var(--text-faint)" }}>
              NO FLAGGED LESSONS
            </div>
            <div className="text-sm" style={{ color: "var(--text-3)" }}>
              {filterReason !== "all" ? "No lessons match this filter." : "All lessons have valid video links."}
            </div>
          </div>
        ) : (
          <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "4px", overflow: "hidden" }}>
            {/* Table header */}
            <div
              className="grid font-mono text-xs px-4 py-2.5 border-b"
              style={{
                gridTemplateColumns: "2fr 1.2fr 1fr 0.9fr 0.9fr 0.8fr",
                borderColor: "var(--border)",
                background: "var(--panel-2)",
                color: "var(--text-3)",
                letterSpacing: "0.05em",
              }}
            >
              <button className="text-left transition-colors" style={{ color: "inherit" }} onClick={() => handleSort("lessonTitle")}>
                LESSON <SortArrow col="lessonTitle" sortKey={sortKey} sortDir={sortDir} />
              </button>
              <span>COURSE / CATEGORY</span>
              <span>VIDEO URL</span>
              <button className="text-left transition-colors" style={{ color: "inherit" }} onClick={() => handleSort("reason")}>
                REASON <SortArrow col="reason" sortKey={sortKey} sortDir={sortDir} />
              </button>
              <button className="text-left transition-colors" style={{ color: "inherit" }} onClick={() => handleSort("dateFlagged")}>
                FLAGGED <SortArrow col="dateFlagged" sortKey={sortKey} sortDir={sortDir} />
              </button>
              <span className="text-right">ACTIONS</span>
            </div>

            {/* Rows */}
            {sorted.map((f, i) => {
              const isReplacing = replacingId === f.id;
              const wasReplaced = replacedIds.has(f.id);
              const reason = REASON_VARS[f.reason];

              return (
                <div key={f.id} style={{ borderBottom: i < sorted.length - 1 ? "1px solid var(--border-faint)" : "none" }}>
                  {/* Main row */}
                  <div
                    className="grid items-center px-4 py-3 transition-colors"
                    style={{
                      gridTemplateColumns: "2fr 1.2fr 1fr 0.9fr 0.9fr 0.8fr",
                      background: isReplacing ? "var(--accent-soft)" : "transparent",
                    }}
                    onMouseEnter={(e) => {
                      if (!isReplacing) e.currentTarget.style.background = "var(--hover)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isReplacing) e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <div>
                      <div className="text-sm font-medium" style={{ color: "var(--text)" }}>
                        {f.lessonTitle}
                      </div>
                      {wasReplaced && (
                        <div className="font-mono text-xs mt-0.5" style={{ color: "var(--ok)" }}>
                          ✓ URL replaced
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="text-sm" style={{ color: "var(--text-2)" }}>
                        {f.course}
                      </div>
                      <div className="font-mono text-xs" style={{ color: "var(--text-3)" }}>
                        {f.category}
                      </div>
                    </div>

                    <div>
                      <a
                        href={f.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs transition-colors"
                        style={{ color: "var(--text-2)", textDecoration: "none", fontSize: "11px" }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = "var(--accent)";
                          e.currentTarget.style.textDecoration = "underline";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = "var(--text-2)";
                          e.currentTarget.style.textDecoration = "none";
                        }}
                        title={f.videoUrl}
                      >
                        {truncateUrl(f.videoUrl, 28)}
                      </a>
                    </div>

                    <div>
                      <span className="font-mono px-1.5 py-0.5 rounded-sm" style={{ fontSize: "10px", background: reason.bg, color: reason.text }}>
                        {reason.label}
                      </span>
                    </div>

                    <div>
                      <div className="font-mono text-xs" style={{ color: "var(--text-2)" }}>
                        {f.dateFlagged}
                      </div>
                      <div className="font-mono text-xs" style={{ color: "var(--text-3)", fontSize: "10px" }}>
                        {f.flaggedBy}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 justify-end">
                      <button
                        onClick={() => (isReplacing ? setReplacingId(null) : handleStartReplace(f.id, f.videoUrl))}
                        className="font-mono text-xs px-2.5 py-1.5 transition-all"
                        style={{
                          background: isReplacing ? "var(--panel-3)" : "var(--btn-strong)",
                          color: isReplacing ? "var(--text-2)" : "var(--btn-strong-fg)",
                          borderRadius: "2px",
                          border: isReplacing ? "1px solid var(--border)" : "1px solid transparent",
                        }}
                        onMouseEnter={(e) => {
                          if (!isReplacing) {
                            e.currentTarget.style.background = "var(--btn-strong-hover)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = isReplacing ? "var(--panel-3)" : "var(--btn-strong)";
                        }}
                      >
                        {isReplacing ? "Cancel" : "Replace"}
                      </button>
                      <button
                        onClick={() => handleMarkResolved(f.id)}
                        className="font-mono text-xs px-2 py-1.5 transition-all"
                        style={{ color: "var(--text-3)", border: "1px solid var(--border)", borderRadius: "2px" }}
                        title="Mark as resolved — removes from queue"
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = "var(--ok)";
                          e.currentTarget.style.borderColor = "var(--ok)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = "var(--text-3)";
                          e.currentTarget.style.borderColor = "var(--border)";
                        }}
                      >
                        ✓
                      </button>
                    </div>
                  </div>

                  {/* Inline replace panel */}
                  {isReplacing && (
                    <div className="px-4 py-3 border-t" style={{ background: "var(--accent-soft)", borderColor: "var(--accent-soft-border)" }}>
                      <div className="font-mono text-xs mb-2" style={{ color: "var(--accent-soft-text)" }}>
                        REPLACE VIDEO URL — {f.lessonTitle}
                      </div>
                      <div className="flex gap-2">
                        <input
                          autoFocus
                          value={replaceUrl}
                          onChange={(e) => setReplaceUrl(e.target.value)}
                          placeholder="https://www.youtube.com/watch?v=..."
                          className="flex-1 px-3 py-2 text-sm font-mono outline-none transition-colors"
                          style={{
                            border: "1px solid var(--accent-soft-border)",
                            borderRadius: "3px",
                            color: "var(--text)",
                            background: "var(--panel)",
                          }}
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = "var(--accent)";
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = "var(--accent-soft-border)";
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleConfirmReplace(f.id);
                            if (e.key === "Escape") setReplacingId(null);
                          }}
                        />
                        <button
                          onClick={() => handleConfirmReplace(f.id)}
                          disabled={!replaceUrl.trim()}
                          className="font-mono text-xs px-4 py-2 transition-all shrink-0"
                          style={{
                            background: replaceUrl.trim() ? "var(--accent)" : "var(--border)",
                            color: replaceUrl.trim() ? "#000" : "var(--text-3)",
                            borderRadius: "3px",
                            cursor: replaceUrl.trim() ? "pointer" : "default",
                          }}
                          onMouseEnter={(e) => {
                            if (replaceUrl.trim()) e.currentTarget.style.background = "var(--accent-hover)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = replaceUrl.trim() ? "var(--accent)" : "var(--border)";
                          }}
                        >
                          CONFIRM REPLACE
                        </button>
                      </div>
                      <p className="font-mono text-xs mt-1.5" style={{ color: "var(--accent-note)" }}>
                        This updates the lesson&apos;s video URL. You will still need to review and approve the new video in the Lesson
                        Editor.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
