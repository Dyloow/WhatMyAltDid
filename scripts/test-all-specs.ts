#!/usr/bin/env tsx
/**
 * Script de test pour toutes les classes/specs
 * Usage: npx tsx scripts/test-all-specs.ts
 */

const API_BASE = 'http://localhost:3000';

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

interface TestResult {
  class: string;
  spec: string;
  analyzed: number;
  scanned: number;
  bisSlots: number;
  altSlots: number;
  passed: boolean;
  error?: string;
}

async function testSpec(className: string, spec: string): Promise<TestResult> {
  const url = `${API_BASE}/api/bis?region=eu&class=${encodeURIComponent(className)}&spec=${encodeURIComponent(spec)}`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      return {
        class: className,
        spec,
        analyzed: 0,
        scanned: 0,
        bisSlots: 0,
        altSlots: 0,
        passed: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }
    
    const data = await response.json();
    
    const passed = data.analyzed_count >= 100;
    
    return {
      class: className,
      spec,
      analyzed: data.analyzed_count,
      scanned: data.total_scanned,
      bisSlots: Object.keys(data.bis || {}).length,
      altSlots: Object.keys(data.bis_alternatives || {}).length,
      passed,
      error: data.error,
    };
  } catch (error) {
    return {
      class: className,
      spec,
      analyzed: 0,
      scanned: 0,
      bisSlots: 0,
      altSlots: 0,
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function main() {
  console.log('🧪 Test de toutes les classes/specs\n');
  console.log('Objectif: >= 100 joueurs analysés par spec\n');
  
  const results: TestResult[] = [];
  let totalTests = 0;
  
  for (const [className, specs] of Object.entries(CLASS_SPECS)) {
    totalTests += specs.length;
  }
  
  let completed = 0;
  
  for (const [className, specs] of Object.entries(CLASS_SPECS)) {
    console.log(`\n📋 ${className}`);
    console.log('─'.repeat(60));
    
    for (const spec of specs) {
      completed++;
      process.stdout.write(`[${completed}/${totalTests}] Testing ${spec}... `);
      
      const result = await testSpec(className, spec);
      results.push(result);
      
      const status = result.passed ? '✅' : '❌';
      const msg = result.passed 
        ? `${result.analyzed}/${result.scanned} joueurs, ${result.bisSlots} slots BiS`
        : `ÉCHEC: ${result.analyzed}/${result.scanned} joueurs`;
      
      console.log(`${status} ${msg}`);
      
      if (result.error) {
        console.log(`   ⚠️  ${result.error}`);
      }
      
      // Petit délai pour ne pas surcharger l'API
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  // Résumé
  console.log('\n' + '═'.repeat(60));
  console.log('📊 RÉSUMÉ');
  console.log('═'.repeat(60));
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log(`✅ Passés: ${passed}/${totalTests}`);
  console.log(`❌ Échecs: ${failed}/${totalTests}`);
  
  if (failed > 0) {
    console.log('\n❌ SPECS EN ÉCHEC:');
    console.log('─'.repeat(60));
    for (const result of results.filter(r => !r.passed)) {
      console.log(`   • ${result.class} ${result.spec}: ${result.analyzed} joueurs`);
      if (result.error) {
        console.log(`     ${result.error}`);
      }
    }
  }
  
  // Stats moyennes
  const avgAnalyzed = results.reduce((sum, r) => sum + r.analyzed, 0) / results.length;
  const avgScanned = results.reduce((sum, r) => sum + r.scanned, 0) / results.length;
  const avgBisSlots = results.reduce((sum, r) => sum + r.bisSlots, 0) / results.length;
  
  console.log('\n📈 STATISTIQUES MOYENNES:');
  console.log('─'.repeat(60));
  console.log(`   Joueurs analysés: ${avgAnalyzed.toFixed(1)}`);
  console.log(`   Joueurs scannés: ${avgScanned.toFixed(1)}`);
  console.log(`   Slots BiS trouvés: ${avgBisSlots.toFixed(1)}`);
  
  // Code de sortie
  process.exit(failed > 0 ? 1 : 0);
}

main();
