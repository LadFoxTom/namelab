"use client";

import { ReactNode } from "react";
import { CurrencyProvider } from "@/components/CurrencyContext";
import { AuthProvider } from "@/components/AuthContext";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <CurrencyProvider>{children}</CurrencyProvider>
    </AuthProvider>
  );
}
