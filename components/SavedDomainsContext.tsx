"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import { DomainResult } from "@/lib/types";

interface SavedDomainsContextType {
  savedDomains: DomainResult[];
  savedCount: number;
  isSaved: (domain: string) => boolean;
  toggleSave: (domain: DomainResult) => Promise<void>;
  checkSaved: (domains: string[]) => Promise<void>;
}

const SavedDomainsContext = createContext<SavedDomainsContextType>({
  savedDomains: [],
  savedCount: 0,
  isSaved: () => false,
  toggleSave: async () => {},
  checkSaved: async () => {},
});

export function SavedDomainsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [savedDomains, setSavedDomains] = useState<DomainResult[]>([]);
  const [savedSet, setSavedSet] = useState<Set<string>>(new Set());

  const fetchSaved = useCallback(async () => {
    if (!user) {
      setSavedDomains([]);
      setSavedSet(new Set());
      return;
    }
    try {
      const res = await fetch("/api/saved-domains");
      const data = await res.json();
      if (data.domains) {
        setSavedDomains(data.domains);
        setSavedSet(new Set(data.domains.map((d: DomainResult) => d.domain)));
      }
    } catch {
      // silently fail
    }
  }, [user]);

  useEffect(() => {
    fetchSaved();
  }, [fetchSaved]);

  const isSaved = useCallback(
    (domain: string) => savedSet.has(domain),
    [savedSet]
  );

  const toggleSave = useCallback(
    async (domain: DomainResult) => {
      if (!user) return;

      const wasSaved = savedSet.has(domain.domain);

      // Optimistic update
      if (wasSaved) {
        setSavedSet((prev) => {
          const next = new Set(prev);
          next.delete(domain.domain);
          return next;
        });
        setSavedDomains((prev) => prev.filter((d) => d.domain !== domain.domain));
      } else {
        setSavedSet((prev) => new Set(prev).add(domain.domain));
        setSavedDomains((prev) => [domain, ...prev]);
      }

      try {
        if (wasSaved) {
          const res = await fetch(
            `/api/saved-domains/${encodeURIComponent(domain.domain)}`,
            { method: "DELETE" }
          );
          if (!res.ok) throw new Error();
        } else {
          const res = await fetch("/api/saved-domains", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ domain }),
          });
          if (!res.ok) throw new Error();
        }
      } catch {
        // Revert on error
        if (wasSaved) {
          setSavedSet((prev) => new Set(prev).add(domain.domain));
          setSavedDomains((prev) => [domain, ...prev]);
        } else {
          setSavedSet((prev) => {
            const next = new Set(prev);
            next.delete(domain.domain);
            return next;
          });
          setSavedDomains((prev) => prev.filter((d) => d.domain !== domain.domain));
        }
      }
    },
    [user, savedSet]
  );

  const checkSaved = useCallback(
    async (domains: string[]) => {
      if (!user || domains.length === 0) return;
      try {
        const res = await fetch("/api/saved-domains/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domains }),
        });
        const data = await res.json();
        if (data.saved) {
          setSavedSet((prev) => {
            const next = new Set(prev);
            for (const [domain, isSaved] of Object.entries(data.saved)) {
              if (isSaved) next.add(domain);
              else next.delete(domain);
            }
            return next;
          });
        }
      } catch {
        // silently fail
      }
    },
    [user]
  );

  return (
    <SavedDomainsContext.Provider
      value={{
        savedDomains,
        savedCount: savedSet.size,
        isSaved,
        toggleSave,
        checkSaved,
      }}
    >
      {children}
    </SavedDomainsContext.Provider>
  );
}

export function useSavedDomains() {
  return useContext(SavedDomainsContext);
}
