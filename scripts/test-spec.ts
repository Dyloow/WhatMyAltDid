#!/usr/bin/env tsx
/**
 * Test rapide pour une spec spécifique
 * Usage: npx tsx scripts/test-spec.ts "class" "spec"
 * Exemple: npx tsx scripts/test-spec.ts "Warlock" "Affliction"
 */

const API_BASE = 'http://localhost:3000';

async function testSpec(className: string, spec: string) {
  console.log(`\n🧪 Test de ${className} ${spec}\n`);
  
  const url = `${API_BASE}/api/bis?region=eu&class=${encodeURIComponent(className)}&spec=${encodeURIComponent(spec)}`;
  
  console.log(`📡 Requête: ${url}\n`);
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(url);
    const duration = Date.now() - startTime;
    
    console.log(`⏱️  Durée: ${duration}ms`);
    console.log(`📊 Status: ${response.status} ${response.statusText}\n`);
    
    if (!response.ok) {
      const text = await response.text();
      console.error(`❌ Erreur HTTP:\n${text}`);
      process.exit(1);
    }
    
    const data = await response.json();
    
    console.log('✅ RÉSULTATS:');
    console.log('─'.repeat(60));
    console.log(`   Classe: ${data.class}`);
    console.log(`   Spec: ${data.spec}`);
    console.log(`   Saison: ${data.season}`);
    console.log(`   Joueurs scannés: ${data.total_scanned}`);
    console.log(`   Joueurs analysés: ${data.analyzed_count}`);
    console.log(`   Slots BiS trouvés: ${Object.keys(data.bis || {}).length}`);
    console.log(`   Alternatives: ${Object.keys(data.bis_alternatives || {}).length}`);
    
    if (data.error) {
      console.log(`\n⚠️  Message d'erreur: ${data.error}`);
    }
    
    if (data.analyzed_count >= 100) {
      console.log(`\n✅ SUCCÈS: ${data.analyzed_count} joueurs analysés (objectif: >= 100)`);
    } else {
      console.log(`\n❌ ÉCHEC: ${data.analyzed_count} joueurs analysés (objectif: >= 100)`);
    }
    
    if (Object.keys(data.bis || {}).length > 0) {
      console.log('\n📦 Items BiS par slot:');
      console.log('─'.repeat(60));
      for (const [slot, item] of Object.entries(data.bis)) {
        const bisItem = item as any;
        console.log(`   ${slot}: ${bisItem.name} (${bisItem.item_level}) - ${Math.round(bisItem.frequency * 100)}% votes`);
      }
    }
    
    process.exit(data.analyzed_count >= 100 ? 0 : 1);
    
  } catch (error) {
    console.error(`\n❌ ERREUR:\n${error}`);
    process.exit(1);
  }
}

// Parse command line args
const args = process.argv.slice(2);
if (args.length !== 2) {
  console.error('Usage: npx tsx scripts/test-spec.ts "Class Name" "Spec Name"');
  console.error('Exemple: npx tsx scripts/test-spec.ts "Warlock" "Affliction"');
  process.exit(1);
}

const [className, spec] = args;
testSpec(className, spec);
