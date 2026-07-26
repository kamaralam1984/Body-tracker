import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { errorResponse } from "@/server/http/respond";
import { notFound, badRequest } from "@/server/http/errors";

export const dynamic = "force-dynamic";

const UPLOADS_DIR = path.join(process.cwd(), "var", "uploads", "avatars");

// Deliberately strict (not just "no ../") — only a real filename this
// app itself ever writes (`{userId}.{ext}`, see the POST route) can ever
// match, so there's no path-traversal surface to reason about at all.
const FILENAME_PATTERN = /^[a-zA-Z0-9_-]+\.(png|jpe?g|webp|gif)$/;

const CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

/** Public (no auth) — avatars are meant to be renderable anywhere in the UI, same as any other public image asset. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
) {
  try {
    const { filename } = await params;
    if (!FILENAME_PATTERN.test(filename)) throw badRequest("Invalid avatar filename");

    const ext = filename.split(".").pop() ?? "";
    const bytes = await readFile(path.join(UPLOADS_DIR, filename)).catch(() => {
      throw notFound("Avatar");
    });

    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": CONTENT_TYPES[ext] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
