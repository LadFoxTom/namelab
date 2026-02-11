type Registrar = "namecheap" | "godaddy" | "namesilo";

export function generateAffiliateUrl(
  domain: string,
  registrar: Registrar
): string {
  const affiliateIds: Record<Registrar, string | undefined> = {
    namecheap: process.env.NAMECHEAP_AFFILIATE_ID,
    godaddy: process.env.GODADDY_AFFILIATE_ID,
    namesilo: process.env.NAMESILO_AFFILIATE_ID,
  };

  const affId = affiliateIds[registrar] || "";

  const urls: Record<Registrar, string> = {
    namecheap: `https://www.namecheap.com/domains/registration/results/?domain=${encodeURIComponent(domain)}&affid=${encodeURIComponent(affId)}`,
    godaddy: `https://www.godaddy.com/domainsearch/find?domainToCheck=${encodeURIComponent(domain)}&affid=${encodeURIComponent(affId)}`,
    namesilo: `https://www.namesilo.com/domain/details/${encodeURIComponent(domain)}?rid=${encodeURIComponent(affId)}`,
  };

  return urls[registrar];
}
