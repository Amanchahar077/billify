import { API_BASE } from "./constants.js";

async function request(path, options = {}, token) {
  const headers = { ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch (error) {
    throw new Error("API is unreachable. Start the backend on http://127.0.0.1:5000.");
  }
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

async function apiFetch(path, options = {}, token, onTokenRefresh) {
  const { response, data } = await request(path, options, token);
  if (response.ok) return data.data ?? data;

  if (response.status === 401 && typeof onTokenRefresh === "function") {
    const refreshed = await onTokenRefresh();
    if (refreshed) {
      const retry = await request(path, options, refreshed);
      if (retry.response.ok) return retry.data.data ?? retry.data;
      throw new Error(retry.data.message || "Request failed");
    }
  }

  throw new Error(data.message || "Request failed");
}

export { apiFetch };
