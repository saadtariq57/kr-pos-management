export type ApiListResponse<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
};

export type ApiError = {
  ok: false;
  error: string;
};

export type ApiGetOptions = {
  /**
   * Suppress the top progress bar for this request. Use for polling /
   * background refreshes that would otherwise flash the bar repeatedly.
   */
  silent?: boolean;
};

async function readJson(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

// Lazy bridge to the top progress bar so this module stays usable outside the
// React tree (and so we don't pull the component into server bundles).
async function withProgress<T>(
  silent: boolean,
  work: () => Promise<T>,
): Promise<T> {
  if (silent || typeof window === "undefined") return work();
  const mod = await import("@/components/ui/top-progress").catch(() => null);
  mod?.startTopProgress();
  try {
    return await work();
  } finally {
    mod?.doneTopProgress();
  }
}

function asError(json: unknown, status: number): Error {
  if (json && typeof json === "object" && "error" in json) {
    return new Error(String((json as { error: unknown }).error));
  }
  return new Error(`Request failed (${status})`);
}

export async function apiGet<T>(
  path: string,
  opts: ApiGetOptions = {},
): Promise<T> {
  return withProgress(!!opts.silent, async () => {
    const res = await fetch(path, {
      method: "GET",
      headers: { "content-type": "application/json" },
      cache: "no-store",
      credentials: "include",
    });
    const json = await readJson(res);
    if (!res.ok) throw asError(json, res.status);
    return json as T;
  });
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return withProgress(false, async () => {
    const res = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      credentials: "include",
    });
    const json = await readJson(res);
    if (!res.ok) throw asError(json, res.status);
    return json as T;
  });
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return withProgress(false, async () => {
    const res = await fetch(path, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      credentials: "include",
    });
    const json = await readJson(res);
    if (!res.ok) throw asError(json, res.status);
    return json as T;
  });
}

export async function apiDelete<T>(path: string): Promise<T> {
  return withProgress(false, async () => {
    const res = await fetch(path, {
      method: "DELETE",
      credentials: "include",
    });
    const json = await readJson(res);
    if (!res.ok) throw asError(json, res.status);
    return json as T;
  });
}
