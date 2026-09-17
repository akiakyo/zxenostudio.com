import { useCallback, useEffect, useRef, useState } from "react";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/* Fired when any request comes back 401, so the app can return to sign-in. */
export const UNAUTHORIZED_EVENT = "zxeno-admin-unauthorized";

export async function api<T = any>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(`/api/admin/${path}`, {
    method: init.method ?? "GET",
    credentials: "same-origin",
    headers:
      init.body === undefined ? undefined : { "content-type": "application/json" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    throw new ApiError(
      res.status,
      typeof data.error === "string" ? data.error : "Something went wrong",
    );
  }
  return data as T;
}

export async function logout() {
  await fetch("/api/admin/logout", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: "{}",
  }).catch(() => {});
}

export const post =<T = any>(path: string, body: unknown) =>
  api<T>(path, { method: "POST", body });
export const patch = <T = any>(path: string, body: unknown) =>
  api<T>(path, { method: "PATCH", body });
export const del = (path: string) => api(path, { method: "DELETE" });

/* Loads a path and reloads when it changes. `null` skips loading. */
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(path !== null);
  const latest = useRef(path);
  latest.current = path;

  const reload = useCallback(async () => {
    if (path === null) return;
    setLoading(true);
    try {
      const result = await api<T>(path);
      if (latest.current === path) {
        setData(result);
        setError("");
      }
    } catch (e) {
      if (latest.current === path) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    } finally {
      if (latest.current === path) setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, error, loading, reload, setData };
}

export function query(params: Record<string, string | number | null | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}
