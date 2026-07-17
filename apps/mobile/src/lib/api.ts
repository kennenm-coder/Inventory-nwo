import * as SecureStore from "expo-secure-store";

const API_BASE = __DEV__
  ? "http://localhost:3000/api/v1"
  : "https://your-production-url.vercel.app/api/v1";

async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync("accessToken");
}

async function setTokens(access: string, refresh: string) {
  await SecureStore.setItemAsync("accessToken", access);
  await SecureStore.setItemAsync("refreshToken", refresh);
}

async function clearTokens() {
  await SecureStore.deleteItemAsync("accessToken");
  await SecureStore.deleteItemAsync("refreshToken");
}

async function tryRefresh(): Promise<boolean> {
  const refreshToken = await SecureStore.getItemAsync("refreshToken");
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) return false;

    const data = await res.json();
    await setTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

async function fetchApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      const newToken = await getToken();
      headers["Authorization"] = `Bearer ${newToken}`;
      const retry = await fetch(`${API_BASE}${path}`, { ...options, headers });
      if (!retry.ok) throw new Error((await retry.json()).error || "Request failed");
      return retry.json();
    }
    await clearTokens();
    throw new Error("SESSION_EXPIRED");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(body.error || "Request failed");
  }

  return res.json();
}

export const api = {
  get: <T>(path: string) => fetchApi<T>(path),
  post: <T>(path: string, body: unknown) => fetchApi<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) => fetchApi<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: <T>(path: string, body?: unknown) => fetchApi<T>(path, { method: "DELETE", body: body ? JSON.stringify(body) : undefined }),
  setTokens,
  clearTokens,
  getToken,
};
