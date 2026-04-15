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
- Traefik déjà en place sur le réseau `proxy`
- Un utilisateur dédié `whatmyaltdid`

```bash
# Vérifier que Docker Compose v2 est disponible
docker compose version
```

---

## 2. Créer l'utilisateur de déploiement

```bash
# Créer l'utilisateur
sudo useradd -m -s /bin/bash whatmyaltdid
sudo usermod -aG docker whatmyaltdid

# Dossier de déploiement
sudo mkdir -p /opt/whatmyaltdid
sudo chown whatmyaltdid:whatmyaltdid /opt/whatmyaltdid

# Clé SSH
sudo mkdir -p /home/whatmyaltdid/.ssh
sudo chmod 700 /home/whatmyaltdid/.ssh
# Coller la clé publique GitHub Actions ici :
sudo nano /home/whatmyaltdid/.ssh/authorized_keys
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

## 3. Préparer le répertoire de déploiement

```bash
sudo -u whatmyaltdid bash
cd /opt/whatmyaltdid
nano .env
```

Contenu du `.env` :

```dotenv
APP_DOMAIN=whatmyaltdid.example.com

# NextAuth
NEXTAUTH_URL=https://whatmyaltdid.example.com
NEXTAUTH_SECRET=        # openssl rand -base64 32

# Battle.net OAuth
BATTLENET_CLIENT_ID=
BATTLENET_CLIENT_SECRET=
```

```bash
chmod 600 .env
```

> Le `docker-compose.yml` est **versionné dans le repo** et synchronisé automatiquement vers le serveur à chaque déploiement. Seul le `.env` reste à créer manuellement.

---

## 4. Secrets GitHub

Dans le repo GitHub : **Settings → Secrets and variables → Actions → New repository secret**

| Secret | Valeur |
|--------|--------|
| `SSH_HOST` | IP du serveur |
| `SSH_USER` | `whatmyaltdid` |
| `SSH_PRIVATE_KEY` | Contenu de `~/.ssh/whatmyaltdid_deploy` |
| `DEPLOY_PATH` | `/opt/whatmyaltdid` |
| `GHCR_TOKEN` | PAT GitHub avec `read:packages` (voir section suivante) |

Le `GITHUB_TOKEN` est injecté automatiquement pour le build/push — ne pas le créer manuellement.

---

## 5. Créer le PAT pour GHCR (repo privé)

Le `GITHUB_TOKEN` de la CI ne peut pas s'authentifier depuis un serveur externe. Il faut un Personal Access Token dédié.

1. GitHub → **Settings → Developer settings → Personal access tokens → Fine-grained tokens**
2. **Repository access** : `Dyloow/WhatMyAltDid`
3. **Permissions** : `Packages` → `Read-only`
4. Copier le token généré
5. L'ajouter comme secret GitHub `GHCR_TOKEN` (voir section 4)

---

## 6. Premier déploiement

Push sur `main` pour déclencher le workflow :

```bash
git push origin main
```

Suivre l'avancement dans **GitHub → Actions**. Deux jobs :
- `Build & push Docker image` (~2-3 min)
- `Deploy on server` (~30s)

Vérifier sur le serveur :

```bash
ssh whatmyaltdid@TON_SERVEUR
cd /opt/whatmyaltdid

docker compose ps          # état du container
docker compose logs -f app # logs en temps réel
```

Tester le healthcheck :

```bash
curl https://whatmyaltdid.example.com/api/health
# {"status":"ok"}
```

---

## 7. Rollback

Chaque déploiement est taggé avec le SHA du commit (`sha-abc1234`), visible dans **GitHub → Actions**.

```bash
ssh whatmyaltdid@TON_SERVEUR
cd /opt/whatmyaltdid

IMAGE_TAG=sha-abc1234 docker compose up -d --wait app
```

---

## 8. Référence des commandes utiles

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
