"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { DEFAULT_TLDS, TLD_REGISTRY } from "@/lib/tlds";

const STORAGE_KEY = "sparkdomain-tld-preferences";

interface TldPreferencesContextType {
  enabledTlds: string[];
  setEnabledTlds: (tlds: string[]) => void;
  toggleTld: (tld: string) => void;
  resetToDefaults: () => void;
}

const TldPreferencesContext = createContext<TldPreferencesContextType>({
  enabledTlds: DEFAULT_TLDS,
  setEnabledTlds: () => {},
  toggleTld: () => {},
  resetToDefaults: () => {},
});

export function TldPreferencesProvider({ children }: { children: ReactNode }) {
  const [enabledTlds, setEnabledTlds] = useState<string[]>(DEFAULT_TLDS);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as string[];
        const valid = parsed.filter((t) => TLD_REGISTRY.some((e) => e.tld === t));
        if (valid.length > 0) setEnabledTlds(valid);
      }
    } catch {
      // use defaults
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(enabledTlds));
    } catch {
      // ignore
    }
  }, [enabledTlds]);

  const toggleTld = useCallback((tld: string) => {
    setEnabledTlds((prev) => {
      if (prev.includes(tld)) {
        if (prev.length <= 1) return prev;
        return prev.filter((t) => t !== tld);
      }
      return [...prev, tld];
    });
  }, []);

  const resetToDefaults = useCallback(() => setEnabledTlds(DEFAULT_TLDS), []);

  return (
    <TldPreferencesContext.Provider value={{ enabledTlds, setEnabledTlds, toggleTld, resetToDefaults }}>
      {children}
    </TldPreferencesContext.Provider>
  );
}

export function useTldPreferences() {
  return useContext(TldPreferencesContext);
}
