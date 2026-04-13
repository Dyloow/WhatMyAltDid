"use client";

import { DungeonGrid } from "@/components/dungeon-grid";
import { ScanProgress } from "@/components/scan-progress";

export default function MplusPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Mythic+</h1>
        <ScanProgress />
      </div>
      <DungeonGrid />
    </div>
  );
}
