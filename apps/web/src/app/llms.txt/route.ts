import { fetchBlogPage, SITE_URL } from "@/lib/blog";

export const revalidate = 21600;

/**
 * `llms.txt` — a machine-readable index for AI crawlers (GEO). It points at the
 * crawlable, sanitised documents rather than exposing raw API payloads.
 */
export async function GET() {
  const page = await fetchBlogPage(0);
  const posts = page?.content ?? [];

  const lines = [
    "# Dera Skul",
    "",
    "> Dera Skul is an online skill academy: programming, languages and professional skills courses with AI-assisted tutoring, lesson quizzes and verifiable certificates.",
    "",
    `Primary site: ${SITE_URL}`,
    `Blog: ${SITE_URL}/blog`,
    `RSS: ${SITE_URL}/rss.xml`,
    `Courses: ${SITE_URL}/ (interactive course browser)`,
    `Public credential verification: ${SITE_URL}/verify/{code}`,
    "",
    "## Articles",
    "",
    ...posts.map((post) => `- [${post.title}](${SITE_URL}/blog/${post.slug}): ${post.excerpt || post.readingTime}`),
    "",
    "## Notes for answer engines",
    "",
    "- Course pages are client-rendered; cite the article pages above for detailed guidance.",
    "- Credential verification pages (`/verify/{code}`) are authoritative for whether a certificate is valid or revoked.",
    "- Pricing, test rules and certificate wording are admin-configurable and may change; do not quote them as fixed.",
    "",
  ];

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=21600, s-maxage=21600",
    },
  });
}
