# Deployment Guide

Ce guide couvre le déploiement de WhatMyAltDid en production sur un VPS avec Traefik et GitHub Actions.

## Vue d'ensemble

```
Push sur main
     │
     ▼
GitHub Actions
  ├── Build image runner  → ghcr.io/dyloow/whatmyaltdid:latest
  ├── Build image migrator → ghcr.io/dyloow/whatmyaltdid:migrator-latest
  └── SSH sur le serveur
        ├── Écrit le .env depuis les GitHub Secrets
        ├── docker compose pull
        └── docker compose up -d --wait
                │
                ├── migrate  (applique les migrations Prisma, puis s'arrête)
                └── app      (démarre après migrate)
                      │
                      ▼
               Traefik → :3000
```

Le build se fait dans la CI — le serveur se contente de tirer les images et de relancer les containers.

---

## 1. Prérequis serveur

- Docker + Docker Compose plugin installés
- Traefik déjà en place sur le réseau `proxy`
- Un utilisateur dédié `whatmyaltdid`

```bash
docker compose version   # doit être v2
```

---

## 2. Créer l'utilisateur de déploiement

```bash
sudo useradd -m -s /bin/bash whatmyaltdid
sudo usermod -aG docker whatmyaltdid

sudo mkdir -p /opt/whatmyaltdid
sudo chown whatmyaltdid:whatmyaltdid /opt/whatmyaltdid

sudo mkdir -p /home/whatmyaltdid/.ssh
sudo chmod 700 /home/whatmyaltdid/.ssh
sudo nano /home/whatmyaltdid/.ssh/authorized_keys   # coller la clé publique CI
sudo chmod 600 /home/whatmyaltdid/.ssh/authorized_keys
sudo chown -R whatmyaltdid:whatmyaltdid /home/whatmyaltdid/.ssh
```

Générer la paire de clés SSH dédiée (sur ta machine locale) :

```bash
ssh-keygen -t ed25519 -C "github-actions-whatmyaltdid" -f ~/.ssh/whatmyaltdid_deploy -N ""
```

- `~/.ssh/whatmyaltdid_deploy.pub` → dans `authorized_keys` sur le serveur
- `~/.ssh/whatmyaltdid_deploy` → dans les secrets GitHub (`SSH_PRIVATE_KEY`)

---

## 3. Secrets GitHub

Dans le repo GitHub : **Settings → Secrets and variables → Actions → New repository secret**

### Infrastructure

| Secret | Valeur |
|--------|--------|
| `SSH_HOST` | IP du serveur |
| `SSH_USER` | `whatmyaltdid` |
| `SSH_PRIVATE_KEY` | Contenu de `~/.ssh/whatmyaltdid_deploy` |
| `DEPLOY_PATH` | `/opt/whatmyaltdid` |
| `GHCR_TOKEN` | PAT GitHub avec `read:packages` (voir section 4) |

### Application

| Secret | Valeur | Requis |
|--------|--------|--------|
| `POSTGRES_PASSWORD` | Mot de passe PostgreSQL | ✅ |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` | ✅ |
| `BATTLENET_CLIENT_ID` | ID de l'app Battle.net | ✅ |
| `BATTLENET_CLIENT_SECRET` | Secret de l'app Battle.net | ✅ |
| `APP_DOMAIN` | `whatmyaltdid.com` (pour Traefik) | ✅ |
| `POSTGRES_USER` | Nom d'utilisateur PostgreSQL | défaut : `wmad` |
| `POSTGRES_DB` | Nom de la base de données | défaut : `wmad` |

> Le CI génère automatiquement le `.env` sur le serveur à partir de ces secrets à chaque déploiement. Il n'est pas nécessaire de le créer manuellement.

---

## 4. Créer le PAT pour GHCR

Le `GITHUB_TOKEN` de la CI ne peut pas s'authentifier depuis un serveur externe. Il faut un Personal Access Token dédié.

1. GitHub → **Settings → Developer settings → Personal access tokens → Fine-grained tokens**
2. **Repository access** : `Dyloow/WhatMyAltDid`
3. **Permissions** : `Packages` → `Read-only`
4. Copier le token et l'ajouter comme secret GitHub `GHCR_TOKEN`

---

## 5. Premier déploiement

Push sur `main` pour déclencher le workflow :

```bash
git push origin main
```

Suivre l'avancement dans **GitHub → Actions**. Deux jobs :
- `Build & push Docker image` — build runner + migrator (~3-4 min)
- `Deploy on server` — pull + migrate + start (~1 min)

Vérifier sur le serveur :

```bash
ssh whatmyaltdid@TON_SERVEUR
cd /opt/whatmyaltdid

docker compose ps           # état des containers
docker compose logs migrate # résultat des migrations
docker compose logs -f app  # logs en temps réel
```

Tester le healthcheck :

```bash
curl https://whatmyaltdid.com/api/health
# {"status":"ok"}
```

---

## 6. Rollback

Les images utilisent `latest` — pour rollback, faire un `git revert` et pousser :

```bash
git revert HEAD
git push origin main
```

La CI rebuild et redéploie automatiquement.

---

## 7. Commandes utiles

```bash
# Voir les logs
docker compose logs -f app

# Redémarrer sans re-puller
docker compose restart app

# Forcer un re-déploiement de la dernière image
docker compose pull && docker compose up -d --wait

# Relancer les migrations manuellement
docker compose run --rm migrate

# Inspecter le container
docker compose exec app sh

# Utilisation des ressources
docker stats
```

---

## 8. Variables d'environnement

Le `.env` sur le serveur est écrit par le CI à chaque déploiement. Pour référence ou opération manuelle :

```dotenv
# Requis
POSTGRES_PASSWORD=
NEXTAUTH_SECRET=
BATTLENET_CLIENT_ID=
BATTLENET_CLIENT_SECRET=
APP_DOMAIN=whatmyaltdid.com

# Optionnels (défauts dans docker-compose.yml)
# POSTGRES_USER=wmad
# POSTGRES_DB=wmad
```

Variables codées en dur dans `docker-compose.yml` (pas dans `.env`) :
- `NEXTAUTH_URL=https://whatmyaltdid.com`
- `REDIS_URL=redis://redis:6379`
- `NODE_ENV=production`
