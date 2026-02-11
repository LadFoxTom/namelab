import { XMLParser } from "fast-xml-parser";
import { ProviderResult } from "./types";

export async function checkNameSiloAvailability(
  domains: string[]
): Promise<ProviderResult[]> {
  const apiKey = process.env.NAMESILO_API_KEY;

  if (!apiKey) {
    console.warn("NameSilo API credentials not configured");
    return [];
  }

  const results: ProviderResult[] = [];

  const checks = domains.map(async (domain) => {
    try {
      const response = await fetch(
        `https://www.namesilo.com/api/checkRegisterAvailability?version=1&type=xml&key=${encodeURIComponent(apiKey)}&domains=${encodeURIComponent(domain)}`
      );

      const xml = await response.text();
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "",
      });
      const parsed = parser.parse(xml);

      const reply = parsed?.namesilo?.reply;
      if (!reply || reply.code !== 300) return null;

      const available = reply.available?.domain;
      const unavailable = reply.unavailable?.domain;

      if (available) {
        const domainName = typeof available === "string" ? available : domain;
        return {
          domain: domainName,
          available: true,
          price: parseFloat(reply.available?.price || "8.99"),
          isPremium: false,
          registrar: "namesilo",
        } as ProviderResult;
      }

      if (unavailable) {
        return {
          domain,
          available: false,
          price: 0,
          isPremium: false,
          registrar: "namesilo",
        } as ProviderResult;
      }

      return null;
    } catch (error) {
      console.error(`NameSilo API error for ${domain}:`, error);
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
