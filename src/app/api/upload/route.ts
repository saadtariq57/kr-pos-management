import { NextRequest, NextResponse } from "next/server";

import { getSessionUserApproved } from "@/lib/auth-server";
import { uploadBufferToCloudinary } from "@/lib/cloudinary";
import { canManageInventory } from "@/lib/rbac";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUserApproved();
    if (!session || !canManageInventory(session.role)) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const form = await req.formData();
    const file = form.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "file is required" },
        { status: 400 },
      );
    }

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      return NextResponse.json(
        { ok: false, error: "Only jpg/png/webp are allowed" },
        { status: 400 },
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { ok: false, error: "File is too large (max 8 MB)" },
        { status: 400 },
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const result = await uploadBufferToCloudinary(buffer);

    return NextResponse.json({
      ok: true,
      url: result.secure_url,
      filename: result.public_id,
      public_id: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
