import { ProviderResult } from "./types";

export async function checkGoDaddyAvailability(
  domains: string[]
): Promise<ProviderResult[]> {
  const apiKey = process.env.GODADDY_API_KEY;
  const apiSecret = process.env.GODADDY_API_SECRET;

  if (!apiKey || !apiSecret) {
    console.warn("GoDaddy API credentials not configured");
    return [];
  }

  const headers = {
    Authorization: `sso-key ${apiKey}:${apiSecret}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  // Use the batch endpoint — checks multiple domains in one request
  try {
    const response = await fetch(
      "https://api.godaddy.com/v1/domains/available?checkType=FAST",
      {
        method: "POST",
        headers,
        body: JSON.stringify(domains),
      }
    );

    if (!response.ok) {
      // Fall back to individual checks if batch fails
      console.warn("GoDaddy batch check failed, trying individual checks");
      return checkIndividually(domains, headers);
    }

    const data = (await response.json()) as {
      domains: Array<{
        available: boolean;
        domain: string;
        price?: number;
        currency?: string;
      }>;
    };

    if (!data.domains) return [];

    return data.domains.map((d) => ({
      domain: d.domain,
      available: d.available,
      // GoDaddy returns price in micro-units (1/1,000,000)
      price: d.price ? d.price / 1000000 : 0,
      isPremium: false,
      registrar: "godaddy" as const,
    }));
  } catch (error) {
    console.error("GoDaddy batch API error:", error);
    return checkIndividually(domains, headers);
  }
}

async function checkIndividually(
  domains: string[],
  headers: Record<string, string>
): Promise<ProviderResult[]> {
  const results: ProviderResult[] = [];

  const checks = domains.map(async (domain) => {
    try {
      const response = await fetch(
        `https://api.godaddy.com/v1/domains/available?domain=${encodeURIComponent(domain)}&checkType=FAST`,
        { headers }
      );

      if (!response.ok) return null;

      const data = (await response.json()) as {
        available: boolean;
        domain: string;
        price?: number;
      };

      return {
        domain: data.domain || domain,
        available: data.available,
        price: data.price ? data.price / 1000000 : 0,
        isPremium: false,
        registrar: "godaddy" as const,
      };
    } catch {
      return null;
    }
  });

  const settled = await Promise.allSettled(checks);
  for (const result of settled) {
    if (result.status === "fulfilled" && result.value) {
      results.push(result.value);
    }
  }

  return results;
}
