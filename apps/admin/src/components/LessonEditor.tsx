"use client";

import { useState, useEffect, useCallback } from "react";
import { api, type LessonApiSummary, type LessonApiDetail, type VideoApi, type TaxonomyApiNode } from "@/lib/api";

const STATUS_VARS: Record<string, { bg: string; text: string; label: string }> = {
  approved: { bg: "var(--badge-success-bg)", text: "var(--badge-success-text)", label: "Approved" },
  pending: { bg: "var(--badge-warning-bg)", text: "var(--badge-warning-text)", label: "Pending Review" },
  flagged: { bg: "var(--badge-danger-bg)", text: "var(--badge-danger-text)", label: "Flagged" },
  unavailable: { bg: "var(--badge-danger-bg)", text: "var(--badge-danger-text)", label: "Unavailable" },
};

function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
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
              onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.background = "var(--panel)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--panel-2)"; }}
            />
            <button
              onClick={() => remove(idx)}
              className="mt-1.5 w-7 h-7 flex items-center justify-center shrink-0 transition-colors"
              style={{ color: "var(--text-faint)", borderRadius: "3px" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--danger)"; e.currentTarget.style.background = "var(--danger-soft)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-faint)"; e.currentTarget.style.background = "transparent"; }}
            >
              ×
            </button>
          </div>
        ))}
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
            placeholder={placeholder}
            className="flex-1 px-3 py-2 text-sm outline-none"
            style={{ border: "1px dashed var(--text-faint)", borderRadius: "3px", color: "var(--text)", background: "var(--panel-2)" }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.background = "var(--panel)"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "var(--text-faint)"; e.currentTarget.style.background = "var(--panel-2)"; }}
          />
          <button
            onClick={add}
            className="font-mono text-xs px-3 py-2 transition-colors shrink-0"
            style={{ background: "var(--panel-3)", color: "var(--text-2)", borderRadius: "3px", border: "1px solid var(--border)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--accent)"; e.currentTarget.style.color = "#000"; e.currentTarget.style.borderColor = "var(--accent)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "var(--panel-3)"; e.currentTarget.style.color = "var(--text-2)"; e.currentTarget.style.borderColor = "var(--border)"; }}
          >
            + Add
          </button>
        </div>
      </div>
    </div>
  );
}

function VideoPanel({
  videos,
  lessonId,
  onRefresh,
}: {
  videos: VideoApi[];
  lessonId: string;
  onRefresh: () => void;
}) {
  const [newUrl, setNewUrl] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newChannel, setNewChannel] = useState("");
  const [adding, setAdding] = useState(false);
  const [autoFinding, setAutoFinding] = useState(false);

  const handleAdd = async () => {
    const videoId = extractYouTubeId(newUrl);
    if (!videoId || !newTitle.trim()) return;
    try {
      setAdding(true);
      await api.videos.add(lessonId, {
        youtubeVideoId: videoId,
        title: newTitle.trim(),
        channel: newChannel.trim() || undefined,
        isPrimary: videos.length === 0,
        curatorStatus: "pending",
      });
      setNewUrl("");
      setNewTitle("");
      setNewChannel("");
      onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add video");
    } finally {
      setAdding(false);
    }
  };

  const handleAutoFind = async () => {
    try {
      setAutoFinding(true);
      await api.videos.autoFind(lessonId);
      onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to auto-find video");
    } finally {
      setAutoFinding(false);
    }
  };

  const handleDelete = async (videoId: string) => {
    if (!confirm("Remove this video?")) return;
    try {
      await api.videos.delete(lessonId, videoId);
      onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete video");
    }
  };

  const handleStatusChange = async (videoId: string, status: string) => {
    try {
      await api.videos.update(videoId, { curatorStatus: status });
      onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update video");
    }
  };

  const handlePrimaryToggle = async (videoId: string) => {
    try {
      await api.videos.update(videoId, { isPrimary: true });
      onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update video");
    }
  };

  const inputStyle = {
    border: "1px solid var(--border)",
    borderRadius: "3px",
    color: "var(--text)",
    background: "var(--panel-2)",
  } as React.CSSProperties;

  return (
    <div className="space-y-4">
      <div className="font-mono text-xs tracking-wider" style={{ color: "var(--text-2)" }}>
        VIDEOS ({videos.length})
      </div>

      {videos.map((v) => {
        const status = STATUS_VARS[v.curatorStatus] || STATUS_VARS.pending;
        const isAuto = v.source === "auto";
        const ytId = v.youtubeVideoId;
        return (
          <div key={v.id} className="p-3 space-y-2" style={{ background: "var(--panel-3)", border: isAuto ? "1px solid var(--accent)" : "1px solid var(--border)", borderRadius: "3px" }}>
            {ytId && (
              <div className="relative overflow-hidden rounded-sm" style={{ aspectRatio: "16/9" }}>
                <img src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} alt="" className="w-full h-full object-cover" />
                {v.isPrimary && (
                  <span className="absolute top-1 left-1 font-mono px-1.5 py-0.5 rounded-sm" style={{ fontSize: "9px", background: "var(--accent)", color: "#000" }}>
                    PRIMARY
                  </span>
                )}
                {isAuto && (
                  <span className="absolute top-1 right-1 font-mono px-1.5 py-0.5 rounded-sm" style={{ fontSize: "9px", background: "rgba(0,0,0,0.75)", color: "var(--accent)", border: "1px solid var(--accent)" }}>
                    AUTO
                  </span>
                )}
              </div>
            )}
            <div className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{v.title}</div>
            <div className="font-mono text-xs truncate" style={{ color: "var(--text-3)" }}>{v.channel || "Unknown channel"}</div>
            <div className="flex items-center gap-2">
              <span className="font-mono px-1.5 py-0.5 rounded-sm" style={{ fontSize: "9px", background: status.bg, color: status.text }}>
                {status.label}
              </span>
              {!isAuto && (
                <span className="font-mono px-1.5 py-0.5 rounded-sm" style={{ fontSize: "9px", background: "var(--panel)", color: "var(--text-3)", border: "1px solid var(--border)" }}>
                  CURATED
                </span>
              )}
              <select
                value={v.curatorStatus}
                onChange={(e) => handleStatusChange(v.id, e.target.value)}
                className="font-mono text-xs px-1.5 py-0.5 rounded-sm outline-none cursor-pointer"
                style={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text)", fontSize: "10px" }}
              >
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="flagged">Flagged</option>
                <option value="unavailable">Unavailable</option>
              </select>
              {!v.isPrimary && (
                <button
                  onClick={() => handlePrimaryToggle(v.id)}
                  className="font-mono text-xs px-1.5 py-0.5 rounded-sm transition-colors"
                  style={{ border: "1px solid var(--border)", color: "var(--text-3)", fontSize: "10px" }}
                >
                  Set Primary
                </button>
              )}
              <button
                onClick={() => handleDelete(v.id)}
                className="font-mono text-xs ml-auto transition-colors"
                style={{ color: "var(--text-faint)" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "var(--danger)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-faint)"; }}
              >
                Remove
              </button>
            </div>
          </div>
        );
      })}

      <div className="pt-3 border-t space-y-2" style={{ borderColor: "var(--border)" }}>
        <div className="font-mono text-xs tracking-wider" style={{ color: "var(--text-3)" }}>ADD VIDEO</div>
        <button
          onClick={handleAutoFind}
          disabled={autoFinding}
          className="w-full font-mono text-xs px-3 py-2 transition-colors disabled:opacity-40"
          style={{ background: "var(--panel-3)", color: "var(--text-2)", border: "1px dashed var(--text-faint)", borderRadius: "3px" }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--text-faint)"; e.currentTarget.style.color = "var(--text-2)"; }}
        >
          {autoFinding ? "Searching YouTube..." : "⚡ Auto-find video (YouTube search)"}
        </button>
        <input
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          placeholder="YouTube URL..."
          className="w-full px-3 py-2 text-sm font-mono outline-none transition-colors"
          style={inputStyle}
          onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.background = "var(--panel)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--panel-2)"; }}
        />
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Video title..."
          className="w-full px-3 py-2 text-sm outline-none transition-colors"
          style={inputStyle}
          onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.background = "var(--panel)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--panel-2)"; }}
        />
        <input
          value={newChannel}
          onChange={(e) => setNewChannel(e.target.value)}
          placeholder="Channel name (optional)..."
          className="w-full px-3 py-2 text-sm outline-none transition-colors"
          style={inputStyle}
          onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.background = "var(--panel)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--panel-2)"; }}
        />
        <button
          onClick={handleAdd}
          disabled={!newUrl || !newTitle.trim() || adding}
          className="w-full font-mono text-xs px-3 py-2 transition-colors disabled:opacity-40"
          style={{ background: "var(--accent)", color: "#000", borderRadius: "3px" }}
        >
          {adding ? "Adding..." : "+ Add Video"}
        </button>
      </div>
    </div>
  );
}

export default function LessonEditor() {
  const [lessons, setLessons] = useState<LessonApiSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<LessonApiDetail | null>(null);
  const [courses, setCourses] = useState<TaxonomyApiNode[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);
  const [newLesson, setNewLesson] = useState({ title: "", nodeId: "", description: "" });

  const fetchLessons = useCallback(
    (nodeId?: string) =>
      Promise.resolve()
        .then(() => {
          setLoading(true);
          return api.lessons.list(nodeId);
        })
        .then((data) => {
          setLessons(data);
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : "Failed to load lessons");
        })
        .finally(() => {
          setLoading(false);
        }),
    []
  );

  const fetchCourses = useCallback(
    () =>
      api.taxonomy
        .list()
        .then((data) => {
          const courseNodes: TaxonomyApiNode[] = [];
          const extractCourses = (nodes: TaxonomyApiNode[]) => {
            for (const n of nodes) {
              if (n.nodeType === "course") courseNodes.push(n);
              if (n.children) extractCourses(n.children);
            }
          };
          extractCourses(data);
          setCourses(courseNodes);
        })
        .catch((err) => {
          console.error("Failed to load courses", err);
        }),
    []
  );

  useEffect(() => {
    fetchLessons();
    fetchCourses();
  }, [fetchLessons, fetchCourses]);

  const fetchDetail = useCallback(
    (id: string) =>
      api.lessons
        .get(id)
        .then((data) => {
          setDetail(data);
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : "Failed to load lesson");
        }),
    []
  );

  useEffect(() => {
    if (selectedId) fetchDetail(selectedId);
  }, [selectedId, fetchDetail]);

  const filtered = lessons.filter(
    (l) => l.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async () => {
    if (!detail) return;
    try {
      await api.lessons.update(detail.id, {
        nodeId: detail.nodeId,
        title: detail.title,
        slug: detail.slug,
        description: detail.description || undefined,
        explanation: detail.explanation || undefined,
        objectives: detail.objectives,
        examples: detail.examples,
        exercises: detail.exercises,
        quizzes: detail.quizzes,
        level: detail.level || undefined,
        status: detail.status,
        sortOrder: detail.sortOrder,
      });
      setDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      fetchLessons();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    }
  };

  const handleCreate = async () => {
    if (!newLesson.title.trim() || !newLesson.nodeId) return;
    try {
      const result = await api.lessons.create({
        nodeId: newLesson.nodeId,
        title: newLesson.title.trim(),
        slug: slugify(newLesson.title.trim()),
        description: newLesson.description || undefined,
      });
      setShowNewForm(false);
      setNewLesson({ title: "", nodeId: "", description: "" });
      fetchLessons();
      setSelectedId(result.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create lesson");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this lesson? This cannot be undone.")) return;
    try {
      await api.lessons.delete(id);
      if (selectedId === id) {
        setSelectedId(null);
        setDetail(null);
      }
      fetchLessons();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const updateDetail = (patch: Partial<LessonApiDetail>) => {
    if (!detail) return;
    setDetail({ ...detail, ...patch });
    setDirty(true);
    setSaved(false);
  };

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
          <div className="flex items-center justify-between mb-2">
            <div className="font-mono text-xs tracking-wider" style={{ color: "var(--text-2)" }}>
              LESSONS
            </div>
            <button
              onClick={() => setShowNewForm(true)}
              className="font-mono text-xs px-2 py-1 transition-colors"
              style={{ color: "var(--text-2)", border: "1px solid var(--border)", borderRadius: "2px" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--accent)"; e.currentTarget.style.color = "#000"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-2)"; }}
            >
              + New
            </button>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full px-2.5 py-1.5 text-sm outline-none"
            style={{ border: "1px solid var(--border)", borderRadius: "3px", color: "var(--text)", background: "var(--panel-3)" }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
          />
        </div>
        <div className="flex-1 scrollable">
          {loading ? (
            <div className="px-4 py-6 font-mono text-xs text-center" style={{ color: "var(--text-3)" }}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-6 font-mono text-xs text-center" style={{ color: "var(--text-3)" }}>No lessons found</div>
          ) : (
            filtered.map((l) => (
              <div key={l.id} className="flex items-center group">
                <button
                  onClick={() => { setSelectedId(l.id); setDirty(false); setSaved(false); }}
                  className="flex-1 text-left px-4 py-3 border-b transition-colors"
                  style={{
                    borderColor: "var(--border-faint)",
                    background: selectedId === l.id ? "var(--accent-soft)" : "transparent",
                    borderLeft: selectedId === l.id ? "2px solid var(--accent)" : "2px solid transparent",
                  }}
                  onMouseEnter={(e) => { if (selectedId !== l.id) e.currentTarget.style.background = "var(--hover)"; }}
                  onMouseLeave={(e) => { if (selectedId !== l.id) e.currentTarget.style.background = "transparent"; }}
                >
                  <div className="text-sm font-medium leading-tight mb-1" style={{ color: "var(--text)" }}>{l.title}</div>
                  <div className="font-mono text-xs truncate" style={{ color: l.status === "draft" ? "var(--badge-warning-text)" : "var(--text-3)" }}>
                    {l.status}
                  </div>
                </button>
                <button
                  onClick={() => handleDelete(l.id)}
                  className="w-7 h-7 flex items-center justify-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: "var(--text-faint)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "var(--danger)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-faint)"; }}
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex min-w-0" style={{ background: "var(--bg)" }}>
        {detail ? (
          <>
            <div className="flex-1 scrollable px-8 py-6 min-w-0">
              <div className="flex items-start justify-between mb-6 gap-4">
                <div>
                  <div className="font-mono text-xs tracking-wider mb-1" style={{ color: "var(--text-3)" }}>
                    {courses.find((c) => c.id === detail.nodeId)?.name || "Lesson"}
                  </div>
                  <h2 className="text-xl font-semibold" style={{ color: "var(--text)" }}>{detail.title}</h2>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {saved && <span className="font-mono text-xs" style={{ color: "var(--ok)" }}>Saved</span>}
                  <select
                    value={detail.status}
                    onChange={(e) => updateDetail({ status: e.target.value })}
                    className="font-mono text-xs px-2 py-1.5 outline-none cursor-pointer"
                    style={{ ...inputStyle, appearance: "auto" }}
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
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
                  >
                    SAVE LESSON
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block font-mono text-xs tracking-wider mb-1.5" style={{ color: "var(--text-2)" }}>TITLE</label>
                  <input
                    value={detail.title}
                    onChange={(e) => updateDetail({ title: e.target.value })}
                    className="w-full px-3 py-2 text-sm font-medium outline-none transition-colors"
                    style={inputStyle}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.background = "var(--panel)"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--panel-2)"; }}
                  />
                </div>

                <div>
                  <label className="block font-mono text-xs tracking-wider mb-1.5" style={{ color: "var(--text-2)" }}>DESCRIPTION</label>
                  <textarea
                    value={detail.description || ""}
                    onChange={(e) => updateDetail({ description: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 text-sm outline-none transition-colors resize-none"
                    style={inputStyle}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.background = "var(--panel)"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--panel-2)"; }}
                  />
                </div>

                <div>
                  <label className="block font-mono text-xs tracking-wider mb-1.5" style={{ color: "var(--text-2)" }}>EXPLANATION</label>
                  <textarea
                    value={detail.explanation || ""}
                    onChange={(e) => updateDetail({ explanation: e.target.value })}
                    rows={6}
                    className="w-full px-3 py-2 text-sm outline-none transition-colors resize-y leading-relaxed"
                    style={inputStyle}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.background = "var(--panel)"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--panel-2)"; }}
                  />
                </div>

                <ListEditor label="LEARNING OBJECTIVES" items={detail.objectives} onChange={(v) => updateDetail({ objectives: v })} placeholder="Add objective..." />
                <ListEditor label="EXAMPLES" items={detail.examples} onChange={(v) => updateDetail({ examples: v })} placeholder="Add example..." />
                <ListEditor label="EXERCISES" items={detail.exercises} onChange={(v) => updateDetail({ exercises: v })} placeholder="Add exercise..." />

                <div>
                  <label className="block font-mono text-xs tracking-wider mb-2" style={{ color: "var(--text-2)" }}>
                    QUIZ QUESTIONS ({detail.quizzes.length})
                  </label>
                  {detail.quizzes.length === 0 ? (
                    <div className="py-4 text-center font-mono text-xs" style={{ border: "1px dashed var(--text-faint)", borderRadius: "3px", color: "var(--text-3)" }}>
                      No quiz questions yet
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {detail.quizzes.map((q, qi) => (
                        <div key={qi} className="p-4" style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "3px" }}>
                          <div className="flex items-start gap-2 mb-3">
                            <span className="font-mono text-xs mt-0.5 shrink-0" style={{ color: "var(--text-3)" }}>Q{qi + 1}</span>
                            <input
                              value={q.question}
                              onChange={(e) => {
                                const qq = detail.quizzes.map((x, i) => (i === qi ? { ...x, question: e.target.value } : x));
                                updateDetail({ quizzes: qq });
                              }}
                              className="flex-1 px-2 py-1.5 text-sm outline-none"
                              style={{ border: "1px solid var(--border)", borderRadius: "2px", color: "var(--text)", background: "var(--panel-2)" }}
                            />
                            <button
                              onClick={() => updateDetail({ quizzes: detail.quizzes.filter((_, i) => i !== qi) })}
                              className="w-6 h-6 flex items-center justify-center shrink-0 text-sm"
                              style={{ color: "var(--text-faint)" }}
                            >
                              ×
                            </button>
                          </div>
                          {q.options.map((opt, oi) => (
                            <div key={oi} className="flex items-center gap-2 mb-1.5">
                              <button
                                className="w-4 h-4 rounded-full shrink-0 border-2 transition-colors"
                                style={{
                                  borderColor: q.answerIndex === oi ? "var(--ok)" : "var(--text-faint)",
                                  background: q.answerIndex === oi ? "var(--ok)" : "transparent",
                                }}
                                onClick={() => {
                                  const qq = detail.quizzes.map((x, i) => (i === qi ? { ...x, answerIndex: oi } : x));
                                  updateDetail({ quizzes: qq });
                                }}
                              />
                              <input
                                value={opt}
                                onChange={(e) => {
                                  const qq = detail.quizzes.map((x, i) =>
                                    i === qi ? { ...x, options: x.options.map((o, j) => (j === oi ? e.target.value : o)) } : x
                                  );
                                  updateDetail({ quizzes: qq });
                                }}
                                className="flex-1 px-2 py-1 text-sm outline-none"
                                style={{ border: "1px solid var(--border-faint)", borderRadius: "2px", color: "var(--text)", background: "var(--panel-2)", fontSize: "13px" }}
                              />
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => updateDetail({ quizzes: [...detail.quizzes, { question: "", options: ["", "", "", ""], answerIndex: 0 }] })}
                    className="mt-2 w-full font-mono text-xs py-2 transition-colors"
                    style={{ border: "1px dashed var(--text-faint)", borderRadius: "3px", color: "var(--text-3)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--text-faint)"; e.currentTarget.style.color = "var(--text-3)"; }}
                  >
                    + Add quiz question
                  </button>
                </div>
              </div>
            </div>

            <div className="w-80 shrink-0 scrollable border-l px-5 py-6" style={{ background: "var(--panel)", borderColor: "var(--border)" }}>
              <VideoPanel videos={detail.videos} lessonId={detail.id} onRefresh={() => fetchDetail(detail.id)} />
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center" style={{ color: "var(--text-3)" }}>
            <div className="font-mono text-xs tracking-widest mb-2">NO LESSON SELECTED</div>
            <div className="text-sm">Select a lesson from the list or create a new one</div>
          </div>
        )}
      </div>

      {/* New Lesson Modal */}
      {showNewForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)" }}>
          <div className="w-full max-w-lg rounded-sm border p-6 space-y-4" style={{ background: "var(--panel)", borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between">
              <h3 className="font-mono text-sm font-semibold" style={{ color: "var(--text)" }}>New Lesson</h3>
              <button onClick={() => setShowNewForm(false)} className="text-xs" style={{ color: "var(--text-faint)" }}>✕</button>
            </div>

            <div>
              <label className="block font-mono text-xs mb-1.5 tracking-wider" style={{ color: "var(--text-2)" }}>COURSE</label>
              <select
                value={newLesson.nodeId}
                onChange={(e) => setNewLesson((prev) => ({ ...prev, nodeId: e.target.value }))}
                className="w-full px-3 py-2 text-xs font-mono rounded-sm border outline-none"
                style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
              >
                <option value="">Select a course...</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <input
              type="text"
              placeholder="Lesson title"
              value={newLesson.title}
              onChange={(e) => setNewLesson((prev) => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 text-xs font-mono rounded-sm border outline-none"
              style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
            />

            <textarea
              placeholder="Description (optional)"
              value={newLesson.description}
              onChange={(e) => setNewLesson((prev) => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 text-xs font-mono rounded-sm border outline-none resize-none"
              style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
            />

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowNewForm(false)}
                className="px-4 py-2 text-xs font-mono rounded-sm transition-colors"
                style={{ color: "var(--text-faint)", border: "1px solid var(--border)" }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newLesson.title.trim() || !newLesson.nodeId}
                className="px-4 py-2 text-xs font-mono rounded-sm transition-colors disabled:opacity-40"
                style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
              >
                Create Lesson
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
