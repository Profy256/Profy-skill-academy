"use client";

import { useState, useEffect, useCallback } from "react";
import {
  api,
  type TaxonomyApiNode,
  type ImportYouTubeResponse,
  type ImportUrlResponse,
  type ImportFileResponse,
} from "@/lib/api";

interface QuickLessonProps {
  onDone: () => void;
}

type Mode = "youtube" | "url" | "file";
type Status = "idle" | "loading" | "success" | "error";
type ImportResult = ImportYouTubeResponse | ImportUrlResponse | ImportFileResponse;

export default function QuickLesson({ onDone }: QuickLessonProps) {
  const [mode, setMode] = useState<Mode>("youtube");
  const [courses, setCourses] = useState<TaxonomyApiNode[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  // YouTube state
  const [youtubeUrl, setYoutubeUrl] = useState("");

  // URL import state
  const [importUrl, setImportUrl] = useState("");

  // File import state
  const [file, setFile] = useState<File | null>(null);
  const [lessonCount, setLessonCount] = useState(3);

  const fetchCourses = useCallback(
    () =>
      Promise.resolve()
        .then(() => {
          setLoading(true);
          return api.taxonomy.list();
        })
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
        })
        .finally(() => {
          setLoading(false);
        }),
    []
  );

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleYouTubeImport = async () => {
    if (!youtubeUrl.trim() || !selectedCourseId) return;

    setStatus("loading");
    setError(null);

    try {
      const res = await api.import.youtube(youtubeUrl.trim(), selectedCourseId);
      setResult(res);
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import YouTube video");
      setStatus("error");
    }
  };

  const handleUrlImport = async () => {
    if (!importUrl.trim() || !selectedCourseId) return;

    setStatus("loading");
    setError(null);

    try {
      const res = await api.import.fromUrl(importUrl.trim(), selectedCourseId);
      setResult(res);
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import from URL");
      setStatus("error");
    }
  };

  const handleFileImport = async () => {
    if (!file || !selectedCourseId) return;

    setStatus("loading");
    setError(null);

    try {
      const res = await api.import.fromFile(file, selectedCourseId, lessonCount);
      setResult(res);
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import from file");
      setStatus("error");
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      setMode("file");
    }
  };

  const resultTitle = result && "title" in result ? result.title : undefined;
  const resultMessage = result && "message" in result ? result.message : undefined;
  const resultLessons = result && "lessons" in result ? result.lessons : undefined;

  const inputStyle = {
    border: "1px solid var(--border)",
    borderRadius: "3px",
    color: "var(--text)",
    background: "var(--panel-2)",
  } as React.CSSProperties;

  return (
    <div
      className="h-full flex items-center justify-center p-6"
      style={{ background: "var(--bg)" }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="w-full max-w-2xl">
        <div className="mb-6">
          <div className="font-mono text-xs tracking-wider mb-1" style={{ color: "var(--text-3)" }}>
            QUICK LESSON
          </div>
          <h2 className="text-xl font-semibold" style={{ color: "var(--text)" }}>
            Add Content Fast
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--text-3)" }}>
            Import from YouTube, any website, or upload a file
          </p>
        </div>

        {/* Mode selector */}
        <div className="flex gap-2 mb-6">
          {[
            { id: "youtube", label: "YouTube", icon: "▶" },
            { id: "url", label: "Website URL", icon: "🌐" },
            { id: "file", label: "Upload File", icon: "📄" },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => { setMode(m.id as Mode); setStatus("idle"); setError(null); setResult(null); }}
              className="flex-1 py-3 font-mono text-xs transition-colors"
              style={{
                background: mode === m.id ? "var(--accent)" : "var(--panel)",
                color: mode === m.id ? "#000" : "var(--text-2)",
                border: `1px solid ${mode === m.id ? "var(--accent)" : "var(--border)"}`,
                borderRadius: "3px",
              }}
            >
              <span className="text-base mr-1">{m.icon}</span> {m.label}
            </button>
          ))}
        </div>

        {/* Course selector */}
        <div className="mb-4">
          <label className="block font-mono text-xs tracking-wider mb-2" style={{ color: "var(--text-2)" }}>
            SELECT COURSE *
          </label>
          {loading ? (
            <div className="font-mono text-xs py-2" style={{ color: "var(--text-3)" }}>Loading courses...</div>
          ) : (
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="w-full px-3 py-2.5 text-sm outline-none"
              style={{ ...inputStyle, appearance: "auto" }}
            >
              <option value="">Select a course...</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
          {courses.length === 0 && !loading && (
            <p className="font-mono text-xs mt-2" style={{ color: "var(--text-3)" }}>
              No courses found. Create a course structure first.
            </p>
          )}
        </div>

        {/* Content panel */}
        <div className="p-5 mb-4" style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "4px" }}>
          {status === "success" ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 mx-auto mb-3 flex items-center justify-center rounded-full" style={{ background: "var(--ok-soft)", fontSize: "24px" }}>
                ✓
              </div>
              <div className="font-mono text-sm font-semibold mb-1" style={{ color: "var(--text)" }}>
                {mode === "file" ? `${resultLessons?.length || 0} lessons created!` : "Lesson created!"}
              </div>
              <div className="text-sm mb-4" style={{ color: "var(--text-2)" }}>
                {resultTitle || resultMessage}
              </div>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={onDone}
                  className="font-mono text-xs px-4 py-2 transition-colors"
                  style={{ background: "var(--accent)", color: "#000", borderRadius: "3px" }}
                >
                  View in Lesson Editor
                </button>
                <button
                  onClick={() => { setStatus("idle"); setResult(null); setYoutubeUrl(""); setImportUrl(""); setFile(null); }}
                  className="font-mono text-xs px-4 py-2 transition-colors"
                  style={{ border: "1px solid var(--border)", borderRadius: "3px", color: "var(--text-2)" }}
                >
                  Import Another
                </button>
              </div>
            </div>
          ) : mode === "youtube" ? (
            <div className="space-y-3">
              <div className="font-mono text-xs tracking-wider" style={{ color: "var(--text-3)" }}>
                IMPORT FROM YOUTUBE
              </div>
              <p className="text-sm" style={{ color: "var(--text-3)" }}>
                Paste a YouTube URL and we&apos;ll create a lesson with the video attached.
              </p>
              <input
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-3 py-2.5 text-sm font-mono outline-none transition-colors"
                style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
              />
              {youtubeUrl && !extractYouTubeId(youtubeUrl) && (
                <p className="font-mono text-xs" style={{ color: "var(--danger)" }}>
                  Invalid YouTube URL
                </p>
              )}
              <button
                onClick={handleYouTubeImport}
                disabled={!youtubeUrl.trim() || !selectedCourseId || status === "loading" || !extractYouTubeId(youtubeUrl)}
                className="w-full font-mono text-xs py-3 transition-colors disabled:opacity-40"
                style={{ background: "var(--accent)", color: "#000", borderRadius: "3px" }}
              >
                {status === "loading" ? "Importing..." : "Import YouTube Video"}
              </button>
            </div>
          ) : mode === "url" ? (
            <div className="space-y-3">
              <div className="font-mono text-xs tracking-wider" style={{ color: "var(--text-3)" }}>
                IMPORT FROM WEBSITE
              </div>
              <p className="text-sm" style={{ color: "var(--text-3)" }}>
                Paste any URL (article, tutorial, documentation) and AI will generate a lesson from it.
              </p>
              <input
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="https://example.com/tutorial/..."
                className="w-full px-3 py-2.5 text-sm outline-none transition-colors"
                style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
              />
              <button
                onClick={handleUrlImport}
                disabled={!importUrl.trim() || !selectedCourseId || status === "loading"}
                className="w-full font-mono text-xs py-3 transition-colors disabled:opacity-40"
                style={{ background: "var(--accent)", color: "#000", borderRadius: "3px" }}
              >
                {status === "loading" ? "AI is generating lesson..." : "Generate Lesson from URL"}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="font-mono text-xs tracking-wider" style={{ color: "var(--text-3)" }}>
                UPLOAD FILE
              </div>
              <p className="text-sm" style={{ color: "var(--text-3)" }}>
                Upload a text file, markdown, or book. AI will generate multiple lessons from it.
              </p>

              {!file ? (
                <div
                  className="p-8 text-center"
                  style={{ border: "2px dashed var(--text-faint)", borderRadius: "4px" }}
                >
                  <div className="text-3xl mb-2">📄</div>
                  <div className="text-sm mb-1" style={{ color: "var(--text-2)" }}>
                    Drag & drop a file here
                  </div>
                  <div className="font-mono text-xs" style={{ color: "var(--text-3)" }}>
                    or click to browse
                  </div>
                  <input
                    type="file"
                    accept=".txt,.md,.pdf,.doc,.docx"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    style={{ position: "relative" }}
                  />
                </div>
              ) : (
                <div className="p-3 flex items-center gap-3" style={{ background: "var(--panel-3)", border: "1px solid var(--border)", borderRadius: "3px" }}>
                  <div className="text-2xl">📄</div>
                  <div className="flex-1">
                    <div className="text-sm font-medium" style={{ color: "var(--text)" }}>{file.name}</div>
                    <div className="font-mono text-xs" style={{ color: "var(--text-3)" }}>
                      {(file.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                  <button
                    onClick={() => setFile(null)}
                    className="text-xs transition-colors"
                    style={{ color: "var(--text-faint)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "var(--danger)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-faint)"; }}
                  >
                    Remove
                  </button>
                </div>
              )}

              <div>
                <label className="block font-mono text-xs tracking-wider mb-2" style={{ color: "var(--text-2)" }}>
                  NUMBER OF LESSONS TO GENERATE
                </label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={lessonCount}
                  onChange={(e) => setLessonCount(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="font-mono text-xs text-center" style={{ color: "var(--text-3)" }}>
                  {lessonCount} lessons
                </div>
              </div>

              <button
                onClick={handleFileImport}
                disabled={!file || !selectedCourseId || status === "loading"}
                className="w-full font-mono text-xs py-3 transition-colors disabled:opacity-40"
                style={{ background: "var(--accent)", color: "#000", borderRadius: "3px" }}
              >
                {status === "loading" ? "AI is generating lessons..." : "Generate Lessons from File"}
              </button>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 font-mono text-xs" style={{ background: "var(--danger-soft)", color: "var(--danger)", borderRadius: "3px" }}>
              {error}
            </div>
          )}
        </div>

        <button
          onClick={onDone}
          className="w-full font-mono text-xs py-2 transition-colors"
          style={{ color: "var(--text-3)" }}
        >
          ← Back to Dashboard
        </button>
      </div>
    </div>
  );
}

function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}
