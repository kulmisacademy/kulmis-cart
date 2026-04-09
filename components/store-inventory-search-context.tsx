"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type StoreInventorySearchValue = {
  search: string;
  setSearch: (value: string) => void;
};

const StoreInventorySearchContext = createContext<StoreInventorySearchValue | null>(null);

/** Wraps the public store profile so the sticky header search and inventory filters share one query. */
export function StoreInventorySearchProvider({ children }: { children: ReactNode }) {
  const [search, setSearch] = useState("");
  return (
    <StoreInventorySearchContext.Provider value={{ search, setSearch }}>{children}</StoreInventorySearchContext.Provider>
  );
}

/** When non-null, header search is synced with the store inventory filter (store profile route). */
export function useOptionalStoreInventorySearch() {
  return useContext(StoreInventorySearchContext);
}
