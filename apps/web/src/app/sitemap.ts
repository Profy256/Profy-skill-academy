import type { MetadataRoute } from "next";
import { fetchBlogPage, SITE_URL } from "@/lib/blog";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/blog`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
  ];

  const posts: MetadataRoute.Sitemap = [];
  // Two pages is enough for a launch-scale blog; deeper archives are linked
  // from `/blog?page=n`, which crawlers follow from the index.
  for (const page of [0, 1]) {
    const data = await fetchBlogPage(page);
    for (const post of data?.content ?? []) {
      posts.push({
        url: `${SITE_URL}/blog/${post.slug}`,
        lastModified: post.publishedAt ? new Date(post.publishedAt) : new Date(),
        changeFrequency: "monthly",
        priority: 0.7,
      });
    }
    if (!data || data.number >= data.totalPages - 1) break;
  }

  return [...base, ...posts];
}
