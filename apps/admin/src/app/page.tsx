"use client";

import { useState, useEffect } from "react";
import Login from "@/components/Login";
import Sidebar from "@/components/Sidebar";
import TaxonomyManager from "@/components/TaxonomyManager";
import LessonEditor from "@/components/LessonEditor";
import ResourcesManager from "@/components/ResourcesManager";
import ReviewDashboard from "@/components/ReviewDashboard";
import CampusLibraryManager from "@/components/CampusLibraryManager";
import CertificateStudio from "@/components/CertificateStudio";
import BlogManager from "@/components/BlogManager";
import AiAssistant from "@/components/AiAssistant";
import AiSettingsPanel from "@/components/AiSettingsPanel";
import QuickSetupWizard from "@/components/QuickSetupWizard";
import QuickLesson from "@/components/QuickLesson";
import ThemeToggle from "@/components/ThemeToggle";
import { getToken, clearSession, api, type AutoCurationSettingsApi } from "@/lib/api";

type View = "dashboard" | "taxonomy" | "lesson-editor" | "resources" | "review" | "campus-library" | "certificates" | "blog" | "ai-assistant" | "ai-settings" | "quick-setup" | "quick-lesson";

export default function App() {
  const [authed, setAuthed] = useState(() => typeof window !== "undefined" && !!getToken());
  const [view, setView] = useState<View>("dashboard");

  const handleLogout = async () => {
    await api.auth.logout();
    clearSession();
    setAuthed(false);
  };

  if (!authed) {
    return <Login onAuth={() => setAuthed(true)} />;
  }

  return (
    <div className="flex h-full overflow-hidden" style={{ background: "var(--bg)" }}>
      <Sidebar
        activeView={view}
        onNavigate={setView}
        onLogout={handleLogout}
      />
      <main className="flex-1 min-w-0 overflow-hidden flex flex-col">
        <div className="h-10 shrink-0 flex items-center px-6 border-b" style={{ background: "var(--panel)", borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs" style={{ color: "var(--text-faint)" }}>
              {view === "dashboard" && "Quick Actions"}
              {view === "taxonomy" && "Taxonomy Manager"}
              {view === "lesson-editor" && "Lesson Editor"}
              {view === "resources" && "Resources"}
              {view === "review" && "Review Queue"}
              {view === "campus-library" && "Campus Library"}
              {view === "certificates" && "Certificates"}
              {view === "blog" && "Blog Manager"}
              {view === "ai-assistant" && "AI Assistant"}
              {view === "ai-settings" && "AI Provider Settings"}
              {view === "quick-setup" && "Quick Setup Wizard"}
              {view === "quick-lesson" && "Quick Lesson"}
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
          {view === "dashboard" && (
            <DashboardView
              onSetupCourse={() => setView("quick-setup")}
              onQuickLesson={() => setView("quick-lesson")}
              onTaxonomy={() => setView("taxonomy")}
              onLessons={() => setView("lesson-editor")}
              onAI={() => setView("ai-assistant")}
            />
          )}
          {view === "taxonomy" && <TaxonomyManager />}
          {view === "lesson-editor" && <LessonEditor />}
          {view === "resources" && <ResourcesManager />}
          {view === "review" && <ReviewDashboard />}
          {view === "campus-library" && <CampusLibraryManager />}
          {view === "certificates" && <CertificateStudio />}
          {view === "blog" && <BlogManager />}
          {view === "ai-assistant" && <AiAssistant />}
          {view === "ai-settings" && <AiSettingsPanel />}
          {view === "quick-setup" && <QuickSetupWizard onDone={() => setView("taxonomy")} />}
          {view === "quick-lesson" && <QuickLesson onDone={() => setView("lesson-editor")} />}
        </div>
      </main>
    </div>
  );
}

interface DashboardViewProps {
  onSetupCourse: () => void;
  onQuickLesson: () => void;
  onTaxonomy: () => void;
  onLessons: () => void;
  onAI: () => void;
}

function DashboardView({ onSetupCourse, onQuickLesson, onTaxonomy, onLessons, onAI }: DashboardViewProps) {
  return (
    <div className="h-full scrollable p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold mb-2" style={{ color: "var(--text)" }}>
            Welcome to Dera Skul Admin
          </h1>
          <p className="text-sm" style={{ color: "var(--text-3)" }}>
            Manage your courses, lessons, and content. Start with a quick action below.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <div className="font-mono text-xs tracking-wider mb-4" style={{ color: "var(--text-3)" }}>
            QUICK ACTIONS
          </div>
          <div className="grid grid-cols-2 gap-4">
            <QuickActionCard
              icon="🏗️"
              title="Setup Course Structure"
              description="Create a category with subcategories and courses in one go"
              onClick={onSetupCourse}
              accent
            />
            <QuickActionCard
              icon="⚡"
              title="Add from YouTube"
              description="Paste a YouTube URL and auto-create a lesson with video"
              onClick={onQuickLesson}
            />
            <QuickActionCard
              icon="🌐"
              title="Import from Website"
              description="Paste any URL and AI generates a complete lesson"
              onClick={onQuickLesson}
            />
            <QuickActionCard
              icon="📄"
              title="Upload Book/PDF"
              description="Upload a file and AI generates multiple lessons"
              onClick={onQuickLesson}
            />
          </div>
        </div>

        {/* Content Settings */}
        <div className="mb-8">
          <div className="font-mono text-xs tracking-wider mb-4" style={{ color: "var(--text-3)" }}>
            CONTENT SETTINGS
          </div>
          <AutoCurationToggle />
        </div>

        {/* Full Tools */}
        <div>
          <div className="font-mono text-xs tracking-wider mb-4" style={{ color: "var(--text-3)" }}>
            FULL TOOLS
          </div>
          <div className="grid grid-cols-3 gap-3">
            <ToolCard
              icon="📂"
              title="Taxonomy Editor"
              description="Manual tree editor"
              onClick={onTaxonomy}
            />
            <ToolCard
              icon="📝"
              title="Lesson Editor"
              description="Full lesson editor"
              onClick={onLessons}
            />
            <ToolCard
              icon="🤖"
              title="AI Assistant"
              description="Chat with AI"
              onClick={onAI}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function AutoCurationToggle() {
  const [settings, setSettings] = useState<AutoCurationSettingsApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    api.autoCuration
      .getSettings()
      .then((s) => {
        if (!cancelled) setSettings(s);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load settings");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = async () => {
    if (!settings || saving) return;
    setSaving(true);
    setError("");
    try {
      const next = await api.autoCuration.updateSettings(!settings.enabled);
      setSettings(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update setting");
    } finally {
      setSaving(false);
    }
  };

  const on = settings?.enabled === true;
  const keyOk = settings?.keyConfigured === true;
  const statusLabel = loading ? "…" : !settings ? "—" : !keyOk ? "KEY MISSING" : on ? "ON" : "OFF";

  return (
    <div
      className="p-5 flex items-center gap-4"
      style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "4px" }}
    >
      <div className="text-2xl">🎬</div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium flex items-center gap-2" style={{ color: "var(--text)" }}>
          Auto video curation
          <span
            className="font-mono text-xs px-1.5 py-0.5"
            style={{
              fontSize: 10,
              borderRadius: "2px",
              background: on && keyOk ? "var(--accent-soft)" : "var(--panel-2)",
              color: on && keyOk ? "var(--accent)" : "var(--text-3)",
              border: "1px solid var(--border)",
            }}
          >
            {statusLabel}
          </span>
        </div>
        <div className="text-xs mt-1" style={{ color: "var(--text-3)" }}>
          Automatically fill lessons without a curated video using YouTube search — results are marked
          &ldquo;auto&rdquo; and land in the Review Queue for approval.
          {settings && !keyOk && " Set YOUTUBE_API_KEY to make this effective."}
        </div>
        {error && (
          <div className="text-xs mt-1" style={{ color: "var(--danger)" }}>
            {error}
          </div>
        )}
      </div>
      <button
        onClick={toggle}
        disabled={loading || saving || !settings}
        aria-pressed={on}
        aria-label="Toggle auto video curation"
        title={on ? "Turn auto-curation off" : "Turn auto-curation on"}
        className="relative shrink-0"
        style={{
          width: 44,
          height: 24,
          borderRadius: 12,
          border: "1px solid var(--border)",
          background: on ? "var(--accent)" : "var(--panel-2)",
          cursor: loading || saving || !settings ? "not-allowed" : "pointer",
          opacity: loading || saving ? 0.6 : 1,
          transition: "background 0.15s ease",
          padding: 0,
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: on ? 22 : 2,
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: on ? "#000" : "var(--text-3)",
            transition: "left 0.15s ease",
          }}
        />
      </button>
    </div>
  );
}

interface QuickActionCardProps {
  icon: string;
  title: string;
  description: string;
  onClick: () => void;
  accent?: boolean;
}

function QuickActionCard({ icon, title, description, onClick, accent }: QuickActionCardProps) {
  return (
    <button
      onClick={onClick}
      className="p-5 text-left transition-all"
      style={{
        background: accent ? "var(--accent-soft)" : "var(--panel)",
        border: `1px solid ${accent ? "var(--accent)" : "var(--border)"}`,
        borderRadius: "4px",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--accent)";
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = accent ? "var(--accent)" : "var(--border)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-sm font-medium mb-1" style={{ color: "var(--text)" }}>{title}</div>
      <div className="text-xs" style={{ color: "var(--text-3)" }}>{description}</div>
    </button>
  );
}

interface ToolCardProps {
  icon: string;
  title: string;
  description: string;
  onClick: () => void;
}

function ToolCard({ icon, title, description, onClick }: ToolCardProps) {
  return (
    <button
      onClick={onClick}
      className="p-4 text-left transition-colors"
      style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "4px" }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
    >
      <div className="flex items-center gap-3">
        <div className="text-xl">{icon}</div>
        <div>
          <div className="text-sm font-medium" style={{ color: "var(--text)" }}>{title}</div>
          <div className="text-xs" style={{ color: "var(--text-3)" }}>{description}</div>
        </div>
      </div>
    </button>
  );
}
