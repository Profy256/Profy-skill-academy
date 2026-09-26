import Link from "next/link";

/**
 * Minimal server-rendered chrome for the public (SEO) routes — the app shell at
 * `/` is a client SPA, while `/blog` and `/verify` are crawlable documents.
 */
export default function SiteShell({
  children,
  eyebrow,
  title,
  description,
}: {
  children: React.ReactNode;
  eyebrow?: string;
  title?: string;
  description?: string;
}) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", color: "var(--foreground)" }}>
      <header
        style={{
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div
          style={{
            maxWidth: 960,
            margin: "0 auto",
            padding: "14px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <Link href="/" style={{ display: "flex", alignItems: "baseline", gap: 8, textDecoration: "none", color: "var(--foreground)" }}>
            <span style={{ fontFamily: "var(--font-serif)", fontSize: 20, fontWeight: 700 }}>Dera Skul</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 1.6, color: "var(--muted-foreground)", textTransform: "uppercase" }}>
              Skill Academy
            </span>
          </Link>
          <nav style={{ display: "flex", gap: 18, alignItems: "center" }}>
            <Link href="/" style={{ fontSize: 14, color: "var(--muted-foreground)", textDecoration: "none" }}>
              Courses
            </Link>
            <Link href="/blog" style={{ fontSize: 14, color: "var(--muted-foreground)", textDecoration: "none" }}>
              Blog
            </Link>
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "40px 24px 72px" }}>
        {eyebrow && (
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: 1.8,
              textTransform: "uppercase",
              color: "var(--primary)",
              marginBottom: 10,
            }}
          >
            {eyebrow}
          </div>
        )}
        {title && (
          <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(30px, 5vw, 44px)", lineHeight: 1.15, margin: 0 }}>
            {title}
          </h1>
        )}
        {description && (
          <p style={{ fontSize: 17, lineHeight: 1.7, color: "var(--muted-foreground)", marginTop: 14, maxWidth: 680 }}>
            {description}
          </p>
        )}
        <div style={{ marginTop: 32 }}>{children}</div>
      </main>

      <footer style={{ borderTop: "1px solid var(--border)", background: "var(--surface)" }}>
        <div
          style={{
            maxWidth: 960,
            margin: "0 auto",
            padding: "22px 24px",
            display: "flex",
            flexWrap: "wrap",
            gap: 14,
            justifyContent: "space-between",
            fontSize: 13,
            color: "var(--muted-foreground)",
          }}
        >
          <span>© {new Date().getFullYear()} Dera Skul — learn programming, languages and professional skills.</span>
          <span>
            <Link href="/" style={{ color: "var(--muted-foreground)" }}>
              Home
            </Link>
            {" · "}
            <Link href="/blog" style={{ color: "var(--muted-foreground)" }}>
              Blog
            </Link>
            {" · "}
            <a href="/rss.xml" style={{ color: "var(--muted-foreground)" }}>
              RSS
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}
