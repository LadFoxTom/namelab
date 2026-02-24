import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { inngest } from '@/inngest/client';

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const body = await req.text();
  const signature = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const { brandSessionId, selectedConceptId, tier, domainName } = session.metadata!;

    const { prisma } = await import('@/lib/prisma');
    const purchase = await prisma.brandPurchase.create({
      data: {
        brandSessionId,
        tier: tier as any,
        stripePaymentIntentId: session.payment_intent as string,
        stripeSessionId: session.id,
        status: 'PROCESSING',
        email: session.customer_email,
      },
    });

    if (selectedConceptId) {
      await prisma.brandConcept.update({
        where: { id: selectedConceptId },
        data: { isSelected: true },
      });
    }

    await inngest.send({
      name: 'brand/generate.assets',
      data: {
        purchaseId: purchase.id,
        brandSessionId,
        selectedConceptId,
        tier,
        domainName,
        email: session.customer_email,
      },
    });
  }

  return NextResponse.json({ received: true });
}
