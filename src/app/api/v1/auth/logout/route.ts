import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, errorResponse } from "@/server/http/respond";
import { parseJsonBody } from "@/server/http/validate";
import { logout } from "@/server/services/auth-service";
import { beginRequestContext } from "@/server/http/request-context";

export const dynamic = "force-dynamic";

export const logoutSchema = z.object({
  refreshToken: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    beginRequestContext(request);
    const body = await parseJsonBody(request, logoutSchema);
    const result = await logout(body.refreshToken);
    return ok(result);
  } catch (error) {
    return errorResponse(error);
  }
}
