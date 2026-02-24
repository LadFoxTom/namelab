import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ domain: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { domain } = await params;
  const domainName = decodeURIComponent(domain);

  await prisma.savedDomain.deleteMany({
    where: {
      userId: session.id,
      domain: domainName,
    },
  });

  return NextResponse.json({ success: true });
}
