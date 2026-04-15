import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { CharacterData } from "@/types/character";

interface RosterState {
  characters: CharacterData[];
  isScanning: boolean;
  lastScanAt: string | null;
  error: string | null;
  view: "grid" | "list" | "mplus" | "vault";
  filters: {
    faction: string | null;
    className: string | null;
    role: string | null;
    realm: string | null;
  };
  sortBy: "score" | "ilvl" | "name" | "vaultMplus" | "vaultRaid";
  sortDir: "asc" | "desc";
  setCharacters: (chars: CharacterData[]) => void;
  addCharacter: (char: CharacterData) => void;
  removeCharacter: (id: number) => void;
  setScanning: (v: boolean) => void;
  setError: (err: string | null) => void;
  setView: (v: RosterState["view"]) => void;
  setFilter: (key: keyof RosterState["filters"], value: string | null) => void;
  setSortBy: (key: RosterState["sortBy"]) => void;
  toggleSortDir: () => void;
  scan: () => Promise<void>;
}

export const useRosterStore = create<RosterState>()(
  persist(
    (set, get) => ({
      characters: [],
      isScanning: false,
      lastScanAt: null,
      error: null,
      view: "grid" as RosterState["view"],
      filters: { faction: null, className: null, role: null, realm: null },
      sortBy: "score",
      sortDir: "desc",

      setCharacters: (characters) =>
        set({ characters, lastScanAt: new Date().toISOString() }),
      addCharacter: (char) =>
        set((s) => {
          const exists = s.characters.some(
            (c) => c.name.toLowerCase() === char.name.toLowerCase() && c.realmSlug === char.realmSlug && c.region === char.region
          );
          if (exists) return s;
          return { characters: [...s.characters, char] };
        }),
      removeCharacter: (id) =>
        set((s) => ({ characters: s.characters.filter((c) => c.id !== id) })),
      setScanning: (isScanning) => set({ isScanning }),
      setError: (error) => set({ error }),
      setView: (view) => set({ view }),
      setFilter: (key, value) =>
        set((s) => ({ filters: { ...s.filters, [key]: value } })),
      setSortBy: (sortBy) => set({ sortBy }),
      toggleSortDir: () => set((s) => ({ sortDir: s.sortDir === "asc" ? "desc" : "asc" })),

      scan: async () => {
        const state = get();
        if (state.isScanning) return;
        set({ isScanning: true, error: null });
        try {
          const res = await fetch("/api/scan", { method: "POST" });
          if (!res.ok) throw new Error("Scan failed");
          const data = await res.json();
          set({
            characters: data,
            isScanning: false,
            lastScanAt: new Date().toISOString(),
          });
        } catch (err) {
          set({
            isScanning: false,
            error: err instanceof Error ? err.message : "Scan error",
          });
        }
      },
    }),
    {
      name: "roster-store",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        characters: state.characters,
        lastScanAt: state.lastScanAt,
        view: state.view,
        sortBy: state.sortBy,
        sortDir: state.sortDir,
        filters: state.filters,
      }),
    }
  )
);
