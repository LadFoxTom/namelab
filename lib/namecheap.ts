import { ProviderResult } from "./types";

// Static pricing table based on Namecheap registration prices (USD/yr)
// Update periodically — these change infrequently
const TLD_PRICING: Record<string, number> = {
  com: 10.98,
  net: 11.98,
  org: 7.48,
  io: 34.98,
  ai: 79.98,
  co: 12.48,
  app: 12.98,
  dev: 12.98,
  nl: 7.48,
  xyz: 2.0,
};

// RDAP servers per TLD for availability lookups (free, no auth, no IP whitelist)
const RDAP_SERVERS: Record<string, string> = {
  com: "https://rdap.verisign.com/com/v1",
  net: "https://rdap.verisign.com/net/v1",
  org: "https://rdap.org.zwrcgl.com/org/v1",
  io: "https://rdap.nic.io/v1",
  ai: "https://rdap.nic.ai/v1",
  co: "https://rdap.nic.co/v1",
  app: "https://rdap.nic.google/v1",
  dev: "https://rdap.nic.google/v1",
  nl: "https://rdap.sidn.nl/v1",
  xyz: "https://rdap.nic.xyz/v1",
};

async function checkDomainRdap(domain: string): Promise<boolean | null> {
  const tld = domain.split(".").pop()?.toLowerCase() || "";
  const server = RDAP_SERVERS[tld];
  if (!server) return null; // Unknown TLD

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${server}/domain/${domain.toLowerCase()}`, {
      signal: controller.signal,
      headers: { Accept: "application/rdap+json" },
    });
    clearTimeout(timeout);

    if (response.status === 404 || response.status === 400) {
      return true; // Not found = available
    }
    if (response.ok) {
      return false; // Found = taken
    }
    return null; // Unexpected status
  } catch {
    return null; // Timeout or network error
  }
}

export async function checkNamecheapAvailability(
  domains: string[]
): Promise<ProviderResult[]> {
  // Check all domains via RDAP in parallel
  const results = await Promise.all(
    domains.map(async (domain): Promise<ProviderResult | null> => {
      const available = await checkDomainRdap(domain);
      if (available === null) return null; // Skip domains we couldn't check

      const tld = domain.split(".").pop()?.toLowerCase() || "";
      const price = TLD_PRICING[tld] || 0;

      return {
        domain,
        available,
        price,
        isPremium: false,
        registrar: "namecheap",
      };
    })
  );

  return results.filter((r): r is ProviderResult => r !== null);
}
