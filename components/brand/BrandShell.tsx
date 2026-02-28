'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/components/AuthContext';

function BrandNav() {
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="flex items-center justify-between py-4 sm:py-6">
      <Link
        href="/brand"
        className="flex items-center gap-2 text-[#1A1A18] font-bold text-lg tracking-tight no-underline"
        style={{ letterSpacing: '-0.02em' }}
      >
        <Image
          src="/brand/nav-icon.png"
          alt="BrandKitz"
          width={24}
          height={24}
          className="flex-shrink-0"
        />
        BrandKitz
      </Link>

      {/* Desktop nav */}
      <div className="hidden sm:flex items-center gap-6 text-sm font-medium text-[#585854]">
        <Link href="/brand/gallery" className="hover:text-[#1A1A18] transition-colors">
          Gallery
        </Link>
        <Link href="/brand/pricing" className="hover:text-[#1A1A18] transition-colors">
          Pricing
        </Link>
        {user ? (
          <Link href="/brand" className="text-[#1A1A18] hover:opacity-70 transition-opacity">
            My Brands
          </Link>
        ) : (
          <Link href="/login" className="text-[#1A1A18] hover:opacity-70 transition-opacity">
            Log in
          </Link>
        )}
      </div>

      {/* Mobile hamburger */}
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="sm:hidden p-2 -mr-2 text-[#585854] hover:text-[#1A1A18] transition-colors"
        aria-label="Toggle menu"
      >
        {menuOpen ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {/* Mobile menu dropdown */}
      {menuOpen && (
        <div className="sm:hidden absolute top-full left-0 right-0 bg-white border-b border-[#E6E6E4] shadow-lg z-50">
          <div className="flex flex-col px-6 py-4 gap-3 text-sm font-medium text-[#585854]">
            <Link
              href="/brand/gallery"
              onClick={() => setMenuOpen(false)}
              className="py-2 hover:text-[#1A1A18] transition-colors"
            >
              Gallery
            </Link>
            <Link
              href="/brand/pricing"
              onClick={() => setMenuOpen(false)}
              className="py-2 hover:text-[#1A1A18] transition-colors"
            >
              Pricing
            </Link>
            {user ? (
              <Link
                href="/brand"
                onClick={() => setMenuOpen(false)}
                className="py-2 text-[#1A1A18] hover:opacity-70 transition-opacity"
              >
                My Brands
              </Link>
            ) : (
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="py-2 text-[#1A1A18] hover:opacity-70 transition-opacity"
              >
                Log in
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

function BrandFooter() {
  return (
    <footer className="border-t border-[#E6E6E4] py-6 sm:py-8 mt-16">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 flex items-center justify-between text-xs text-[#585854]">
        <span>&copy; {new Date().getFullYear()} BrandKitz</span>
        <div className="flex gap-4 sm:gap-6">
          <Link href="/brand" className="hover:text-[#1A1A18] transition-colors">Terms</Link>
          <Link href="/brand" className="hover:text-[#1A1A18] transition-colors">Privacy</Link>
        </div>
      </div>
    </footer>
  );
}

export default function BrandShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen font-sans"
      style={{
        backgroundColor: '#FAFAF8',
        color: '#1A1A18',
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      <div className="relative max-w-[1200px] mx-auto px-4 sm:px-6">
        <BrandNav />
      </div>
      {children}
      <BrandFooter />
    </div>
  );
}
