import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, errorResponse } from "@/server/http/respond";
import { parseJsonBody } from "@/server/http/validate";
import { refreshSession } from "@/server/services/auth-service";

export const dynamic = "force-dynamic";

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await parseJsonBody(request, refreshSchema);
    const result = refreshSession(body.refreshToken);
    return ok(result);
  } catch (error) {
    return errorResponse(error);
  }
}
