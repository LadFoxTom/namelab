'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthContext';

function BrandNav() {
  const { user } = useAuth();

  return (
    <nav className="flex items-center justify-between py-6">
      <Link
        href="/brand"
        className="flex items-center gap-2 text-[#1A1A18] font-bold text-lg tracking-tight no-underline"
        style={{ letterSpacing: '-0.02em' }}
      >
        <div className="w-6 h-6 bg-[#7C3AED] rounded-md flex-shrink-0" />
        Sparkdomain
      </Link>

      <div className="flex items-center gap-8 text-sm font-medium text-[#585854]">
        <Link href="/brand/gallery" className="hover:text-[#1A1A18] transition-colors">
          Gallery
        </Link>
        <Link href="/brand/pricing" className="hover:text-[#1A1A18] transition-colors">
          Pricing
        </Link>
      </div>

      <div>
        {user ? (
          <Link href="/brand" className="text-sm font-medium text-[#1A1A18] hover:opacity-70 transition-opacity">
            My Brands
          </Link>
        ) : (
          <Link href="/login" className="text-sm font-medium text-[#1A1A18] hover:opacity-70 transition-opacity">
            Log in
          </Link>
        )}
      </div>
    </nav>
  );
}

function BrandFooter() {
  return (
    <footer className="border-t border-[#E6E6E4] py-8 mt-16">
      <div className="max-w-[1200px] mx-auto px-6 flex items-center justify-between text-xs text-[#585854]">
        <span>&copy; {new Date().getFullYear()} Sparkdomain</span>
        <div className="flex gap-6">
          <Link href="/brand" className="hover:text-[#1A1A18] transition-colors">Terms</Link>
          <Link href="/brand" className="hover:text-[#1A1A18] transition-colors">Privacy</Link>
        </div>
      </div>
    </footer>
  );
}

export default function BrandLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen font-sans"
      style={{
        backgroundColor: '#FAFAF8',
        color: '#1A1A18',
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      <div className="max-w-[1200px] mx-auto px-6">
        <BrandNav />
      </div>
      {children}
      <BrandFooter />
    </div>
  );
}
