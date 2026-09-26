type View = "dashboard" | "taxonomy" | "lesson-editor" | "resources" | "review" | "campus-library" | "certificates" | "blog" | "ai-assistant" | "ai-settings" | "quick-setup" | "quick-lesson";

interface Props {
  activeView: View;
  onNavigate: (v: View) => void;
  onLogout: () => void;
}

const IconTree = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <rect x="0.5" y="0.5" width="4" height="3" rx="0.5" stroke="currentColor" strokeWidth="1" />
    <rect x="0.5" y="10.5" width="4" height="3" rx="0.5" stroke="currentColor" strokeWidth="1" />
    <rect x="9.5" y="5.5" width="4" height="3" rx="0.5" stroke="currentColor" strokeWidth="1" />
    <path d="M4.5 2H7V12H4.5" stroke="currentColor" strokeWidth="1" fill="none" />
    <path d="M7 7H9.5" stroke="currentColor" strokeWidth="1" />
  </svg>
);

const IconDoc = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <rect x="2" y="1" width="10" height="12" rx="1" stroke="currentColor" strokeWidth="1" />
    <line x1="4.5" y1="4.5" x2="9.5" y2="4.5" stroke="currentColor" strokeWidth="0.9" />
    <line x1="4.5" y1="6.5" x2="9.5" y2="6.5" stroke="currentColor" strokeWidth="0.9" />
    <line x1="4.5" y1="8.5" x2="7.5" y2="8.5" stroke="currentColor" strokeWidth="0.9" />
  </svg>
);

const IconFile = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M8 1H4a1 1 0 00-1 1v10a1 1 0 001 1h6a1 1 0 001-1V5L8 1z" stroke="currentColor" strokeWidth="1" />
    <polyline points="8,1 8,5 12,5" stroke="currentColor" strokeWidth="1" fill="none" />
    <line x1="5" y1="7.5" x2="9" y2="7.5" stroke="currentColor" strokeWidth="0.8" />
    <line x1="5" y1="9.5" x2="8" y2="9.5" stroke="currentColor" strokeWidth="0.8" />
  </svg>
);

const IconShield = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M7 1L12 3V7C12 10 9.8 12.2 7 13C4.2 12.2 2 10 2 7V3L7 1Z" stroke="currentColor" strokeWidth="1" fill="none" />
    <path d="M5 7L6.5 8.5L9.5 5.5" stroke="currentColor" strokeWidth="1" fill="none" />
  </svg>
);

const IconBot = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <rect x="3" y="2" width="8" height="9" rx="1.5" stroke="currentColor" strokeWidth="1" />
    <circle cx="5.5" cy="6" r="1" fill="currentColor" />
    <circle cx="8.5" cy="6" r="1" fill="currentColor" />
    <line x1="7" y1="11" x2="7" y2="13" stroke="currentColor" strokeWidth="1" />
    <line x1="5" y1="13" x2="9" y2="13" stroke="currentColor" strokeWidth="1" />
    <line x1="3" y1="5" x2="1" y2="5" stroke="currentColor" strokeWidth="1" />
    <line x1="11" y1="5" x2="13" y2="5" stroke="currentColor" strokeWidth="1" />
  </svg>
);

const IconGear = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1" />
    <path d="M7 1v2M7 11v2M1 7h2M11 7h2M2.8 2.8l1.4 1.4M9.8 9.8l1.4 1.4M11.2 2.8l-1.4 1.4M4.2 9.8l-1.4 1.4" stroke="currentColor" strokeWidth="1" />
  </svg>
);

const IconBook = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M2 1h4a1 1 0 011 1v11a1 1 0 00-1-1H2V1z" stroke="currentColor" strokeWidth="1" fill="none" />
    <path d="M12 1H8a1 1 0 00-1 1v11a1 1 0 011-1h5V1z" stroke="currentColor" strokeWidth="1" fill="none" />
  </svg>
);

const IconHome = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M2 7L7 2L12 7V12C12 12.5 11.5 13 11 13H9V9H5V13H3C2.5 13 2 12.5 2 12V7Z" stroke="currentColor" strokeWidth="1" fill="none" />
  </svg>
);

const IconBolt = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M8 1L3 8H7L6 13L11 6H7L8 1Z" stroke="currentColor" strokeWidth="1" fill="none" />
  </svg>
);

const IconAward = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <circle cx="7" cy="5" r="3.5" stroke="currentColor" strokeWidth="1" />
    <path d="M5 8L4 13L7 11L10 13L9 8" stroke="currentColor" strokeWidth="1" fill="none" />
  </svg>
);

const IconPen = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M9.5 1.5L12.5 4.5L5 12H2V9L9.5 1.5Z" stroke="currentColor" strokeWidth="1" fill="none" />
    <line x1="8" y1="3" x2="11" y2="6" stroke="currentColor" strokeWidth="1" />
  </svg>
);

const contentTools = [
  { id: "dashboard" as View, label: "Quick Actions", Icon: IconHome },
  { id: "taxonomy" as View, label: "Taxonomy Manager", Icon: IconTree },
  { id: "lesson-editor" as View, label: "Lesson Editor", Icon: IconDoc },
  { id: "resources" as View, label: "Resources", Icon: IconFile },
  { id: "review" as View, label: "Review Queue", Icon: IconShield },
  { id: "campus-library" as View, label: "Campus Library", Icon: IconBook },
  { id: "certificates" as View, label: "Certificates", Icon: IconAward },
  { id: "blog" as View, label: "Blog Manager", Icon: IconPen },
];

const aiTools = [
  { id: "ai-assistant" as View, label: "AI Assistant", Icon: IconBot },
  { id: "ai-settings" as View, label: "AI Settings", Icon: IconGear },
];

export default function Sidebar({ activeView, onNavigate, onLogout }: Props) {
  return (
    <aside className="flex flex-col w-52 shrink-0 border-r" style={{ background: "#141414", borderColor: "#262626" }}>
      <div className="px-5 pt-5 pb-4 border-b" style={{ borderColor: "#262626" }}>
        <div className="font-mono text-xs tracking-widest" style={{ color: "#f59e0b" }}>
          DERA ADMIN
        </div>
        <div className="font-mono text-xs mt-0.5" style={{ color: "#5c5c5c" }}>
          Content Management
        </div>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-0.5 scrollable-dark">
        <div className="px-3 pb-1.5">
          <span className="font-mono text-xs" style={{ color: "#4a4a4a" }}>
            TOOLS
          </span>
        </div>
        {contentTools.map(({ id, label, Icon }) => {
          const active = activeView === id;
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-all"
              style={{
                background: active ? "#1f1f1f" : "transparent",
                color: active ? "#e5e5e5" : "#6b6b6b",
                borderLeft: active ? "2px solid #f59e0b" : "2px solid transparent",
                borderRadius: "2px",
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.color = "#9a9a9a";
                  e.currentTarget.style.background = "#1a1a1a";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.color = "#6b6b6b";
                  e.currentTarget.style.background = "transparent";
                }
              }}
            >
              <Icon />
              <span className="font-mono text-xs flex-1">{label}</span>
            </button>
          );
        })}

        <div className="px-3 pt-4 pb-1.5">
          <span className="font-mono text-xs" style={{ color: "#4a4a4a" }}>
            AI
          </span>
        </div>
        {aiTools.map(({ id, label, Icon }) => {
          const active = activeView === id;
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-all"
              style={{
                background: active ? "#1f1f1f" : "transparent",
                color: active ? "#e5e5e5" : "#6b6b6b",
                borderLeft: active ? "2px solid #f59e0b" : "2px solid transparent",
                borderRadius: "2px",
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.color = "#9a9a9a";
                  e.currentTarget.style.background = "#1a1a1a";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.color = "#6b6b6b";
                  e.currentTarget.style.background = "transparent";
                }
              }}
            >
              <Icon />
              <span className="font-mono text-xs flex-1">{label}</span>
            </button>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t" style={{ borderColor: "#262626" }}>
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs font-semibold shrink-0" style={{ background: "#232323", color: "#f59e0b" }}>
            A
          </div>
          <div className="min-w-0">
            <div className="font-mono text-xs truncate" style={{ color: "#8f8f8f" }}>
              admin@deraskul.com
            </div>
            <div className="font-mono text-xs" style={{ color: "#5c5c5c", fontSize: "10px" }}>
              Administrator
            </div>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full font-mono text-xs py-1.5 px-2 transition-colors text-left"
          style={{ color: "#4a4a4a", borderRadius: "2px" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#ef4444";
            e.currentTarget.style.background = "#1a1414";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "#4a4a4a";
            e.currentTarget.style.background = "transparent";
          }}
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
