import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const hostname = req.headers.get('host')?.split(':')[0] ?? '';
  const brandDomain = process.env.BRAND_DOMAIN?.trim();

  if (!brandDomain || hostname !== brandDomain) {
    return NextResponse.next();
  }

  const { pathname } = req.nextUrl;

  // On the brand domain, rewrite root paths to /brand/*
  // API routes and static assets pass through unchanged
  if (pathname.startsWith('/api/') || pathname.startsWith('/_next/') || pathname.startsWith('/favicon')) {
    return NextResponse.next();
  }

  // Map brand domain paths to /brand/* routes
  if (pathname === '/') {
    return NextResponse.rewrite(new URL('/brand', req.url));
  }

  if (pathname === '/success') {
    return NextResponse.rewrite(new URL('/brand/success', req.url));
  }

  // /gallery, /pricing etc. could be added here later

  // For paths like /{brandname}, rewrite to /brand/{brandname}
  if (!pathname.startsWith('/brand') && pathname.length > 1) {
    return NextResponse.rewrite(new URL(`/brand${pathname}`, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
