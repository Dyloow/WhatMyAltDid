# Système de génération BiS

## Architecture

### Données pré-générées

Les données BiS sont **pré-générées quotidiennement** et stockées dans `/public/data/bis/` sous forme de fichiers JSON statiques.

**Avantages:**

- ✅ Chargement instantané (pas d'analyse en temps réel)
- ✅ Pas de rate limiting RaiderIO en production
- ✅ Réduction drastique des coûts d'API
- ✅ Données cohérentes pour tous les utilisateurs

### Génération automatique

**Cron job GitHub Actions** : `.github/workflows/generate-bis-data.yml`

- Déclenché tous les jours à **6h00 UTC** (reset serveur EU)
- Peut être lancé manuellement via l'onglet Actions
- Commit automatique des nouveaux fichiers JSON

### Génération manuelle

```bash
# Local
npx tsx scripts/generate-all-bis.ts

# Durée estimée avec 3 workers: ~15-20 minutes pour 39 specs
```

## Structure des fichiers

```
public/data/bis/
├── _index.json                    # Index de toutes les specs
├── death-knight_blood.json        # Données BiS pour DK Blood
├── death-knight_frost.json
├── demon-hunter_havoc.json
└── ...                            # 39 fichiers (une par spec)
```

### Format JSON

Chaque fichier contient:

```typescript
{
  "analyzed_count": 100,
  "total_scanned": 150,
  "season": "season-mn-1",
  "class": "Death Knight",
  "spec": "Blood",
  "bis": {
    "head": {
      "item_id": 12345,
      "name": "Helm of...",
      "item_level": 276,
      "icon": "...",
      "frequency": 0.85,
      "raw_count": 85,
      "slot": "head",
      "dungeon": "...",
      "dungeon_display": "..."
    },
    // ... autres slots
  },
  "bis_alternatives": {
    // Items alternatifs pour trinkets/rings/weapons
  }
}
```

## API

### GET /api/bis/data

Récupère les données BiS pré-générées

**Query params:**

- `class` (string) - Nom de la classe
- `spec` (string) - Nom de la spec

**Exemple:**

```
GET /api/bis/data?class=Death Knight&spec=Blood
```

**Réponse:** JSON avec les données BiS (voir format ci-dessus)

### GET /api/bis (deprecated)

⚠️ **Ancienne route d'analyse en temps réel** - Ne plus utiliser en production

## Frontend

### Components

**`/src/components/bis-panel.tsx`**

- Charge automatiquement les données au montage
- Change de données quand l'utilisateur change de spec
- Affiche "Mise à jour quotidienne à 6h" au lieu du bouton "Analyser"
- Utilise `/api/bis/data` pour récupérer les JSONs

## Workers

Le script de génération utilise **3 workers en parallèle** :

```typescript
const MAX_WORKERS = 3; // Configurable dans generate-all-bis.ts
```

**Distribution des tâches:**

- Worker 1: specs 0, 3, 6, 9, ...
- Worker 2: specs 1, 4, 7, 10, ...
- Worker 3: specs 2, 5, 8, 11, ...

**Rate limiting:**

- 150 joueurs récupérés max par spec
- 100 avec gear valide conservés
- Délai de 100ms entre batches de 5 requêtes
- Délai de 2s entre specs pour un même worker

## Monitoring

### Logs GitHub Actions

Consultez l'onglet **Actions** du repo pour voir:

- Durée de la génération
- Nombre de specs réussies/échouées
- Erreurs éventuelles

### Vérification locale

```bash
# Lister les fichiers générés
ls -lh public/data/bis/

# Voir l'index
cat public/data/bis/_index.json

# Voir les données d'une spec
cat public/data/bis/death-knight_blood.json | jq
```

## Dépannage

### Génération échoue pour certaines specs

**Cause probable:** Rate limiting RaiderIO

**Solution:**

- Augmenter les délais dans `generate-all-bis.ts`
- Réduire `MAX_WORKERS` de 3 à 2
- Relancer la génération manuellement

### Fichiers JSON non trouvés en prod

**Cause:** Les fichiers ne sont pas déployés

**Solution:**

- Vérifier que `/public/data/bis/` est commité
- Vérifier que le dossier n'est pas dans `.gitignore`
- Rebuild et redéploy

### Données obsolètes

**Solution:**

- Onglet Actions → "Generate BiS Data" → "Run workflow"
- Ou push un commit pour déclencher un nouveau build

## Configuration

### Variables d'environnement (GitHub Actions)

Secrets requis:

- `BATTLENET_CLIENT_ID`
- `BATTLENET_CLIENT_SECRET`

### Changer l'heure de génération

Modifier `.github/workflows/generate-bis-data.yml`:

```yaml
schedule:
  - cron: "0 6 * * *" # 6h UTC
  #        ┬ ┬ ┬ ┬ ┬
  #        │ │ │ │ └─── jour de la semaine (0-6)
  #        │ │ │ └───── mois (1-12)
  #        │ │ └─────── jour du mois (1-31)
  #        │ └───────── heure (0-23)
  #        └─────────── minute (0-59)
```

### Ajuster le nombre de workers

Dans `scripts/generate-all-bis.ts`:

```typescript
const MAX_WORKERS = 3; // Augmenter pour aller plus vite (attention au rate limit)
```

## Migration depuis l'ancien système

✅ **Fait:**

- `/api/bis/data` créé (lecture depuis JSON)
- `bis-panel.tsx` modifié (chargement auto, plus de bouton)
- Script de génération créé
- GitHub Actions configuré

❌ **À faire avant déploiement:**

1. Lancer une première génération locale: `npx tsx scripts/generate-all-bis.ts`
2. Commiter les JSONs générés
3. Vérifier que ça fonctionne en local
4. Déployer

## Performance

### Avant (analyse en temps réel)

- 1ère requête: ~20-30s
- Avec cache Redis: ~4s
- Rate limit atteint après 2-3 analyses

### Après (données pré-générées)

- Chargement: **< 100ms** (lecture fichier)
- Pas de rate limit
- Pas besoin de Redis en prod
