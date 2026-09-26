import type { Metadata } from "next";
import Link from "next/link";
import SiteShell from "@/components/SiteShell";
import JsonLd from "@/components/seo/JsonLd";
import { fetchBlogPage, SITE_URL } from "@/lib/blog";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Blog — programming, languages & career guides",
  description:
    "Practical guides on programming, languages and professional skills from the Dera Skul teaching team. Written for learners, readable by anyone.",
  alternates: { canonical: "/blog" },
  openGraph: {
    type: "website",
    url: "/blog",
    title: "Blog | Dera Skul",
    description:
      "Practical guides on programming, languages and professional skills from the Dera Skul teaching team.",
  },
};

type Props = { searchParams: Promise<{ page?: string; tag?: string }> };

export default async function BlogIndex({ searchParams }: Props) {
  const { page: pageParam, tag } = await searchParams;
  const page = Math.max(0, Number(pageParam ?? "0") || 0);
  const data = await fetchBlogPage(page, tag);
  const posts = data?.content ?? [];

  const itemList = posts.map((post, index) => ({
    "@type": "BlogPosting",
    headline: post.title,
    url: `${SITE_URL}/blog/${post.slug}`,
    datePublished: post.publishedAt ?? undefined,
    author: post.authorName ? { "@type": "Person", name: post.authorName } : undefined,
    publisher: { "@type": "Organization", name: "Dera Skul" },
    position: index + 1,
  }));

  return (
    <SiteShell
      eyebrow="Dera Skul journal"
      title="Guides that make hard things obvious"
      description="Programming, languages and career guides written by the people who teach the courses — free to read, easy to share."
    >
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Blog",
          name: "Dera Skul Blog",
          url: `${SITE_URL}/blog`,
          description:
            "Practical guides on programming, languages and professional skills from the Dera Skul teaching team.",
          blogPost: itemList,
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "Latest Dera Skul articles",
          itemListElement: itemList,
        }}
      />

      {tag && (
        <p style={{ fontSize: 14, color: "var(--muted-foreground)", marginBottom: 20 }}>
          Tagged <strong style={{ color: "var(--foreground)" }}>#{tag}</strong>
        </p>
      )}

      {posts.length === 0 ? (
        <div
          style={{
            border: "1px dashed var(--border)",
            borderRadius: 14,
            padding: "36px 24px",
            textAlign: "center",
            color: "var(--muted-foreground)",
          }}
        >
          <p style={{ fontSize: 16, margin: 0 }}>No articles published yet.</p>
          <p style={{ fontSize: 14, marginTop: 8 }}>New guides land here as soon as they are published.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 24, gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
          {posts.map((post) => (
            <article
              key={post.slug}
              style={{
                border: "1px solid var(--border)",
                borderRadius: 14,
                overflow: "hidden",
                background: "var(--card)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {post.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.coverImageUrl}
                  alt=""
                  loading="lazy"
                  style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover" }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    aspectRatio: "16 / 9",
                    background: "linear-gradient(135deg, var(--primary), var(--secondary))",
                    opacity: 0.85,
                  }}
                />
              )}
              <div style={{ padding: "18px 18px 20px", display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                {post.tags.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {post.tags.slice(0, 3).map((t) => (
                      <span
                        key={t}
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          letterSpacing: 0.6,
                          textTransform: "uppercase",
                          color: "var(--primary)",
                        }}
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
                <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 21, lineHeight: 1.3, margin: 0 }}>
                  <Link href={`/blog/${post.slug}`} style={{ color: "var(--foreground)", textDecoration: "none" }}>
                    {post.title}
                  </Link>
                </h2>
                {post.excerpt && (
                  <p style={{ fontSize: 15, lineHeight: 1.6, color: "var(--muted-foreground)", margin: 0 }}>{post.excerpt}</p>
                )}
                <div
                  style={{
                    marginTop: "auto",
                    paddingTop: 12,
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                    fontSize: 13,
                    color: "var(--muted-foreground)",
                  }}
                >
                  <span>{post.readingTime}</span>
                  {post.publishedAt && <span>· {new Date(post.publishedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>}
                  {post.authorName && <span>· {post.authorName}</span>}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {data && data.totalPages > 1 && (
        <nav style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 40 }}>
          {page > 0 && (
            <Link
              href={`/blog?page=${page - 1}${tag ? `&tag=${encodeURIComponent(tag)}` : ""}`}
              style={pageLink}
            >
              ← Newer
            </Link>
          )}
          {page < data.totalPages - 1 && (
            <Link
              href={`/blog?page=${page + 1}${tag ? `&tag=${encodeURIComponent(tag)}` : ""}`}
              style={pageLink}
            >
              Older →
            </Link>
          )}
        </nav>
      )}
    </SiteShell>
  );
}

const pageLink = {
  padding: "10px 18px",
  borderRadius: 10,
  border: "1px solid var(--border)",
  color: "var(--foreground)",
  textDecoration: "none",
  fontSize: 14,
  fontWeight: 600,
} as const;
