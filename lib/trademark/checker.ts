import {
  TrademarkMatch,
  TrademarkResult,
  TrademarkRisk,
} from "./types";

async function searchUSPTO(name: string): Promise<TrademarkMatch[]> {
  const matches: TrademarkMatch[] = [];
  try {
    const query = encodeURIComponent(name);
    const res = await fetch(
      `https://tsdr.uspto.gov/documentretrieve?searchText=${query}&searchType=wordMark&freeFormSearch=true`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) return matches;
    const text = await res.text();
    // Parse basic results — USPTO returns XML
    const markRegex = /<wordMark>([^<]+)<\/wordMark>/gi;
    const regNumRegex = /<registrationNumber>([^<]+)<\/registrationNumber>/gi;
    const statusRegex = /<markCurrentStatusDescription>([^<]+)<\/markCurrentStatusDescription>/gi;

    const marks = Array.from(text.matchAll(markRegex)).map((m) => m[1]);
    const regNums = Array.from(text.matchAll(regNumRegex)).map((m) => m[1]);
    const statuses = Array.from(text.matchAll(statusRegex)).map((m) => m[1]);

    for (let i = 0; i < Math.min(marks.length, 5); i++) {
      matches.push({
        name: marks[i],
        registrationNumber: regNums[i] || "N/A",
        status: statuses[i] || "Unknown",
        source: "USPTO",
      });
    }
  } catch {
    // USPTO API may be unavailable — silently fail
  }
  return matches;
}

async function searchWIPO(name: string): Promise<TrademarkMatch[]> {
  const matches: TrademarkMatch[] = [];
  try {
    const query = encodeURIComponent(name);
    const res = await fetch(
      `https://branddb.wipo.int/api/v1/brands?query=${query}&rows=5`,
      {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(10000),
      }
    );
    if (!res.ok) return matches;
    const data = await res.json();
    const docs = data?.response?.docs || [];
    for (const doc of docs.slice(0, 5)) {
      matches.push({
        name: doc.markName || doc.brandName || name,
        registrationNumber: doc.registrationNumber || doc.applicationNumber || "N/A",
        status: doc.status || doc.markStatus || "Unknown",
        source: "WIPO",
      });
    }
  } catch {
    // WIPO API may be unavailable — silently fail
  }
  return matches;
}

function computeRisk(
  name: string,
  matches: TrademarkMatch[]
): TrademarkRisk {
  const nameLower = name.toLowerCase();

  for (const match of matches) {
    const matchLower = match.name.toLowerCase();
    // Exact match with registered status
    if (
      matchLower === nameLower &&
      (match.status.toLowerCase().includes("registered") ||
        match.status.toLowerCase().includes("live"))
    ) {
      return "conflict";
    }
  }

  // Partial/phonetic matches
  for (const match of matches) {
    const matchLower = match.name.toLowerCase();
    if (
      matchLower.includes(nameLower) ||
      nameLower.includes(matchLower)
    ) {
      return "caution";
    }
  }

  if (matches.length > 0) {
    return "caution";
  }

  return "clear";
}

export async function checkTrademark(
  domainName: string
): Promise<TrademarkResult> {
  const name = domainName.split(".")[0];

  const [usptoMatches, wipoMatches] = await Promise.allSettled([
    searchUSPTO(name),
    searchWIPO(name),
  ]);

  const allMatches: TrademarkMatch[] = [
    ...(usptoMatches.status === "fulfilled" ? usptoMatches.value : []),
    ...(wipoMatches.status === "fulfilled" ? wipoMatches.value : []),
  ];

  const risk = computeRisk(name, allMatches);

  return {
    domain: domainName,
    risk,
    matches: allMatches,
    checkedAt: new Date().toISOString(),
  };
}
