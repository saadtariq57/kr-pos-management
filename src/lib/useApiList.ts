"use client";

import * as React from "react";

import { apiGet, type ApiListResponse } from "@/lib/api-client";

export function useApiList<T>(path: string) {
  const [data, setData] = React.useState<ApiListResponse<T> | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  const reload = React.useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) {
        setLoading(true);
        setError(null);
      }
      try {
        const json = await apiGet<ApiListResponse<T>>(path, {
          silent: opts?.silent,
        });
        setData(json);
        if (opts?.silent) setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        if (!opts?.silent) setLoading(false);
      }
    },
    [path],
  );

  React.useEffect(() => {
    void reload();
  }, [reload]);

  return { data, error, loading, reload };
}

