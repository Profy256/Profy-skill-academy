"use client";

import { useState, useEffect } from "react";
import Login from "@/components/Login";
import Sidebar from "@/components/Sidebar";
import TaxonomyManager from "@/components/TaxonomyManager";
import LessonEditor from "@/components/LessonEditor";
import ResourcesManager from "@/components/ResourcesManager";
import ReviewDashboard from "@/components/ReviewDashboard";
import ThemeToggle from "@/components/ThemeToggle";
import { getToken } from "@/lib/api";

type View = "taxonomy" | "lesson-editor" | "resources" | "review";

export default function App() {
  const [authed, setAuthed] = useState(false);
  const [view, setView] = useState<View>("taxonomy");

  useEffect(() => {
    if (getToken()) {
      setAuthed(true);
    }
  }, []);

  if (!authed) {
    return <Login onAuth={() => setAuthed(true)} />;
  }

  return (
    <div className="flex h-full overflow-hidden" style={{ background: "var(--bg)" }}>
      <Sidebar
        activeView={view}
        onNavigate={setView}
        onLogout={() => setAuthed(false)}
      />
      <main className="flex-1 min-w-0 overflow-hidden flex flex-col">
        <div className="h-10 shrink-0 flex items-center px-6 border-b" style={{ background: "var(--panel)", borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs" style={{ color: "var(--text-faint)" }}>
              {view === "taxonomy" && "Taxonomy Manager"}
              {view === "lesson-editor" && "Lesson Editor"}
              {view === "resources" && "Resources"}
              {view === "review" && "Review Queue"}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle />
            <div className="font-mono text-xs" style={{ color: "var(--text-faint)" }}>
              profy-cms v2.5 — Sep 2026
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {view === "taxonomy" && <TaxonomyManager />}
          {view === "lesson-editor" && <LessonEditor />}
          {view === "resources" && <ResourcesManager />}
          {view === "review" && <ReviewDashboard />}
        </div>
      </main>
    </div>
  );
}
