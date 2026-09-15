"use client";

import { useState, useEffect, useCallback } from "react";
import { api, type ResourceApi, type TaxonomyApiNode } from "@/lib/api";

export default function ResourcesManager() {
  const [resources, setResources] = useState<ResourceApi[]>([]);
  const [courses, setCourses] = useState<TaxonomyApiNode[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCourse, setFilterCourse] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newResource, setNewResource] = useState({
    title: "",
    description: "",
    nodeId: "",
    allowDownload: false,
    pageFlipEnabled: true,
  });
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [adding, setAdding] = useState(false);

  const fetchResources = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.resources.list();
      setResources(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load resources");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCourses = useCallback(async () => {
    try {
      const data = await api.taxonomy.list();
      const courseNodes: TaxonomyApiNode[] = [];
      const extractCourses = (nodes: TaxonomyApiNode[]) => {
        for (const n of nodes) {
          if (n.nodeType === "course") courseNodes.push(n);
          if (n.children) extractCourses(n.children);
        }
      };
      extractCourses(data);
      setCourses(courseNodes);
    } catch (err) {
      console.error("Failed to load courses", err);
    }
  }, []);

  useEffect(() => {
    fetchResources();
    fetchCourses();
  }, [fetchResources, fetchCourses]);

  const filtered = resources.filter((r) => {
    const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase()) || (r.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCourse = filterCourse === "all" || r.nodeId === filterCourse;
    return matchesSearch && matchesCourse;
  });

  const getCourseName = (nodeId: string) => courses.find((c) => c.id === nodeId)?.name || "Unknown";

  const handleAdd = async () => {
    if (!newResource.title || !newResource.nodeId || !uploadedFile) return;
    try {
      setAdding(true);
      await api.resources.create({
        nodeId: newResource.nodeId,
        title: newResource.title,
        description: newResource.description || undefined,
        fileName: uploadedFile.name,
        fileSize: `${(uploadedFile.size / 1024 / 1024).toFixed(1)} MB`,
        allowDownload: newResource.allowDownload,
        pageFlipEnabled: newResource.pageFlipEnabled,
      });
      setNewResource({ title: "", description: "", nodeId: "", allowDownload: false, pageFlipEnabled: true });
      setUploadedFile(null);
      setShowAddForm(false);
      fetchResources();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add resource");
    } finally {
      setAdding(false);
    }
  };

  const handleToggleDownload = async (id: string, current: boolean) => {
    try {
      await api.resources.update(id, { allowDownload: !current });
      setResources((prev) => prev.map((r) => (r.id === id ? { ...r, allowDownload: !current } : r)));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update");
    }
  };

  const handleTogglePageFlip = async (id: string, current: boolean) => {
    try {
      await api.resources.update(id, { pageFlipEnabled: !current });
      setResources((prev) => prev.map((r) => (r.id === id ? { ...r, pageFlipEnabled: !current } : r)));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this resource?")) return;
    try {
      await api.resources.delete(id);
      setResources((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: "var(--bg)" }}>
      {/* Toolbar */}
      <div className="shrink-0 px-5 py-3 flex items-center gap-3 border-b" style={{ borderColor: "var(--border)" }}>
        <input
          type="text"
          placeholder="Search resources..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-3 py-1.5 text-xs font-mono rounded-sm border outline-none flex-1 max-w-xs"
          style={{ background: "var(--panel)", borderColor: "var(--border)", color: "var(--text)" }}
        />
        <select
          value={filterCourse}
          onChange={(e) => setFilterCourse(e.target.value)}
          className="px-3 py-1.5 text-xs font-mono rounded-sm border outline-none"
          style={{ background: "var(--panel)", borderColor: "var(--border)", color: "var(--text)" }}
        >
          <option value="all">All courses</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <div className="ml-auto flex items-center gap-2">
          <span className="font-mono text-xs" style={{ color: "var(--text-faint)" }}>{filtered.length} resources</span>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-3 py-1.5 text-xs font-mono rounded-sm transition-colors"
            style={{ background: "#f59e0b", color: "#000" }}
          >
            + Add Resource
          </button>
        </div>
      </div>

      {/* Resource list */}
      <div className="flex-1 overflow-y-auto p-5 space-y-2">
        {loading ? (
          <div className="text-center py-12 font-mono text-xs" style={{ color: "var(--text-faint)" }}>Loading resources...</div>
        ) : error ? (
          <div className="text-center py-12 font-mono text-xs" style={{ color: "var(--danger)" }}>{error}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <div className="font-mono text-sm" style={{ color: "var(--text-faint)" }}>No resources found</div>
          </div>
        ) : (
          filtered.map((r) => (
            <div
              key={r.id}
              className="rounded-sm border p-4 transition-colors"
              style={{ background: "var(--panel)", borderColor: "var(--border)" }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-sm flex items-center justify-center shrink-0" style={{ background: "var(--accent-bg)" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <polyline points="14,2 14,8 20,8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold truncate" style={{ color: "var(--text)" }}>{r.title}</span>
                    <span className="font-mono text-xs px-1.5 py-0.5 rounded-sm" style={{ background: "var(--accent-bg)", color: "var(--accent)", fontSize: "10px" }}>
                      {getCourseName(r.nodeId)}
                    </span>
                  </div>
                  <p className="text-xs mt-1 line-clamp-2" style={{ color: "var(--text-faint)" }}>{r.description}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="font-mono text-xs" style={{ color: "var(--text-faint)", fontSize: "10px" }}>
                      {r.fileName} {r.fileSize ? `· ${r.fileSize}` : ""}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs" style={{ color: r.allowDownload ? "#22c55e" : "#ef4444", fontSize: "10px" }}>
                      {r.allowDownload ? "DL ON" : "DL OFF"}
                    </span>
                    <button
                      onClick={() => handleToggleDownload(r.id, r.allowDownload)}
                      className="w-8 h-4 rounded-full relative transition-colors"
                      style={{ background: r.allowDownload ? "#22c55e" : "#3f3833" }}
                    >
                      <div className="w-3 h-3 rounded-full absolute top-0.5 transition-all" style={{ background: "#fff", left: r.allowDownload ? "16px" : "2px" }} />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs" style={{ color: "var(--text-faint)", fontSize: "10px" }}>FLIP</span>
                    <button
                      onClick={() => handleTogglePageFlip(r.id, r.pageFlipEnabled)}
                      className="w-8 h-4 rounded-full relative transition-colors"
                      style={{ background: r.pageFlipEnabled ? "var(--accent)" : "#3f3833" }}
                    >
                      <div className="w-3 h-3 rounded-full absolute top-0.5 transition-all" style={{ background: "#fff", left: r.pageFlipEnabled ? "16px" : "2px" }} />
                    </button>
                  </div>

                  <button
                    onClick={() => handleDelete(r.id)}
                    className="w-6 h-6 flex items-center justify-center rounded-sm transition-colors"
                    style={{ color: "var(--text-faint)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-faint)")}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3,6 5,6 21,6" />
                      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Resource Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)" }}>
          <div className="w-full max-w-lg rounded-sm border p-6 space-y-4" style={{ background: "var(--panel)", borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between">
              <h3 className="font-mono text-sm font-semibold" style={{ color: "var(--text)" }}>Add Resource</h3>
              <button onClick={() => setShowAddForm(false)} className="text-xs" style={{ color: "var(--text-faint)" }}>✕</button>
            </div>

            <div
              className="border-2 border-dashed rounded-sm p-6 text-center cursor-pointer transition-colors"
              style={{ borderColor: uploadedFile ? "var(--accent)" : "var(--border)" }}
              onClick={() => document.getElementById("file-upload")?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file?.type === "application/pdf") setUploadedFile(file);
              }}
            >
              <input
                id="file-upload"
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => { const file = e.target.files?.[0]; if (file) setUploadedFile(file); }}
              />
              {uploadedFile ? (
                <div>
                  <div className="font-mono text-xs" style={{ color: "var(--accent)" }}>{uploadedFile.name}</div>
                  <div className="font-mono text-xs mt-1" style={{ color: "var(--text-faint)", fontSize: "10px" }}>
                    {(uploadedFile.size / 1024 / 1024).toFixed(1)} MB
                  </div>
                </div>
              ) : (
                <div className="font-mono text-xs" style={{ color: "var(--text-faint)" }}>Drop PDF here or click to browse</div>
              )}
            </div>

            <div>
              <label className="block font-mono text-xs mb-1.5 tracking-wider" style={{ color: "var(--text-2)" }}>COURSE</label>
              <select
                value={newResource.nodeId}
                onChange={(e) => setNewResource((prev) => ({ ...prev, nodeId: e.target.value }))}
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
              placeholder="Resource title"
              value={newResource.title}
              onChange={(e) => setNewResource((prev) => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 text-xs font-mono rounded-sm border outline-none"
              style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
            />

            <textarea
              placeholder="Description"
              value={newResource.description}
              onChange={(e) => setNewResource((prev) => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 text-xs font-mono rounded-sm border outline-none resize-none"
              style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
            />

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs" style={{ color: "var(--text-faint)" }}>Allow download</span>
                <button
                  onClick={() => setNewResource((prev) => ({ ...prev, allowDownload: !prev.allowDownload }))}
                  className="w-8 h-4 rounded-full relative transition-colors"
                  style={{ background: newResource.allowDownload ? "#22c55e" : "#3f3833" }}
                >
                  <div className="w-3 h-3 rounded-full absolute top-0.5 transition-all" style={{ background: "#fff", left: newResource.allowDownload ? "16px" : "2px" }} />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs" style={{ color: "var(--text-faint)" }}>Page flip viewer</span>
                <button
                  onClick={() => setNewResource((prev) => ({ ...prev, pageFlipEnabled: !prev.pageFlipEnabled }))}
                  className="w-8 h-4 rounded-full relative transition-colors"
                  style={{ background: newResource.pageFlipEnabled ? "var(--accent)" : "#3f3833" }}
                >
                  <div className="w-3 h-3 rounded-full absolute top-0.5 transition-all" style={{ background: "#fff", left: newResource.pageFlipEnabled ? "16px" : "2px" }} />
                </button>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-xs font-mono rounded-sm transition-colors"
                style={{ color: "var(--text-faint)", border: "1px solid var(--border)" }}
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={!newResource.title || !newResource.nodeId || !uploadedFile || adding}
                className="px-4 py-2 text-xs font-mono rounded-sm transition-colors disabled:opacity-40"
                style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
              >
                {adding ? "Adding..." : "Add Resource"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
