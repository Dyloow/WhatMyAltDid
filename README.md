# WhatMyAltDid

WoW alt tracker — track Mythic+ runs, Great Vault progress, and Best in Slot gear across all your characters.

## Features

- **Battle.net OAuth** — log in with your Blizzard account, auto-import your characters
- **Mythic+ Dashboard** — weekly key count, highest key, Rio score, dungeon-by-dungeon grid
- **Great Vault Tracker** — dungeon / raid / world activity slots with ilvl rewards
- **Best in Slot Analysis** — aggregates gear from top 50 players per spec via Raider.IO, shows BiS items, enchants & gems with Wowhead tooltips
- **Character Profiles** — public pages at `/character/:region/:realm/:name`
- **9 Languages** — FR, EN, DE, ES, PT, IT, RU, KO, ZH
- **Dark / Light Theme**

## Tech Stack

| Layer     | Tech                                  |
| --------- | ------------------------------------- |
| Framework | Next.js 16 (App Router)               |
| Database  | PostgreSQL + Prisma                   |
| Auth      | NextAuth.js v5 (Battle.net OAuth2)    |
| State     | Zustand                               |
| Styling   | Tailwind CSS v4 + CSS variables       |
| UI        | shadcn/ui components                  |
| APIs      | Blizzard API, Raider.IO, WarcraftLogs |
| Tooltips  | Wowhead embedded tooltips             |
| Cache     | Upstash Redis / ioredis               |

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── bis/           # BiS analysis endpoint
│   │   ├── scan/          # Character scan (Blizzard + RIO + WCL)
│   │   ├── affixes/       # Weekly affix data
│   │   ├── characters/    # User characters CRUD
│   │   └── character/     # Character lookup
│   ├── auth/              # Battle.net callback & error
│   ├── character/         # Public character pages
│   └── dashboard/         # Main dashboard (M+, Vault)
├── components/            # React components
├── lib/                   # Utils, API clients, auth, i18n
└── types/                 # TypeScript types
scripts/
└── generate-all-bis.ts    # BiS data generator (40 specs)
public/data/bis/           # Generated BiS JSON files
prisma/
└── schema.prisma          # Database schema
```

## Environment Variables

```env
# Battle.net OAuth
BATTLENET_CLIENT_ID=
BATTLENET_CLIENT_SECRET=
BATTLENET_REGION=eu          # eu | us | cn

# Auth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=

# Database
DATABASE_URL=postgresql://...

# Redis (optional, for caching)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

## Getting Started

```bash
# Install dependencies
npm install

# Setup database
npx prisma generate
npx prisma db push

# Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## BiS Data Generation

The `scripts/generate-all-bis.ts` script analyzes the top 50 players per spec from Raider.IO to build Best in Slot recommendations.

```bash
# Run manually
npx tsx scripts/generate-all-bis.ts

# Force regenerate all specs
npx tsx scripts/generate-all-bis.ts --force
```

Output: `public/data/bis/<class>/<spec>.json` (40 files + `_index.json`)

### Automated Updates (GitHub Actions)

A workflow runs daily at **06:00 UTC** (EU server reset) to regenerate BiS data and auto-commit changes:

```
.github/workflows/generate-bis-data.yml
```

- Runs `generate-all-bis.ts --force` with Battle.net API credentials from secrets
- Commits updated JSON files to `public/data/bis/`
- Uses `[skip ci]` to avoid triggering another build
- Can be triggered manually via `workflow_dispatch`

**Required GitHub Secrets:**

- `BATTLENET_CLIENT_ID`
- `BATTLENET_CLIENT_SECRET`

## Database Schema

| Model         | Description                                  |
| ------------- | -------------------------------------------- |
| `User`        | Battle.net identity (battletag, region)      |
| `Character`   | WoW character (class, spec, ilvl, Rio score) |
| `WeeklyMplus` | Weekly M+ runs per character                 |
| `WeeklyVault` | Weekly vault slot progress                   |

## Deployment

Designed for [Vercel](https://vercel.com) with:

- PostgreSQL (Neon, Supabase, etc.)
- Upstash Redis for caching
- GitHub Actions for BiS data updates
