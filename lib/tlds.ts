export interface TldEntry {
  tld: string;
  label: string;
  price: number;
  rdapServer?: string;
  category: TldCategory;
}

export type TldCategory =
  | "popular"
  | "tech"
  | "business"
  | "creative"
  | "european"
  | "asian"
  | "americas"
  | "other";

export const TLD_CATEGORIES: { key: TldCategory; label: string }[] = [
  { key: "popular", label: "Popular" },
  { key: "tech", label: "Tech & Dev" },
  { key: "business", label: "Business" },
  { key: "creative", label: "Creative" },
  { key: "european", label: "European" },
  { key: "asian", label: "Asian" },
  { key: "americas", label: "Americas" },
  { key: "other", label: "Other" },
];

export const TLD_REGISTRY: TldEntry[] = [
  // Popular
  { tld: ".com", label: "com", price: 10.98, rdapServer: "https://rdap.verisign.com/com/v1", category: "popular" },
  { tld: ".net", label: "net", price: 11.98, rdapServer: "https://rdap.verisign.com/net/v1", category: "popular" },
  { tld: ".org", label: "org", price: 7.48, rdapServer: "https://rdap.org.zwrcgl.com/org/v1", category: "popular" },
  { tld: ".io", label: "io", price: 34.98, rdapServer: "https://rdap.nic.io/v1", category: "popular" },
  { tld: ".co", label: "co", price: 12.48, rdapServer: "https://rdap.nic.co/v1", category: "popular" },
  { tld: ".ai", label: "ai", price: 79.98, rdapServer: "https://rdap.nic.ai/v1", category: "popular" },
  { tld: ".xyz", label: "xyz", price: 2.00, rdapServer: "https://rdap.nic.xyz/v1", category: "popular" },

  // Tech & Dev
  { tld: ".app", label: "app", price: 12.98, rdapServer: "https://rdap.nic.google/v1", category: "tech" },
  { tld: ".dev", label: "dev", price: 12.98, rdapServer: "https://rdap.nic.google/v1", category: "tech" },
  { tld: ".tech", label: "tech", price: 5.98, category: "tech" },
  { tld: ".codes", label: "codes", price: 8.98, category: "tech" },
  { tld: ".software", label: "software", price: 9.98, category: "tech" },

  // Business
  { tld: ".biz", label: "biz", price: 4.98, category: "business" },
  { tld: ".agency", label: "agency", price: 7.98, category: "business" },
  { tld: ".store", label: "store", price: 3.98, category: "business" },
  { tld: ".shop", label: "shop", price: 2.98, category: "business" },
  { tld: ".company", label: "company", price: 8.98, category: "business" },

  // Creative
  { tld: ".design", label: "design", price: 8.98, category: "creative" },
  { tld: ".art", label: "art", price: 4.98, category: "creative" },
  { tld: ".studio", label: "studio", price: 7.98, category: "creative" },
  { tld: ".media", label: "media", price: 8.98, category: "creative" },

  // European
  { tld: ".nl", label: "nl", price: 7.48, rdapServer: "https://rdap.sidn.nl/v1", category: "european" },
  { tld: ".de", label: "de", price: 7.98, category: "european" },
  { tld: ".fr", label: "fr", price: 9.98, category: "european" },
  { tld: ".uk", label: "uk", price: 8.18, category: "european" },
  { tld: ".eu", label: "eu", price: 3.98, category: "european" },
  { tld: ".it", label: "it", price: 8.98, category: "european" },
  { tld: ".es", label: "es", price: 8.98, category: "european" },
  { tld: ".be", label: "be", price: 7.98, category: "european" },
  { tld: ".se", label: "se", price: 14.98, category: "european" },
  { tld: ".pl", label: "pl", price: 8.98, category: "european" },
  { tld: ".ch", label: "ch", price: 10.98, category: "european" },
  { tld: ".at", label: "at", price: 10.98, category: "european" },

  // Asian
  { tld: ".jp", label: "jp", price: 12.98, category: "asian" },
  { tld: ".in", label: "in", price: 8.98, category: "asian" },
  { tld: ".cn", label: "cn", price: 9.98, category: "asian" },
  { tld: ".kr", label: "kr", price: 16.98, category: "asian" },
  { tld: ".sg", label: "sg", price: 24.98, category: "asian" },

  // Americas
  { tld: ".us", label: "us", price: 5.98, category: "americas" },
  { tld: ".ca", label: "ca", price: 12.98, category: "americas" },
  { tld: ".mx", label: "mx", price: 15.98, category: "americas" },
  { tld: ".com.br", label: "com.br", price: 14.98, category: "americas" },
  { tld: ".com.co", label: "com.co", price: 12.98, category: "americas" },
];

export const DEFAULT_TLDS = [".com", ".io", ".ai", ".co", ".net", ".app", ".nl", ".dev", ".xyz", ".org"];

export function getTldPricing(): Record<string, number> {
  const map: Record<string, number> = {};
  for (const entry of TLD_REGISTRY) {
    map[entry.label] = entry.price;
  }
  return map;
}

export function getRdapServers(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const entry of TLD_REGISTRY) {
    if (entry.rdapServer) {
      map[entry.label] = entry.rdapServer;
    }
  }
  return map;
}

export function getTldsByCategory(): Map<TldCategory, TldEntry[]> {
  const map = new Map<TldCategory, TldEntry[]>();
  for (const entry of TLD_REGISTRY) {
    if (!map.has(entry.category)) map.set(entry.category, []);
    map.get(entry.category)!.push(entry);
  }
  return map;
}
