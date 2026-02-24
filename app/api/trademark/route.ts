import { NextRequest, NextResponse } from "next/server";
import { checkTrademark } from "@/lib/trademark/checker";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { domain } = await request.json();

    if (!domain || typeof domain !== "string") {
      return NextResponse.json(
        { success: false, error: "Domain is required" },
        { status: 400 }
      );
    }

    // Check cache (7-day TTL)
    try {
      const cached = await prisma.trademarkCache.findUnique({
        where: { domainName: domain.toLowerCase() },
      });

      if (cached && cached.expiresAt > new Date()) {
        return NextResponse.json({
          success: true,
          result: {
            domain: cached.domainName,
            risk: cached.risk,
            matches: cached.resultJson as unknown[],
            checkedAt: cached.checkedAt.toISOString(),
          },
        });
      }
    } catch {
      // Cache miss or DB error — proceed with live check
    }

    // Live trademark check
    const result = await checkTrademark(domain);

    // Cache the result
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await prisma.trademarkCache.upsert({
        where: { domainName: domain.toLowerCase() },
        update: {
          risk: result.risk,
          resultJson: JSON.parse(JSON.stringify(result.matches)),
          checkedAt: new Date(),
          expiresAt,
        },
        create: {
          domainName: domain.toLowerCase(),
          risk: result.risk,
          resultJson: JSON.parse(JSON.stringify(result.matches)),
          expiresAt,
        },
      });
    } catch {
      // Cache save failure is non-critical
    }

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("Trademark check error:", error);
    return NextResponse.json(
      { success: false, error: "Trademark check failed" },
      { status: 500 }
    );
  }
}
