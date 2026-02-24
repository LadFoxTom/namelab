"use client";

import { ReactNode } from "react";
import { CurrencyProvider } from "@/components/CurrencyContext";
import { AuthProvider } from "@/components/AuthContext";
import { SavedDomainsProvider } from "@/components/SavedDomainsContext";
import { TldPreferencesProvider } from "@/components/TldPreferencesContext";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <SavedDomainsProvider>
        <CurrencyProvider>
          <TldPreferencesProvider>{children}</TldPreferencesProvider>
        </CurrencyProvider>
      </SavedDomainsProvider>
    </AuthProvider>
  );
}
