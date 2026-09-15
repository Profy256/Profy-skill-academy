const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8082";

export interface ApiTaxonomyNode {
  id: string;
  parentId: string | null;
  nodeType: "category" | "subcategory" | "course";
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  phase: number;
  isActive: boolean;
  sortOrder: number;
  depth: number;
  children: ApiTaxonomyNode[];
}

export interface ApiLesson {
  id: string;
  nodeId: string;
  title: string;
  slug: string;
  description: string | null;
  explanation: string | null;
  objectives: string[];
  examples: string[];
  exercises: string[];
  quizzes: { question: string; options: string[]; correctIndex: number }[];
  level: string | null;
  status: string;
  sortOrder: number;
  primaryVideo: {
    youtubeVideoId: string;
    title: string;
    channel: string;
  } | null;
}

export interface ApiCourse {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  lessons: { id: string; title: string; slug: string; sortOrder: number }[];
}

export interface ApiFeaturedResponse {
  featured: { id: string; name: string; slug: string; description: string }[];
  categories: ApiTaxonomyNode[];
}

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  return res.json();
}

export async function fetchTaxonomyTree(): Promise<ApiTaxonomyNode[]> {
  const data = await apiFetch<{ tree: ApiTaxonomyNode[] }>("/api/v1/taxonomy/tree");
  return data.tree;
}

export async function fetchTaxonomyNode(slug: string): Promise<ApiTaxonomyNode & { breadcrumb: { id: string; name: string; slug: string }[] }> {
  return apiFetch(`/api/v1/taxonomy/nodes/${slug}`);
}

export async function fetchCourse(slug: string): Promise<ApiCourse> {
  return apiFetch(`/api/v1/courses/${slug}`);
}

export async function fetchLesson(slug: string): Promise<ApiLesson> {
  return apiFetch(`/api/v1/lessons/${slug}`);
}

export async function fetchFeatured(): Promise<ApiFeaturedResponse> {
  return apiFetch("/api/v1/home/featured");
}

export async function searchContent(query: string): Promise<{ courses: ApiCourse[]; lessons: ApiLesson[] }> {
  return apiFetch(`/api/v1/search?q=${encodeURIComponent(query)}`);
}

export interface ApiResource {
  id: string;
  nodeId: string;
  title: string;
  description: string | null;
  fileName: string;
  fileSize: string | null;
  fileUrl: string | null;
  allowDownload: boolean;
  pageFlipEnabled: boolean;
  isActive: boolean;
  courseName: string | null;
  courseSlug: string | null;
  categoryName: string | null;
  categorySlug: string | null;
}

export async function fetchResources(): Promise<ApiResource[]> {
  return apiFetch("/api/v1/resources");
}
