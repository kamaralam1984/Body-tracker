/**
 * Coarse, honest User-Agent classification for API usage analytics — real
 * substring/regex matching against the actual header value, no fabricated
 * device/OS/version detail beyond what a UA string can reliably signal.
 */
export function classifyUserAgent(userAgent: string | null): string {
  if (!userAgent) return "Unknown";
  const ua = userAgent.toLowerCase();

  if (ua.includes("curl/")) return "curl";
  if (ua.includes("postmanruntime")) return "Postman";
  if (ua.includes("insomnia")) return "Insomnia";
  if (ua.includes("python-requests") || ua.startsWith("python/")) return "Python";
  if (ua.includes("axios")) return "Node.js (axios)";
  if (ua.includes("node-fetch") || ua.includes("node.js")) return "Node.js";
  if (ua.includes("go-http-client")) return "Go";
  if (/bot|spider|crawler/.test(ua)) return "Bot/crawler";

  const isMobile = /mobile|android|iphone|ipad/.test(ua);
  let browser = "Other";
  if (ua.includes("edg/")) browser = "Edge";
  else if (ua.includes("chrome/") && !ua.includes("chromium")) browser = "Chrome";
  else if (ua.includes("firefox/")) browser = "Firefox";
  else if (ua.includes("safari/") && !ua.includes("chrome") && !ua.includes("chromium"))
    browser = "Safari";

  return isMobile ? `${browser} (Mobile)` : browser;
}
