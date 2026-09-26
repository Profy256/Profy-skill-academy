import { readPublic } from "./server-api";

export interface BlogSummary {
  slug: string;
  title: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  tags: string[];
  readingTime: string;
  publishedAt: string | null;
  authorName: string | null;
}

export interface BlogDetail extends BlogSummary {
  contentMd: string;
  metaTitle: string | null;
  metaDescription: string | null;
  updatedAt: string;
}

export interface BlogPage {
  content: BlogSummary[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface VerifyResult {
  code: string;
  valid: boolean;
  revoked: boolean;
  recipientName: string;
  courseName: string;
  definitionName: string;
  badgeColor: string;
  score: number | null;
  total: number | null;
  passPercent: number;
  issuedAt: string | null;
  revokedAt: string | null;
  courseSlug: string | null;
  organization: string;
  holderEmailHint: string | null;
}

export function fetchBlogPage(page = 0, tag?: string): Promise<BlogPage | null> {
  const query = new URLSearchParams({ page: String(page), size: "12" });
  if (tag) query.set("tag", tag);
  return readPublic<BlogPage>(`/api/v1/blog?${query.toString()}`, 60);
}

export function fetchBlogPost(slug: string): Promise<BlogDetail | null> {
  return readPublic<BlogDetail>(`/api/v1/blog/${encodeURIComponent(slug)}`, 300);
}

export function fetchCertificate(code: string): Promise<VerifyResult | null> {
  return readPublic<VerifyResult>(`/api/v1/verify/${encodeURIComponent(code)}`, 60);
}

/** Site URL used for absolute links (RSS, canonical, JSON-LD). */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://deraskul.com").replace(/\/+$/, "");
