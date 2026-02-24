import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { DomainResult, AffiliateProvider } from "@/lib/types";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const saved = await prisma.savedDomain.findMany({
    where: { userId: session.id },
    orderBy: { savedAt: "desc" },
  });

  const domains: DomainResult[] = saved.map((s) => ({
    id: s.id,
    domain: s.domain,
    reasoning: s.reasoning,
    namingStrategy: s.namingStrategy,
    brandabilityScore: s.brandabilityScore,
    memorabilityScore: s.memorabilityScore,
    seoScore: s.seoScore,
    lqsScore: s.lqsScore ?? undefined,
    providers: s.providers as unknown as AffiliateProvider[],
    cheapestProvider: s.cheapestProvider as DomainResult["cheapestProvider"],
  }));

  return NextResponse.json({ domains });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const domain = body.domain as DomainResult;

  if (!domain?.domain) {
    return NextResponse.json({ error: "Missing domain" }, { status: 400 });
  }

  await prisma.savedDomain.upsert({
    where: {
      userId_domain: {
        userId: session.id,
        domain: domain.domain,
      },
    },
    create: {
      userId: session.id,
      domain: domain.domain,
      reasoning: domain.reasoning,
      namingStrategy: domain.namingStrategy,
      brandabilityScore: domain.brandabilityScore,
      memorabilityScore: domain.memorabilityScore,
      seoScore: domain.seoScore,
      lqsScore: domain.lqsScore ?? null,
      providers: domain.providers as unknown as Prisma.InputJsonValue,
      cheapestProvider: (domain.cheapestProvider ?? Prisma.JsonNull) as Prisma.InputJsonValue,
    },
    update: {
      reasoning: domain.reasoning,
      namingStrategy: domain.namingStrategy,
      brandabilityScore: domain.brandabilityScore,
      memorabilityScore: domain.memorabilityScore,
      seoScore: domain.seoScore,
      lqsScore: domain.lqsScore ?? null,
      providers: domain.providers as unknown as Prisma.InputJsonValue,
      cheapestProvider: (domain.cheapestProvider ?? Prisma.JsonNull) as Prisma.InputJsonValue,
    },
  });

  return NextResponse.json({ success: true });
}
