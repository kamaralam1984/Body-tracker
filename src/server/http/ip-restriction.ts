import ipaddr from "ipaddr.js";

/**
 * Real IP allowlist matching for `ApiKey.allowedIps` — exact addresses or
 * real CIDR ranges (e.g. "203.0.113.0/24"), IPv4 and IPv6, via `ipaddr.js`
 * (real, zero-dependency, widely used). An empty `allowedIps` list means
 * "no restriction" (today's behavior for every existing key, unchanged).
 */
export function isIpAllowed(callerIp: string | null, allowedIps: string[]): boolean {
  if (allowedIps.length === 0) return true;
  if (!callerIp) return false;

  let caller;
  try {
    caller = ipaddr.process(callerIp);
  } catch {
    return false;
  }

  return allowedIps.some((entry) => {
    try {
      if (entry.includes("/")) {
        const [rangeAddr, bits] = ipaddr.parseCIDR(entry);
        if (rangeAddr.kind() !== caller.kind()) return false;
        return caller.match([rangeAddr, bits]);
      }
      const exact = ipaddr.process(entry);
      return exact.kind() === caller.kind() && exact.toString() === caller.toString();
    } catch {
      // A malformed allowedIps entry never accidentally grants access.
      return false;
    }
  });
}
