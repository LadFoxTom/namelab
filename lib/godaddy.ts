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

  const results: ProviderResult[] = [];

  // GoDaddy checks domains one at a time
  const checks = domains.map(async (domain) => {
    try {
      const response = await fetch(
        `https://api.godaddy.com/v1/domains/available?domain=${encodeURIComponent(domain)}`,
        {
          headers: {
            Authorization: `sso-key ${apiKey}:${apiSecret}`,
            Accept: "application/json",
          },
        }
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
        price: (data.price || 1299) / 1000000, // GoDaddy returns price in micro-units
        isPremium: false,
        registrar: "godaddy",
      } as ProviderResult;
    } catch (error) {
      console.error(`GoDaddy API error for ${domain}:`, error);
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
