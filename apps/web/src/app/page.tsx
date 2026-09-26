"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { register as apiRegister, login as apiLogin, logout as apiLogout, getTokens, saveTokens, getProfile } from "@/lib/auth";

type Screen =
  | "welcome"
  | "register"
  | "interests"
  | "home"
  | "category"
  | "subcategory"
  | "course"
  | "lesson"
  | "ai-chat"
  | "library"
  | "profile"
  | "subscription"
  | "resources"
  | "login";

interface NavState {
  screen: Screen;
  category?: CategoryItem;
  subcategory?: SubcategoryItem;
  course?: CourseItem;
  lesson?: LessonItem;
}

import {
  loadCategories,
  loadCourseDetail,
  loadLessonDetail,
  INTEREST_OPTIONS,
  type CategoryItem,
  type CourseItem,
  type LessonItem,
  type SubcategoryItem,
} from "@/lib/data";
import {
  fetchResources,
  fetchMyCertificates,
  fetchFeatured,
  searchContent,
  fetchProfileStats,
  updateLessonProgress,
  fetchContinueLearning,
  fetchBookmarks,
  addBookmark,
  removeBookmark,
  aiChat,
  fetchAiMessages,
  recordQuizAttempt,
  ApiError,
  isAuthError,
  type ApiLesson,
  type ApiFeaturedCourse,
  type ApiSearchResult,
  type CertificateInfo,
  type ProfileStats,
  type ContinueItem,
  type BookmarkInfo,
} from "@/lib/api";
import CertificateTab, { CertificateList } from "@/components/CertificateTab";

const FG = "var(--foreground)";
const FG_MUTED = "var(--muted-foreground)";
const BORDER = "var(--border)";
const CARD = "var(--card)";
const SURFACE = "var(--surface)";
const PRIMARY = "var(--primary)";
const ON_PRIMARY = "var(--on-primary)";
const SECONDARY = "var(--secondary)";
const ON_SECONDARY = "var(--on-secondary)";
const SUCCESS = "var(--success)";

/* ────────────────────────────────────────────────────────────────────────────
   Sidebar navigation
   ──────────────────────────────────────────────────────────────────────────── */
function Sidebar({
  active,
  onNav,
  collapsed,
  onToggle,
}: {
  active: string;
  onNav: (s: "home" | "learn" | "library" | "profile" | "resources") => void;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const tabs = [
    { id: "home", label: "Home", icon: HomeIcon },
    { id: "learn", label: "Browse", icon: LearnIcon },
    { id: "resources", label: "Resources", icon: ResourcesIcon },
    { id: "library", label: "Library", icon: LibraryIcon },
    { id: "profile", label: "Profile", icon: ProfileIcon },
  ] as const;

  return (
    <aside
      style={{
        width: collapsed ? 64 : 220,
        background: "var(--background)",
        borderRight: `1px solid ${BORDER}`,
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        transition: "width 0.2s ease",
        overflow: "hidden",
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: collapsed ? "16px 0" : "16px 20px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          borderBottom: `1px solid ${BORDER}`,
          minHeight: 60,
          justifyContent: collapsed ? "center" : "flex-start",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: PRIMARY,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 44 44" fill="none">
            <path d="M10 13l12-5 12 5v11c0 7-5 12-12 14C17 36 10 31 10 24V13z" fill="none" stroke={ON_PRIMARY} strokeWidth="1.5" />
            <path d="M16 22l4 4 8-8" stroke={ON_PRIMARY} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        {!collapsed && (
          <div>
            <div style={{ fontFamily: "var(--font-serif)", fontSize: 16, fontWeight: 700, color: FG, lineHeight: 1.1 }}>Dera Skul</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: PRIMARY, letterSpacing: 1, textTransform: "uppercase" }}>Learn &amp; Grow</div>
          </div>
        )}
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: "8px 0" }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onNav(tab.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                padding: collapsed ? "10px 0" : "10px 20px",
                justifyContent: collapsed ? "center" : "flex-start",
                background: isActive ? "rgb(var(--shadow-color) / 0.06)" : "none",
                border: "none",
                borderRight: isActive ? `3px solid ${PRIMARY}` : "3px solid transparent",
                cursor: "pointer",
                color: isActive ? PRIMARY : FG_MUTED,
                fontWeight: isActive ? 700 : 500,
                fontSize: 14,
                transition: "all 0.15s",
              }}
            >
              <Icon active={isActive} />
              {!collapsed && <span>{tab.label}</span>}
            </button>
          );
        })}
        {/* Real route (not an SPA screen) — also the internal link search
            engines follow into the crawlable article pages. */}
        <Link
          href="/blog"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            width: "100%",
            padding: collapsed ? "10px 0" : "10px 20px",
            justifyContent: collapsed ? "center" : "flex-start",
            background: "none",
            border: "none",
            borderRight: "3px solid transparent",
            cursor: "pointer",
            color: FG_MUTED,
            fontWeight: 500,
            fontSize: 14,
            textDecoration: "none",
          }}
        >
          <BlogIcon active={false} />
          {!collapsed && <span>Blog</span>}
        </Link>
      </nav>

      {/* Collapse toggle */}
      <div style={{ padding: "12px 0", borderTop: `1px solid ${BORDER}` }}>
        <button
          onClick={onToggle}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            width: "100%",
            padding: collapsed ? "10px 0" : "10px 20px",
            justifyContent: collapsed ? "center" : "flex-start",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: FG_MUTED,
            fontSize: 13,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {collapsed ? <path d="M9 18l6-6-6-6" /> : <path d="M15 18l-6-6 6-6" />}
          </svg>
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}

function BlogIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? PRIMARY : FG_MUTED} strokeWidth="1.8">
      <path d="M4 5a2 2 0 012-2h12a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V5z" />
      <path d="M8 7h8M8 11h8M8 15h5" />
    </svg>
  );
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? PRIMARY : "none"} stroke={active ? PRIMARY : FG_MUTED} strokeWidth="1.8">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
      <path d="M9 21V12h6v9" strokeLinejoin="round" />
    </svg>
  );
}
function LearnIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? PRIMARY : FG_MUTED} strokeWidth="1.8">
      <path d="M12 3L2 8l10 5 10-5-10-5z" />
      <path d="M2 8v8M12 21v-8M22 8v8" />
    </svg>
  );
}
function LibraryIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? PRIMARY : FG_MUTED} strokeWidth="1.8">
      <rect x="3" y="3" width="7" height="18" rx="1" />
      <rect x="13" y="3" width="8" height="11" rx="1" />
      <rect x="13" y="17" width="8" height="4" rx="1" />
    </svg>
  );
}
function ProfileIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? PRIMARY : FG_MUTED} strokeWidth="1.8">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}
function ResourcesIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? PRIMARY : FG_MUTED} strokeWidth="1.8">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14,2 14,8 20,8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10,9 9,9 8,9" />
    </svg>
  );
}

function BackButton({ onBack, label = "Back" }: { onBack: () => void; label?: string }) {
  return (
    <button
      onClick={onBack}
      className="flex items-center gap-1.5"
      style={{ background: "none", border: "none", cursor: "pointer", color: SECONDARY, fontWeight: 600, fontSize: 14 }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={SECONDARY} strokeWidth="2.2">
        <path d="M15 18l-6-6 6-6" />
      </svg>
      {label}
    </button>
  );
}

function AdBanner() {
  return (
    <div style={{ borderRadius: 10, border: `1px solid ${BORDER}`, background: CARD, padding: "12px 16px" }}>
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 10, color: FG_MUTED, letterSpacing: 0.8, textTransform: "uppercase", fontWeight: 600 }}>Advertisement</span>
      </div>
      <div className="flex items-center justify-center" style={{ height: 80, borderRadius: 8, background: BORDER, marginTop: 6 }}>
        <span style={{ fontSize: 13, color: FG_MUTED }}>Ad space · 728 × 90</span>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Screens
   ──────────────────────────────────────────────────────────────────────────── */

function WelcomeScreen({ onGetStarted, onLogin }: { onGetStarted: () => void; onLogin: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
      <div className="text-center" style={{ maxWidth: 520, padding: 40 }}>
        <div className="flex flex-col items-center gap-4 mb-8">
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 22,
              background: PRIMARY,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 20px rgb(var(--shadow-color) / 0.3)",
            }}
          >
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
              <path d="M10 13l12-5 12 5v11c0 7-5 12-12 14C17 36 10 31 10 24V13z" fill="none" stroke={ON_PRIMARY} strokeWidth="1.5" />
              <path d="M16 22l4 4 8-8" stroke={ON_PRIMARY} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-serif)", fontSize: 36, fontWeight: 700, color: FG, letterSpacing: -0.5 }}>Dera Skul</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: PRIMARY, letterSpacing: 2, textTransform: "uppercase" }}>Learn &amp; Grow</div>
          </div>
        </div>
        <p style={{ fontFamily: "var(--font-serif)", fontSize: 26, color: FG, lineHeight: 1.4, fontStyle: "italic", marginBottom: 12 }}>
          Learn Anything. Anytime. Anywhere.
        </p>
        <p style={{ fontSize: 16, color: FG_MUTED, marginBottom: 32, lineHeight: 1.6 }}>
          Practical, applied skills for the life you&apos;re building — on your schedule.
        </p>
        <div className="flex gap-3 justify-center mb-6">
          <button
            onClick={onGetStarted}
            style={{
              padding: "14px 40px",
              background: PRIMARY,
              color: ON_PRIMARY,
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
              fontSize: 16,
              fontWeight: 700,
              boxShadow: "0 2px 12px rgb(var(--shadow-color) / 0.35)",
            }}
          >
            Get Started
          </button>
          <button
            onClick={onLogin}
            style={{
              padding: "14px 40px",
              background: "transparent",
              color: SECONDARY,
              border: `1.5px solid ${SECONDARY}`,
              borderRadius: 10,
              cursor: "pointer",
              fontSize: 16,
              fontWeight: 600,
            }}
          >
            Log In
          </button>
        </div>
        <p style={{ fontSize: 13, color: FG_MUTED }}>Free to start · No credit card required</p>
      </div>
    </div>
  );
}

function InterestsScreen({ onContinue }: { onContinue: () => void }) {
  const [selected, setSelected] = useState<string[]>([]);
  const toggle = (id: string) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
      <div style={{ maxWidth: 640, width: "100%", padding: 40 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: PRIMARY, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>Step 1 of 1</div>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 28, fontWeight: 600, color: FG, lineHeight: 1.3 }}>What do you want to learn?</h1>
        <p style={{ fontSize: 15, color: FG_MUTED, marginTop: 8, lineHeight: 1.5 }}>Pick at least one — we&apos;ll personalise your home feed.</p>
        <div className="grid gap-3 mt-6" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
          {INTEREST_OPTIONS.map((opt) => {
            const isSelected = selected.includes(opt.id);
            return (
              <button
                key={opt.id}
                onClick={() => toggle(opt.id)}
                style={{
                  padding: "18px 10px",
                  borderRadius: 10,
                  border: isSelected ? `2px solid ${PRIMARY}` : `1.5px solid ${BORDER}`,
                  background: isSelected ? "rgb(var(--shadow-color) / 0.06)" : "var(--background)",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                  transition: "all 0.15s",
                }}
              >
                <span style={{ fontSize: 28 }}>{opt.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: isSelected ? PRIMARY : FG, textAlign: "center", lineHeight: 1.2 }}>{opt.label}</span>
              </button>
            );
          })}
        </div>
        <div className="flex gap-3 mt-8">
          <button
            onClick={onContinue}
            disabled={selected.length === 0}
            style={{
              flex: 1,
              padding: "14px 0",
              background: selected.length > 0 ? PRIMARY : BORDER,
              color: selected.length > 0 ? ON_PRIMARY : FG_MUTED,
              border: "none",
              borderRadius: 10,
              cursor: selected.length > 0 ? "pointer" : "not-allowed",
              fontSize: 15,
              fontWeight: 700,
            }}
          >
            {selected.length === 0 ? "Select at least one" : `Continue with ${selected.length} topic${selected.length > 1 ? "s" : ""}`}
          </button>
          <button onClick={onContinue} style={{ padding: "14px 24px", background: "none", border: "none", cursor: "pointer", fontSize: 14, color: FG_MUTED, fontWeight: 500 }}>
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}

function HomeScreen({
  onCategory,
  onOpenCourse,
  onOpenLesson,
}: {
  onCategory: (c: CategoryItem) => void;
  onOpenCourse: (courseSlug: string) => void;
  onOpenLesson: (lessonSlug: string) => void;
}) {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [featured, setFeatured] = useState<ApiFeaturedCourse[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ApiSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const profile = getProfile();
  const firstName = profile?.name ? profile.name.split(" ")[0] : null;

  useEffect(() => {
    loadCategories().then(setCategories).catch(console.error);
    fetchFeatured()
      .then((r) => setFeatured(r.featuredCourses))
      .catch(console.error);
  }, []);

  const onQueryChange = (value: string) => {
    setQuery(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (value.trim().length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    searchTimer.current = setTimeout(() => {
      searchContent(value.trim())
        .then((r) => setResults(r.results))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);
  };

  const showResults = query.trim().length >= 2;

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--background)" }}>
      {/* Header */}
      <div className="px-6 pt-4 pb-3 flex-shrink-0 flex items-center justify-between" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div>
          <div style={{ fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 600, color: FG }}>
            {firstName ? `Welcome back, ${firstName}` : "Welcome to Dera Skul"}
          </div>
          <div style={{ fontSize: 14, color: FG_MUTED }}>Ready to keep learning?</div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle size={16} />
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: SECONDARY, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: ON_SECONDARY }}>
              {(firstName || profile?.email || "?").charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-6 py-3">
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: CARD, borderRadius: 10, padding: "12px 16px", border: `1px solid ${BORDER}`, maxWidth: 600 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={FG_MUTED} strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="What do you want to learn?"
            style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 14, color: FG, minWidth: 0 }}
          />
        </div>
        {showResults && (
          <div style={{ maxWidth: 600, marginTop: 8 }}>
            {searching && results.length === 0 && (
              <div style={{ fontSize: 13, color: FG_MUTED, padding: "8px 4px" }}>Searching…</div>
            )}
            {!searching && results.length === 0 && (
              <div style={{ fontSize: 13, color: FG_MUTED, padding: "8px 4px" }}>No lessons match “{query.trim()}”.</div>
            )}
            {results.map((r) => (
              <button
                key={r.id}
                onClick={() => onOpenLesson(r.slug)}
                style={{ display: "block", width: "100%", textAlign: "left", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 14px", marginBottom: 6, cursor: "pointer" }}
              >
                <div style={{ fontSize: 14, fontWeight: 600, color: FG }}>{r.title}</div>
                {r.description && <div style={{ fontSize: 12, color: FG_MUTED, marginTop: 2 }}>{r.description}</div>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {/* Featured courses */}
        {featured.length > 0 && (
          <div className="mb-6">
            <div style={{ fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 600, color: FG, marginBottom: 12 }}>Featured Courses</div>
            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
              {featured.map((course) => (
                <button
                  key={course.slug}
                  onClick={() => onOpenCourse(course.slug)}
                  style={{ display: "flex", flexDirection: "column", gap: 6, background: CARD, borderRadius: 10, padding: "16px 20px", border: `1px solid ${BORDER}`, cursor: "pointer", textAlign: "left" }}
                >
                  <div style={{ fontFamily: "var(--font-serif)", fontSize: 16, fontWeight: 600, color: FG }}>{course.name}</div>
                  {course.description && (
                    <div style={{ fontSize: 13, color: FG_MUTED, lineHeight: 1.5 }}>{course.description}</div>
                  )}
                  <span style={{ fontSize: 13, fontWeight: 700, color: PRIMARY, marginTop: 2 }}>View course →</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Categories */}
        <div className="mb-6">
          <div style={{ fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 600, color: FG, marginBottom: 12 }}>Browse by Category</div>
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => onCategory(cat)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  background: CARD,
                  borderRadius: 10,
                  padding: "16px 20px",
                  border: `1px solid ${BORDER}`,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div style={{ width: 48, height: 48, borderRadius: 10, background: `var(--${cat.color})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{cat.icon}</div>
                <div className="flex-1">
                  <div style={{ fontFamily: "var(--font-serif)", fontSize: 16, fontWeight: 600, color: FG }}>{cat.label}</div>
                  <div style={{ fontSize: 13, color: FG_MUTED, marginTop: 2 }}>{cat.subcategories.reduce((sum, s) => sum + s.courses.length, 0)} courses</div>
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={FG_MUTED} strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
              </button>
            ))}
          </div>
        </div>

        <AdBanner />
      </div>
    </div>
  );
}

function CategoryScreen({ category, onBack, onSubcategory }: { category: CategoryItem; onBack: () => void; onSubcategory: (s: SubcategoryItem) => void }) {
  return (
    <div className="flex flex-col h-full" style={{ background: "var(--background)" }}>
      <div className="px-6 pt-4 pb-4 flex-shrink-0" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <BackButton onBack={onBack} label="Browse" />
        <div className="flex items-center gap-4 mt-4">
          <div style={{ width: 52, height: 52, borderRadius: 14, background: `var(--${category.color})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>{category.icon}</div>
          <div>
            <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 24, fontWeight: 600, color: FG }}>{category.label}</h1>
            <p style={{ fontSize: 14, color: FG_MUTED }}>{category.subcategories.length} topics · {category.subcategories.reduce((s, sub) => s + sub.courses.length, 0)} courses</p>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-6 pt-4" style={{ maxWidth: 720 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: FG_MUTED, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 10 }}>Topics</div>
        <div className="flex flex-col gap-3">
          {category.subcategories.map((sub) => (
            <button
              key={sub.id}
              onClick={() => onSubcategory(sub)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: CARD,
                borderRadius: 10,
                padding: "16px 20px",
                border: `1px solid ${BORDER}`,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div>
                <div style={{ fontFamily: "var(--font-serif)", fontSize: 16, fontWeight: 600, color: FG }}>{sub.label}</div>
                <div style={{ fontSize: 13, color: FG_MUTED, marginTop: 2 }}>{sub.courses.length} course{sub.courses.length !== 1 ? "s" : ""}</div>
              </div>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={FG_MUTED} strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function SubcategoryScreen({ category, subcategory, onBack, onCourse }: { category: CategoryItem; subcategory: SubcategoryItem; onBack: () => void; onCourse: (c: CourseItem) => void }) {
  const isLanguageBranch = category.id === "languages";
  return (
    <div className="flex flex-col h-full" style={{ background: "var(--background)" }}>
      <div className="px-6 pt-4 pb-4 flex-shrink-0" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <BackButton onBack={onBack} label={category.label} />
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 24, fontWeight: 600, color: FG, marginTop: 12 }}>{subcategory.label}</h1>
        <p style={{ fontSize: 14, color: FG_MUTED, marginTop: 4 }}>{subcategory.courses.length} course{subcategory.courses.length !== 1 ? "s" : ""} available</p>
      </div>
      <div className="flex-1 overflow-y-auto px-6 pt-4 pb-4" style={{ maxWidth: 720 }}>
        <div className="flex flex-col gap-3">
          {subcategory.courses.map((course) => (
            <button
              key={course.id}
              onClick={() => onCourse(course)}
              style={{
                background: CARD,
                borderRadius: 10,
                padding: "18px 20px",
                border: `1px solid ${BORDER}`,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              {isLanguageBranch && (
                <div style={{ display: "inline-block", background: "rgb(var(--shadow-color) / 0.10)", borderRadius: 6, padding: "2px 10px", marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: SECONDARY, textTransform: "uppercase", letterSpacing: 0.8 }}>{course.level}</span>
                </div>
              )}
              <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div style={{ fontFamily: "var(--font-serif)", fontSize: 17, fontWeight: 600, color: FG, lineHeight: 1.3, marginBottom: 4 }}>{course.title}</div>
                    {!isLanguageBranch && course.instructor && <div style={{ fontSize: 13, color: FG_MUTED, marginBottom: 6 }}>{course.instructor}</div>}
                    <div style={{ fontSize: 14, color: FG_MUTED, lineHeight: 1.5 }}>{course.description}</div>
                    <div className="flex items-center gap-3 mt-3">
                      {course.duration && <span style={{ fontSize: 13, color: FG_MUTED }}>{course.duration}</span>}
                      {course.duration && <span style={{ color: BORDER }}>·</span>}
                      <span style={{ fontSize: 13, color: FG_MUTED }}>{course.lessons.length} lessons</span>
                      {course.level && <span style={{ color: BORDER }}>·</span>}
                      {course.level && <span style={{ fontSize: 13, color: FG_MUTED }}>{course.level}</span>}
                    </div>
                  </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={FG_MUTED} strokeWidth="2" style={{ flexShrink: 0, marginTop: 4 }}><path d="M9 18l6-6-6-6" /></svg>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function CourseScreen({
  course,
  completedSlugs,
  onBack,
  onLesson,
}: {
  course: CourseItem;
  completedSlugs: Set<string>;
  onBack: () => void;
  onLesson: (l: LessonItem) => void;
}) {
  const [tab, setTab] = useState<"lessons" | "certificate">("lessons");
  const [detail, setDetail] = useState<CourseItem | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    loadCourseDetail(course.id).then((d) => {
      if (!active) return;
      if (d) setDetail(d);
      else setFailed(true);
    });
    return () => {
      active = false;
    };
  }, [course.id]);

  const current = detail ?? course;
  const lessons = current.lessons.map((l) => ({ ...l, completed: completedSlugs.has(l.id) }));
  const completed = lessons.filter((l) => l.completed).length;
  const pct = lessons.length > 0 ? Math.round((completed / lessons.length) * 100) : 0;
  const meta = [current.instructor, current.level].filter(Boolean).join(" · ");

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--background)" }}>
      <div className="px-6 pt-4 pb-4 flex-shrink-0" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <BackButton onBack={onBack} />
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 600, color: FG, marginTop: 12, lineHeight: 1.3 }}>{current.title}</h1>
        {meta && <p style={{ fontSize: 14, color: FG_MUTED, marginTop: 4 }}>{meta}</p>}
        <p style={{ fontSize: 14, color: FG_MUTED, marginTop: 4, lineHeight: 1.5 }}>{current.description}</p>
        {completed > 0 && (
          <div className="mt-4" style={{ maxWidth: 500 }}>
            <div className="flex justify-between mb-1">
              <span style={{ fontSize: 13, color: FG_MUTED }}>{completed} of {lessons.length} complete</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: PRIMARY }}>{pct}%</span>
            </div>
            <div style={{ background: BORDER, borderRadius: 4, height: 5 }}><div style={{ width: `${pct}%`, height: "100%", background: PRIMARY, borderRadius: 4 }} /></div>
          </div>
        )}
        <div className="flex gap-0 mt-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
          {([["lessons", "Lessons"], ["certificate", "Certificate"]] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                padding: "9px 16px",
                background: "none",
                border: "none",
                cursor: "pointer",
                borderBottom: tab === id ? `2px solid ${PRIMARY}` : "2px solid transparent",
                fontSize: 14,
                fontWeight: tab === id ? 700 : 500,
                color: tab === id ? PRIMARY : FG_MUTED,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {tab === "certificate" && (
        <div className="flex-1 overflow-y-auto px-6" style={{ maxWidth: 720, paddingTop: 16 }}>
          <CertificateTab courseSlug={current.id} />
        </div>
      )}
      {tab === "lessons" && (
      <div className="flex-1 overflow-y-auto px-6" style={{ maxWidth: 720 }}>
        <div style={{ padding: "16px 0 4px", fontSize: 11, fontWeight: 700, color: FG_MUTED, letterSpacing: 1.2, textTransform: "uppercase" }}>
          {detail ? `${lessons.length} Lessons` : "Lessons"}
        </div>
        {!detail && !failed && (
          <div style={{ padding: "16px 0", fontSize: 14, color: FG_MUTED }}>Loading lessons…</div>
        )}
        {failed && (
          <div style={{ padding: "16px 0", fontSize: 14, color: FG_MUTED }}>
            We couldn&apos;t load the lesson list for this course. Please go back and try again.
          </div>
        )}
        {lessons.map((lesson, idx) => (
          <div key={lesson.id}>
            <button
              onClick={() => onLesson(lesson)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "14px 0",
                background: "none",
                border: "none",
                cursor: "pointer",
                borderBottom: `1px solid ${BORDER}`,
                textAlign: "left",
              }}
            >
              <div style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, background: lesson.completed ? PRIMARY : CARD, border: lesson.completed ? "none" : `1.5px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {lesson.completed ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={ON_PRIMARY} strokeWidth="2.5"><path d="M5 13l4 4L19 7" /></svg> : <span style={{ fontSize: 12, fontWeight: 700, color: FG_MUTED }}>{idx + 1}</span>}
              </div>
              <div className="flex-1">
                <div style={{ fontSize: 15, fontWeight: 600, color: FG, lineHeight: 1.3 }}>{lesson.title}</div>
                <div style={{ fontSize: 13, color: FG_MUTED, marginTop: 1 }}>
                  {[lesson.duration, lesson.level].filter(Boolean).join(" · ")}
                </div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={FG_MUTED} strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
            </button>
            {idx === 1 && <div className="my-3"><AdBanner /></div>}
          </div>
        ))}
      </div>
      )}
    </div>
  );
}

function NotesTab({ lessonId }: { lessonId: string }) {
  const storageKey = `notes.${lessonId}`;
  const [notes, setNotes] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      return localStorage.getItem(storageKey) || "";
    } catch {
      return "";
    }
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, notes);
      } catch {
        // Storage unavailable (private mode) — notes stay in memory.
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [notes, storageKey]);

  return (
    <div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Add your notes for this lesson…"
        style={{ width: "100%", minHeight: 160, padding: "14px 16px", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: 14, color: FG, lineHeight: 1.6, resize: "none", outline: "none" }}
      />
      <p style={{ fontSize: 13, color: FG_MUTED, marginTop: 8 }}>Notes are saved locally on this device.</p>
    </div>
  );
}

function LessonScreen({
  lesson,
  course,
  onBack,
  onAiChat,
  onProgressChange,
}: {
  lesson: LessonItem;
  course?: CourseItem;
  onBack: () => void;
  onAiChat: () => void;
  onProgressChange: (lessonSlug: string, completed: boolean) => void;
}) {
  const [activeTab, setActiveTab] = useState<"steps" | "tools" | "examples" | "notes" | "quiz">("steps");
  const [completed, setCompleted] = useState(lesson.completed);
  const [apiLesson, setApiLesson] = useState<ApiLesson | null>(null);
  const [lessonFailed, setLessonFailed] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // Keyed by lesson id so switching lessons starts a fresh quiz without an
  // effect (and without re-answering when you come back to a graded one).
  const [quizAnswersByLesson, setQuizAnswersByLesson] = useState<Record<string, Record<number, number>>>({});
  const [gradedLessons, setGradedLessons] = useState<Record<string, boolean>>({});
  const quizAnswers = quizAnswersByLesson[lesson.id] ?? {};
  const quizChecked = Boolean(gradedLessons[lesson.id]);
  const setQuizAnswers = (update: Record<number, number> | ((prev: Record<number, number>) => Record<number, number>)) =>
    setQuizAnswersByLesson((prev) => {
      const current = prev[lesson.id] ?? {};
      const next = typeof update === "function" ? update(current) : update;
      return { ...prev, [lesson.id]: next };
    });
  const setQuizChecked = (value: boolean | ((prev: boolean) => boolean)) =>
    setGradedLessons((prev) => {
      const current = Boolean(prev[lesson.id]);
      return { ...prev, [lesson.id]: typeof value === "function" ? value(current) : value };
    });
  const tabs = [{ id: "steps", label: "Steps" }, { id: "tools", label: "Tools" }, { id: "examples", label: "Examples" }, { id: "notes", label: "Notes" }, { id: "quiz", label: "Quiz" }] as const;

  useEffect(() => {
    loadLessonDetail(lesson.id).then((detail) => {
      setApiLesson(detail);
      if (!detail) {
        setLessonFailed(true);
        return;
      }
      if (!getTokens()) return;
      fetchBookmarks()
        .then((r) => setBookmarked(r.items.some((b) => b.lessonId === detail.id)))
        .catch(() => undefined);
    });
  }, [lesson.id]);

  const objectives = apiLesson?.objectives || [];
  const examples = apiLesson?.examples || [];
  const exercises = apiLesson?.exercises || [];
  const quizzes = apiLesson?.quizzes || [];
  const explanation = apiLesson?.explanation || "";
  const videoId = apiLesson?.primaryVideo?.youtubeVideoId || null;

  const toggleDone = () => {
    if (!apiLesson || saving) return;
    if (!getTokens()) {
      setNotice("Sign in to track your progress.");
      return;
    }
    const next = !completed;
    setSaving(true);
    setNotice(null);
    updateLessonProgress(apiLesson.id, next ? "completed" : "in_progress")
      .then(() => {
        setCompleted(next);
        onProgressChange(lesson.id, next);
      })
      .catch((err) => {
        if (isAuthError(err)) setNotice("Sign in to track your progress.");
        else setNotice("We couldn't save your progress. Please try again.");
      })
      .finally(() => setSaving(false));
  };

  const toggleBookmark = () => {
    if (!apiLesson || saving) return;
    if (!getTokens()) {
      setNotice("Sign in to save lessons to your library.");
      return;
    }
    const next = !bookmarked;
    setBookmarked(next);
    setNotice(null);
    (next ? addBookmark(apiLesson.id) : removeBookmark(apiLesson.id)).catch((err) => {
      setBookmarked(!next);
      if (isAuthError(err)) setNotice("Sign in to save lessons to your library.");
      else setNotice("We couldn't update your bookmark. Please try again.");
    });
  };

  const checkQuiz = () => {
    setQuizChecked(true);
    if (!apiLesson || !getTokens()) return;
    const score = quizzes.filter((quiz, qi) => quizAnswers[qi] === quiz.correctIndex).length;
    recordQuizAttempt(apiLesson.id, { score, total: quizzes.length }).catch(() => undefined);
  };

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--background)" }}>
      <div className="px-6 pt-4 pb-3 flex-shrink-0 flex items-center gap-3" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <BackButton onBack={onBack} />
        <div className="flex-1" />
        <button
          onClick={toggleBookmark}
          aria-pressed={bookmarked}
          title={bookmarked ? "Remove from saved" : "Save lesson"}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill={bookmarked ? PRIMARY : "none"} stroke={bookmarked ? PRIMARY : FG_MUTED} strokeWidth="1.8">
            <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-6">
          {/* Video */}
          <div style={{ background: "var(--code-bg)", borderRadius: 12, overflow: "hidden", marginBottom: 20 }}>
            {videoId ? (
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${videoId}`}
                title={apiLesson?.primaryVideo?.title || lesson.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                style={{ width: "100%", aspectRatio: "16/9", border: 0, display: "block" }}
              />
            ) : (
              <div style={{ aspectRatio: "16/9", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8 }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={FG_MUTED} strokeWidth="1.5">
                  <rect x="2" y="4" width="20" height="16" rx="3" />
                  <path d="M10 9l5 3-5 3z" fill={FG_MUTED} stroke="none" />
                </svg>
                <span style={{ fontSize: 13, color: FG_MUTED }}>
                  {apiLesson ? "No video for this lesson yet" : "Loading lesson…"}
                </span>
              </div>
            )}
          </div>

          {/* Title + complete */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <div style={{ fontFamily: "var(--font-serif)", fontSize: 20, fontWeight: 600, color: FG, lineHeight: 1.3 }}>
                {apiLesson?.title || lesson.title}
              </div>
              <div style={{ fontSize: 13, color: FG_MUTED, marginTop: 4 }}>
                {[course?.title, apiLesson?.level || lesson.level].filter(Boolean).join(" · ")}
              </div>
            </div>
            <button
              onClick={toggleDone}
              disabled={!apiLesson || saving}
              style={{ flexShrink: 0, padding: "8px 16px", borderRadius: 8, background: completed ? PRIMARY : "transparent", border: completed ? "none" : `1.5px solid ${BORDER}`, cursor: apiLesson && !saving ? "pointer" : "default", opacity: apiLesson ? 1 : 0.6, display: "flex", alignItems: "center", gap: 6 }}
            >
              {completed ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={ON_PRIMARY} strokeWidth="2.5"><path d="M5 13l4 4L19 7" /></svg> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={FG_MUTED} strokeWidth="2"><circle cx="12" cy="12" r="10" /></svg>}
              <span style={{ fontSize: 13, fontWeight: 700, color: completed ? ON_PRIMARY : FG_MUTED }}>{completed ? "Done" : "Mark done"}</span>
            </button>
          </div>
          {notice && (
            <div style={{ fontSize: 13, color: "var(--danger, #be5050)", marginBottom: 16 }}>{notice}</div>
          )}
          {lessonFailed && !apiLesson && (
            <div style={{ fontSize: 14, color: FG_MUTED, marginBottom: 16 }}>
              This lesson couldn&apos;t be loaded from the server. Please go back and try again.
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-0 mb-6" style={{ borderBottom: `1px solid ${BORDER}` }}>
            {tabs.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ padding: "10px 16px", background: "none", border: "none", cursor: "pointer", borderBottom: activeTab === tab.id ? `2px solid ${PRIMARY}` : "2px solid transparent", fontSize: 14, fontWeight: activeTab === tab.id ? 700 : 500, color: activeTab === tab.id ? PRIMARY : FG_MUTED }}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="pb-12">
            {activeTab === "steps" && (
              <div className="flex flex-col gap-4">
                {explanation && (
                  <p style={{ fontFamily: "var(--font-serif)", fontSize: 16, color: FG, lineHeight: 1.7, fontStyle: "italic" }}>
                    {explanation}
                  </p>
                )}
                {objectives.length > 0 && (
                  <>
                    <div style={{ fontSize: 13, fontWeight: 700, color: FG_MUTED, letterSpacing: 1, textTransform: "uppercase", marginTop: 8 }}>Learning Objectives</div>
                    {objectives.map((obj, i) => (
                      <div key={i} className="flex gap-3">
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: CARD, border: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: PRIMARY }}>{i + 1}</span>
                        </div>
                        <div>
                          <div style={{ fontSize: 15, color: FG, lineHeight: 1.6 }}>{obj}</div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
                {!explanation && objectives.length === 0 && (
                  <p style={{ fontSize: 15, color: FG_MUTED, lineHeight: 1.6 }}>
                    Lesson content is loading from the server...
                  </p>
                )}
              </div>
            )}
            {activeTab === "tools" && (
              <div className="flex flex-col gap-3">
                <p style={{ fontSize: 15, color: FG_MUTED, lineHeight: 1.6 }}>What you need for this lesson:</p>
                {exercises.length > 0 ? exercises.map((exercise) => (
                  <div key={exercise} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: CARD, borderRadius: 10, border: `1px solid ${BORDER}` }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={SECONDARY} strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                    <span style={{ fontSize: 14, color: FG, fontWeight: 500 }}>{exercise}</span>
                  </div>
                )) : (
                  <p style={{ fontSize: 14, color: FG_MUTED }}>No exercises available for this lesson yet.</p>
                )}
              </div>
            )}
            {activeTab === "examples" && (
              <div>
                {examples.length > 0 ? (
                  <>
                    <p style={{ fontFamily: "var(--font-serif)", fontSize: 16, color: FG, lineHeight: 1.6, marginBottom: 12 }}>Examples from this lesson:</p>
                    {examples.map((example, i) => (
                      <div key={i} style={{ background: CARD, borderRadius: 10, padding: "16px 20px", border: `1px solid ${BORDER}`, marginBottom: 12 }}>
                        <pre style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 13, color: "var(--code-fg)", lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap" }}>
                          {example}
                        </pre>
                      </div>
                    ))}
                  </>
                ) : (
                  <p style={{ fontSize: 14, color: FG_MUTED }}>No examples available for this lesson yet.</p>
                )}
              </div>
            )}
            {activeTab === "notes" && <NotesTab lessonId={lesson.id} />}
            {activeTab === "quiz" && (
              <div className="flex flex-col gap-3">
                {quizzes.length > 0 ? (
                  <>
                    {quizzes.map((quiz, qi) => {
                      const chosen = quizAnswers[qi];
                      return (
                        <div key={qi} className="mb-4">
                          <p style={{ fontFamily: "var(--font-serif)", fontSize: 16, color: FG, lineHeight: 1.5, marginBottom: 12 }}>{qi + 1}. {quiz.question}</p>
                          {quiz.options.map((opt, i) => {
                            const picked = chosen === i;
                            const isCorrect = i === quiz.correctIndex;
                            const revealCorrect = quizChecked && isCorrect;
                            const revealWrong = quizChecked && picked && !isCorrect;
                            return (
                              <button
                                key={i}
                                disabled={quizChecked}
                                onClick={() => setQuizAnswers((prev) => ({ ...prev, [qi]: i }))}
                                style={{
                                  padding: "14px 18px",
                                  borderRadius: 10,
                                  background: revealCorrect ? "rgb(122 158 126 / 0.12)" : revealWrong ? "rgb(190 80 80 / 0.12)" : picked ? "rgb(59 91 170 / 0.10)" : CARD,
                                  border: revealCorrect ? `1.5px solid ${SUCCESS}` : revealWrong ? `1.5px solid var(--danger, #be5050)` : picked ? `1.5px solid ${PRIMARY}` : `1px solid ${BORDER}`,
                                  cursor: quizChecked ? "default" : "pointer",
                                  textAlign: "left",
                                  fontSize: 15,
                                  fontWeight: picked || revealCorrect ? 600 : 500,
                                  color: FG,
                                  marginBottom: 8,
                                  width: "100%",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  gap: 10,
                                }}
                              >
                                <span>{opt}</span>
                                {revealCorrect && <span style={{ fontSize: 12, fontWeight: 700, color: SUCCESS }}>Correct</span>}
                                {revealWrong && <span style={{ fontSize: 12, fontWeight: 700, color: "var(--danger, #be5050)" }}>Your answer</span>}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                    {!quizChecked ? (
                      <button
                        disabled={quizzes.some((_, qi) => quizAnswers[qi] === undefined)}
                        onClick={checkQuiz}
                        style={{
                          padding: "13px 0",
                          borderRadius: 10,
                          background: quizzes.some((_, qi) => quizAnswers[qi] === undefined) ? CARD : PRIMARY,
                          color: quizzes.some((_, qi) => quizAnswers[qi] === undefined) ? FG_MUTED : ON_PRIMARY,
                          border: "none",
                          cursor: quizzes.some((_, qi) => quizAnswers[qi] === undefined) ? "default" : "pointer",
                          fontSize: 15,
                          fontWeight: 700,
                        }}
                      >
                        Check answers
                      </button>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "14px 18px" }}>
                        <span style={{ fontSize: 14, color: FG, fontWeight: 600 }}>
                          {quizzes.filter((quiz, qi) => quizAnswers[qi] === quiz.correctIndex).length} of {quizzes.length} correct
                        </span>
                        <button
                          onClick={() => {
                            setQuizAnswers({});
                            setQuizChecked(false);
                          }}
                          style={{ padding: "8px 16px", borderRadius: 8, background: "transparent", border: `1.5px solid ${BORDER}`, color: FG_MUTED, cursor: "pointer", fontSize: 13, fontWeight: 700 }}
                        >
                          Try again
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <p style={{ fontSize: 14, color: FG_MUTED }}>No quiz available for this lesson yet.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ask AI */}
      <div className="flex-shrink-0 px-6 py-4" style={{ borderTop: `1px solid ${BORDER}` }}>
        <button onClick={onAiChat} style={{ width: "100%", maxWidth: 400, margin: "0 auto", padding: "13px 0", background: SECONDARY, color: ON_SECONDARY, border: "none", borderRadius: 10, cursor: "pointer", fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={ON_SECONDARY} strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
          Ask AI Teacher
        </button>
      </div>
    </div>
  );
}

function AiChatScreen({ lesson, onBack, onSignIn }: { lesson: LessonItem; onBack: () => void; onSignIn: () => void }) {
  const [messages, setMessages] = useState<{ role: "ai" | "user"; text: string }[]>([
    { role: "ai", text: `Hi! I'm here to help you with "${lesson.title}". What's giving you trouble?` },
  ]);
  const [apiLessonId, setApiLessonId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ kind: "signin" | "unavailable" | "error"; text: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadLessonDetail(lesson.id).then((detail) => {
      if (!detail) {
        setLoading(false);
        setNotice({ kind: "error", text: "This lesson couldn't be loaded, so the AI Teacher is unavailable right now." });
        return;
      }
      setApiLessonId(detail.id);
      if (!getTokens()) {
        setLoading(false);
        setNotice({ kind: "signin", text: "Sign in to chat with the AI Teacher about this lesson." });
        return;
      }
      fetchAiMessages(detail.id)
        .then((history) => {
          if (history.messages.length > 0) {
            setMessages(
              history.messages.map((m) => ({ role: m.role === "user" ? "user" : "ai", text: m.content }))
            );
          }
        })
        .catch((err) => {
          if (isAuthError(err)) setNotice({ kind: "signin", text: "Sign in to chat with the AI Teacher about this lesson." });
        })
        .finally(() => setLoading(false));
    });
  }, [lesson.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pending]);

  const send = () => {
    const text = input.trim();
    if (!text || pending || !apiLessonId) return;
    setInput("");
    setNotice(null);
    setMessages((prev) => [...prev, { role: "user", text }]);
    setPending(true);
    aiChat(apiLessonId, text)
      .then((r) => setMessages((prev) => [...prev, { role: "ai", text: r.reply }]))
      .catch((err) => {
        if (err instanceof ApiError && (err.status === 503 || err.code === "ai_unavailable")) {
          setNotice({ kind: "unavailable", text: "AI Teacher is temporarily unavailable. Your lesson content still works — try again in a moment." });
        } else if (isAuthError(err)) {
          setNotice({ kind: "signin", text: "Sign in to chat with the AI Teacher." });
        } else {
          setNotice({ kind: "error", text: err instanceof Error ? err.message : "Your message couldn't be sent. Please try again." });
        }
      })
      .finally(() => setPending(false));
  };

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--background)" }}>
      <div className="px-6 pt-4 pb-4 flex-shrink-0" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <BackButton onBack={onBack} label="Back to lesson" />
        <div className="flex items-center gap-3 mt-3">
          <div style={{ width: 38, height: 38, borderRadius: "50%", background: SECONDARY, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ON_SECONDARY} strokeWidth="2"><circle cx="12" cy="9" r="3" /></svg>
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: FG }}>AI Teacher</div>
            <div style={{ fontSize: 13, color: FG_MUTED }}>Scoped to this lesson only</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, padding: "6px 12px", background: CARD, borderRadius: 8, border: `1px solid ${BORDER}`, width: "fit-content" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={FG_MUTED} strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
          <span style={{ fontSize: 12, color: FG_MUTED }}>Answers based on: <strong style={{ color: FG }}>{lesson.title}</strong></span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4" style={{ maxWidth: 720, margin: "0 auto", width: "100%" }}>
        {loading && (
          <div style={{ fontSize: 14, color: FG_MUTED }}>Loading conversation…</div>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
            {msg.role === "ai" && (
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: SECONDARY, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginRight: 10, marginTop: 2 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={ON_SECONDARY} strokeWidth="2.5"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>
              </div>
            )}
            <div style={{ maxWidth: "75%", padding: "12px 16px", borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px", background: msg.role === "user" ? PRIMARY : CARD, border: msg.role === "ai" ? `1px solid ${BORDER}` : "none" }}>
              <p style={{ fontSize: 14, color: msg.role === "user" ? ON_PRIMARY : FG, lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap" }}>{msg.text}</p>
            </div>
          </div>
        ))}
        {pending && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{ maxWidth: "75%", padding: "12px 16px", borderRadius: "14px 14px 14px 4px", background: CARD, border: `1px solid ${BORDER}` }}>
              <p style={{ fontSize: 14, color: FG_MUTED, lineHeight: 1.6, margin: 0, fontStyle: "italic" }}>AI Teacher is thinking…</p>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex-shrink-0 px-6 pb-5 pt-3" style={{ borderTop: `1px solid ${BORDER}` }}>
        {notice && (
          <div style={{ maxWidth: 720, margin: "0 auto 10px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 14px", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10 }}>
            <span style={{ fontSize: 13, color: FG, lineHeight: 1.5 }}>{notice.text}</span>
            {notice.kind === "signin" && (
              <button onClick={onSignIn} style={{ padding: "7px 16px", borderRadius: 8, background: PRIMARY, color: ON_PRIMARY, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                Sign in
              </button>
            )}
          </div>
        )}
        <div className="flex gap-2 items-end" style={{ maxWidth: 720, margin: "0 auto" }}>
          <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="Ask about this lesson…" rows={1} style={{ flex: 1, padding: "12px 16px", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: 14, color: FG, lineHeight: 1.5, outline: "none", resize: "none" }} />
          <button onClick={send} disabled={!input.trim() || pending || !apiLessonId} style={{ width: 44, height: 44, borderRadius: 10, background: input.trim() && apiLessonId && !pending ? PRIMARY : BORDER, border: "none", cursor: input.trim() && apiLessonId && !pending ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={ON_PRIMARY} strokeWidth="2.2"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function LibraryScreen({
  onOpenLesson,
  onSignIn,
}: {
  onOpenLesson: (lessonSlug: string, courseSlug?: string, courseName?: string) => void;
  onSignIn: () => void;
}) {
  const [tab, setTab] = useState<"inprogress" | "saved">("inprogress");
  const [continueItems, setContinueItems] = useState<ContinueItem[] | null>(null);
  const [bookmarks, setBookmarks] = useState<BookmarkInfo[] | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    Promise.all([fetchContinueLearning(), fetchBookmarks()])
      .then(([cont, saved]) => {
        setContinueItems(cont.items);
        setBookmarks(saved.items);
      })
      .catch((err) => {
        if (isAuthError(err)) setSignedOut(true);
        else setFailed(true);
      });
  }, []);

  const loading = continueItems === null && bookmarks === null && !signedOut && !failed;

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--background)" }}>
      <div className="px-6 pt-4 pb-4 flex-shrink-0" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 600, color: FG }}>Library</h1>
        <div className="flex gap-0 mt-3" style={{ background: CARD, borderRadius: 10, padding: 3, maxWidth: 300 }}>
          {[{ id: "inprogress", label: "In Progress" }, { id: "saved", label: "Saved" }].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id as "inprogress" | "saved")} style={{ flex: 1, padding: "8px 0", background: tab === t.id ? SURFACE : "transparent", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, color: tab === t.id ? FG : FG_MUTED }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-6 pt-4" style={{ maxWidth: 720 }}>
        {signedOut && (
          <div style={{ background: CARD, borderRadius: 10, border: `1px solid ${BORDER}`, padding: "24px 20px", textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-serif)", fontSize: 17, fontWeight: 600, color: FG, marginBottom: 6 }}>Your library lives in your account</div>
            <p style={{ fontSize: 14, color: FG_MUTED, lineHeight: 1.6, marginBottom: 16 }}>
              Sign in to pick up where you left off and keep saved lessons across devices.
            </p>
            <button onClick={onSignIn} style={{ padding: "10px 24px", background: PRIMARY, color: ON_PRIMARY, border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 700 }}>
              Sign in
            </button>
          </div>
        )}
        {failed && (
          <div style={{ fontSize: 14, color: FG_MUTED }}>Your library couldn&apos;t be loaded right now. Please try again shortly.</div>
        )}
        {loading && <div style={{ fontSize: 14, color: FG_MUTED }}>Loading your library…</div>}

        {!signedOut && !failed && tab === "inprogress" && (
          <div className="flex flex-col gap-3">
            {(continueItems ?? []).map((item) => (
              <div key={item.lesson.id} style={{ background: CARD, borderRadius: 10, border: `1px solid ${BORDER}`, padding: "16px 20px" }}>
                <div style={{ fontFamily: "var(--font-serif)", fontSize: 16, fontWeight: 600, color: FG, marginBottom: 4 }}>{item.courseName}</div>
                <div style={{ fontSize: 14, color: FG, marginBottom: 4 }}>{item.lesson.title}</div>
                <div style={{ fontSize: 13, color: FG_MUTED, marginBottom: 10 }}>
                  {item.status === "completed" ? "Completed" : "In progress"} · {new Date(item.updatedAt).toLocaleDateString()}
                </div>
                <div className="flex items-center justify-end">
                  <button
                    onClick={() => onOpenLesson(item.lesson.slug, item.courseSlug, item.courseName)}
                    style={{ padding: "8px 18px", background: PRIMARY, color: ON_PRIMARY, border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700 }}
                  >
                    {item.status === "completed" ? "Review" : "Continue"}
                  </button>
                </div>
              </div>
            ))}
            {continueItems !== null && continueItems.length === 0 && (
              <div style={{ fontSize: 14, color: FG_MUTED, lineHeight: 1.6 }}>
                Nothing in progress yet. Open a lesson and mark it as started — it will show up here.
              </div>
            )}
          </div>
        )}

        {!signedOut && !failed && tab === "saved" && (
          <div className="flex flex-col gap-3">
            {(bookmarks ?? []).map((bm) => (
              <button
                key={bm.lessonId}
                onClick={() => onOpenLesson(bm.lessonSlug, bm.courseSlug, bm.courseName)}
                style={{ display: "flex", alignItems: "center", gap: 12, background: CARD, borderRadius: 10, padding: "14px 18px", border: `1px solid ${BORDER}`, cursor: "pointer", textAlign: "left" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill={PRIMARY} stroke={PRIMARY} strokeWidth="1.5"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" /></svg>
                <div className="flex-1">
                  <div style={{ fontSize: 15, fontWeight: 600, color: FG }}>{bm.lessonTitle}</div>
                  <div style={{ fontSize: 13, color: FG_MUTED, marginTop: 1 }}>{bm.courseName}</div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={FG_MUTED} strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
              </button>
            ))}
            {bookmarks !== null && bookmarks.length === 0 && (
              <div style={{ fontSize: 14, color: FG_MUTED, lineHeight: 1.6 }}>
                No saved lessons yet. Tap the bookmark icon on any lesson to keep it here.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileScreen({ onSubscription, onLogout }: { onSubscription: () => void; onLogout: () => void }) {
  // null = still loading / signed-out visitors resolve to null.
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [certificates, setCertificates] = useState<CertificateInfo[] | null>(null);
  const profile = getProfile();
  const displayName = profile?.name || profile?.email || "Your account";
  const initial = (profile?.name || profile?.email || "?").charAt(0).toUpperCase();

  useEffect(() => {
    fetchProfileStats()
      .then((s) => setStats(s))
      .catch(() => setStats(null));
    fetchMyCertificates()
      .then((list) => setCertificates(list))
      .catch(() => setCertificates([]));
  }, []);

  const tiles = [
    { label: "Lessons Done", value: stats ? String(stats.lessonsCompleted) : "—" },
    { label: "Courses Done", value: stats ? String(stats.coursesCompleted) : "—" },
    { label: "Quizzes Taken", value: stats ? String(stats.quizzesTaken) : "—" },
  ];

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--background)" }}>
      <div className="flex-1 overflow-y-auto px-6" style={{ maxWidth: 720 }}>
        <div className="pt-6 pb-5" style={{ borderBottom: `1px solid ${BORDER}` }}>
          <div className="flex items-center gap-4">
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: SECONDARY, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 24, fontWeight: 700, color: ON_SECONDARY }}>{initial}</span>
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 600, color: FG }}>{displayName}</div>
              {profile?.email && profile.name && <div style={{ fontSize: 14, color: FG_MUTED }}>{profile.email}</div>}
              <div style={{ marginTop: 4, display: "inline-flex", alignItems: "center", gap: 5, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 6, padding: "3px 10px" }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill={FG_MUTED}><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" /></svg>
                <span style={{ fontSize: 12, fontWeight: 600, color: FG_MUTED }}>Free plan</span>
              </div>
            </div>
          </div>
        </div>
        <div className="py-5" style={{ borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: FG_MUTED, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 12 }}>Your progress</div>
          <div className="flex gap-4">
            {tiles.map((stat) => (
              <div key={stat.label} style={{ flex: 1, background: CARD, borderRadius: 10, padding: "16px 12px", border: `1px solid ${BORDER}`, textAlign: "center" }}>
                <div style={{ fontFamily: "var(--font-serif)", fontSize: 24, fontWeight: 600, color: PRIMARY }}>{stat.value}</div>
                <div style={{ fontSize: 12, color: FG_MUTED, marginTop: 4 }}>{stat.label}</div>
              </div>
            ))}
          </div>
          {stats && stats.quizzesTaken > 0 && stats.avgQuizScore !== null && (
            <div style={{ fontSize: 13, color: FG_MUTED, marginTop: 10 }}>
              Average quiz score: <strong style={{ color: FG }}>{Math.round(stats.avgQuizScore * 100)}%</strong>
            </div>
          )}
          {stats === null && (
            <div style={{ fontSize: 13, color: FG_MUTED, marginTop: 10 }}>Sign in to sync your progress across devices.</div>
          )}
        </div>
        <div className="py-5" style={{ borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: FG_MUTED, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 12 }}>Credentials</div>
          {certificates && certificates.length > 0 ? (
            <CertificateList certificates={certificates} />
          ) : (
            <p style={{ fontSize: 14, color: FG_MUTED, lineHeight: 1.6 }}>
              {certificates === null
                ? "Loading your credentials…"
                : "No credentials yet. Pass a course final test to earn a verifiable certificate."}
            </p>
          )}
        </div>
        <div className="py-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
          <button onClick={onSubscription} style={{ width: "100%", padding: "16px 20px", background: PRIMARY, borderRadius: 10, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, textAlign: "left" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={ON_PRIMARY} strokeWidth="1.8"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" /></svg>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: ON_PRIMARY }}>Upgrade to Premium</div>
              <div style={{ fontSize: 13, color: "rgb(var(--shadow-color) / 0.6)", marginTop: 1 }}>Remove all ads · Learn without interruptions</div>
            </div>
          </button>
        </div>
        <div className="py-3">
          {[{ icon: "\u{1F310}", label: "Language", value: "English" }, { icon: "\u{1F514}", label: "Notifications", value: "On" }, { icon: "\u{1F512}", label: "Privacy & Data", value: "" }, { icon: "\u{1F4B3}", label: "Subscription", value: "Free", action: onSubscription }, { icon: "\u2753", label: "Help & Support", value: "" }].map((row, i) => (
            <button key={i} onClick={row.action} style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "14px 0", background: "none", border: "none", cursor: "pointer", borderBottom: i < 4 ? `1px solid ${BORDER}` : "none", textAlign: "left" }}>
              <span style={{ fontSize: 18 }}>{row.icon}</span>
              <span style={{ fontSize: 15, fontWeight: 500, color: FG, flex: 1 }}>{row.label}</span>
              {row.value && <span style={{ fontSize: 13, color: FG_MUTED }}>{row.value}</span>}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={BORDER} strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
            </button>
          ))}
        </div>
        <div className="pb-6">
          <button onClick={onLogout} style={{ width: "100%", padding: "14px 0", background: "transparent", border: `1.5px solid ${BORDER}`, borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 600, color: FG_MUTED }}>Log Out</button>
        </div>
      </div>
    </div>
  );
}

function SubscriptionScreen({ onBack }: { onBack: () => void }) {
  const [selected, setSelected] = useState<"monthly" | "annual">("annual");
  return (
    <div className="flex flex-col h-full" style={{ background: "var(--background)" }}>
      <div className="px-6 pt-4 pb-4 flex-shrink-0" style={{ borderBottom: `1px solid ${BORDER}` }}><BackButton onBack={onBack} /></div>
      <div className="flex-1 overflow-y-auto px-6 py-6" style={{ maxWidth: 560, margin: "0 auto" }}>
        <div className="text-center mb-8">
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 56, height: 56, background: PRIMARY, borderRadius: 16, marginBottom: 16 }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={ON_PRIMARY} strokeWidth="1.8"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" /></svg>
          </div>
          <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 26, fontWeight: 600, color: FG, lineHeight: 1.3 }}>Learn Without Interruptions</h1>
          <p style={{ fontSize: 15, color: FG_MUTED, marginTop: 8, lineHeight: 1.6 }}>Premium removes every ad, so nothing breaks your flow mid-lesson.</p>
        </div>
        <div className="flex gap-4 mb-8">
          <div style={{ flex: 1, background: CARD, borderRadius: 10, border: `1px solid ${BORDER}`, overflow: "hidden" }}>
            <div style={{ padding: "14px 16px", borderBottom: `1px solid ${BORDER}` }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: FG }}>Free</div>
              <div style={{ fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 600, color: FG, marginTop: 2 }}>$0</div>
            </div>
            <div style={{ padding: "14px 16px" }}>
              {[1, 2].map((n) => (
                <div key={n}>
                  <div style={{ fontSize: 13, color: FG_MUTED, lineHeight: 1.5, marginBottom: 4 }}>Lesson {n}</div>
                  <div style={{ borderRadius: 6, background: BORDER, height: 24, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}><span style={{ fontSize: 9, color: FG_MUTED, letterSpacing: 0.6, textTransform: "uppercase", fontWeight: 700 }}>Ad</span></div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, background: SURFACE, borderRadius: 10, border: `2px solid ${PRIMARY}`, overflow: "hidden" }}>
            <div style={{ padding: "14px 16px", borderBottom: `1px solid ${CARD}`, background: "rgb(var(--shadow-color) / 0.04)" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: PRIMARY }}>Premium</div>
              <div style={{ fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 600, color: FG, marginTop: 2 }}>{selected === "annual" ? "$4.99" : "$7.99"}<span style={{ fontSize: 13, color: FG_MUTED }}>/mo</span></div>
            </div>
            <div style={{ padding: "14px 16px" }}>
              {["Lesson 1", "Lesson 2", "Lesson 3"].map((l) => <div key={l} style={{ fontSize: 13, color: FG_MUTED, lineHeight: 1.6 }}>{l}</div>)}
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 8 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={SUCCESS} strokeWidth="2.5"><path d="M5 13l4 4L19 7" /></svg>
                <span style={{ fontSize: 12, color: SUCCESS, fontWeight: 700 }}>No ads, ever</span>
              </div>
            </div>
          </div>
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, color: FG_MUTED, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 10 }}>Choose your plan</div>
        <div className="flex flex-col gap-3 mb-6">
          {[{ id: "annual", label: "Annual", price: "$4.99/mo", note: "Billed $59.88/year · Save 38%", badge: "Best value" }, { id: "monthly", label: "Monthly", price: "$7.99/mo", note: "Billed monthly, cancel anytime", badge: "" }].map((plan) => (
            <button key={plan.id} onClick={() => setSelected(plan.id as "monthly" | "annual")} style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", borderRadius: 10, cursor: "pointer", background: selected === plan.id ? "rgb(var(--shadow-color) / 0.04)" : CARD, border: selected === plan.id ? `2px solid ${PRIMARY}` : `1.5px solid ${BORDER}`, textAlign: "left" }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", border: selected === plan.id ? `6px solid ${PRIMARY}` : `2px solid ${BORDER}`, flexShrink: 0 }} />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 15, fontWeight: 700, color: FG }}>{plan.label}</span>
                  {plan.badge && <span style={{ background: PRIMARY, color: ON_PRIMARY, fontSize: 10, fontWeight: 700, borderRadius: 4, padding: "2px 8px", textTransform: "uppercase", letterSpacing: 0.6 }}>{plan.badge}</span>}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: FG, marginTop: 2 }}>{plan.price}</div>
                <div style={{ fontSize: 12, color: FG_MUTED, marginTop: 1 }}>{plan.note}</div>
              </div>
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 mb-8">
          {["No ads on any lesson", "Full access to all courses and skill tracks", "Offline lesson downloads", "Priority AI Teacher responses"].map((feat) => (
            <div key={feat} className="flex items-center gap-3">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={SUCCESS} strokeWidth="2.5"><path d="M5 13l4 4L19 7" /></svg>
              <span style={{ fontSize: 14, color: FG }}>{feat}</span>
            </div>
          ))}
        </div>
        <button style={{ width: "100%", padding: "16px 0", background: PRIMARY, color: ON_PRIMARY, border: "none", borderRadius: 10, cursor: "pointer", fontSize: 16, fontWeight: 700, boxShadow: "0 2px 12px rgb(var(--shadow-color) / 0.3)" }}>
          Start {selected === "annual" ? "Annual" : "Monthly"} Premium
        </button>
        <p style={{ textAlign: "center", fontSize: 12, color: FG_MUTED, marginTop: 10 }}>7-day free trial · Cancel anytime in settings</p>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Register screen — name + email + password with show/hide toggle
   ──────────────────────────────────────────────────────────────────────────── */
function RegisterScreen({ onRegister, onBack }: { onRegister: () => void; onBack: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email || !password) { setError("All fields are required."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    setError("");
    try {
      const pair = await apiRegister(name.trim(), email, password);
      saveTokens(pair);
      onRegister();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
      <div style={{ width: "100%", maxWidth: 400, padding: 32 }}>
        <button onClick={onBack} className="flex items-center gap-1.5 mb-8" style={{ background: "none", border: "none", cursor: "pointer", color: SECONDARY, fontWeight: 600, fontSize: 14 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={SECONDARY} strokeWidth="2.2"><path d="M15 18l-6-6 6-6" /></svg>
          Back
        </button>
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontFamily: "var(--font-serif)", fontSize: 28, fontWeight: 700, color: FG, marginBottom: 4 }}>Create Account</div>
          <div style={{ fontSize: 14, color: FG_MUTED }}>Start learning with Dera Skul</div>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: FG_MUTED, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>Full Name</label>
            <input type="text" value={name} onChange={(e) => { setName(e.target.value); setError(""); }} placeholder="Your full name"
              style={{ width: "100%", padding: "12px 14px", borderRadius: 8, border: `1.5px solid ${BORDER}`, background: CARD, color: FG, fontSize: 15, outline: "none" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = PRIMARY)} onBlur={(e) => (e.currentTarget.style.borderColor = BORDER)} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: FG_MUTED, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>Email</label>
            <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} placeholder="you@example.com"
              style={{ width: "100%", padding: "12px 14px", borderRadius: 8, border: `1.5px solid ${BORDER}`, background: CARD, color: FG, fontSize: 15, outline: "none" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = PRIMARY)} onBlur={(e) => (e.currentTarget.style.borderColor = BORDER)} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: FG_MUTED, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>Password</label>
            <div style={{ position: "relative" }}>
              <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }} placeholder="At least 8 characters"
                style={{ width: "100%", padding: "12px 40px 12px 14px", borderRadius: 8, border: `1.5px solid ${BORDER}`, background: CARD, color: FG, fontSize: 15, outline: "none" }}
                onFocus={(e) => (e.currentTarget.style.borderColor = PRIMARY)} onBlur={(e) => (e.currentTarget.style.borderColor = BORDER)} />
              <button type="button" onClick={() => setShowPassword((v) => !v)}
                style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: FG_MUTED, padding: 4 }} tabIndex={-1}>
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                )}
              </button>
            </div>
          </div>
          {error && <div style={{ fontSize: 13, color: "#ef4444", marginBottom: 12 }}>{error}</div>}
          <button type="submit" disabled={loading}
            style={{ width: "100%", padding: "14px 0", borderRadius: 10, border: "none", cursor: loading ? "wait" : "pointer", background: loading ? FG_MUTED : PRIMARY, color: ON_PRIMARY, fontSize: 16, fontWeight: 700, boxShadow: "0 2px 12px rgb(var(--shadow-color) / 0.3)", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>
        <div style={{ textAlign: "center", marginTop: 24, fontSize: 13, color: FG_MUTED }}>
          Already have an account?{" "}
          <button onClick={onBack} style={{ color: PRIMARY, background: "none", border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>Log In</button>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Login screen — email + password with show/hide toggle
   ──────────────────────────────────────────────────────────────────────────── */
function LoginScreen({ onLogin, onBack }: { onLogin: () => void; onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError("Both fields are required."); return; }
    setLoading(true);
    setError("");
    try {
      const pair = await apiLogin(email, password);
      saveTokens(pair);
      onLogin();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
      <div style={{ width: "100%", maxWidth: 400, padding: 32 }}>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 mb-8"
          style={{ background: "none", border: "none", cursor: "pointer", color: SECONDARY, fontWeight: 600, fontSize: 14 }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={SECONDARY} strokeWidth="2.2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Back
        </button>

        <div style={{ marginBottom: 32 }}>
          <div style={{ fontFamily: "var(--font-serif)", fontSize: 28, fontWeight: 700, color: FG, marginBottom: 4 }}>Sign in</div>
          <div style={{ fontSize: 14, color: FG_MUTED }}>Welcome back to Dera Skul</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: FG_MUTED, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              placeholder="you@example.com"
              style={{ width: "100%", padding: "12px 14px", borderRadius: 8, border: `1.5px solid ${BORDER}`, background: CARD, color: FG, fontSize: 15, outline: "none" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = PRIMARY)}
              onBlur={(e) => (e.currentTarget.style.borderColor = BORDER)}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: FG_MUTED, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>Password</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                placeholder="••••••••"
                style={{ width: "100%", padding: "12px 40px 12px 14px", borderRadius: 8, border: `1.5px solid ${BORDER}`, background: CARD, color: FG, fontSize: 15, outline: "none" }}
                onFocus={(e) => (e.currentTarget.style.borderColor = PRIMARY)}
                onBlur={(e) => (e.currentTarget.style.borderColor = BORDER)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: FG_MUTED, padding: 4 }}
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && <div style={{ fontSize: 13, color: "#ef4444", marginBottom: 12 }}>{error}</div>}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%", padding: "14px 0", borderRadius: 10, border: "none", cursor: loading ? "wait" : "pointer",
              background: loading ? FG_MUTED : PRIMARY, color: ON_PRIMARY, fontSize: 16, fontWeight: 700,
              boxShadow: "0 2px 12px rgb(var(--shadow-color) / 0.3)", opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 24, fontSize: 13, color: FG_MUTED }}>
          Don&apos;t have an account?{" "}
          <button onClick={onBack} style={{ color: PRIMARY, background: "none", border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
            Sign Up
          </button>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Resources screen — browse & read PDFs, download gated by admin settings
   ──────────────────────────────────────────────────────────────────────────── */
function ResourcesScreen({ onBack }: { onBack: () => void }) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [previewRes, setPreviewRes] = useState<{ id: string; title: string; fileName: string; category: string; pageFlip: boolean; allowDownload: boolean } | null>(null);
  const [resources, setResources] = useState<{ id: string; title: string; description: string; fileName: string; fileSize: string; category: string; pageFlip: boolean; allowDownload: boolean }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResources()
      .then((data) => {
        setResources(data.map((r) => ({
          id: r.id,
          title: r.title,
          description: r.description || "",
          fileName: r.fileName,
          fileSize: r.fileSize || "",
          category: r.categoryName || "Uncategorized",
          pageFlip: r.pageFlipEnabled,
          allowDownload: r.allowDownload,
        })));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const categories = ["All", ...Array.from(new Set(resources.map((r) => r.category)))];
  const filtered = resources.filter((r) => {
    const matchSearch = r.title.toLowerCase().includes(search.toLowerCase()) || r.description.toLowerCase().includes(search.toLowerCase());
    const matchCat = selectedCategory === "All" || r.category === selectedCategory;
    return matchSearch && matchCat;
  });

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: 32 }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <BackButton onBack={onBack} />
        <h1 style={{ fontSize: 24, fontWeight: 700, color: FG }}>Resources</h1>
      </div>
      <p style={{ fontSize: 14, color: FG_MUTED, marginBottom: 24 }}>
        Browse and read PDF guides, cheat sheets, and reference materials uploaded by your instructors.
      </p>

      {/* Search & filters */}
      <div className="flex gap-3 mb-6">
        <input
          type="text"
          placeholder="Search resources..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, padding: "10px 14px", borderRadius: 8, border: `1.5px solid ${BORDER}`, background: CARD, color: FG, fontSize: 14, outline: "none" }}
        />
        <div className="flex gap-2 flex-wrap">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedCategory(c)}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: `1.5px solid ${selectedCategory === c ? PRIMARY : BORDER}`,
                background: selectedCategory === c ? PRIMARY : CARD,
                color: selectedCategory === c ? ON_PRIMARY : FG_MUTED,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 48 }}>
          <div style={{ fontSize: 14, color: FG_MUTED }}>Loading resources...</div>
        </div>
      ) : (
        <>
          {/* Resource grid */}
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
            {filtered.map((r) => (
              <div
                key={r.id}
                style={{ borderRadius: 10, border: `1.5px solid ${BORDER}`, background: CARD, padding: 20, cursor: "pointer", transition: "border-color 0.15s" }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = PRIMARY)}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = BORDER)}
                onClick={() => setPreviewRes(r)}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div style={{ width: 44, height: 44, borderRadius: 8, background: SURFACE, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={PRIMARY} strokeWidth="1.5">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                      <polyline points="14,2 14,8 20,8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: FG, marginBottom: 2 }}>{r.title}</div>
                    <div style={{ fontSize: 12, color: FG_MUTED }}>{r.fileSize && `${r.fileSize} · `}{r.category}</div>
                  </div>
                  {r.allowDownload && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: SUCCESS, background: "rgb(122 158 126 / 0.15)", padding: "2px 8px", borderRadius: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>
                      Downloadable
                    </span>
                  )}
                  {!r.allowDownload && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: SECONDARY, background: "rgb(110 132 160 / 0.15)", padding: "2px 8px", borderRadius: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>
                      Read-only
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 13, color: FG_MUTED, lineHeight: 1.5 }}>{r.description}</p>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: 48 }}>
              <div style={{ fontSize: 14, color: FG_MUTED }}>No resources found</div>
            </div>
          )}
        </>
      )}

      {/* Preview modal */}
      {previewRes && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setPreviewRes(null)}>
          <div
            style={{ width: "90%", maxWidth: 700, maxHeight: "80vh", borderRadius: 12, border: `1.5px solid ${BORDER}`, background: CARD, display: "flex", flexDirection: "column", overflow: "hidden" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between" style={{ padding: "16px 20px", borderBottom: `1px solid ${BORDER}` }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: FG }}>{previewRes.title}</div>
                <div style={{ fontSize: 12, color: FG_MUTED }}>{previewRes.fileName}</div>
              </div>
              <div className="flex gap-2">
                {previewRes.allowDownload ? (
                  <button
                    style={{ padding: "8px 16px", borderRadius: 8, background: PRIMARY, color: ON_PRIMARY, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                    onClick={() => alert("Downloading PDF...")}
                  >
                    Download PDF
                  </button>
                ) : (
                  <button
                    style={{ padding: "8px 16px", borderRadius: 8, background: SECONDARY, color: ON_SECONDARY, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                    onClick={() => alert("Download not available for this resource")}
                  >
                    Read Only
                  </button>
                )}
                <button
                  onClick={() => setPreviewRes(null)}
                  style={{ padding: "8px 16px", borderRadius: 8, background: "none", border: `1.5px solid ${BORDER}`, color: FG_MUTED, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                >
                  Close
                </button>
              </div>
            </div>
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 32, background: SURFACE }}>
              <div style={{ textAlign: "center" }}>
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke={FG_MUTED} strokeWidth="1">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <polyline points="14,2 14,8 20,8" />
                </svg>
                <div style={{ fontSize: 14, color: FG_MUTED, marginTop: 12 }}>
                  {previewRes.pageFlip ? "Page flip viewer" : "PDF viewer"} — {previewRes.fileName}
                </div>
                <div style={{ fontSize: 12, color: FG_MUTED, marginTop: 4 }}>In production, this renders the full PDF inline.</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   App root
   ──────────────────────────────────────────────────────────────────────────── */

export default function App() {
  const [nav, setNav] = useState<NavState>(() => ({
    screen: getTokens() ? "home" : "welcome",
  }));
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [completedSlugs, setCompletedSlugs] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    loadCategories().then(setCategories).catch(console.error);
  }, []);

  const go = (screen: Screen, extra?: Partial<NavState>) => setNav((n) => ({ ...n, screen, ...extra }));

  const handleLogout = async () => {
    await apiLogout();
    setCompletedSlugs(new Set());
    setNav({ screen: "welcome" });
  };

  const markProgress = (lessonSlug: string, done: boolean) => {
    setCompletedSlugs((prev) => {
      const next = new Set(prev);
      if (done) next.add(lessonSlug);
      else next.delete(lessonSlug);
      return next;
    });
  };

  const openCourse = (courseSlug: string) => {
    loadCourseDetail(courseSlug).then((detail) => {
      if (detail) go("course", { course: detail, subcategory: undefined });
    });
  };

  const openLesson = (lessonSlug: string, courseSlug?: string, courseName?: string) => {
    const placeholder: LessonItem = { id: lessonSlug, title: lessonSlug.replace(/-/g, " "), duration: "", videoId: "" };
    if (!courseSlug) {
      go("lesson", { lesson: placeholder, course: undefined, subcategory: undefined });
      return;
    }
    loadCourseDetail(courseSlug).then((detail) => {
      go("lesson", {
        lesson: placeholder,
        subcategory: undefined,
        course: detail ?? (courseName ? { id: courseSlug, title: courseName, instructor: "", duration: "", lessons: [], level: "", description: "" } : undefined),
      });
    });
  };

  const handleBottomNav = (tab: "home" | "learn" | "library" | "profile" | "resources") => {
    if (tab === "home") go("home");
    else if (tab === "learn") {
      if (categories.length > 0) go("category", { category: categories[0] });
      else loadCategories().then((cats) => { if (cats.length > 0) go("category", { category: cats[0] }); else go("home"); });
    }
    else if (tab === "library") go("library");
    else if (tab === "profile") go("profile");
    else if (tab === "resources") go("resources");
  };

  const isWelcome = nav.screen === "welcome" || nav.screen === "interests" || nav.screen === "login" || nav.screen === "register";

  const render = () => {
    switch (nav.screen) {
      case "welcome":
        return <WelcomeScreen onGetStarted={() => go("register")} onLogin={() => go("login")} />;
      case "register":
        return <RegisterScreen onRegister={() => go("interests")} onBack={() => go("login")} />;
      case "login":
        return <LoginScreen onLogin={() => go("home")} onBack={() => go("register")} />;
      case "interests":
        return <InterestsScreen onContinue={() => go("home")} />;
      case "home":
        return (
          <HomeScreen
            onCategory={(cat) => go("category", { category: cat })}
            onOpenCourse={openCourse}
            onOpenLesson={(slug) => openLesson(slug)}
          />
        );
      case "category":
        return nav.category ? <CategoryScreen category={nav.category} onBack={() => go("home")} onSubcategory={(sub) => go("subcategory", { subcategory: sub })} /> : null;
      case "subcategory":
        return nav.category && nav.subcategory ? <SubcategoryScreen category={nav.category} subcategory={nav.subcategory} onBack={() => go("category")} onCourse={(course) => go("course", { course })} /> : null;
      case "course":
        return nav.course ? <CourseScreen course={nav.course} completedSlugs={completedSlugs} onBack={() => go(nav.subcategory ? "subcategory" : "home")} onLesson={(lesson) => go("lesson", { lesson })} /> : null;
      case "lesson":
        return nav.lesson ? (
          <LessonScreen
            key={nav.lesson.id}
            lesson={nav.lesson}
            course={nav.course}
            onBack={() => go(nav.course ? "course" : "home")}
            onAiChat={() => go("ai-chat")}
            onProgressChange={markProgress}
          />
        ) : null;
      case "ai-chat":
        return nav.lesson ? (
          <AiChatScreen key={nav.lesson.id} lesson={nav.lesson} onBack={() => go("lesson")} onSignIn={() => go("login")} />
        ) : null;
      case "library":
        return <LibraryScreen onOpenLesson={openLesson} onSignIn={() => go("login")} />;
      case "resources":
        return <ResourcesScreen onBack={() => go("home")} />;
      case "profile":
        return <ProfileScreen onSubscription={() => go("subscription")} onLogout={handleLogout} />;
      case "subscription":
        return <SubscriptionScreen onBack={() => go("profile")} />;
      default:
        return null;
    }
  };

  if (isWelcome) {
    return (
      <div style={{ background: "var(--background)", minHeight: "100vh" }}>
        <div style={{ position: "fixed", top: 16, right: 16, zIndex: 50 }}>
          <ThemeToggle />
        </div>
        {render()}
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--background)" }}>
      <Sidebar active={nav.screen === "category" || nav.screen === "subcategory" || nav.screen === "course" || nav.screen === "lesson" || nav.screen === "ai-chat" ? "learn" : nav.screen} onNav={handleBottomNav} collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((c) => !c)} />
      <main className="flex-1 overflow-hidden flex flex-col">{render()}</main>
    </div>
  );
}
