import { NextResponse } from "next/server";

/**
 * App-wide security headers (Next.js 16 renamed Middleware to Proxy — see
 * node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md).
 * This is the hand-rolled equivalent of an Express "Helmet" layer, since
 * adding the `helmet` package would violate this project's zero-new-deps
 * constraint. Nginx (see deploy/nginx/body-tracker.conf) sets the same
 * headers again at the edge in production — defense in depth, not
 * duplication for its own sake, since the app must be safe standalone too
 * (e.g. behind a bare load balancer, or during local `next start`).
 *
 * CSP is production-only: Next.js dev tooling (Turbopack HMR websocket,
 * React Refresh's dynamic eval) needs looser rules that would otherwise
 * mask real CSP violations you'd only find in production.
 */
export function proxy() {
  const response = NextResponse.next();

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(self), microphone=(), geolocation=(), interest-cohort=()",
  );
  response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  response.headers.set("X-Request-Id", crypto.randomUUID());

  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob:",
        "font-src 'self' data:",
        "media-src 'self' blob:",
        "connect-src 'self'",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "object-src 'none'",
      ].join("; "),
    );
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"],
};
