const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8082";
const STORAGE_KEY = "auth.token_pair.v1";

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
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
}

export function getAccessToken(): string | null {
  return getTokens()?.accessToken ?? null;
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
    throw new Error(err.message || err.error || `Registration failed (${res.status})`);
  }
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
    throw new Error(err.message || err.error || `Login failed (${res.status})`);
  }
  return res.json();
}

export async function refreshTokens(refreshToken: string): Promise<TokenPair> {
  const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!res.ok) throw new Error("Refresh failed");
  return res.json();
}

export async function logoutServer(refreshToken: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/v1/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
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
