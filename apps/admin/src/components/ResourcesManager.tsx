"use client";

import { useState } from "react";

export interface Resource {
  id: string;
  title: string;
  description: string;
  fileName: string;
  fileSize: string;
  category: string;
  addedBy: string;
  dateAdded: string;
  allowDownload: boolean;
  pageFlipEnabled: boolean;
}

const categories = ["Web Development", "Data Science", "Software Engineering", "Business", "Languages"];

const mockResources: Resource[] = [
  {
    id: "r-1",
    title: "HTML & CSS Cheat Sheet",
    description: "Quick reference for common HTML elements and CSS properties with examples.",
    fileName: "html-css-cheatsheet.pdf",
    fileSize: "1.2 MB",
    category: "Web Development",
    addedBy: "sarah@profy.io",
    dateAdded: "2026-09-10",
    allowDownload: true,
    pageFlipEnabled: true,
  },
  {
    id: "r-2",
    title: "JavaScript Promises Guide",
    description: "Comprehensive guide to understanding and using Promises in JavaScript.",
    fileName: "js-promises-guide.pdf",
    fileSize: "890 KB",
    category: "Web Development",
    addedBy: "sarah@profy.io",
    dateAdded: "2026-09-08",
    allowDownload: false,
    pageFlipEnabled: true,
  },
  {
    id: "r-3",
    title: "Python Data Science Handbook",
    description: "Full reference for NumPy, Pandas, Matplotlib, and Scikit-Learn.",
    fileName: "python-ds-handbook.pdf",
    fileSize: "4.7 MB",
    category: "Data Science",
    addedBy: "marcus@profy.io",
    dateAdded: "2026-09-05",
    allowDownload: true,
    pageFlipEnabled: true,
  },
  {
    id: "r-4",
    title: "System Design Interview Prep",
    description: "Common system design patterns and interview questions with solutions.",
    fileName: "system-design-prep.pdf",
    fileSize: "2.1 MB",
    category: "Software Engineering",
    addedBy: "sarah@profy.io",
    dateAdded: "2026-09-03",
    allowDownload: false,
    pageFlipEnabled: true,
  },
  {
    id: "r-5",
    title: "Git Workflow Poster",
    description: "Visual poster showing common Git branching and merging workflows.",
    fileName: "git-workflow-poster.pdf",
    fileSize: "560 KB",
    category: "Software Engineering",
    addedBy: "marcus@profy.io",
    dateAdded: "2026-09-01",
    allowDownload: true,
    pageFlipEnabled: false,
  },
];

export default function ResourcesManager() {
  const [resources, setResources] = useState<Resource[]>(mockResources);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [previewResource, setPreviewResource] = useState<Resource | null>(null);
  const [newResource, setNewResource] = useState({
    title: "",
    description: "",
    category: "Web Development",
    allowDownload: false,
    pageFlipEnabled: true,
  });
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const filtered = resources.filter((r) => {
    const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase()) || r.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === "all" || r.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleDownload = (id: string) => {
    setResources((prev) => prev.map((r) => (r.id === id ? { ...r, allowDownload: !r.allowDownload } : r)));
  };

  const togglePageFlip = (id: string) => {
    setResources((prev) => prev.map((r) => (r.id === id ? { ...r, pageFlipEnabled: !r.pageFlipEnabled } : r)));
  };

  const deleteResource = (id: string) => {
    setResources((prev) => prev.filter((r) => r.id !== id));
  };

  const handleAdd = () => {
    if (!newResource.title || !uploadedFile) return;
    const resource: Resource = {
      id: `r-${Date.now()}`,
      title: newResource.title,
      description: newResource.description,
      fileName: uploadedFile.name,
      fileSize: `${(uploadedFile.size / 1024 / 1024).toFixed(1)} MB`,
      category: newResource.category,
      addedBy: "sarah@profy.io",
      dateAdded: new Date().toISOString().split("T")[0],
      allowDownload: newResource.allowDownload,
      pageFlipEnabled: newResource.pageFlipEnabled,
    };
    setResources((prev) => [resource, ...prev]);
    setNewResource({ title: "", description: "", category: "Web Development", allowDownload: false, pageFlipEnabled: true });
    setUploadedFile(null);
    setShowAddForm(false);
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
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3 py-1.5 text-xs font-mono rounded-sm border outline-none"
          style={{ background: "var(--panel)", borderColor: "var(--border)", color: "var(--text)" }}
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
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
        {filtered.map((r) => (
          <div
            key={r.id}
            className="rounded-sm border p-4 transition-colors"
            style={{ background: "var(--panel)", borderColor: "var(--border)" }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
          >
            <div className="flex items-start gap-3">
              {/* PDF icon */}
              <div className="w-10 h-10 rounded-sm flex items-center justify-center shrink-0" style={{ background: "var(--accent-bg)" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <polyline points="14,2 14,8 20,8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10,9 9,9 8,9" />
                </svg>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold truncate" style={{ color: "var(--text)" }}>
                    {r.title}
                  </span>
                  <span className="font-mono text-xs px-1.5 py-0.5 rounded-sm" style={{ background: "var(--accent-bg)", color: "var(--accent)", fontSize: "10px" }}>
                    {r.category}
                  </span>
                </div>
                <p className="text-xs mt-1 line-clamp-2" style={{ color: "var(--text-faint)" }}>
                  {r.description}
                </p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="font-mono text-xs" style={{ color: "var(--text-faint)", fontSize: "10px" }}>
                    {r.fileName} · {r.fileSize}
                  </span>
                  <span className="font-mono text-xs" style={{ color: "var(--text-faint)", fontSize: "10px" }}>
                    Added {r.dateAdded} by {r.addedBy}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Preview */}
                <button
                  onClick={() => setPreviewResource(r)}
                  className="px-2 py-1 text-xs font-mono rounded-sm transition-colors"
                  style={{ border: "1px solid var(--border)", color: "var(--text-faint)" }}
                >
                  Preview
                </button>

                {/* Download toggle */}
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs" style={{ color: r.allowDownload ? "#22c55e" : "#ef4444", fontSize: "10px" }}>
                    {r.allowDownload ? "DOWNLOAD ON" : "DOWNLOAD OFF"}
                  </span>
                  <button
                    onClick={() => toggleDownload(r.id)}
                    className="w-8 h-4 rounded-full relative transition-colors"
                    style={{ background: r.allowDownload ? "#22c55e" : "#3f3833" }}
                  >
                    <div
                      className="w-3 h-3 rounded-full absolute top-0.5 transition-all"
                      style={{ background: "#fff", left: r.allowDownload ? "16px" : "2px" }}
                    />
                  </button>
                </div>

                {/* Page flip toggle */}
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs" style={{ color: "var(--text-faint)", fontSize: "10px" }}>
                    FLIP
                  </span>
                  <button
                    onClick={() => togglePageFlip(r.id)}
                    className="w-8 h-4 rounded-full relative transition-colors"
                    style={{ background: r.pageFlipEnabled ? "var(--accent)" : "#3f3833" }}
                  >
                    <div
                      className="w-3 h-3 rounded-full absolute top-0.5 transition-all"
                      style={{ background: "#fff", left: r.pageFlipEnabled ? "16px" : "2px" }}
                    />
                  </button>
                </div>

                {/* Delete */}
                <button
                  onClick={() => deleteResource(r.id)}
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
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <div className="font-mono text-sm" style={{ color: "var(--text-faint)" }}>No resources found</div>
          </div>
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

            {/* File upload */}
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
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setUploadedFile(file);
                }}
              />
              {uploadedFile ? (
                <div>
                  <div className="font-mono text-xs" style={{ color: "var(--accent)" }}>{uploadedFile.name}</div>
                  <div className="font-mono text-xs mt-1" style={{ color: "var(--text-faint)", fontSize: "10px" }}>
                    {(uploadedFile.size / 1024 / 1024).toFixed(1)} MB
                  </div>
                </div>
              ) : (
                <div>
                  <div className="font-mono text-xs" style={{ color: "var(--text-faint)" }}>Drop PDF here or click to browse</div>
                </div>
              )}
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

            <select
              value={newResource.category}
              onChange={(e) => setNewResource((prev) => ({ ...prev, category: e.target.value }))}
              className="w-full px-3 py-2 text-xs font-mono rounded-sm border outline-none"
              style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* Toggles */}
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
                disabled={!newResource.title || !uploadedFile}
                className="px-4 py-2 text-xs font-mono rounded-sm transition-colors disabled:opacity-40"
                style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
              >
                Add Resource
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="w-full max-w-3xl h-[80vh] rounded-sm border flex flex-col overflow-hidden" style={{ background: "var(--panel)", borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "var(--border)" }}>
              <div>
                <div className="font-mono text-sm font-semibold" style={{ color: "var(--text)" }}>{previewResource.title}</div>
                <div className="font-mono text-xs" style={{ color: "var(--text-faint)", fontSize: "10px" }}>
                  {previewResource.fileName} · {previewResource.fileSize}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreviewResource(null)}
                  className="px-3 py-1.5 text-xs font-mono rounded-sm"
                  style={{ color: "var(--text-faint)", border: "1px solid var(--border)" }}
                >
                  Close
                </button>
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center p-8" style={{ background: "var(--bg)" }}>
              <div className="text-center space-y-3">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="1">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <polyline points="14,2 14,8 20,8" />
                </svg>
                <div className="font-mono text-xs" style={{ color: "var(--text-faint)" }}>
                  PDF preview — {previewResource.pageFlipEnabled ? "Page flip viewer" : "Standard viewer"}
                </div>
                <div className="font-mono text-xs" style={{ color: "var(--text-faint)", fontSize: "10px" }}>
                  In production, this renders the PDF using react-pageflip or react-pdf.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
