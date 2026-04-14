/**
 * Tests unitaires pour l'analyse BiS
 * Vérifie que chaque classe/spec analyse au moins 100 joueurs
 */

import { describe, test, expect } from '@jest/globals';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const CLASS_SPECS: Record<string, string[]> = {
  "Death Knight":  ["Blood", "Frost", "Unholy"],
  "Demon Hunter":  ["Devourer", "Havoc", "Vengeance"],
  Druid:           ["Balance", "Feral", "Guardian", "Restoration"],
  Evoker:          ["Augmentation", "Devastation", "Preservation"],
  Hunter:          ["Beast Mastery", "Marksmanship", "Survival"],
  Mage:            ["Arcane", "Fire", "Frost"],
  Monk:            ["Brewmaster", "Mistweaver", "Windwalker"],
  Paladin:         ["Holy", "Protection", "Retribution"],
  Priest:          ["Discipline", "Holy", "Shadow"],
  Rogue:           ["Assassination", "Outlaw", "Subtlety"],
  Shaman:          ["Elemental", "Enhancement", "Restoration"],
  Warlock:         ["Affliction", "Demonology", "Destruction"],
  Warrior:         ["Arms", "Fury", "Protection"],
};

// Timeout plus long pour les requêtes API
const TEST_TIMEOUT = 60000; // 60 secondes par test

describe('BiS Analysis - Player Count Verification', () => {
  for (const [className, specs] of Object.entries(CLASS_SPECS)) {
    describe(className, () => {
      for (const spec of specs) {
        test(
          `${spec} should analyze at least 100 players`,
          async () => {
            const url = `${API_BASE}/api/bis?region=eu&class=${encodeURIComponent(className)}&spec=${encodeURIComponent(spec)}`;
            
            const response = await fetch(url);
            expect(response.ok).toBe(true);
            
            const data = await response.json();
            
            // Vérifications de base
            expect(data).toBeDefined();
            expect(data.class).toBe(className);
            expect(data.spec).toBe(spec);
            expect(data.analyzed_count).toBeGreaterThanOrEqual(0);
            expect(data.total_scanned).toBeGreaterThanOrEqual(0);
            
            // Vérification principale: au moins 100 joueurs analysés
            expect(data.analyzed_count).toBeGreaterThanOrEqual(100);
            
            // Vérification que des items BiS ont été trouvés
            expect(Object.keys(data.bis).length).toBeGreaterThan(0);
            
            // Log pour debug
            console.log(`✓ ${className} ${spec}: ${data.analyzed_count}/${data.total_scanned} joueurs analysés, ${Object.keys(data.bis).length} slots BiS`);
          },
          TEST_TIMEOUT
        );
      }
    });
  }
});

describe('BiS Analysis - Data Quality', () => {
  // Test un échantillon représentatif
  const sampleSpecs = [
    { class: "Demon Hunter", spec: "Vengeance" },
    { class: "Warlock", spec: "Affliction" },
    { class: "Mage", spec: "Fire" },
    { class: "Paladin", spec: "Protection" },
  ];

  for (const { class: className, spec } of sampleSpecs) {
    test(
      `${className} ${spec} should have valid BiS items`,
      async () => {
        const url = `${API_BASE}/api/bis?region=eu&class=${encodeURIComponent(className)}&spec=${encodeURIComponent(spec)}`;
        const response = await fetch(url);
        const data = await response.json();

        // Vérifier que chaque item BiS a les champs requis
        for (const [slot, item] of Object.entries(data.bis)) {
          expect(item).toBeDefined();
          expect(item.item_id).toBeGreaterThan(0);
          expect(item.name).toBeTruthy();
          expect(item.item_level).toBeGreaterThanOrEqual(245);
          expect(item.item_level).toBeLessThanOrEqual(300);
          expect(item.frequency).toBeGreaterThan(0);
          expect(item.frequency).toBeLessThanOrEqual(1);
          expect(item.raw_count).toBeGreaterThan(0);
          expect(item.slot).toBe(slot);
        }

        // Vérifier les alternatives
        for (const [slot, item] of Object.entries(data.bis_alternatives)) {
          expect(item).toBeDefined();
          expect(item.item_id).toBeGreaterThan(0);
          expect(item.frequency).toBeGreaterThan(0);
        }
      },
      TEST_TIMEOUT
    );
  }
});
