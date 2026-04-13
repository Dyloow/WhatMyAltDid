"use client";

import { useRosterStore } from "@/lib/store";
import { CharacterCard } from "@/components/character-card";
import { CharacterData } from "@/types/character";
import { useMemo } from "react";

function sortCharacters(
  chars: CharacterData[],
  sortBy: string,
  sortDir: "asc" | "desc"
): CharacterData[] {
  const sorted = [...chars].sort((a, b) => {
    switch (sortBy) {
      case "score":
        return (b.rioScore?.all ?? 0) - (a.rioScore?.all ?? 0);
      case "ilvl":
        return b.itemLevel - a.itemLevel;
      case "name":
        return a.name.localeCompare(b.name);
      case "vaultMplus":
        return b.weeklyRuns.length - a.weeklyRuns.length;
      default:
        return 0;
    }
  });
  return sortDir === "asc" ? sorted.reverse() : sorted;
}

export function RosterGrid() {
  const { characters, filters, sortBy, sortDir } = useRosterStore();

  const filtered = useMemo(() => {
    let result = characters;
    if (filters.faction)
      result = result.filter((c) => c.faction === filters.faction);
    if (filters.className)
      result = result.filter((c) => c.className === filters.className);
    if (filters.role)
      result = result.filter(
        (c) => c.specRole.toUpperCase() === filters.role
      );
    if (filters.realm)
      result = result.filter((c) => c.realm === filters.realm);
    return sortCharacters(result, sortBy, sortDir);
  }, [characters, filters, sortBy, sortDir]);

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p>Aucun personnage trouvé.</p>
        <p className="text-sm">Lancez un scan ou ajustez vos filtres.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {filtered.map((char) => (
        <CharacterCard key={`${char.region}-${char.realmSlug}-${char.name}`} character={char} />
      ))}
    </div>
  );
}
