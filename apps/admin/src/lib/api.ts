const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

let accessToken: string | null = null;

export function setToken(token: string | null) {
  accessToken = token;
  if (token) {
    localStorage.setItem("admin_token", token);
  } else {
    localStorage.removeItem("admin_token");
  }
}

export function getToken(): string | null {
  if (!accessToken) {
    accessToken = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
  }
  return accessToken;
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, ...init } = options;
  const token = getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    setToken(null);
    window.location.reload();
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || error.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ accessToken: string; refreshToken: string; admin: { id: string; email: string; name: string; role: string } }>(
        "/api/v1/admin/auth/login",
        { method: "POST", body: { email, password } }
      ),
  },

  taxonomy: {
    list: (phase?: number) =>
      request<TaxonomyApiNode[]>(`/api/v1/admin/taxonomy${phase != null ? `?phase=${phase}` : ""}`),
    get: (id: string) =>
      request<TaxonomyApiNode & { children: TaxonomyApiNode[] }>(`/api/v1/admin/taxonomy/${id}`),
    create: (data: { parentNodeId?: string; nodeType: string; name: string; slug: string; description?: string; icon?: string; phase?: number }) =>
      request<{ id: string; slug: string; name: string }>("/api/v1/admin/taxonomy", { method: "POST", body: data }),
    update: (id: string, data: { name?: string; slug?: string; description?: string; icon?: string; phase?: number; isActive?: boolean; sortOrder?: number }) =>
      request<{ id: string; slug: string; name: string }>(`/api/v1/admin/taxonomy/${id}`, { method: "PUT", body: data }),
    reorder: (items: { id: string; sortOrder: number }[]) =>
      request<{ status: string }>("/api/v1/admin/taxonomy/reorder", { method: "POST", body: { items } }),
    delete: (id: string) =>
      request<{ status: string }>(`/api/v1/admin/taxonomy/${id}`, { method: "DELETE" }),
  },

  lessons: {
    list: (nodeId?: string) =>
      request<LessonApiSummary[]>(`/api/v1/admin/lessons${nodeId ? `?nodeId=${nodeId}` : ""}`),
    get: (id: string) =>
      request<LessonApiDetail>(`/api/v1/admin/lessons/${id}`),
    create: (data: LessonCreateRequest) =>
      request<{ id: string; slug: string; title: string; status: string }>("/api/v1/admin/lessons", { method: "POST", body: data }),
    update: (id: string, data: LessonCreateRequest) =>
      request<{ id: string; slug: string; title: string; status: string }>(`/api/v1/admin/lessons/${id}`, { method: "PUT", body: data }),
    delete: (id: string) =>
      request<{ status: string }>(`/api/v1/admin/lessons/${id}`, { method: "DELETE" }),
    reviewQueue: () =>
      request<ReviewQueueItem[]>(`/api/v1/admin/review/videos`),
    uncoveredLessons: () =>
      request<UncoveredLessonItem[]>(`/api/v1/admin/report/uncovered-lessons`),
  },

  videos: {
    list: (lessonId: string) =>
      request<VideoApi[]>(`/api/v1/admin/lessons/${lessonId}/videos`),
    add: (lessonId: string, data: { youtubeVideoId: string; title: string; channel?: string; isPrimary?: boolean; curatorStatus?: string; notes?: string }) =>
      request<{ id: string; youtubeVideoId: string; title: string }>(`/api/v1/admin/lessons/${lessonId}/videos`, { method: "POST", body: data }),
    autoFind: (lessonId: string) =>
      request<VideoApi>(`/api/v1/admin/lessons/${lessonId}/videos/auto`, { method: "POST" }),
    update: (videoId: string, data: { youtubeVideoId?: string; title?: string; channel?: string; isPrimary?: boolean; curatorStatus?: string; notes?: string }) =>
      request<{ id: string; youtubeVideoId: string; title: string }>(`/api/v1/admin/videos/${videoId}`, { method: "PUT", body: data }),
    delete: (lessonId: string, videoId: string) =>
      request<{ status: string }>(`/api/v1/admin/lessons/${lessonId}/videos/${videoId}`, { method: "DELETE" }),
  },

  resources: {
    list: () =>
      request<ResourceApi[]>("/api/v1/admin/resources"),
    listByNode: (nodeId: string) =>
      request<ResourceApi[]>(`/api/v1/admin/resources/node/${nodeId}`),
    get: (id: string) =>
      request<ResourceApi>(`/api/v1/admin/resources/${id}`),
    create: (data: { nodeId: string; title: string; description?: string; fileName: string; fileSize?: string; fileUrl?: string; allowDownload?: boolean; pageFlipEnabled?: boolean }) =>
      request<{ id: string; title: string; fileName: string }>("/api/v1/admin/resources", { method: "POST", body: data }),
    update: (id: string, data: { title?: string; description?: string; allowDownload?: boolean; pageFlipEnabled?: boolean; isActive?: boolean }) =>
      request<{ id: string; title: string; allowDownload: boolean; pageFlipEnabled: boolean }>(`/api/v1/admin/resources/${id}`, { method: "PUT", body: data }),
    delete: (id: string) =>
      request<{ status: string }>(`/api/v1/admin/resources/${id}`, { method: "DELETE" }),
  },

  aiProviders: {
    list: () =>
      request<AiProviderApi[]>("/api/v1/admin/ai-providers"),
    get: (id: string) =>
      request<AiProviderApi>(`/api/v1/admin/ai-providers/${id}`),
    create: (data: { name: string; providerType: string; apiKey: string; baseUrl: string; defaultModel: string }) =>
      request<AiProviderApi>("/api/v1/admin/ai-providers", { method: "POST", body: data }),
    update: (id: string, data: { name?: string; providerType?: string; apiKey?: string; baseUrl?: string; defaultModel?: string; isActive?: boolean }) =>
      request<AiProviderApi>(`/api/v1/admin/ai-providers/${id}`, { method: "PUT", body: data }),
    delete: (id: string) =>
      request<{ status: string }>(`/api/v1/admin/ai-providers/${id}`, { method: "DELETE" }),
    getSettings: () =>
      request<AiSettingsApi>("/api/v1/admin/ai-providers/settings"),
    updateSettings: (data: { activeProviderId: string | null }) =>
      request<AiSettingsApi>("/api/v1/admin/ai-providers/settings", { method: "PUT", body: data }),
    test: (message: string) =>
      request<AiTestResultApi>("/api/v1/admin/ai-providers/test", { method: "POST", body: { message } }),
  },

  aiAssistant: {
    chat: (message: string) =>
      request<AiAssistantResponse>("/api/v1/admin/ai-assistant/chat", { method: "POST", body: { message } }),
    test: (message: string) =>
      request<AiTestResultApi>("/api/v1/admin/ai-assistant/test", { method: "POST", body: { message } }),
  },

  campusBooks: {
    list: (params: { page?: number; limit?: number; search?: string; filter?: string } = {}) => {
      const qs = new URLSearchParams();
      if (params.page) qs.set("page", String(params.page));
      if (params.limit) qs.set("limit", String(params.limit));
      if (params.search) qs.set("search", params.search);
      if (params.filter && params.filter !== "all") qs.set("filter", params.filter);
      return request<CampusBookListApi>(`/api/v1/admin/campus-books?${qs.toString()}`);
    },
    updateSettings: (campusBookId: string, data: { isPremium?: boolean; isFeatured?: boolean; customNote?: string }) =>
      request<{ status: string }>(`/api/v1/admin/campus-books/${campusBookId}/settings`, { method: "PUT", body: data }),
    sync: () =>
      request<CampusBookSyncResult>("/api/v1/admin/campus-books/sync", { method: "POST" }),
  },
};

// API Types
export interface TaxonomyApiNode {
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
  children: TaxonomyApiNode[];
}

export interface LessonApiSummary {
  id: string;
  nodeId: string;
  title: string;
  slug: string;
  description: string | null;
  level: string | null;
  status: string;
  sortOrder: number;
  createdAt: string | null;
}

export interface LessonApiDetail extends LessonApiSummary {
  explanation: string | null;
  objectives: string[];
  examples: string[];
  exercises: string[];
  quizzes: QuizApi[];
  createdBy: string | null;
  updatedAt: string | null;
  videos: VideoApi[];
}

export interface QuizApi {
  question: string;
  options: string[];
  answerIndex: number;
}

export interface VideoApi {
  id: string;
  lessonId: string;
  youtubeVideoId: string;
  title: string;
  channel: string | null;
  isPrimary: boolean;
  /** "curated" (admin-provided) or "auto" (auto-sourced fallback via YouTube search) */
  source: string;
  curatorStatus: string;
  dateReviewed: string | null;
  notes: string | null;
  addedBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ReviewQueueItem {
  id: string;
  lessonId: string;
  lessonTitle?: string | null;
  youtubeVideoId: string;
  title: string;
  channel: string | null;
  isPrimary: boolean;
  source: string;
  curatorStatus: string;
  dateReviewed: string | null;
  notes: string | null;
  addedBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface UncoveredLessonItem {
  id: string;
  title: string;
  slug: string;
  courseName: string;
  createdAt: string | null;
}

export interface ResourceApi {
  id: string;
  nodeId: string;
  title: string;
  description: string | null;
  fileName: string;
  fileSize: string | null;
  fileUrl: string | null;
  addedBy: string | null;
  allowDownload: boolean;
  pageFlipEnabled: boolean;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface LessonCreateRequest {
  nodeId: string;
  title: string;
  slug: string;
  description?: string;
  explanation?: string;
  objectives?: string[];
  examples?: string[];
  exercises?: string[];
  quizzes?: { question: string; options: string[]; answerIndex: number }[];
  level?: string;
  status?: string;
  sortOrder?: number;
}

export interface AiProviderApi {
  id: string;
  name: string;
  providerType: string;
  baseUrl: string;
  defaultModel: string;
  isActive: boolean;
  apiKeyMasked: string;
}

export interface AiSettingsApi {
  activeProviderId: string | null;
  activeProviderName: string | null;
}

export interface AiTestResultApi {
  success: boolean;
  response: string | null;
  error: string | null;
}

export interface AiAssistantResponse {
  content: string;
  actionType: string | null;
  actionResult: Record<string, unknown> | null;
}

export interface CampusBookApi {
  id: string | null;
  campusBookId: string;
  title: string;
  author: string;
  description: string | null;
  coverUrl: string | null;
  category: string | null;
  categorySlug: string | null;
  language: string;
  pageCount: number | null;
  publishedYear: number | null;
  formats: string[];
  rating: number | null;
  ratingCount: number;
  isPremium: boolean;
  isFeatured: boolean;
  isAvailable: boolean;
  customNote: string | null;
}

export interface CampusBookListApi {
  books: CampusBookApi[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CampusBookSyncResult {
  added: number;
  updated: number;
  removed: number;
  message: string;
}
