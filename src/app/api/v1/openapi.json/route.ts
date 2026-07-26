import { NextResponse } from "next/server";
import { OPENAPI_BASE, mergePaths } from "@/server/openapi/document";
import { buildRegisteredSchemas } from "@/server/openapi/schema-registry";
import { platformPaths } from "@/server/openapi/paths/platform";
import { authUsersPaths } from "@/server/openapi/paths/auth-users";
import { organizationsPaths } from "@/server/openapi/paths/organizations";
import { sessionsPaths } from "@/server/openapi/paths/sessions";
import { trackingPaths } from "@/server/openapi/paths/tracking";
import { analyticsPaths } from "@/server/openapi/paths/analytics";
import { reportsPaths } from "@/server/openapi/paths/reports";
import { webhooksPaths } from "@/server/openapi/paths/webhooks";
import { oauthPaths } from "@/server/openapi/paths/oauth";
import { serviceAccountsPaths } from "@/server/openapi/paths/service-accounts";
import { securityCenterPaths } from "@/server/openapi/paths/security-center";
import { notificationsPaths } from "@/server/openapi/paths/notifications";
import { platformAdminPaths } from "@/server/openapi/paths/platform-admin";

export const dynamic = "force-dynamic";

export function buildOpenApiDocument() {
  const paths = mergePaths(
    platformPaths,
    authUsersPaths,
    organizationsPaths,
    sessionsPaths,
    trackingPaths,
    analyticsPaths,
    reportsPaths,
    webhooksPaths,
    oauthPaths,
    serviceAccountsPaths,
    securityCenterPaths,
    notificationsPaths,
    platformAdminPaths,
  );

  // Importing every path fragment above runs each one's Zod schema
  // registrations (via `schemaRef`) as a module side effect, so by this
  // point the registry is complete for this request.
  return {
    ...OPENAPI_BASE,
    components: {
      ...OPENAPI_BASE.components,
      schemas: {
        ...(OPENAPI_BASE.components as { schemas?: Record<string, unknown> }).schemas,
        ...buildRegisteredSchemas(),
      },
    },
    paths,
  };
}

export async function GET() {
  return NextResponse.json(buildOpenApiDocument());
}
