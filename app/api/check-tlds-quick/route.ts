import { NextRequest, NextResponse } from "next/server";
import { checkNamecheapAvailability } from "@/lib/namecheap";

const TLDS = [".com", ".io", ".ai", ".co", ".net", ".app", ".nl", ".dev", ".xyz", ".org"];

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
  const domainNames = TLDS.map((tld) => `${baseName}${tld}`);

  const results = await checkNamecheapAvailability(domainNames);

  const availabilityMap = new Map(
    results.map((r) => [r.domain.toLowerCase(), r.available])
  );

  const tlds = TLDS.map((tld) => {
    const domain = `${baseName}${tld}`;
    return {
      tld,
      available: availabilityMap.get(domain) ?? false,
    };
  });

  const availableCount = tlds.filter((t) => t.available).length;

  return NextResponse.json({
    baseName,
    tlds,
    availableCount,
    totalCount: TLDS.length,
  });
}
