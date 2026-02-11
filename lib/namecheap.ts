import { XMLParser } from "fast-xml-parser";
import { ProviderResult } from "./types";

export async function checkNamecheapAvailability(
  domains: string[]
): Promise<ProviderResult[]> {
  const apiUser = process.env.NAMECHEAP_API_USER;
  const apiKey = process.env.NAMECHEAP_API_KEY;
  const clientIp = process.env.NAMECHEAP_CLIENT_IP;

  if (!apiUser || !apiKey || !clientIp) {
    console.warn("Namecheap API credentials not configured");
    return [];
  }

  const domainList = domains.join(",");
  const baseUrl = "https://api.namecheap.com/xml.response";

  const url = `${baseUrl}?ApiUser=${encodeURIComponent(apiUser)}&ApiKey=${encodeURIComponent(apiKey)}&UserName=${encodeURIComponent(apiUser)}&ClientIp=${encodeURIComponent(clientIp)}&Command=namecheap.domains.check&DomainList=${encodeURIComponent(domainList)}`;

  try {
    const response = await fetch(url);
    const xml = await response.text();

    console.log("Namecheap raw XML response:", xml.substring(0, 500));

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "",
    });
    const parsed = parser.parse(xml);

    console.log("Namecheap parsed response:", JSON.stringify(parsed, null, 2).substring(0, 1000));

    const commandResponse =
      parsed?.ApiResponse?.CommandResponse?.DomainCheckResult;
    if (!commandResponse) {
      console.warn("Namecheap: No DomainCheckResult in response");
      return [];
    }

    const results = Array.isArray(commandResponse)
      ? commandResponse
      : [commandResponse];

    return results.map(
      (r: {
        Domain: string;
        Available: string;
        Price?: string;
        IsPremiumName?: string;
      }) => ({
        domain: r.Domain,
        available: r.Available === "true",
        price: parseFloat(r.Price || "10.98"),
        isPremium: r.IsPremiumName === "true",
        registrar: "namecheap",
      })
    );
  } catch (error) {
    console.error("Namecheap API error:", error);
    return [];
  }
}
