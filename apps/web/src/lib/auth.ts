const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8082";
const STORAGE_KEY = "auth.token_pair.v1";
const PROFILE_KEY = "auth.profile.v1";

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface StoredProfile {
  email: string;
  name?: string;
}

let currentTokens: TokenPair | null = null;

export function getTokens(): TokenPair | null {
  if (currentTokens) return currentTokens;
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) currentTokens = JSON.parse(raw);
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  return currentTokens;
}

export function saveTokens(pair: TokenPair) {
  currentTokens = pair;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pair));
}

export function clearTokens() {
  currentTokens = null;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(PROFILE_KEY);
}

/** The auth API only returns token pairs, so the account details we know
 *  (what the user typed at register/login) are kept next to the session. */
export function saveProfile(email: string, name?: string) {
  if (typeof window === "undefined") return;
  const previous = getProfile();
  const profile: StoredProfile = {
    email,
    name: name || (previous && previous.email === email ? previous.name : undefined),
  };
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function getProfile(): StoredProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredProfile;
    return parsed && typeof parsed.email === "string" ? parsed : null;
  } catch {
    localStorage.removeItem(PROFILE_KEY);
    return null;
  }
}

export function getAccessToken(): string | null {
  return getTokens()?.accessToken ?? null;
}

export function apiErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object") {
    const b = body as { message?: unknown; error?: unknown };
    if (typeof b.message === "string" && b.message) return b.message;
    if (typeof b.error === "string" && b.error) return b.error;
    if (b.error && typeof b.error === "object") {
      const nested = (b.error as { message?: unknown }).message;
      if (typeof nested === "string" && nested) return nested;
    }
  }
  return fallback;
}

export async function register(
  name: string,
  email: string,
  password: string
): Promise<TokenPair> {
  const res = await fetch(`${API_BASE}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(apiErrorMessage(err, `Registration failed (${res.status})`));
  }
  saveProfile(email, name);
  return res.json();
}

export async function login(
  email: string,
  password: string
): Promise<TokenPair> {
  const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(apiErrorMessage(err, `Login failed (${res.status})`));
  }
  saveProfile(email);
  return res.json();
}

export async function refreshTokens(refreshToken: string): Promise<TokenPair> {
  const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) throw new Error("Refresh failed");
  return res.json();
}

export async function logoutServer(refreshToken: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/v1/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    // Best-effort; local session is cleared regardless.
  }
}

export async function logout(): Promise<void> {
  const tokens = getTokens();
  if (tokens) await logoutServer(tokens.refreshToken);
  clearTokens();
}
