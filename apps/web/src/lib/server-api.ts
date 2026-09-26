import "server-only";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "http://localhost:8082";

/**
 * Server-side read helper for public endpoints. Never carries a user token:
 * pages built with it are cacheable and shareable (SEO/GEO).
 */
export async function readPublic<T>(path: string, revalidate = 60): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { Accept: "application/json" },
      next: { revalidate },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export { API_BASE as SERVER_API_BASE };
