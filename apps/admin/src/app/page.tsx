"use client";

import { useState, useEffect } from "react";
import Login from "@/components/Login";
import Sidebar from "@/components/Sidebar";
import TaxonomyManager from "@/components/TaxonomyManager";
import LessonEditor from "@/components/LessonEditor";
import ResourcesManager from "@/components/ResourcesManager";
import ReviewDashboard from "@/components/ReviewDashboard";
import CampusLibraryManager from "@/components/CampusLibraryManager";
import AiAssistant from "@/components/AiAssistant";
import AiSettingsPanel from "@/components/AiSettingsPanel";
import ThemeToggle from "@/components/ThemeToggle";
import { getToken } from "@/lib/api";

type View = "taxonomy" | "lesson-editor" | "resources" | "review" | "campus-library" | "ai-assistant" | "ai-settings";

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
              {view === "campus-library" && "Campus Library"}
              {view === "ai-assistant" && "AI Assistant"}
              {view === "ai-settings" && "AI Provider Settings"}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle />
            <div className="font-mono text-xs" style={{ color: "var(--text-faint)" }}>
              dera-cms v3.0 — Sep 2026
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {view === "taxonomy" && <TaxonomyManager />}
          {view === "lesson-editor" && <LessonEditor />}
          {view === "resources" && <ResourcesManager />}
          {view === "review" && <ReviewDashboard />}
          {view === "campus-library" && <CampusLibraryManager />}
          {view === "ai-assistant" && <AiAssistant />}
          {view === "ai-settings" && <AiSettingsPanel />}
        </div>
      </main>
    </div>
  );
}
