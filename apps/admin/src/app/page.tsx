"use client";

import { useState } from "react";
import Login from "@/components/Login";
import Sidebar from "@/components/Sidebar";
import TaxonomyManager from "@/components/TaxonomyManager";
import LessonEditor from "@/components/LessonEditor";
import ReviewDashboard from "@/components/ReviewDashboard";
import ResourcesManager from "@/components/ResourcesManager";
import ThemeToggle from "@/components/ThemeToggle";
import { flaggedLessons } from "@/lib/mockData";

type View = "taxonomy" | "lesson-editor" | "review" | "resources";

export default function App() {
  const [authed, setAuthed] = useState(false);
  const [view, setView] = useState<View>("taxonomy");

  if (!authed) {
    return <Login onAuth={() => setAuthed(true)} />;
  }

  return (
    <div className="flex h-full overflow-hidden" style={{ background: "var(--bg)" }}>
      <Sidebar
        activeView={view}
        onNavigate={setView}
        flaggedCount={flaggedLessons.length}
        onLogout={() => setAuthed(false)}
      />
      <main className="flex-1 min-w-0 overflow-hidden flex flex-col">
        {/* Top bar */}
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
              profy-cms v2.4 — Sep 2026
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
