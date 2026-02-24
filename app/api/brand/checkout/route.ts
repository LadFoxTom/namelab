import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe not configured yet' }, { status: 503 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  const TIER_PRICES: Record<string, string | undefined> = {
    LOGO_ONLY:      process.env.STRIPE_PRICE_LOGO_ONLY,
    BRAND_KIT:      process.env.STRIPE_PRICE_BRAND_KIT,
    BRAND_KIT_PRO:  process.env.STRIPE_PRICE_BRAND_KIT_PRO,
  };

  const { sessionId, conceptId, tier, email } = await req.json();

  const session = await prisma.brandSession.findUnique({ where: { id: sessionId } });
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  const priceId = TIER_PRICES[tier];
  if (!priceId) return NextResponse.json({ error: 'Invalid tier or price not configured' }, { status: 400 });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: email,
    metadata: {
      brandSessionId: sessionId,
      selectedConceptId: conceptId,
      tier,
      domainName: session.domainName,
    },
    success_url: `${baseUrl}/brand/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/domain/${session.domainName}?brand=cancelled`,
    payment_intent_data: {
      metadata: { brandSessionId: sessionId, tier },
    },
  });

  return NextResponse.json({ checkoutUrl: checkoutSession.url });
}
