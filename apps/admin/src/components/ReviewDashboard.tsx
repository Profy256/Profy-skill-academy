"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type ReviewQueueItem } from "@/lib/api";

type QueueFilter = "all" | "auto-pending" | "flagged-unavailable";

/** Status badge styling for queue rows. */
const STATUS_VARS: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "var(--badge-warning-bg)", text: "var(--badge-warning-text)", label: "Pending" },
  approved: { bg: "var(--badge-success-bg)", text: "var(--badge-success-text)", label: "Approved" },
  flagged: { bg: "var(--badge-danger-bg)", text: "var(--badge-danger-text)", label: "Flagged" },
  unavailable: { bg: "var(--badge-danger-bg)", text: "var(--badge-danger-text)", label: "Unavailable" },
};

/** Reason label shown for broken videos (the check that flagged them). */
const REASON_VARS: Record<string, { bg: string; text: string; label: string }> = {
  flagged: { bg: "var(--badge-danger-bg)", text: "var(--badge-danger-text)", label: "Flagged" },
  unavailable: { bg: "var(--badge-warning-bg)", text: "var(--badge-warning-text)", label: "Unavailable" },
};

export default function ReviewDashboard() {
  const [items, setItems] = useState<ReviewQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<QueueFilter>("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchQueue = useCallback(async () => {
    try {
      setError(null);
      const data = await api.lessons.reviewQueue();
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load review queue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const handleApprove = async (item: ReviewQueueItem) => {
    try {
      setBusyId(item.id);
      await api.videos.update(item.id, { curatorStatus: "approved" });
      // Approving a pending auto video resolves it; it leaves the queue.
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to approve video");
    } finally {
      setBusyId(null);
    }
  };

  const handleFlag = async (item: ReviewQueueItem) => {
    try {
      setBusyId(item.id);
      await api.videos.update(item.id, { curatorStatus: "flagged" });
      // Flagged entries stay in the queue (bad status), just re-badged.
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, curatorStatus: "flagged" } : i)));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to flag video");
    } finally {
      setBusyId(null);
    }
  };

  const handleRemove = async (item: ReviewQueueItem) => {
    try {
      setBusyId(item.id);
      // Removing the only video of a lesson re-exposes it to auto-curation on next read.
      await api.videos.delete(item.lessonId, item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to remove video");
    } finally {
      setBusyId(null);
    }
  };

  const filtered = items.filter((i) => {
    if (filter === "auto-pending") return i.source === "auto" && i.curatorStatus === "pending";
    if (filter === "flagged-unavailable") return i.curatorStatus === "flagged" || i.curatorStatus === "unavailable";
    return true;
  });

  const autoPendingCount = items.filter((i) => i.source === "auto" && i.curatorStatus === "pending").length;
  const brokenCount = items.filter((i) => i.curatorStatus === "flagged" || i.curatorStatus === "unavailable").length;

  return (
    <div className="h-full flex flex-col" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <div className="px-8 py-5 border-b flex items-center justify-between" style={{ background: "var(--panel)", borderColor: "var(--border)" }}>
        <div>
          <h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>
            Review Queue
          </h2>
          <p className="font-mono text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
            {autoPendingCount} auto-sourced video{autoPendingCount !== 1 ? "s" : ""} awaiting review ·{" "}
            {brokenCount} flagged/unavailable
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="font-mono text-xs" style={{ color: "var(--text-3)" }}>
              SHOW
            </label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as QueueFilter)}
              className="font-mono text-xs px-2 py-1.5 outline-none cursor-pointer"
              style={{
                border: "1px solid var(--border)",
                borderRadius: "3px",
                color: "var(--text-2)",
                background: "var(--panel-3)",
              }}
            >
              <option value="all">All</option>
              <option value="auto-pending">Auto videos pending</option>
              <option value="flagged-unavailable">Flagged / unavailable</option>
            </select>
          </div>
          <button
            onClick={fetchQueue}
            className="font-mono text-xs px-3 py-1.5 transition-colors"
            style={{ border: "1px solid var(--border)", borderRadius: "3px", color: "var(--text-2)" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-2)"; }}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 scrollable px-8 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64">
            <div className="font-mono text-xs tracking-widest" style={{ color: "var(--text-faint)" }}>
              LOADING...
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64 gap-2">
            <div className="font-mono text-xs tracking-widest" style={{ color: "var(--badge-danger-text)" }}>
              FAILED TO LOAD
            </div>
            <div className="text-sm" style={{ color: "var(--text-3)" }}>{error}</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <div className="font-mono text-xs tracking-widest mb-2" style={{ color: "var(--text-faint)" }}>
              NOTHING TO REVIEW
            </div>
            <div className="text-sm" style={{ color: "var(--text-3)" }}>
              {filter !== "all" ? "No entries match this filter." : "All videos are approved and healthy."}
            </div>
          </div>
        ) : (
          <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "4px", overflow: "hidden" }}>
            {/* Table header */}
            <div
              className="grid font-mono text-xs px-4 py-2.5 border-b"
              style={{
                gridTemplateColumns: "2fr 1.2fr 1fr 0.9fr 1.3fr",
                borderColor: "var(--border)",
                background: "var(--panel-2)",
                color: "var(--text-3)",
                letterSpacing: "0.05em",
              }}
            >
              <span>VIDEO / LESSON</span>
              <span>LESSON ID</span>
              <span>THUMBNAIL</span>
              <span>STATUS</span>
              <span className="text-right">ACTIONS</span>
            </div>

            {/* Rows */}
            {filtered.map((item, i) => {
              const isAuto = item.source === "auto";
              const isBroken = item.curatorStatus === "flagged" || item.curatorStatus === "unavailable";
              const status = STATUS_VARS[item.curatorStatus] || STATUS_VARS.pending;
              const busy = busyId === item.id;

              return (
                <div
                  key={item.id}
                  className="grid items-center px-4 py-3 transition-colors"
                  style={{
                    gridTemplateColumns: "2fr 1.2fr 1fr 0.9fr 1.3fr",
                    borderBottom: i < filtered.length - 1 ? "1px solid var(--border-faint)" : "none",
                    background: isAuto && !isBroken ? "var(--accent-soft)" : "transparent",
                  }}
                  onMouseEnter={(e) => { if (!busy) e.currentTarget.style.background = "var(--hover)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = isAuto && !isBroken ? "var(--accent-soft)" : "transparent"; }}
                >
                  {/* Video / lesson */}
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center gap-1.5">
                      {isAuto && (
                        <span
                          className="font-mono px-1.5 py-0.5 rounded-sm shrink-0"
                          style={{ fontSize: "9px", background: "var(--accent)", color: "#000" }}
                          title="Auto-sourced from YouTube search — review and approve or replace"
                        >
                          AUTO
                        </span>
                      )}
                      <div className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>
                        {item.title}
                      </div>
                    </div>
                    <div className="font-mono text-xs truncate" style={{ color: "var(--text-3)" }}>
                      {item.lessonTitle || item.lessonId}
                    </div>
                  </div>

                  {/* Lesson id */}
                  <div className="font-mono text-xs truncate pr-3" style={{ color: "var(--text-3)", fontSize: "10px" }} title={item.lessonId}>
                    {item.lessonId.slice(0, 8)}…
                  </div>

                  {/* Thumbnail */}
                  <div>
                    <a href={`https://www.youtube.com/watch?v=${item.youtubeVideoId}`} target="_blank" rel="noopener noreferrer">
                      <img
                        src={`https://img.youtube.com/vi/${item.youtubeVideoId}/default.jpg`}
                        alt=""
                        className="w-20 h-11 object-cover rounded-sm"
                        style={{ border: "1px solid var(--border)" }}
                      />
                    </a>
                  </div>

                  {/* Status */}
                  <div className="flex flex-col items-start gap-1">
                    <span className="font-mono px-1.5 py-0.5 rounded-sm" style={{ fontSize: "10px", background: status.bg, color: status.text }}>
                      {status.label}
                    </span>
                    {isBroken && (
                      <span className="font-mono px-1.5 py-0.5 rounded-sm" style={{ fontSize: "9px", background: REASON_VARS[item.curatorStatus]?.bg, color: REASON_VARS[item.curatorStatus]?.text }}>
                        {REASON_VARS[item.curatorStatus]?.label || item.curatorStatus}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 justify-end">
                    <button
                      onClick={() => handleApprove(item)}
                      disabled={busy}
                      className="font-mono text-xs px-2.5 py-1.5 transition-all disabled:opacity-40"
                      style={{
                        background: "var(--btn-strong)",
                        color: "var(--btn-strong-fg)",
                        borderRadius: "2px",
                      }}
                      title={isAuto ? "Approve this auto-sourced video" : "Approve video"}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleFlag(item)}
                      disabled={busy}
                      className="font-mono text-xs px-2 py-1.5 transition-all disabled:opacity-40"
                      style={{ color: "var(--text-3)", border: "1px solid var(--border)", borderRadius: "2px" }}
                      title="Flag for replacement — stops serving to learners"
                    >
                      Flag
                    </button>
                    <button
                      onClick={() => handleRemove(item)}
                      disabled={busy}
                      className="font-mono text-xs px-2 py-1.5 transition-all disabled:opacity-40"
                      style={{ color: "var(--text-3)", border: "1px solid var(--border)", borderRadius: "2px" }}
                      title="Remove video — lesson becomes auto-curation-eligible again"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
