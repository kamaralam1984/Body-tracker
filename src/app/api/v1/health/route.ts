import { NextRequest, NextResponse } from "next/server";
import { beginRequestContext, logApiRequest } from "@/server/http/request-context";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  beginRequestContext(request);
  logApiRequest(200);
  return NextResponse.json({ status: "ok", timestamp: new Date().toISOString() });
}
