# Configuration Redis pour le cache BiS

## Pourquoi Redis est nécessaire

Sans Redis, **chaque analyse BiS fait ~100 requêtes directes à l'API RaiderIO**, ce qui déclenche le rate limiting après seulement 1-2 analyses.

Avec Redis, les profils de personnages sont **cachés pendant 15 minutes**, réduisant drastiquement le nombre de requêtes.

## Option 1: Redis local (Développement)

### Installation

#### macOS (avec Homebrew)

```bash
brew install redis
brew services start redis
```

#### Linux (Ubuntu/Debian)

```bash
sudo apt-get install redis-server
sudo systemctl start redis
sudo systemctl enable redis
```

#### Windows

Télécharger depuis : https://github.com/tporadowski/redis/releases

### Vérification

```bash
redis-cli ping
# Devrait retourner: PONG
```

### Configuration .env

```bash
# Ajouter à .env
REDIS_URL=redis://localhost:6379
REDIS_TOKEN=
```

### Redémarrer le serveur

```bash
npm run dev
```

## Option 2: Upstash Redis (Production/Gratuit)

Upstash offre un plan gratuit avec 10 000 requêtes/jour, parfait pour ce projet.

### 1. Créer un compte

https://console.upstash.com/

### 2. Créer une base Redis

- Cliquer sur "Create Database"
- Choisir une région proche (Europe West - Ireland)
- Plan: Free (10k requests/day)

### 3. Récupérer les credentials

Dans la page de votre base :

- Onglet "REST API"
- Copier `UPSTASH_REDIS_REST_URL` et `UPSTASH_REDIS_REST_TOKEN`

### 4. Configuration .env

```bash
# Ajouter à .env
REDIS_URL=https://YOUR-DATABASE-NAME.upstash.io
REDIS_TOKEN=YOUR_TOKEN_HERE
```

### 5. Redémarrer

```bash
npm run build
npm run dev
```

## Vérification du cache

### Test simple

```bash
# Terminal 1: Lancer le serveur
npm run dev

# Terminal 2: Première analyse (lente - pas de cache)
time npx tsx scripts/test-spec.ts "Death Knight" "Unholy"
# Devrait prendre ~20-30 secondes

# Immédiatement après: Deuxième analyse (rapide - depuis cache)
time npx tsx scripts/test-spec.ts "Death Knight" "Unholy"
# Devrait prendre ~1-2 secondes
```

### Logs Redis

Si vous voulez voir les accès cache :

```bash
# Redis local
redis-cli monitor

# Upstash
# Aller sur le dashboard Upstash → onglet "Monitoring"
```

## Dépannage

### "Connection refused" avec Redis local

```bash
# Vérifier que Redis tourne
redis-cli ping

# Si ça ne répond pas:
brew services restart redis  # macOS
sudo systemctl restart redis  # Linux
```

### "Authentication failed" avec Upstash

- Vérifier que REDIS_TOKEN est bien copié (sans espaces)
- Vérifier que l'URL commence par `https://`
- Essayer de régénérer le token dans le dashboard Upstash

### Le cache ne semble pas fonctionner

```bash
# Vider le cache et réessayer
redis-cli FLUSHALL  # Redis local

# Ou dans le code, ajouter :
import { invalidateCache } from '@/lib/cache';
await invalidateCache('rio:*');
```

## Performance attendue

### Sans Redis

- 1ère analyse: ~25 secondes
- 2ème analyse: ~25 secondes (pas de cache)
- Rate limit après: 1-2 analyses

### Avec Redis

- 1ère analyse: ~25 secondes (appels API)
- 2ème analyse (dans les 15min): ~1-2 secondes (depuis cache)
- Rate limit: Quasi impossible à atteindre

## Script de test complet

Une fois Redis configuré :

```bash
# Tester toutes les classes/specs
# Cela prendra ~30-60 minutes mais ne devrait pas rate limit
npx tsx scripts/test-all-specs.ts

# Résultat attendu:
# - 37 specs testées (39 - Devourer)
# - ~25-30 specs avec >= 100 joueurs
# - Quelques specs avec <100 joueurs (normal pour meta actuel)
```

## Recommandations

### Développement

✅ **Redis local** : Installation simple, pas de limite

### Production/CI

✅ **Upstash** : Pas d'infrastructure à gérer, free tier généreux

### Ne PAS utiliser

❌ **Pas de cache** : Rate limiting garanti après quelques minutes
