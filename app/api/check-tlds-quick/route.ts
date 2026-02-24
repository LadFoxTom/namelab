import { NextRequest, NextResponse } from "next/server";
import { checkNamecheapAvailability } from "@/lib/namecheap";
import { checkGoDaddyAvailability } from "@/lib/godaddy";
import { DEFAULT_TLDS, TLD_REGISTRY } from "@/lib/tlds";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");

  if (!name || !/^[a-zA-Z0-9-]+$/.test(name)) {
    return NextResponse.json(
      { error: "Invalid domain name", availableCount: 0, totalCount: 0, tlds: [] },
      { status: 400 }
    );
  }

  const baseName = name.toLowerCase();
  const tldsParam = searchParams.get("tlds");
  const requestedTlds = tldsParam
    ? tldsParam.split(",").filter((t) => TLD_REGISTRY.some((e) => e.tld === t))
    : DEFAULT_TLDS;
  const domainNames = requestedTlds.map((tld) => `${baseName}${tld}`);

  // Check RDAP first, then use GoDaddy as fallback for domains RDAP couldn't resolve
  const rdapResults = await checkNamecheapAvailability(domainNames);

  const availabilityMap = new Map<string, boolean>();
  for (const r of rdapResults) {
    availabilityMap.set(r.domain.toLowerCase(), r.available);
  }

  // Find domains that RDAP failed to check (unreliable servers like .io)
  const uncheckedDomains = domainNames.filter(
    (d) => !availabilityMap.has(d.toLowerCase())
  );

  if (uncheckedDomains.length > 0) {
    const fallbackResults = await checkGoDaddyAvailability(uncheckedDomains);
    for (const r of fallbackResults) {
      availabilityMap.set(r.domain.toLowerCase(), r.available);
    }
  }

  const tlds = requestedTlds.map((tld) => {
    const domain = `${baseName}${tld}`;
    const available = availabilityMap.get(domain);
    return {
      tld,
      available: available ?? null,
    };
  });

  // Only count domains we could actually check
  const checked = tlds.filter((t) => t.available !== null);
  const availableCount = checked.filter((t) => t.available === true).length;

  return NextResponse.json({
    baseName,
    tlds,
    availableCount,
    totalCount: checked.length,
  });
}
