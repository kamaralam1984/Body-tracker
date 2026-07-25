import { NextResponse } from "next/server";
import { OPENAPI_BASE, mergePaths } from "@/server/openapi/document";
import { platformPaths } from "@/server/openapi/paths/platform";
import { authUsersPaths } from "@/server/openapi/paths/auth-users";
import { organizationsPaths } from "@/server/openapi/paths/organizations";
import { sessionsPaths } from "@/server/openapi/paths/sessions";
import { trackingPaths } from "@/server/openapi/paths/tracking";
import { analyticsPaths } from "@/server/openapi/paths/analytics";
import { reportsPaths } from "@/server/openapi/paths/reports";
import { webhooksPaths } from "@/server/openapi/paths/webhooks";

export const dynamic = "force-dynamic";

export async function GET() {
  const document = {
    ...OPENAPI_BASE,
    paths: mergePaths(
      platformPaths,
      authUsersPaths,
      organizationsPaths,
      sessionsPaths,
      trackingPaths,
      analyticsPaths,
      reportsPaths,
      webhooksPaths,
    ),
  };

  return NextResponse.json(document);
}
