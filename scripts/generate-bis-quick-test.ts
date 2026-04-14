#!/usr/bin/env tsx
/**
 * Test rapide : génère seulement 3 specs pour valider le système
 * Usage: npx tsx scripts/generate-bis-quick-test.ts
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const TEST_SPECS = [
  { class: "Death Knight", spec: "Blood" },
  { class: "Demon Hunter", spec: "Vengeance" },
  { class: "Warlock", spec: "Affliction" },
];

async function main() {
  console.log('🧪 Test rapide de génération BiS (3 specs)\n');

  for (const { class: cls, spec } of TEST_SPECS) {
    console.log(`Génération de ${cls} ${spec}...`);
    
    const cmd = `npx tsx -e "
      import { promises as fs } from 'fs';
      import path from 'path';
      // Import des fonctions adaptées aux tests
      const { analyzeBisForSpec } = require('./scripts/generate-all-bis.ts');
      
      (async () => {
        const result = await analyzeBisForSpec('${cls}', '${spec}');
        const filename = '${cls.toLowerCase().replace(/\s+/g, '-')}_${spec.toLowerCase().replace(/\s+/g, '-')}.json';
        const filepath = path.join(process.cwd(), 'public', 'data', 'bis', filename);
        await fs.writeFile(filepath, JSON.stringify(result, null, 2));
        console.log('✅ Sauvegardé:', filename);
      })();
    "`;

    try {
      const { stdout } = await execAsync(cmd);
      console.log(stdout);
    } catch (error) {
      console.error(`❌ Erreur:`, error);
    }
  }

  console.log('\n✅ Test terminé');
  console.log('Vérifiez: ls -lh public/data/bis/');
}

main();
