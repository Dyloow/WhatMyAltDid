#!/usr/bin/env tsx
/**
 * Génère les données BiS pour toutes les classes/specs
 * Lance plusieurs workers en parallèle avec rate limiting
 * Sauvegarde les résultats dans des JSONs statiques
 * 
 * Usage: npx tsx scripts/generate-all-bis.ts
 */

import { promises as fs } from 'fs';
import path from 'path';
import { getRioTopPlayersBySpec, getRioCharacterProfileFull, RioGearItem } from '../src/lib/raiderio-api';
import { getJournalInstanceItems } from '../src/lib/blizzard-api';
import { CURRENT_SEASON } from '../src/lib/season-config';
import type { BisAnalysisResult, BisItem } from '../src/app/api/bis/route';

const CLASS_SPECS: Record<string, string[]> = {
  "Death Knight": ["Blood", "Frost", "Unholy"],
  "Demon Hunter": ["Devourer", "Havoc", "Vengeance"],
  "Druid": ["Balance", "Feral", "Guardian", "Restoration"],
  "Evoker": ["Augmentation", "Devastation", "Preservation"],
  "Hunter": ["Beast Mastery", "Marksmanship", "Survival"],
  "Mage": ["Arcane", "Fire", "Frost"],
  "Monk": ["Brewmaster", "Mistweaver", "Windwalker"],
  "Paladin": ["Holy", "Protection", "Retribution"],
  "Priest": ["Discipline", "Holy", "Shadow"],
  "Rogue": ["Assassination", "Outlaw", "Subtlety"],
  "Shaman": ["Elemental", "Enhancement", "Restoration"],
  "Warlock": ["Affliction", "Demonology", "Destruction"],
  "Warrior": ["Arms", "Fury", "Protection"],
};

const OUTPUT_DIR = path.join(process.cwd(), 'public', 'data', 'bis');
const REGION = 'eu';
const MAX_WORKERS = 3; // Nombre de specs analysées en parallèle
const MIN_ILVL = 245;
const MAX_ILVL = 300;

// Mapping des classes vers leurs slugs de dossier
const CLASS_SLUGS: Record<string, string> = {
  "Death Knight": "death-knight",
  "Demon Hunter": "demon-hunter",
  "Druid": "druid",
  "Evoker": "evoker",
  "Hunter": "hunter",
  "Mage": "mage",
  "Monk": "monk",
  "Paladin": "paladin",
  "Priest": "priest",
  "Rogue": "rogue",
  "Shaman": "shaman",
  "Warlock": "warlock",
  "Warrior": "warrior",
};

interface WorkerTask {
  className: string;
  spec: string;
}

// Copie de la logique d'analyse BiS
async function analyzeBisForSpec(className: string, spec: string): Promise<BisAnalysisResult> {
  console.log(`  [${className} ${spec}] Démarrage...`);
  
  try {
    // 1. Récupérer les top joueurs
    console.log(`  [${className} ${spec}] 📡 Récupération top joueurs...`);
    const topPlayers = await getRioTopPlayersBySpec(REGION, className, spec, 150, CURRENT_SEASON.rioSeasonSlug);
    console.log(`  [${className} ${spec}] 📊 ${topPlayers.length} joueurs trouvés`);
    
    if (topPlayers.length === 0) {
      console.log(`  [${className} ${spec}] ❌ Aucun joueur trouvé`);
      return {
        analyzed_count: 0,
        total_scanned: 0,
        season: CURRENT_SEASON.id,
        class: className,
        spec,
        bis: {},
        bis_alternatives: {},
        error: `Aucun joueur trouvé`,
      };
    }

    const totalScanned = topPlayers.length;

    // 2. Récupérer les profils avec gear (max 100)
    console.log(`  [${className} ${spec}] 🔍 Récupération des profils...`);
    const TARGET_PROFILES = 100;
    const BATCH_SIZE = 15; // Réduit pour éviter rate limiting
    const allProfiles: Array<{ gear: Record<string, RioGearItem>; weight: number }> = [];
    
    for (let i = 0; i < topPlayers.length && allProfiles.length < TARGET_PROFILES; i += BATCH_SIZE) {
      const chunk = topPlayers.slice(i, Math.min(i + BATCH_SIZE, topPlayers.length));
      const settled = await Promise.allSettled(
        chunk.map((p) => getRioCharacterProfileFull(REGION, p.realm, p.name))
      );
      
      for (let j = 0; j < settled.length; j++) {
        if (allProfiles.length >= TARGET_PROFILES) break;
        
        const res = settled[j];
        if (res.status === "fulfilled" && res.value?.gear?.items) {
          const items = res.value.gear.items;
          if (Object.keys(items).length >= 5) {
            const globalIndex = i + j;
            const weight = Math.max(1, 101 - globalIndex);
            allProfiles.push({ gear: items, weight });
          }
        }
      }
      
      console.log(`  [${className} ${spec}] ⏳ ${allProfiles.length}/${TARGET_PROFILES} profils récupérés...`);
    }

    console.log(`  [${className} ${spec}] ✅ ${allProfiles.length}/${topPlayers.length} joueurs, ${Object.keys({}).length} slots BiS`);

    if (allProfiles.length === 0) {
      console.log(`  [${className} ${spec}] ❌ Aucun profil avec gear (${totalScanned} scannés)`);
      return {
        analyzed_count: 0,
        total_scanned: totalScanned,
        season: CURRENT_SEASON.id,
        class: className,
        spec,
        bis: {},
        bis_alternatives: {},
        error: `Impossible de récupérer l'équipement`,
      };
    }

    // 3. Mapping items → donjons
    const itemToDungeon: Record<number, string> = {};
    const itemToDungeonDisplay: Record<number, string> = {};
    
    try {
      for (const inst of CURRENT_SEASON.instances) {
        const journalItems = await getJournalInstanceItems(inst.journalInstanceId);
        for (const ji of journalItems) {
          itemToDungeon[ji.id] = inst.slug;
          itemToDungeonDisplay[ji.id] = inst.name;
        }
      }
    } catch {
      // Continuer sans les infos de donjons
    }

    // 4. Aggrégation par slot avec fusion des paired slots
    type SlotAggregate = Map<number, { item: RioGearItem; count: number; totalWeight: number }>;
    const slotAggregates: Record<string, SlotAggregate> = {};

    for (const { gear, weight } of allProfiles) {
      for (const [slot, rioItem] of Object.entries(gear)) {
        let targetSlot = slot;
        if (slot === "finger1" || slot === "finger2") targetSlot = "finger";
        if (slot === "trinket1" || slot === "trinket2") targetSlot = "trinket";

        if (!slotAggregates[targetSlot]) {
          slotAggregates[targetSlot] = new Map();
        }

        const agg = slotAggregates[targetSlot];
        const existing = agg.get(rioItem.item_id);
        
        if (existing) {
          existing.count += 1;
          existing.totalWeight += weight;
        } else {
          agg.set(rioItem.item_id, {
            item: rioItem,
            count: 1,
            totalWeight: weight,
          });
        }
      }
    }

    // 5. Filtrage et calcul du BiS
    const totalWeight = allProfiles.reduce((sum, p) => sum + p.weight, 0);
    const threshold = allProfiles.length < 100 ? 0.12 : 0.08;
    
    const bis: Record<string, BisItem> = {};
    const bis_alternatives: Record<string, BisItem> = {};

    for (const [slot, agg] of Object.entries(slotAggregates)) {
      const sorted = Array.from(agg.values())
        .filter(entry => {
          const ilvl = entry.item.item_level;
          if (ilvl < MIN_ILVL || ilvl > MAX_ILVL) return false;
          
          const dungeonSlug = itemToDungeon[entry.item.item_id];
          if (!dungeonSlug) return true;
          
          return CURRENT_SEASON.instances.some(inst => inst.slug === dungeonSlug);
        })
        .sort((a, b) => b.totalWeight - a.totalWeight);

      if (sorted.length === 0) continue;

      const top = sorted[0];
      const freq = top.totalWeight / totalWeight;
      
      if (freq >= threshold) {
        bis[slot] = {
          item_id: top.item.item_id,
          name: top.item.name,
          item_level: top.item.item_level,
          icon: top.item.icon,
          icon_url: `https://wow.zamimg.com/images/wow/icons/medium/${top.item.icon}.jpg`,
          frequency: freq,
          raw_count: top.count,
          slot,
          dungeon: itemToDungeon[top.item.item_id] || null,
          dungeon_display: itemToDungeonDisplay[top.item.item_id] || null,
        };
      }

      // Alternatives pour weapons/trinkets/rings
      const altSlots = new Set(["mainhand", "offhand", "trinket", "finger"]);
      if (altSlots.has(slot) && sorted.length > 1) {
        const second = sorted[1];
        const freq2 = second.totalWeight / totalWeight;
        
        if (freq2 >= threshold && second.item.item_id !== top.item.item_id) {
          bis_alternatives[slot] = {
            item_id: second.item.item_id,
            name: second.item.name,
            item_level: second.item.item_level,
            icon: second.item.icon,
            icon_url: `https://wow.zamimg.com/images/wow/icons/medium/${second.item.icon}.jpg`,
            frequency: freq2,
            raw_count: second.count,
            slot,
            dungeon: itemToDungeon[second.item.item_id] || null,
            dungeon_display: itemToDungeonDisplay[second.item.item_id] || null,
          };
        }
      }
    }

    console.log(`  [${className} ${spec}] ✅ ${allProfiles.length}/${totalScanned} joueurs, ${Object.keys(bis).length} slots BiS`);

    return {
      analyzed_count: allProfiles.length,
      total_scanned: totalScanned,
      season: CURRENT_SEASON.id,
      class: className,
      spec,
      bis,
      bis_alternatives,
    };
    
  } catch (error) {
    console.error(`  [${className} ${spec}] ❌ Erreur:`, error);
    return {
      analyzed_count: 0,
      total_scanned: 0,
      season: CURRENT_SEASON.id,
      class: className,
      spec,
      bis: {},
      bis_alternatives: {},
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function main() {
  console.log('🚀 Génération de toutes les données BiS\n');
  console.log(`Région: ${REGION}`);
  console.log(`Saison: ${CURRENT_SEASON.id}`);
  console.log(`Mode: Séquentiel (1 spec à la fois)`);
  console.log(`Output: ${OUTPUT_DIR}\n`);

  // Créer le dossier de sortie
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  // Préparer toutes les tâches
  const allTasks: WorkerTask[] = [];
  for (const [className, specs] of Object.entries(CLASS_SPECS)) {
    for (const spec of specs) {
      allTasks.push({ className, spec });
    }
  }

  console.log(`📋 Total: ${allTasks.length} specs à analyser\n`);

  // Traiter séquentiellement une spec à la fois
  const startTime = Date.now();
  let completed = 0;
  
  for (const task of allTasks) {
    completed++;
    
    // Vérifier si déjà généré (skip si le fichier existe)
    const classSlug = CLASS_SLUGS[task.className];
    const filename = `${task.spec.toLowerCase().replace(/\s+/g, '-')}.json`;
    const filepath = path.join(OUTPUT_DIR, classSlug, filename);
    try {
      await fs.access(filepath);
      console.log(`[${completed}/${allTasks.length}] ⏭️  Skip (déjà généré): ${classSlug}/${filename}`);
      continue;
    } catch {
      // Fichier n'existe pas, on génère
    }
    
    try {
      console.log(`[${completed}/${allTasks.length}] ${task.className} ${task.spec}`);
      
      const result = await analyzeBisForSpec(task.className, task.spec);
      
      // Créer le sous-dossier par classe
      const classDir = path.join(OUTPUT_DIR, classSlug);
      await fs.mkdir(classDir, { recursive: true });
      
      // Sauvegarder le résultat dans le sous-dossier
      await fs.writeFile(filepath, JSON.stringify(result, null, 2), 'utf-8');
      console.log(`✅ Sauvegardé: ${classSlug}/${filename}\n`);
      
      // Délai entre specs pour éviter le rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`❌ Erreur fatale sur ${task.className} ${task.spec}:`, error);
    }
  }
  
  const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

  // Créer un index de toutes les données
  const index = {
    generated_at: new Date().toISOString(),
    season: CURRENT_SEASON.id,
    region: REGION,
    specs: allTasks.map(t => ({
      class: t.className,
      spec: t.spec,
      file: `${CLASS_SLUGS[t.className]}/${t.spec.toLowerCase().replace(/\s+/g, '-')}.json`,
    })),
  };

  await fs.writeFile(
    path.join(OUTPUT_DIR, '_index.json'),
    JSON.stringify(index, null, 2),
    'utf-8'
  );

  console.log('\n' + '═'.repeat(60));
  console.log('✅ GÉNÉRATION TERMINÉE');
  console.log('═'.repeat(60));
  console.log(`Durée: ${duration} minutes`);
  console.log(`Fichiers: ${allTasks.length + 1} (${allTasks.length} specs + 1 index)`);
  console.log(`Dossier: ${OUTPUT_DIR}`);
}

main().catch(console.error);
