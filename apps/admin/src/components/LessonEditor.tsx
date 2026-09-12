"use client";

import { useState } from "react";
import { lessons as initialLessons, type Lesson, type VideoAttachment, type CandidateVideo } from "@/lib/mockData";

const STATUS_VARS: Record<string, { bg: string; text: string; label: string }> = {
  approved: { bg: "var(--badge-success-bg)", text: "var(--badge-success-text)", label: "Approved" },
  pending: { bg: "var(--badge-warning-bg)", text: "var(--badge-warning-text)", label: "Pending Review" },
  "needs-replacement": { bg: "var(--badge-danger-bg)", text: "var(--badge-danger-text)", label: "Needs Replacement" },
};

function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

function ListEditor({
  label,
  items,
  onChange,
  placeholder,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState("");

  const add = () => {
    if (!draft.trim()) return;
    onChange([...items, draft.trim()]);
    setDraft("");
  };

  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));

  const update = (idx: number, value: string) => onChange(items.map((item, i) => (i === idx ? value : item)));

  const inputStyle = {
    border: "1px solid var(--border)",
    borderRadius: "3px",
    color: "var(--text)",
    background: "var(--panel-2)",
  } as React.CSSProperties;

  return (
    <div>
      <label className="block font-mono text-xs tracking-wider mb-2" style={{ color: "var(--text-2)" }}>
        {label}
      </label>
      <div className="space-y-1.5">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-start gap-2">
            <span className="font-mono text-xs mt-2.5 shrink-0" style={{ color: "var(--text-faint)" }}>
              {idx + 1}.
            </span>
            <input
              value={item}
              onChange={(e) => update(idx, e.target.value)}
              className="flex-1 px-3 py-2 text-sm outline-none transition-colors"
              style={inputStyle}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--accent)";
                e.currentTarget.style.background = "var(--panel)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.background = "var(--panel-2)";
              }}
            />
            <button
              onClick={() => remove(idx)}
              className="mt-1.5 w-7 h-7 flex items-center justify-center shrink-0 transition-colors"
              style={{ color: "var(--text-faint)", borderRadius: "3px" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--danger)";
                e.currentTarget.style.background = "var(--danger-soft)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--text-faint)";
                e.currentTarget.style.background = "transparent";
              }}
            >
              ×
            </button>
          </div>
        ))}
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            placeholder={placeholder}
            className="flex-1 px-3 py-2 text-sm outline-none"
            style={{ border: "1px dashed var(--text-faint)", borderRadius: "3px", color: "var(--text)", background: "var(--panel-2)" }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--accent)";
              e.currentTarget.style.background = "var(--panel)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "var(--text-faint)";
              e.currentTarget.style.background = "var(--panel-2)";
            }}
          />
          <button
            onClick={add}
            className="font-mono text-xs px-3 py-2 transition-colors shrink-0"
            style={{
              background: "var(--panel-3)",
              color: "var(--text-2)",
              borderRadius: "3px",
              border: "1px solid var(--border)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--accent)";
              e.currentTarget.style.color = "#000";
              e.currentTarget.style.borderColor = "var(--accent)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--panel-3)";
              e.currentTarget.style.color = "var(--text-2)";
              e.currentTarget.style.borderColor = "var(--border)";
            }}
          >
            + Add
          </button>
        </div>
      </div>
    </div>
  );
}

function VideoPanel({
  video,
  candidateVideos,
  onVideoChange,
  onCandidatesChange,
}: {
  video: VideoAttachment | null;
  candidateVideos: CandidateVideo[];
  onVideoChange: (v: VideoAttachment | null) => void;
  onCandidatesChange: (v: CandidateVideo[]) => void;
}) {
  const [showCandidates, setShowCandidates] = useState(candidateVideos.length > 0);

  const ytId = video ? extractYouTubeId(video.url) : null;

  const updateVideo = (field: keyof VideoAttachment, value: string) => {
    if (!video) return;
    onVideoChange({ ...video, [field]: value });
  };

  const addCandidate = () => {
    if (candidateVideos.length >= 5) return;
    onCandidatesChange([...candidateVideos, { url: "", notes: "" }]);
    setShowCandidates(true);
  };

  const updateCandidate = (idx: number, field: keyof CandidateVideo, value: string) => {
    onCandidatesChange(candidateVideos.map((c, i) => (i === idx ? { ...c, [field]: value } : c)));
  };

  const removeCandidate = (idx: number) => {
    onCandidatesChange(candidateVideos.filter((_, i) => i !== idx));
  };

  const initVideo = () => {
    onVideoChange({ url: "", title: "", channel: "", reviewStatus: "pending", dateReviewed: "" });
  };

  const inputStyle = {
    border: "1px solid var(--border)",
    borderRadius: "3px",
    color: "var(--text)",
    background: "var(--panel-2)",
  } as React.CSSProperties;

  return (
    <div className="space-y-5">
      {/* Primary video */}
      <div>
        <div className="font-mono text-xs tracking-wider mb-3 flex items-center gap-2" style={{ color: "var(--text-2)" }}>
          <span>PRIMARY VIDEO</span>
          {video && (
            <span
              className="font-mono px-1.5 py-0.5 rounded-sm"
              style={{ fontSize: "9px", background: STATUS_VARS[video.reviewStatus].bg, color: STATUS_VARS[video.reviewStatus].text }}
            >
              {STATUS_VARS[video.reviewStatus].label.toUpperCase()}
            </span>
          )}
        </div>

        {!video ? (
          <div
            className="flex flex-col items-center justify-center py-8 cursor-pointer transition-colors"
            style={{ border: "2px dashed var(--border)", borderRadius: "4px", background: "var(--panel-2)" }}
            onClick={initVideo}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--accent)";
              e.currentTarget.style.background = "var(--accent-soft)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.background = "var(--panel-2)";
            }}
          >
            <div style={{ fontSize: "24px", marginBottom: "8px", color: "var(--text-faint)" }}>▶</div>
            <div className="font-mono text-xs" style={{ color: "var(--text-3)" }}>
              No video attached
            </div>
            <div className="font-mono text-xs mt-1" style={{ color: "var(--text-faint)" }}>
              Click to add a YouTube video
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* YouTube thumbnail preview */}
            {ytId && (
              <div className="relative overflow-hidden" style={{ borderRadius: "3px", aspectRatio: "16/9", background: "var(--panel-3)" }}>
                <img src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} alt="Video thumbnail" className="w-full h-full object-cover" />
                <a
                  href={video.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute inset-0 flex items-center justify-center transition-opacity"
                  style={{ background: "rgba(0,0,0,0)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(0,0,0,0.3)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(0,0,0,0)";
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center opacity-0 transition-opacity"
                    style={{ background: "rgba(255,255,255,0.9)", fontSize: "18px", paddingLeft: "3px" }}
                    id="play-btn"
                  >
                    ▶
                  </div>
                </a>
              </div>
            )}

            <div>
              <label className="block font-mono text-xs mb-1.5 tracking-wider" style={{ color: "var(--text-3)" }}>
                YOUTUBE URL
              </label>
              <input
                value={video.url}
                onChange={(e) => updateVideo("url", e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-3 py-2 text-sm font-mono outline-none transition-colors"
                style={inputStyle}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent)";
                  e.currentTarget.style.background = "var(--panel)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.background = "var(--panel-2)";
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-mono text-xs mb-1.5 tracking-wider" style={{ color: "var(--text-3)" }}>
                  VIDEO TITLE
                </label>
                <input
                  value={video.title}
                  onChange={(e) => updateVideo("title", e.target.value)}
                  placeholder="Video title"
                  className="w-full px-3 py-2 text-sm outline-none transition-colors"
                  style={inputStyle}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--accent)";
                    e.currentTarget.style.background = "var(--panel)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.background = "var(--panel-2)";
                  }}
                />
              </div>
              <div>
                <label className="block font-mono text-xs mb-1.5 tracking-wider" style={{ color: "var(--text-3)" }}>
                  CHANNEL
                </label>
                <input
                  value={video.channel}
                  onChange={(e) => updateVideo("channel", e.target.value)}
                  placeholder="Channel name"
                  className="w-full px-3 py-2 text-sm outline-none transition-colors"
                  style={inputStyle}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--accent)";
                    e.currentTarget.style.background = "var(--panel)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.background = "var(--panel-2)";
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-mono text-xs mb-1.5 tracking-wider" style={{ color: "var(--text-3)" }}>
                  REVIEW STATUS
                </label>
                <select
                  value={video.reviewStatus}
                  onChange={(e) => updateVideo("reviewStatus", e.target.value)}
                  className="w-full px-3 py-2 text-sm outline-none cursor-pointer"
                  style={{ ...inputStyle, appearance: "auto" }}
                >
                  <option value="pending">Pending Review</option>
                  <option value="approved">Approved</option>
                  <option value="needs-replacement">Needs Replacement</option>
                </select>
              </div>
              <div>
                <label className="block font-mono text-xs mb-1.5 tracking-wider" style={{ color: "var(--text-3)" }}>
                  DATE REVIEWED
                </label>
                <input
                  type="date"
                  value={video.dateReviewed}
                  onChange={(e) => updateVideo("dateReviewed", e.target.value)}
                  className="w-full px-3 py-2 text-sm outline-none transition-colors"
                  style={inputStyle}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--accent)";
                    e.currentTarget.style.background = "var(--panel)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.background = "var(--panel-2)";
                  }}
                />
              </div>
            </div>

            <button
              onClick={() => onVideoChange(null)}
              className="font-mono text-xs transition-colors"
              style={{ color: "var(--danger)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.textDecoration = "underline";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.textDecoration = "none";
              }}
            >
              Remove video
            </button>
          </div>
        )}
      </div>

      {/* Candidate videos */}
      <div className="pt-4 border-t" style={{ borderColor: "var(--border)" }}>
        <button
          className="w-full flex items-center justify-between font-mono text-xs tracking-wider transition-colors mb-3"
          style={{ color: "var(--text-3)" }}
          onClick={() => setShowCandidates((v) => !v)}
        >
          <span>CANDIDATE VIDEOS ({candidateVideos.length}/5)</span>
          <span style={{ fontSize: "10px" }}>{showCandidates ? "▲" : "▼"}</span>
        </button>

        {showCandidates && (
          <div className="space-y-3">
            <p className="text-xs" style={{ color: "var(--text-3)" }}>
              Log alternate videos considered but not selected. For curator reference only.
            </p>
            {candidateVideos.map((cv, idx) => (
              <div key={idx} className="p-3 space-y-2" style={{ background: "var(--panel-3)", border: "1px solid var(--border)", borderRadius: "3px" }}>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs" style={{ color: "var(--text-3)" }}>
                    CANDIDATE {idx + 1}
                  </span>
                  <button
                    onClick={() => removeCandidate(idx)}
                    className="font-mono text-xs transition-colors"
                    style={{ color: "var(--text-faint)" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "var(--danger)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "var(--text-faint)";
                    }}
                  >
                    Remove
                  </button>
                </div>
                <input
                  value={cv.url}
                  onChange={(e) => updateCandidate(idx, "url", e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full px-2 py-1.5 text-sm font-mono outline-none"
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: "2px",
                    background: "var(--panel)",
                    color: "var(--text)",
                    fontSize: "11px",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--accent)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                  }}
                />
                <textarea
                  value={cv.notes}
                  onChange={(e) => updateCandidate(idx, "notes", e.target.value)}
                  placeholder="Notes on why this was considered or rejected..."
                  rows={2}
                  className="w-full px-2 py-1.5 text-sm outline-none resize-none"
                  style={{ border: "1px solid var(--border)", borderRadius: "2px", background: "var(--panel)", color: "var(--text)" }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--accent)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                  }}
                />
              </div>
            ))}

            {candidateVideos.length < 5 && (
              <button
                onClick={addCandidate}
                className="w-full font-mono text-xs py-2 transition-colors"
                style={{ border: "1px dashed var(--text-faint)", borderRadius: "3px", color: "var(--text-3)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent)";
                  e.currentTarget.style.color = "var(--accent)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--text-faint)";
                  e.currentTarget.style.color = "var(--text-3)";
                }}
              >
                + Add candidate video
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function LessonEditor() {
  const [lessons, setLessons] = useState<Lesson[]>(initialLessons);
  const [selectedId, setSelectedId] = useState<string>(initialLessons[0].id);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [search, setSearch] = useState("");

  const lesson = lessons.find((l) => l.id === selectedId)!;

  const update = (patch: Partial<Lesson>) => {
    setLessons((prev) => prev.map((l) => (l.id === selectedId ? { ...l, ...patch } : l)));
    setDirty(true);
    setSaved(false);
  };

  const handleSave = () => {
    setDirty(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const filtered = lessons.filter(
    (l) => l.title.toLowerCase().includes(search.toLowerCase()) || l.courseName.toLowerCase().includes(search.toLowerCase())
  );

  const inputStyle = {
    border: "1px solid var(--border)",
    borderRadius: "3px",
    color: "var(--text)",
    background: "var(--panel-2)",
  } as React.CSSProperties;

  return (
    <div className="flex h-full">
      {/* Lesson list */}
      <div className="w-64 shrink-0 flex flex-col border-r" style={{ background: "var(--panel)", borderColor: "var(--border)" }}>
        <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="font-mono text-xs tracking-wider mb-2" style={{ color: "var(--text-2)" }}>
            LESSONS
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full px-2.5 py-1.5 text-sm outline-none"
            style={{ border: "1px solid var(--border)", borderRadius: "3px", color: "var(--text)", background: "var(--panel-3)" }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--accent)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
            }}
          />
        </div>
        <div className="flex-1 scrollable">
          {filtered.map((l) => (
            <button
              key={l.id}
              onClick={() => {
                setSelectedId(l.id);
                setDirty(false);
                setSaved(false);
              }}
              className="w-full text-left px-4 py-3 border-b transition-colors"
              style={{
                borderColor: "var(--border-faint)",
                background: selectedId === l.id ? "var(--accent-soft)" : "transparent",
                borderLeft: selectedId === l.id ? "2px solid var(--accent)" : "2px solid transparent",
              }}
              onMouseEnter={(e) => {
                if (selectedId !== l.id) e.currentTarget.style.background = "var(--hover)";
              }}
              onMouseLeave={(e) => {
                if (selectedId !== l.id) e.currentTarget.style.background = "transparent";
              }}
            >
              <div className="text-sm font-medium leading-tight mb-1" style={{ color: "var(--text)" }}>
                {l.title}
              </div>
              <div className="font-mono text-xs truncate" style={{ color: "var(--text-3)" }}>
                {l.courseName}
              </div>
              {!l.video && (
                <div className="font-mono text-xs mt-1" style={{ color: "var(--accent)", fontSize: "10px" }}>
                  ⚠ No video
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex min-w-0" style={{ background: "var(--bg)" }}>
        {/* Main form */}
        <div className="flex-1 scrollable px-8 py-6 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between mb-6 gap-4">
            <div>
              <div className="font-mono text-xs tracking-wider mb-1" style={{ color: "var(--text-3)" }}>
                {lesson.courseName}
              </div>
              <h2 className="text-xl font-semibold" style={{ color: "var(--text)" }}>
                {lesson.title}
              </h2>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {saved && (
                <span className="font-mono text-xs" style={{ color: "var(--ok)" }}>
                  ✓ Saved
                </span>
              )}
              <button
                onClick={handleSave}
                disabled={!dirty}
                className="font-mono text-xs px-4 py-2 transition-all"
                style={{
                  background: dirty ? "var(--btn-strong)" : "var(--border)",
                  color: dirty ? "var(--btn-strong-fg)" : "var(--text-3)",
                  borderRadius: "3px",
                  cursor: dirty ? "pointer" : "default",
                }}
                onMouseEnter={(e) => {
                  if (dirty) e.currentTarget.style.background = "var(--btn-strong-hover)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = dirty ? "var(--btn-strong)" : "var(--border)";
                }}
              >
                SAVE LESSON
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {/* Title */}
            <div>
              <label className="block font-mono text-xs tracking-wider mb-1.5" style={{ color: "var(--text-2)" }}>
                TITLE
              </label>
              <input
                value={lesson.title}
                onChange={(e) => update({ title: e.target.value })}
                className="w-full px-3 py-2 text-sm font-medium outline-none transition-colors"
                style={inputStyle}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent)";
                  e.currentTarget.style.background = "var(--panel)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.background = "var(--panel-2)";
                }}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block font-mono text-xs tracking-wider mb-1.5" style={{ color: "var(--text-2)" }}>
                DESCRIPTION
              </label>
              <textarea
                value={lesson.description}
                onChange={(e) => update({ description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 text-sm outline-none transition-colors resize-none"
                style={inputStyle}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent)";
                  e.currentTarget.style.background = "var(--panel)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.background = "var(--panel-2)";
                }}
              />
            </div>

            {/* Explanation */}
            <div>
              <label className="block font-mono text-xs tracking-wider mb-1.5" style={{ color: "var(--text-2)" }}>
                WRITTEN EXPLANATION
              </label>
              <textarea
                value={lesson.explanation}
                onChange={(e) => update({ explanation: e.target.value })}
                rows={6}
                className="w-full px-3 py-2 text-sm outline-none transition-colors resize-y leading-relaxed"
                style={inputStyle}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent)";
                  e.currentTarget.style.background = "var(--panel)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.background = "var(--panel-2)";
                }}
              />
            </div>

            {/* Objectives */}
            <ListEditor label="LEARNING OBJECTIVES" items={lesson.objectives} onChange={(v) => update({ objectives: v })} placeholder="Add objective..." />

            {/* Examples */}
            <ListEditor label="EXAMPLES" items={lesson.examples} onChange={(v) => update({ examples: v })} placeholder="Add example..." />

            {/* Exercises */}
            <ListEditor label="EXERCISES" items={lesson.exercises} onChange={(v) => update({ exercises: v })} placeholder="Add exercise..." />

            {/* Quiz questions */}
            <div>
              <label className="block font-mono text-xs tracking-wider mb-2" style={{ color: "var(--text-2)" }}>
                QUIZ QUESTIONS ({lesson.quizQuestions.length})
              </label>
              {lesson.quizQuestions.length === 0 ? (
                <div className="py-4 text-center font-mono text-xs" style={{ border: "1px dashed var(--text-faint)", borderRadius: "3px", color: "var(--text-3)" }}>
                  No quiz questions yet — add one below
                </div>
              ) : (
                <div className="space-y-3">
                  {lesson.quizQuestions.map((q, qi) => (
                    <div key={qi} className="p-4" style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "3px" }}>
                      <div className="flex items-start gap-2 mb-3">
                        <span className="font-mono text-xs mt-0.5 shrink-0" style={{ color: "var(--text-3)" }}>
                          Q{qi + 1}
                        </span>
                        <input
                          value={q.question}
                          onChange={(e) => {
                            const qq = lesson.quizQuestions.map((x, i) => (i === qi ? { ...x, question: e.target.value } : x));
                            update({ quizQuestions: qq });
                          }}
                          className="flex-1 px-2 py-1.5 text-sm outline-none"
                          style={{ border: "1px solid var(--border)", borderRadius: "2px", color: "var(--text)", background: "var(--panel-2)" }}
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = "var(--accent)";
                            e.currentTarget.style.background = "var(--panel)";
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = "var(--border)";
                            e.currentTarget.style.background = "var(--panel-2)";
                          }}
                        />
                        <button
                          onClick={() => {
                            update({ quizQuestions: lesson.quizQuestions.filter((_, i) => i !== qi) });
                          }}
                          className="w-6 h-6 flex items-center justify-center shrink-0 text-sm transition-colors"
                          style={{ color: "var(--text-faint)" }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = "var(--danger)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = "var(--text-faint)";
                          }}
                        >
                          ×
                        </button>
                      </div>
                      {q.options.map((opt, oi) => (
                        <div key={oi} className="flex items-center gap-2 mb-1.5">
                          <button
                            className="w-4 h-4 rounded-full shrink-0 border-2 transition-colors"
                            style={{
                              borderColor: q.correctIndex === oi ? "var(--ok)" : "var(--text-faint)",
                              background: q.correctIndex === oi ? "var(--ok)" : "transparent",
                            }}
                            onClick={() => {
                              const qq = lesson.quizQuestions.map((x, i) => (i === qi ? { ...x, correctIndex: oi } : x));
                              update({ quizQuestions: qq });
                            }}
                            title="Set as correct answer"
                          />
                          <input
                            value={opt}
                            onChange={(e) => {
                              const qq = lesson.quizQuestions.map((x, i) =>
                                i === qi ? { ...x, options: x.options.map((o, j) => (j === oi ? e.target.value : o)) } : x
                              );
                              update({ quizQuestions: qq });
                            }}
                            className="flex-1 px-2 py-1 text-sm outline-none"
                            style={{
                              border: "1px solid var(--border-faint)",
                              borderRadius: "2px",
                              color: "var(--text)",
                              background: "var(--panel-2)",
                              fontSize: "13px",
                            }}
                            onFocus={(e) => {
                              e.currentTarget.style.borderColor = "var(--accent)";
                              e.currentTarget.style.background = "var(--panel)";
                            }}
                            onBlur={(e) => {
                              e.currentTarget.style.borderColor = "var(--border-faint)";
                              e.currentTarget.style.background = "var(--panel-2)";
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={() => {
                  update({
                    quizQuestions: [
                      ...lesson.quizQuestions,
                      {
                        question: "",
                        options: ["", "", "", ""],
                        correctIndex: 0,
                      },
                    ],
                  });
                }}
                className="mt-2 w-full font-mono text-xs py-2 transition-colors"
                style={{ border: "1px dashed var(--text-faint)", borderRadius: "3px", color: "var(--text-3)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent)";
                  e.currentTarget.style.color = "var(--accent)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--text-faint)";
                  e.currentTarget.style.color = "var(--text-3)";
                }}
              >
                + Add quiz question
              </button>
            </div>
          </div>
        </div>

        {/* Video panel */}
        <div className="w-80 shrink-0 scrollable border-l px-5 py-6" style={{ background: "var(--panel)", borderColor: "var(--border)" }}>
          <VideoPanel
            video={lesson.video}
            candidateVideos={lesson.candidateVideos}
            onVideoChange={(v) => update({ video: v })}
            onCandidatesChange={(v) => update({ candidateVideos: v })}
          />
        </div>
      </div>
    </div>
  );
}
