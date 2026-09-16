import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://profyskillacademy.com";

  return {
    rules: [
      // ── Default: all crawlers ────────────────────────────────
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin/", "/profile/"],
      },
      // ── GEO: AI search bots (full access for citations) ─────
      // OpenAI
      {
        userAgent: "GPTBot",
        allow: "/",
        disallow: ["/api/", "/admin/"],
      },
      {
        userAgent: "ChatGPT-User",
        allow: "/",
        disallow: ["/api/", "/admin/"],
      },
      // Google
      {
        userAgent: "Google-Extended",
        allow: "/",
        disallow: ["/api/", "/admin/"],
      },
      // Anthropic
      {
        userAgent: "ClaudeBot",
        allow: "/",
        disallow: ["/api/", "/admin/"],
      },
      {
        userAgent: "anthropic-ai",
        allow: "/",
        disallow: ["/api/", "/admin/"],
      },
      // Perplexity
      {
        userAgent: "PerplexityBot",
        allow: "/",
        disallow: ["/api/", "/admin/"],
      },
      // Bing / Microsoft
      {
        userAgent: "Bingbot",
        allow: "/",
        disallow: ["/api/", "/admin/"],
      },
      {
        userAgent: "BingPreview",
        allow: "/",
        disallow: ["/api/", "/admin/"],
      },
      // You.com
      {
        userAgent: "YouBot",
        allow: "/",
        disallow: ["/api/", "/admin/"],
      },
      // Cohere
      {
        userAgent: "cohere-ai",
        allow: "/",
        disallow: ["/api/", "/admin/"],
      },
      // Meta
      {
        userAgent: "meta-externalagent",
        allow: "/",
        disallow: ["/api/", "/admin/"],
      },
      // Mistral
      {
        userAgent: "MistralAI-User",
        allow: "/",
        disallow: ["/api/", "/admin/"],
      },
      // Apple
      {
        userAgent: "Applebot-Extended",
        allow: "/",
        disallow: ["/api/", "/admin/"],
      },
      // Amazon
      {
        userAgent: "Amazonbot",
        allow: "/",
        disallow: ["/api/", "/admin/"],
      },
      // Yandex
      {
        userAgent: "YandexBot",
        allow: "/",
        disallow: ["/api/", "/admin/"],
      },
      // Brave
      {
        userAgent: "bravebot",
        allow: "/",
        disallow: ["/api/", "/admin/"],
      },
      // Elastic
      {
        userAgent: "elastic-crawler",
        allow: "/",
        disallow: ["/api/", "/admin/"],
      },
      // Common Crawl
      {
        userAgent: "CCBot",
        allow: "/",
        disallow: ["/api/", "/admin/"],
      },
      // Archive.org
      {
        userAgent: "ia_archiver",
        allow: "/",
        disallow: ["/api/", "/admin/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
