import { XMLParser } from "fast-xml-parser";
import { ProviderResult } from "./types";

// Cache TLD pricing to avoid repeated API calls
let pricingCache: Map<string, number> | null = null;
let pricingCacheTime = 0;
const PRICING_CACHE_TTL = 60 * 60 * 1000; // 1 hour

async function fetchTldPricing(): Promise<Map<string, number>> {
  // Return cached pricing if still valid
  if (pricingCache && Date.now() - pricingCacheTime < PRICING_CACHE_TTL) {
    return pricingCache;
  }

  const apiUser = process.env.NAMECHEAP_API_USER;
  const apiKey = process.env.NAMECHEAP_API_KEY;
  const clientIp = process.env.NAMECHEAP_CLIENT_IP;

  if (!apiUser || !apiKey || !clientIp) {
    return new Map();
  }

  const baseUrl = "https://api.namecheap.com/xml.response";
  const url = `${baseUrl}?ApiUser=${encodeURIComponent(apiUser)}&ApiKey=${encodeURIComponent(apiKey)}&UserName=${encodeURIComponent(apiUser)}&ClientIp=${encodeURIComponent(clientIp)}&Command=namecheap.users.getPricing&ProductType=DOMAIN&ActionName=REGISTER`;

  try {
    const response = await fetch(url);
    const xml = await response.text();

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "",
    });
    const parsed = parser.parse(xml);

    const priceMap = new Map<string, number>();

    const productType =
      parsed?.ApiResponse?.CommandResponse?.UserGetPricingResult?.ProductType;
    if (!productType) {
      console.warn("Namecheap getPricing: No ProductType in response");
      return priceMap;
    }

    // ProductCategory can be a single object or array
    const categories = productType.ProductCategory;
    const categoryList = Array.isArray(categories) ? categories : [categories];

    for (const category of categoryList) {
      if (category?.Name !== "register") continue;

      const products = category.Product;
      const productList = Array.isArray(products) ? products : [products];

      for (const product of productList) {
        if (!product?.Name) continue;
        const tld = product.Name.toLowerCase();

        // Price can be a single object or array (for different durations)
        const prices = product.Price;
        const priceList = Array.isArray(prices) ? prices : [prices];

        // Find the 1-year registration price
        for (const p of priceList) {
          if (p?.Duration === "1" || p?.Duration === 1) {
            const price = parseFloat(p.Price || p.YourPrice || "0");
            if (price > 0) {
              priceMap.set(tld, price);
              break;
            }
          }
        }

        // If no 1-year price found, use the first available price
        if (!priceMap.has(tld) && priceList.length > 0) {
          const price = parseFloat(
            priceList[0]?.Price || priceList[0]?.YourPrice || "0"
          );
          if (price > 0) {
            priceMap.set(tld, price);
          }
        }
      }
    }

    console.log(
      "Namecheap TLD pricing loaded:",
      Object.fromEntries(
        [...priceMap.entries()]
          .filter(([tld]) =>
            ["com", "io", "ai", "co", "net", "app", "nl", "dev", "xyz", "org"].includes(tld)
          )
          .sort(([a], [b]) => a.localeCompare(b))
      )
    );

    pricingCache = priceMap;
    pricingCacheTime = Date.now();
    return priceMap;
  } catch (error) {
    console.error("Namecheap getPricing error:", error);
    return new Map();
  }
}

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

  // Fetch pricing in parallel with availability check
  const [pricing] = await Promise.all([fetchTldPricing()]);

  const domainList = domains.join(",");
  const baseUrl = "https://api.namecheap.com/xml.response";

  const url = `${baseUrl}?ApiUser=${encodeURIComponent(apiUser)}&ApiKey=${encodeURIComponent(apiKey)}&UserName=${encodeURIComponent(apiUser)}&ClientIp=${encodeURIComponent(clientIp)}&Command=namecheap.domains.check&DomainList=${encodeURIComponent(domainList)}`;

  try {
    const response = await fetch(url);
    const xml = await response.text();

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "",
    });
    const parsed = parser.parse(xml);

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
        IsPremiumName?: string;
        PremiumRegistrationPrice?: string;
      }) => {
        const tld = r.Domain.split(".").pop()?.toLowerCase() || "";
        const isPremium = r.IsPremiumName === "true";
        const premiumPrice = parseFloat(r.PremiumRegistrationPrice || "0");

        // Use premium price if available, otherwise look up TLD pricing
        let price: number;
        if (isPremium && premiumPrice > 0) {
          price = premiumPrice;
        } else {
          price = pricing.get(tld) || 0;
        }

        return {
          domain: r.Domain,
          available: r.Available === "true",
          price,
          isPremium,
          registrar: "namecheap",
        };
      }
    );
  } catch (error) {
    console.error("Namecheap API error:", error);
    return [];
  }
}
