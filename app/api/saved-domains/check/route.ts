import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const domains = body.domains as string[];

  if (!Array.isArray(domains)) {
    return NextResponse.json({ error: "Missing domains array" }, { status: 400 });
  }

  const saved = await prisma.savedDomain.findMany({
    where: {
      userId: session.id,
      domain: { in: domains },
    },
    select: { domain: true },
  });

  const savedMap: Record<string, boolean> = {};
  for (const d of domains) {
    savedMap[d] = false;
  }
  for (const s of saved) {
    savedMap[s.domain] = true;
  }

  return NextResponse.json({ saved: savedMap });
}
