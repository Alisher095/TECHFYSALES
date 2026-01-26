import React, { createContext, useContext } from "react";

type ApiContextType = {
  fetchJson: (path: string) => Promise<any>;
};

const ApiContext = createContext<ApiContextType | null>(null);

export function ApiProvider({ children }: { children: React.ReactNode }) {
  // Vite exposes env via import.meta.env; fall back to localhost if not set
  // prefer VITE_API_BASE (set in .env as VITE_API_BASE)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const env: any = import.meta.env || {};
  const base = env.VITE_API_BASE || env.REACT_APP_API_BASE || "http://localhost:8000";

  const fetchJson = async (path: string) => {
    const res = await fetch(base + path);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `HTTP ${res.status}`);
    }
    return res.json();
  };

  return <ApiContext.Provider value={{ fetchJson }}>{children}</ApiContext.Provider>;
}

export function useApi() {
  const ctx = useContext(ApiContext);
  if (!ctx) throw new Error("useApi must be used inside ApiProvider");
  return ctx;
}
