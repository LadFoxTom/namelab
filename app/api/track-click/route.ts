import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TrackClickRequest } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as TrackClickRequest;
    const { domain, registrar, affiliateUrl, userId } = body;

    if (!domain || !registrar || !affiliateUrl) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    try {
      const click = await prisma.affiliateClick.create({
        data: {
          domain,
          registrar,
          affiliateUrl,
          userId: userId || null,
        },
      });

      return NextResponse.json({ success: true, clickId: click.id });
    } catch (dbError) {
      console.error("Database error tracking click:", dbError);
      // Still return success - don't block the user from buying
      return NextResponse.json({
        success: true,
        clickId: `click_${Date.now()}`,
      });
    }
  } catch (error) {
    console.error("Track click error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
