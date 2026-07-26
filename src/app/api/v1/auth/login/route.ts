import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, errorResponse } from "@/server/http/respond";
import { parseJsonBody } from "@/server/http/validate";
import { login } from "@/server/services/auth-service";
import { beginRequestContext } from "@/server/http/request-context";

export const dynamic = "force-dynamic";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    beginRequestContext(request);
    const body = await parseJsonBody(request, loginSchema);
    const result = await login(body.email, body.password);
    return ok(result);
  } catch (error) {
    return errorResponse(error);
  }
}
