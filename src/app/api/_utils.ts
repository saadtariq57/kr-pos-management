import { NextRequest, NextResponse } from "next/server";

export type ListQuery = {
  page: number;
  limit: number;
};

export function parseListQuery(req: NextRequest): ListQuery {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") || "1") || 1);
  const limit = Math.min(
    100,
    Math.max(1, Number(searchParams.get("limit") || "20") || 20),
  );
  return { page, limit };
}

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, { status: 200, ...init });
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

