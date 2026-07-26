import { NextRequest } from "next/server";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { getPrisma } from "@/server/db/prisma";
import { resolvePrincipal, requireScope, rateLimitResponseHeaders } from "@/server/http/principal";
import { ok, errorResponse } from "@/server/http/respond";
import { ApiError, notFound } from "@/server/http/errors";
import { sanitizeUser } from "@/server/services/auth-service";

export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

// Deliberately NOT under `public/` — see the schema comment on
// `User.avatarUrl`. `process.cwd()` is the repo root both in `next dev`
// and under the real PM2 deployment (ecosystem.config.js sets `cwd:
// __dirname` even though the executed script is
// `.next/standalone/server.js`), so this resolves to the same real
// on-disk location in both environments.
const UPLOADS_DIR = path.join(process.cwd(), "var", "uploads", "avatars");

/** Real single-file avatar upload — the one real endpoint the SDK's file-upload module wraps. Chunked/resumable upload is out of scope (see INCOMPLETE.md): this is a single ≤5MB image, which covers the actual real use case. */
export async function POST(request: NextRequest) {
  try {
    const principal = await resolvePrincipal(request);
    requireScope(principal, "users:write");

    const formData = await request.formData().catch(() => {
      throw new ApiError("bad_request", "Request must be multipart/form-data with a `file` field");
    });
    const file = formData.get("file");
    if (!(file instanceof File)) {
      throw new ApiError("bad_request", "Missing `file` field");
    }
    if (file.size === 0) throw new ApiError("bad_request", "File is empty");
    if (file.size > MAX_BYTES) {
      throw new ApiError("bad_request", `File exceeds the ${MAX_BYTES / (1024 * 1024)}MB limit`);
    }
    const ext = ALLOWED_TYPES[file.type];
    if (!ext) {
      throw new ApiError(
        "bad_request",
        `Unsupported file type "${file.type}" — allowed: ${Object.keys(ALLOWED_TYPES).join(", ")}`,
      );
    }

    const prisma = await getPrisma();
    const existing = await prisma.user.findUnique({ where: { id: principal.userId } });
    if (!existing) throw notFound("User");

    await mkdir(UPLOADS_DIR, { recursive: true });
    const filename = `${principal.userId}.${ext}`;
    const bytes = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(UPLOADS_DIR, filename), bytes);

    const avatarUrl = `/api/v1/uploads/avatars/${filename}`;
    const user = await prisma.user.update({
      where: { id: principal.userId },
      data: { avatarUrl },
    });

    return ok(sanitizeUser(user), { headers: rateLimitResponseHeaders(principal) });
  } catch (error) {
    return errorResponse(error);
  }
}

/** Removes the caller's own avatar — best-effort file delete, always clears the real `avatarUrl` field. */
export async function DELETE(request: NextRequest) {
  try {
    const principal = await resolvePrincipal(request);
    requireScope(principal, "users:write");

    const prisma = await getPrisma();
    const existing = await prisma.user.findUnique({ where: { id: principal.userId } });
    if (!existing) throw notFound("User");

    if (existing.avatarUrl) {
      const filename = existing.avatarUrl.split("/").pop();
      if (filename) {
        await unlink(path.join(UPLOADS_DIR, filename)).catch(() => {
          // Best-effort — a missing file on disk shouldn't block clearing the field.
        });
      }
    }

    const user = await prisma.user.update({
      where: { id: principal.userId },
      data: { avatarUrl: null },
    });

    return ok(sanitizeUser(user), { headers: rateLimitResponseHeaders(principal) });
  } catch (error) {
    return errorResponse(error);
  }
}
