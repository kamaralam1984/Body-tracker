import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, errorResponse } from "@/server/http/respond";
import { parseJsonBody } from "@/server/http/validate";
import { login } from "@/server/services/auth-service";

export const dynamic = "force-dynamic";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await parseJsonBody(request, loginSchema);
    const result = login(body.email, body.password);
    return ok(result);
  } catch (error) {
    return errorResponse(error);
  }
}
