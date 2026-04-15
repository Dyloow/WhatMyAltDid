# Deployment Guide

Ce guide couvre le déploiement de WhatMyAltDid en production sur un VPS avec Traefik et GitHub Actions.

## Vue d'ensemble

```
Push sur main
     │
     ▼
GitHub Actions
  ├── Build image Docker (Next.js standalone)
  ├── Push vers GHCR (repo privé)
  └── SSH sur le serveur → docker compose pull + up
                                    │
                                    ▼
                             Traefik (reverse proxy)
                                    │
                                    ▼
                          Container Next.js :3000
```

Le build se fait dans la CI — le serveur se contente de tirer l'image et de relancer le container. Downtime typique : **2-5 secondes**.

---

## 1. Prérequis serveur

- Docker + Docker Compose plugin installés
- Traefik déjà en place (voir section [Traefik](#traefik))
- Un utilisateur dédié (recommandé, ex: `deploy`)

```bash
# Vérifier que Docker Compose v2 est disponible
docker compose version
```

---

## 2. Créer un utilisateur de déploiement (recommandé)

```bash
# Sur le serveur, en root
adduser deploy
usermod -aG docker deploy
```

Générer une paire de clés SSH **sur ta machine locale** :

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/whatmyaltdid_deploy
```

Copier la clé publique sur le serveur :

```bash
ssh-copy-id -i ~/.ssh/whatmyaltdid_deploy.pub deploy@TON_SERVEUR
```

La **clé privée** (`~/.ssh/whatmyaltdid_deploy`) va dans les secrets GitHub (voir [section 4](#4-secrets-github)).

---

## 3. Préparer le répertoire de déploiement

```bash
# Sur le serveur
mkdir -p /opt/whatmyaltdid
chown deploy:deploy /opt/whatmyaltdid
```

Créer le fichier `.env` de production :

```bash
# /opt/whatmyaltdid/.env
APP_DOMAIN=whatmyaltdid.example.com

# Base de données
DATABASE_URL=postgresql://user:password@localhost:5432/whatmyaltdid

# NextAuth
NEXTAUTH_URL=https://whatmyaltdid.example.com
NEXTAUTH_SECRET=                    # openssl rand -base64 32

# Battle.net OAuth
BATTLENET_CLIENT_ID=
BATTLENET_CLIENT_SECRET=

# Warcraft Logs
WARCRAFTLOGS_CLIENT_ID=
WARCRAFTLOGS_CLIENT_SECRET=

# Redis (optionnel)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

> Le `docker-compose.yml` est **versionné dans le repo** et synchronisé automatiquement vers le serveur à chaque déploiement via `appleboy/scp-action`. Seul le `.env` reste à créer manuellement (il contient des secrets).

---

## 4. Secrets GitHub

Dans le repo GitHub : **Settings → Secrets and variables → Actions**

| Secret | Valeur |
|--------|--------|
| `SSH_HOST` | IP ou hostname du serveur |
| `SSH_USER` | `deploy` (ou ton utilisateur) |
| `SSH_PRIVATE_KEY` | Contenu de `~/.ssh/whatmyaltdid_deploy` |
| `DEPLOY_PATH` | `/opt/whatmyaltdid` |

Le `GITHUB_TOKEN` est injecté automatiquement par GitHub Actions — ne pas le créer manuellement.

---

## 5. Autoriser le serveur à puller depuis GHCR (repo privé)

Avec un repo privé, l'image GHCR est privée. Le workflow GitHub Actions logue le serveur avec le `GITHUB_TOKEN` de la CI — c'est déjà géré dans le script de déploiement.

Si tu veux pouvoir faire un `docker compose pull` **manuellement** sur le serveur, crée un Personal Access Token :

1. GitHub → **Settings → Developer settings → Personal access tokens → Fine-grained tokens**
2. Permissions : `read:packages`
3. Sur le serveur :

```bash
echo "TON_PAT" | docker login ghcr.io -u TON_USERNAME --password-stdin
```

Ce login est persisté dans `~/.docker/config.json` sur le serveur.

---

## 6. Traefik

Si Traefik n'est pas encore en place, voici une configuration minimale. Le réseau `proxy` doit exister avant de lancer l'app.

```bash
# Créer le réseau partagé entre Traefik et les apps
docker network create proxy
```

Exemple de `docker-compose.yml` pour Traefik (dans un répertoire séparé, ex: `/opt/traefik`) :

```yaml
services:
  traefik:
    image: traefik:v3
    restart: unless-stopped
    command:
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--entrypoints.web.http.redirections.entrypoint.to=websecure"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge=true"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
      - "--certificatesresolvers.letsencrypt.acme.email=ton@email.com"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - "/var/run/docker.sock:/var/run/docker.sock:ro"
      - "letsencrypt:/letsencrypt"
    networks:
      - proxy

volumes:
  letsencrypt:

networks:
  proxy:
    external: true
```

```bash
cd /opt/traefik
docker compose up -d
```

---

## 7. Premier déploiement

Après avoir configuré les secrets GitHub et le serveur, push sur `main` pour déclencher le premier déploiement :

```bash
git push origin main
```

Suivre l'avancement dans **GitHub → Actions**.

Pour vérifier que tout tourne sur le serveur :

```bash
ssh deploy@TON_SERVEUR
cd /opt/whatmyaltdid

docker compose ps          # état des containers
docker compose logs -f app # logs en temps réel
```

Tester le healthcheck :

```bash
curl https://whatmyaltdid.example.com/api/health
# {"status":"ok"}
```

---

## 8. Migrations Prisma

Les migrations ne sont **pas lancées automatiquement** au démarrage pour éviter les surprises. Les lancer manuellement avant ou après un déploiement :

```bash
# Option A : depuis ta machine locale (avec DATABASE_URL pointant vers la prod)
DATABASE_URL="postgresql://..." pnpm exec prisma migrate deploy

# Option B : via un container éphémère sur le serveur
cd /opt/whatmyaltdid
docker run --rm \
  --env-file .env \
  --network host \
  ghcr.io/TON_USERNAME/whatmyaltdid:latest \
  npx prisma migrate deploy
```

> `migrate deploy` applique uniquement les migrations en attente — sans risque sur un schéma déjà à jour.

---

## 9. Rollback

Chaque déploiement est taggé avec le SHA du commit (`sha-abc1234`). Pour revenir en arrière :

```bash
ssh deploy@TON_SERVEUR
cd /opt/whatmyaltdid

# Remplacer par le SHA du commit cible (visible dans GitHub Actions)
IMAGE_TAG=sha-abc1234 docker compose up -d --wait app
```

---

## 10. Référence des commandes utiles

```bash
# Voir les logs
docker compose logs -f app

# Redémarrer sans re-puller
docker compose restart app

# Forcer un re-déploiement de la dernière image
docker compose pull app && docker compose up -d --wait app

# Inspecter le container
docker compose exec app sh

# Voir l'utilisation des ressources
docker stats
```
