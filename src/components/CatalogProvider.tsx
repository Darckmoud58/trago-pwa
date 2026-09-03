"use client";

import { createContext, useContext } from "react";
import type { Catalog } from "@/lib/types";

const empty: Catalog = { chains: [], branches: [], promos: [], branchPromos: [] };
const CatalogContext = createContext<Catalog>(empty);

export function CatalogProvider({
  catalog,
  children,
}: {
  catalog: Catalog;
  children: React.ReactNode;
}) {
  return <CatalogContext.Provider value={catalog}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  return useContext(CatalogContext);
}
