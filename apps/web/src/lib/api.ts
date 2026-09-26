import { getAccessToken, refreshTokens, saveTokens, clearTokens, getTokens, apiErrorMessage } from "./auth";

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
  lessons: { id: string; title: string; slug: string; level: string | null; sortOrder: number }[];
}

export interface ApiFeaturedCourse {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
}

export interface ApiFeaturedResponse {
  featuredCourses: ApiFeaturedCourse[];
  categoryGrid: { id: string; name: string; slug: string; icon: string | null }[];
}

export interface ApiSearchResult {
  id: string;
  nodeId: string;
  title: string;
  slug: string;
  description: string | null;
  level: string | null;
  status: string;
  sortOrder: number;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string | null;

  constructor(status: number, message: string, code: string | null = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export function isAuthError(err: unknown): boolean {
  return err instanceof ApiError && (err.status === 401 || err.status === 403);
}

function errorCodeOf(body: unknown): string | null {
  if (body && typeof body === "object") {
    const b = body as { error?: unknown };
    if (b.error && typeof b.error === "object") {
      const code = (b.error as { code?: unknown }).code;
      if (typeof code === "string") return code;
    }
  }
  return null;
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  const token = getAccessToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  // Try transparent refresh on 401
  if (res.status === 401 && token) {
    const tokens = getTokens();
    if (tokens?.refreshToken) {
      try {
        const newTokens = await refreshTokens(tokens.refreshToken);
        saveTokens(newTokens);
        headers["Authorization"] = `Bearer ${newTokens.accessToken}`;
        res = await fetch(`${API_BASE}${path}`, { ...options, headers });
      } catch {
        clearTokens();
        if (typeof window !== "undefined") window.location.reload();
        throw new ApiError(401, "Session expired", "unauthorized");
      }
    } else {
      clearTokens();
      if (typeof window !== "undefined") window.location.reload();
      throw new ApiError(401, "Unauthorized", "unauthorized");
    }
  }

  const text = await res.text().catch(() => "");
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
  }

  if (!res.ok) {
    throw new ApiError(
      res.status,
      apiErrorMessage(body, `API ${res.status}: ${res.statusText}`),
      errorCodeOf(body)
    );
  }
  if (body === null) return undefined as T;
  return body as T;
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

export async function searchContent(query: string): Promise<{ query: string; results: ApiSearchResult[] }> {
  return apiFetch(`/api/v1/search?q=${encodeURIComponent(query)}`);
}

/* ── Learner progress, library & AI Teacher ──────────────────────────────── */

export interface ProfileStats {
  coursesCompleted: number;
  lessonsCompleted: number;
  lessonsInProgress: number;
  bookmarksCount: number;
  quizzesTaken: number;
  avgQuizScore: number | null;
}

export function fetchProfileStats(): Promise<ProfileStats> {
  return apiFetch("/api/v1/profile/stats");
}

export interface ContinueLesson {
  id: string;
  title: string;
  slug: string;
  level: string | null;
  sortOrder: number;
}

export interface ContinueItem {
  lesson: ContinueLesson;
  courseSlug: string;
  courseName: string;
  status: string;
  updatedAt: string;
}

export function fetchContinueLearning(): Promise<{ items: ContinueItem[] }> {
  return apiFetch("/api/v1/progress/continue");
}

export function updateLessonProgress(lessonId: string, status: "in_progress" | "completed"): Promise<unknown> {
  return apiFetch(`/api/v1/lessons/${encodeURIComponent(lessonId)}/progress`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
}

export interface BookmarkInfo {
  lessonId: string;
  lessonSlug: string;
  lessonTitle: string;
  courseSlug: string;
  courseName: string;
  createdAt: string;
}

export function fetchBookmarks(): Promise<{ items: BookmarkInfo[] }> {
  return apiFetch("/api/v1/library/bookmarks");
}

export function addBookmark(lessonId: string): Promise<unknown> {
  return apiFetch(`/api/v1/library/bookmarks/${encodeURIComponent(lessonId)}`, { method: "POST" });
}

export function removeBookmark(lessonId: string): Promise<unknown> {
  return apiFetch(`/api/v1/library/bookmarks/${encodeURIComponent(lessonId)}`, { method: "DELETE" });
}

export interface AiChatReply {
  reply: string;
}

export interface AiChatMessage {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

export function aiChat(lessonId: string, message: string): Promise<AiChatReply> {
  return apiFetch(`/api/v1/lessons/${encodeURIComponent(lessonId)}/ai/chat`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

export function fetchAiMessages(lessonId: string): Promise<{ messages: AiChatMessage[] }> {
  return apiFetch(`/api/v1/lessons/${encodeURIComponent(lessonId)}/ai/messages`);
}

export function recordQuizAttempt(lessonId: string, body: { score: number; total: number }): Promise<unknown> {
  return apiFetch(`/api/v1/lessons/${encodeURIComponent(lessonId)}/quiz-attempts`, {
    method: "POST",
    body: JSON.stringify(body),
  });
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

/* ── Certificates & course final test ───────────────────────────────────── */

export interface FinalTestQuestion {
  index: number;
  question: string;
  options: string[];
}

export interface CertificateInfo {
  id: string;
  code: string;
  verifyUrl: string;
  courseId: string | null;
  courseSlug: string | null;
  courseName: string;
  definitionId: string | null;
  definitionName: string;
  recipientName: string | null;
  score: number | null;
  total: number | null;
  passPercent: number;
  issuedAt: string | null;
  revokedAt: string | null;
  identityVerifiedAt: string | null;
  emailSentAt: string | null;
  revoked: boolean;
}

export interface FinalTestState {
  courseId: string;
  courseSlug: string;
  courseName: string;
  progressPercent: number;
  progressThresholdPercent: number;
  attemptsUsed: number;
  freeAttemptAvailable: boolean;
  creditsAvailable: number;
  readyToAttempt: boolean;
  featureEnabled: boolean;
  testTitle: string;
  testInstructions: string;
  passPercent: number;
  pricing: {
    stripeAmountCents: number;
    stripeCurrency: string;
    marzpayAmountUgx: number;
    marzpayCurrency: string;
  };
  questions: FinalTestQuestion[];
  certificate: CertificateInfo | null;
  certificates: CertificateInfo[];
  lessonCompleted: number;
  lessonTotal: number;
}

export interface SubmitFinalTestResult {
  score: number;
  total: number;
  percent: number;
  passed: boolean;
  attemptNumber: number;
  freeAttempt: boolean;
  creditsRemaining: number;
  certificates: CertificateInfo[];
}

export interface CertCheckoutResult {
  provider: "stripe" | "marzpay";
  checkoutUrl?: string;
  reference?: string;
  status?: string;
  amount?: number;
  amountCents?: number;
  currency?: string;
}

export function fetchFinalTestState(courseSlug: string): Promise<FinalTestState> {
  return apiFetch(`/api/v1/courses/${encodeURIComponent(courseSlug)}/final-test`);
}

export function submitFinalTest(
  courseSlug: string,
  body: { answers: number[]; confirmName: boolean; recipientName?: string }
): Promise<SubmitFinalTestResult> {
  return apiFetch(`/api/v1/courses/${encodeURIComponent(courseSlug)}/final-test/attempts`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function checkoutCertTest(
  provider: "stripe" | "marzpay",
  body: { courseNodeId: string; successUrl?: string; cancelUrl?: string; phoneNumber?: string; country?: string }
): Promise<CertCheckoutResult> {
  return apiFetch(`/api/v1/billing/cert-test/checkout/${provider}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function fetchCertCreditStatus(
  provider: string,
  reference: string
): Promise<{ provider: string; reference: string; status: string }> {
  return apiFetch(`/api/v1/billing/cert-test/status?provider=${encodeURIComponent(provider)}&reference=${encodeURIComponent(reference)}`);
}

export function fetchMyCertificates(): Promise<CertificateInfo[]> {
  return apiFetch("/api/v1/certificates");
}

export interface CertificateDefinitionInfo {
  id: string;
  name: string;
  slug: string;
  shortName: string | null;
  description: string | null;
  badgeColor: string | null;
  courseId: string | null;
  courseSlug: string | null;
  courseName: string | null;
  requireFinalTest: boolean;
  requireCourseComplete: boolean;
  passPercent: number;
  minProgressPercent: number;
  autoIssue: boolean;
  isEnabled: boolean;
  issuedCount: number;
}

export function fetchCertificateDefinitions(): Promise<CertificateDefinitionInfo[]> {
  return apiFetch("/api/v1/certificates/definitions");
}
