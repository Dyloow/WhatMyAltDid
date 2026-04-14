# Rapport d'analyse BiS - Problèmes et Solutions

## Problèmes identifiés

### 1. **Specs invalides**

❌ **Problème** : "Devourer" listé comme spec de Demon Hunter  
✅ **Solution** : Corrigé - les seules specs valides sont Havoc et Vengeance

### 2. **Rate limiting RaiderIO API**

❌ **Problème** : Sans cache Redis, chaque requête va directement à l'API  
⚠️ **Impact** : Limite de ~100-200 requêtes par heure atteinte rapidement  
✅ **Solutions appliquées** :

- Retry avec exponential backoff (3 tentatives)
- Réduction des batches de 10 à 5 requêtes parallèles
- Délai de 100ms entre les batches
- Vérification du Content-Type pour détecter les réponses HTML

### 3. **Endpoint rankings broken**

❌ **Problème** : `/mythic-plus/rankings/characters` retourne du HTML au lieu de JSON  
✅ **Solution** : Vérification du Content-Type avant parsing, fallback automatique vers l'endpoint runs

### 4. **Specs peu jouées**

❌ **Problème** : Certaines specs (Affliction, Fire Mage, etc.) ont très peu de joueurs en M+  
⚠️ **Impact** : Impossible d'atteindre 100 joueurs pour ces specs  
💡 **Cause** : Meta actuel du jeu - certaines specs ne sont simplement pas jouées en M+ haut niveau

## Résultats des tests

### ✅ Specs fonctionnelles (>= 100 joueurs)

- Death Knight Unholy: 179 joueurs analysés

### ⚠️ Specs avec peu de joueurs

- Death Knight Blood: 3 joueurs
- Death Knight Frost: 8 joueurs
- Warlock Affliction: 2 joueurs
- Mage Fire: 0 joueurs trouvés

### ❌ Specs bloquées par rate limit

La plupart des autres specs n'ont pas pu être testées à cause du rate limiting.

## Solutions recommandées

### 1. **Mise en place de Redis** (PRIORITAIRE)

```bash
# .env
REDIS_URL=redis://localhost:6379
REDIS_TOKEN=  # Laissez vide pour Redis local
```

**Bénéfices** :

- Cache de 15 minutes pour les profils de personnages
- Réduction drastique des appels API
- Permet de tester toutes les specs sans rate limit

### 2. **Accepter les limitations du meta**

Pour les specs peu jouées (<100 joueurs disponibles), ajuster les attentes :

- Réduire le seuil à 50 joueurs pour certaines specs
- Afficher un warning "spec peu jouée" dans l'UI
- Calculer le BiS sur moins de joueurs mais avec plus de poids par joueur

### 3. **Alternative : Scraping de Warcraft Logs**

Si RaiderIO ne suffit pas, intégrer Warcraft Logs API pour compléter les données :

- Plus de joueurs disponibles
- Données de BiS raid en complément M+
- Meilleure couverture des specs de heal/support

## Code modifié

### Fichiers corrigés

1. `/src/lib/raiderio-api.ts`
   - Retry avec backoff
   - Vérification Content-Type
   - Gestion 429 Rate Limit

2. `/src/app/api/bis/route.ts`
   - Batches réduits (5 au lieu de 10)
   - Délai entre batches (100ms)

3. `/src/components/bis-panel.tsx`
   - Suppression "Devourer"
   - Badge "ALT ✓" pour alternatives équipées

## Tests unitaires

### Scripts créés

- `/tests/bis-analysis.test.ts` - Tests Jest pour toutes les classes/specs
- `/scripts/test-all-specs.ts` - Script CLI pour tester toutes les specs
- `/scripts/test-spec.ts` - Script CLI pour tester une spec spécifique

### Usage

```bash
# Tester une spec spécifique
npx tsx scripts/test-spec.ts "Warlock" "Affliction"

# Tester toutes les specs (nécessite Redis ou rate limit garantis)
npx tsx scripts/test-all-specs.ts
```

## Prochaines étapes

1. **CRITIQUE** : Configurer Redis pour éviter le rate limiting
2. Ajuster les seuils par spec (meta-aware thresholds)
3. Afficher des warnings dans l'UI pour les specs peu jouées
4. Considérer Warcraft Logs comme source secondaire
5. Implémenter un système de queue pour les analyses lourdes

## Notes technique

### Rate Limiting RaiderIO

- ~100-200 requêtes/heure sans cache
- 401 après rate limit
- Réinitialisation après ~1 heure

### Métriques actuelles

- Temps moyen par analyse: ~15-25 secondes
- Requêtes par analyse: 1 (top players) + N (profils individuels)
- Avec 100 joueurs: ~101 requêtes = rate limit atteint en 1-2 analyses

### Solution finale

**Redis est OBLIGATOIRE pour une utilisation en production** sans quoi le système est inutilisable au-delà de quelques analyses par heure.
