import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { CharacterData } from "@/types/character";

interface RosterState {
  characters: CharacterData[];
  isScanning: boolean;
  lastScanAt: string | null;
  error: string | null;
  view: "mplus" | "vault" | "hunt";
  isGuest: boolean;
  /** ID de l'utilisateur actuellement "propriétaire" du store.
   *  Null = pas de session, "guest" = mode invité, string = userId. */
  trackedUserId: string | null;

  setCharacters: (chars: CharacterData[]) => void;
  addCharacter: (char: CharacterData) => void;
  removeCharacter: (id: number) => void;
  setScanning: (v: boolean) => void;
  setError: (err: string | null) => void;
  setView: (v: RosterState["view"]) => void;
  setGuest: (v: boolean) => void;
  setTrackedUserId: (id: string | null) => void;
  /** Vide les personnages ET remet trackedUserId à null. */
  clearCharacters: () => void;
  scan: () => Promise<void>;
  saveCharacterToAccount: (char: CharacterData) => Promise<void>;
  /** Recharge les personnages sauvegardés depuis le serveur (non-guest seulement). */
  loadSavedCharacters: () => Promise<void>;
}

export const useRosterStore = create<RosterState>()(
  persist(
    (set, get) => ({
      characters: [],
      isScanning: false,
      lastScanAt: null,
      error: null,
      view: "mplus" as RosterState["view"],
      isGuest: false,
      trackedUserId: null,

      setCharacters: (characters) =>
        set({ characters, lastScanAt: new Date().toISOString() }),

      addCharacter: (char) =>
        set((s) => {
          const exists = s.characters.some(
            (c) =>
              c.name.toLowerCase() === char.name.toLowerCase() &&
              c.realmSlug === char.realmSlug &&
              c.region === char.region
          );
          if (exists) return s;
          // Persist to DB asynchronously when logged in (fire-and-forget)
          if (!s.isGuest) {
            fetch("/api/saved-characters", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: char.name,
                realm: char.realm,
                realmSlug: char.realmSlug,
                region: char.region,
                classId: char.classId,
              }),
            }).catch(() => {});
          }
          return { characters: [...s.characters, char] };
        }),

      removeCharacter: (id) =>
        set((s) => ({ characters: s.characters.filter((c) => c.id !== id) })),

      setScanning: (isScanning) => set({ isScanning }),
      setError: (error) => set({ error }),
      setView: (view) => set({ view }),
      setGuest: (isGuest) => set({ isGuest }),
      setTrackedUserId: (trackedUserId) => set({ trackedUserId }),

      clearCharacters: () =>
        set({ characters: [], lastScanAt: null, error: null, trackedUserId: null }),

      scan: async () => {
        const state = get();
        if (state.isScanning) return;
        set({ isScanning: true, error: null });
        try {
          const res = await fetch("/api/scan", { method: "POST" });
          if (!res.ok) throw new Error("Scan failed");
          const data: CharacterData[] = await res.json();

          // Auto-save scanned characters to account (non-guest)
          if (!state.isGuest) {
            data.forEach((char) => {
              fetch("/api/saved-characters", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name: char.name,
                  realm: char.realm,
                  realmSlug: char.realmSlug,
                  region: char.region,
                  classId: char.classId,
                }),
              }).catch(() => {});
            });
          }

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

      saveCharacterToAccount: async (char) => {
        const state = get();
        if (state.isGuest) return;
        try {
          await fetch("/api/saved-characters", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: char.name,
              realm: char.realm,
              realmSlug: char.realmSlug,
              region: char.region,
              classId: char.classId,
            }),
          });
        } catch {
          // silent
        }
      },

      loadSavedCharacters: async () => {
        const state = get();
        if (state.isGuest || state.isScanning) return;

        set({ isScanning: true, error: null });
        try {
          const res = await fetch("/api/saved-characters");
          if (!res.ok) throw new Error("fetch_saved_failed");
          const stubs: { name: string; realmSlug: string; region: string }[] = await res.json();

          if (stubs.length === 0) {
            set({ isScanning: false });
            return;
          }

          // Fetch full profiles in parallel batches of 3
          const chars: CharacterData[] = [];
          const batchSize = 3;
          for (let i = 0; i < stubs.length; i += batchSize) {
            const batch = stubs.slice(i, i + batchSize);
            const results = await Promise.allSettled(
              batch.map((s) =>
                fetch(`/api/character/lookup?region=${s.region}&realm=${s.realmSlug}&name=${encodeURIComponent(s.name)}`)
                  .then((r) => (r.ok ? (r.json() as Promise<CharacterData>) : null))
              )
            );
            for (const r of results) {
              if (r.status === "fulfilled" && r.value) chars.push(r.value);
            }
          }

          set({
            characters: chars,
            isScanning: false,
            lastScanAt: new Date().toISOString(),
          });
        } catch (err) {
          set({
            isScanning: false,
            error: err instanceof Error ? err.message : "Load error",
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
        isGuest: state.isGuest,
        trackedUserId: state.trackedUserId,
      }),
    }
  )
);
