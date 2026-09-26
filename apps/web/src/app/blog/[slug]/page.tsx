import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteShell from "@/components/SiteShell";
import JsonLd from "@/components/seo/JsonLd";
import { fetchBlogPost, SITE_URL } from "@/lib/blog";
import { renderMarkdown } from "@/lib/markdown";

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await fetchBlogPost(slug);
  if (!post) return { title: "Article not found" };

  const description = post.metaDescription || post.excerpt || "Article from the Dera Skul teaching team.";
  const title = post.metaTitle || post.title;
  const image = post.coverImageUrl;

  return {
    title,
    description,
    alternates: { canonical: `/blog/${post.slug}` },
    keywords: post.tags,
    authors: post.authorName ? [{ name: post.authorName }] : undefined,
    openGraph: {
      type: "article",
      url: `/blog/${post.slug}`,
      title,
      description,
      publishedTime: post.publishedAt ?? undefined,
      modifiedTime: post.updatedAt,
      authors: post.authorName ? [post.authorName] : undefined,
      tags: post.tags,
      ...(image ? { images: [{ url: image }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await fetchBlogPost(slug);
  if (!post) notFound();

  const html = renderMarkdown(post.contentMd);
  const url = `${SITE_URL}/blog/${post.slug}`;

  return (
    <SiteShell eyebrow={post.tags[0] ? `#${post.tags[0]}` : "Dera Skul journal"} title={post.title}>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          mainEntityOfPage: { "@type": "WebPage", "@id": url },
          headline: post.title,
          description: post.excerpt || undefined,
          image: post.coverImageUrl || undefined,
          datePublished: post.publishedAt || undefined,
          dateModified: post.updatedAt,
          author: { "@type": "Person", name: post.authorName || "Dera Skul" },
          publisher: {
            "@type": "Organization",
            name: "Dera Skul",
            url: SITE_URL,
            logo: { "@type": "ImageObject", url: `${SITE_URL}/logo.png` },
          },
          keywords: post.tags.join(", "),
          inLanguage: "en",
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
            { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
            { "@type": "ListItem", position: 3, name: post.title, item: url },
          ],
        }}
      />

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          fontSize: 13,
          color: "var(--muted-foreground)",
          marginBottom: 26,
          paddingBottom: 18,
          borderBottom: "1px solid var(--border)",
        }}
      >
        {post.authorName && <span>By {post.authorName}</span>}
        {post.publishedAt && (
          <span>
            ·{" "}
            {new Date(post.publishedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          </span>
        )}
        <span>· {post.readingTime}</span>
        {post.tags.length > 0 && <span>· {post.tags.map((t) => `#${t}`).join(" ")}</span>}
      </div>

      {post.coverImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.coverImageUrl}
          alt=""
          style={{ width: "100%", borderRadius: 16, marginBottom: 28, aspectRatio: "16 / 9", objectFit: "cover" }}
        />
      )}

      <article className="prose" dangerouslySetInnerHTML={{ __html: html }} />

      <div style={{ marginTop: 44, paddingTop: 22, borderTop: "1px solid var(--border)", display: "flex", gap: 16, flexWrap: "wrap" }}>
        <Link href="/blog" style={{ color: "var(--primary)", fontSize: 15, fontWeight: 600, textDecoration: "none" }}>
          ← All articles
        </Link>
        <Link href="/" style={{ color: "var(--muted-foreground)", fontSize: 15, textDecoration: "none" }}>
          Browse courses
        </Link>
      </div>
    </SiteShell>
  );
}
