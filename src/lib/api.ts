// API origin: use VITE_API_ORIGIN in production, relative /api in dev (Vite proxy)
const getApiBase = () => {
  const origin = import.meta.env.VITE_API_ORIGIN;
  if (origin) {
    // Remove trailing slash if present
    return origin.replace(/\/$/, "") + "/api";
  }
  // In dev, Vite proxy handles /api
  return "/api";
};

// Token getter function - will be set by the auth hook
let tokenGetter: (() => Promise<string | null>) | null = null;

export const setTokenGetter = (getter: () => Promise<string | null>) => {
  tokenGetter = getter;
};

export const apiFetch = async (path: string, options: RequestInit = {}) => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };

  // Get token from Clerk
  if (tokenGetter) {
    const token = await tokenGetter();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const apiBase = getApiBase();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(`${apiBase}${path}`, {
      ...options,
      headers,
      signal: options.signal ?? controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      const message = await res.text();
      throw new Error(message || `Request failed: ${res.status}`);
    }
    const text = await res.text();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch (err) {
      return {};
    }
  } catch (e) {
    clearTimeout(timeoutId);
    throw e;
  }
};
