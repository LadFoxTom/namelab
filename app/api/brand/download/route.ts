import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSignedDownloadUrl } from '@/lib/brand/storage';

export async function GET(req: NextRequest) {
  const purchaseId = req.nextUrl.searchParams.get('purchaseId');
  const stripeSessionId = req.nextUrl.searchParams.get('stripeSessionId');

  if (!purchaseId && !stripeSessionId) {
    return NextResponse.json({ error: 'Missing purchaseId or stripeSessionId' }, { status: 400 });
  }

  const purchase = purchaseId
    ? await prisma.brandPurchase.findUnique({ where: { id: purchaseId } })
    : await prisma.brandPurchase.findFirst({ where: { stripeSessionId: stripeSessionId! } });

  if (!purchase) return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });

  if (purchase.status !== 'COMPLETED') {
    return NextResponse.json({
      purchaseId: purchase.id,
      error: 'Assets not ready yet',
      status: purchase.status,
    }, { status: 202 });
  }

  // Check if download link has expired, regenerate if so
  if (purchase.zipR2Key) {
    const isExpired = purchase.downloadExpiresAt && new Date() > purchase.downloadExpiresAt;

    if (isExpired || !purchase.downloadUrl) {
      const newUrl = await getSignedDownloadUrl(purchase.zipR2Key, 86400 * 7);
      await prisma.brandPurchase.update({
        where: { id: purchase.id },
        data: {
          downloadUrl: newUrl,
          downloadExpiresAt: new Date(Date.now() + 86400 * 7 * 1000),
        },
      });
      return NextResponse.json({ downloadUrl: newUrl });
    }

    return NextResponse.json({ downloadUrl: purchase.downloadUrl });
  }

  return NextResponse.json({ error: 'No download available' }, { status: 404 });
}
