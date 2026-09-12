type View = "taxonomy" | "lesson-editor" | "review" | "resources";

interface Props {
  activeView: View;
  onNavigate: (v: View) => void;
  flaggedCount: number;
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

const IconFlag = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M3 1.5v11M3 1.5h7.5l-2 3.5 2 3.5H3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
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

const navItems = [
  { id: "taxonomy" as View, label: "Taxonomy Manager", Icon: IconTree },
  { id: "lesson-editor" as View, label: "Lesson Editor", Icon: IconDoc },
  { id: "resources" as View, label: "Resources", Icon: IconFile },
  { id: "review" as View, label: "Review Queue", Icon: IconFlag },
];

export default function Sidebar({ activeView, onNavigate, flaggedCount, onLogout }: Props) {
  return (
    <aside className="flex flex-col w-52 shrink-0 border-r" style={{ background: "#141414", borderColor: "#262626" }}>
      {/* Logo */}
      <div className="px-5 pt-5 pb-4 border-b" style={{ borderColor: "#262626" }}>
        <div className="font-mono text-xs tracking-widest" style={{ color: "#f59e0b" }}>
          PROFY ADMIN
        </div>
        <div className="font-mono text-xs mt-0.5" style={{ color: "#5c5c5c" }}>
          Content Management
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 scrollable-dark">
        <div className="px-3 pb-1.5">
          <span className="font-mono text-xs" style={{ color: "#4a4a4a" }}>
            TOOLS
          </span>
        </div>
        {navItems.map(({ id, label, Icon }) => {
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
              {id === "review" && flaggedCount > 0 && (
                <span className="font-mono text-xs px-1.5 py-0.5 rounded-sm" style={{ background: "#dc2626", color: "#fff", fontSize: "10px" }}>
                  {flaggedCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t" style={{ borderColor: "#262626" }}>
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs font-semibold shrink-0" style={{ background: "#232323", color: "#f59e0b" }}>
            SC
          </div>
          <div className="min-w-0">
            <div className="font-mono text-xs truncate" style={{ color: "#8f8f8f" }}>
              sarah@profy.io
            </div>
            <div className="font-mono text-xs" style={{ color: "#5c5c5c", fontSize: "10px" }}>
              Curator
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
