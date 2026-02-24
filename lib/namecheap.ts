import { ProviderResult } from "./types";
import { getTldPricing, getRdapServers } from "./tlds";

const TLD_PRICING = getTldPricing();
const RDAP_SERVERS = getRdapServers();

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
