"use client";

import { ReactNode } from "react";
import { CurrencyProvider } from "@/components/CurrencyContext";
import { AuthProvider } from "@/components/AuthContext";
import { SavedDomainsProvider } from "@/components/SavedDomainsContext";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <SavedDomainsProvider>
        <CurrencyProvider>{children}</CurrencyProvider>
      </SavedDomainsProvider>
    </AuthProvider>
  );
}
