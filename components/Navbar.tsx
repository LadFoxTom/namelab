"use client";

import { useState } from "react";
import Link from "next/link";
import LoginModal from "./LoginModal";
import { useAuth } from "./AuthContext";
import { useCurrency } from "./CurrencyContext";
import { useSavedDomains } from "./SavedDomainsContext";
import { CURRENCIES, Currency } from "@/lib/currency";

export default function Navbar() {
  const [showModal, setShowModal] = useState(false);
  const [modalTab, setModalTab] = useState<"login" | "signup">("login");
  const { user, loading, logout } = useAuth();
  const { currency, setCurrency } = useCurrency();
  const { savedCount } = useSavedDomains();

  const openLogin = () => {
    setModalTab("login");
    setShowModal(true);
  };

  const openSignup = () => {
    setModalTab("signup");
    setShowModal(true);
  };

  return (
    <>
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 transition-all duration-300">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
              S
            </div>
            <span className="font-medium text-lg tracking-tight">
              Sparkdomain
            </span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Currency toggle */}
            <div className="hidden md:flex items-center bg-gray-100 rounded-full p-0.5">
              {CURRENCIES.map((c) => (
                <button
                  key={c.code}
                  onClick={() => setCurrency(c.code as Currency)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                    currency === c.code
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  {c.symbol} {c.label}
                </button>
              ))}
            </div>

            {!loading && !user && (
              <>
                <button
                  onClick={openLogin}
                  className="px-3 sm:px-5 py-2 rounded-full text-sm font-medium text-gray-600 hover:text-black transition-colors"
                >
                  Login
                </button>
                <button
                  onClick={openSignup}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-3 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-medium hover:shadow-lg hover:shadow-purple-200/50 hover:scale-105 transition-all duration-200"
                >
                  <span className="hidden sm:inline">Create Account</span>
                  <span className="sm:hidden">Sign Up</span>
                </button>
              </>
            )}

            {!loading && user && (
              <div className="flex items-center gap-3">
                <Link
                  href="/saved"
                  className="relative p-2 rounded-full hover:bg-purple-50 transition-colors"
                  title="Saved domains"
                >
                  <svg className="w-5 h-5 text-gray-500 hover:text-purple-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  {savedCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-purple-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {savedCount > 99 ? "99+" : savedCount}
                    </span>
                  )}
                </Link>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-xs font-bold">
                    {(user.name?.[0] || user.email[0]).toUpperCase()}
                  </div>
                  <span className="hidden md:inline text-sm font-medium text-gray-700">
                    {user.name || user.email.split("@")[0]}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="px-4 py-2 rounded-full text-xs font-medium text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {showModal && (
        <LoginModal
          onClose={() => setShowModal(false)}
          initialTab={modalTab}
        />
      )}
    </>
  );
}
