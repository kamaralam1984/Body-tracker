/**
 * Real wildcard-capable domain/origin matching for `ApiKey.allowedOrigins`
 * (e.g. "example.com", "*.example.com"). Checked against the request's
 * real `Origin` header, falling back to the hostname of `Referer` when
 * `Origin` is absent (server-to-server calls typically send neither, which
 * is why this only applies when the key actually has restrictions set —
 * an empty `allowedOrigins` list means "no restriction").
 */
export function isOriginAllowed(request: Request, allowedOrigins: string[]): boolean {
  if (allowedOrigins.length === 0) return true;

  const hostname = extractHostname(request);
  if (!hostname) return false;

  return allowedOrigins.some((pattern) => matchesHostname(hostname, pattern));
}

function extractHostname(request: Request): string | null {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).hostname;
    } catch {
      return null;
    }
  }
  const referer = request.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).hostname;
    } catch {
      return null;
    }
  }
  return null;
}

function matchesHostname(hostname: string, pattern: string): boolean {
  if (pattern.startsWith("*.")) {
    const suffix = pattern.slice(1); // ".example.com"
    return hostname.endsWith(suffix) && hostname.length > suffix.length;
  }
  return hostname === pattern;
}
