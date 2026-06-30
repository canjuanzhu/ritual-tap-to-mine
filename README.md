# Ritual · Tap-to-Mine

> Gen Z's own bitcoin miner. Tap the rig, earn Ritual BTC.
> Bitcoin-style halving economy · 5 ASIC miner tiers · off-chain points · per-user mining records.

Built with Next.js 16 · TypeScript · Tailwind CSS · Prisma · Framer Motion.

---

## Features

- **Twitter + Wallet login** — one Twitter ID + one wallet = one account. MetaMask auto-connect with manual fallback.
- **5 Miner Tiers** (bitcoin ASIC-inspired SVG visuals with animated fans, LED strips, cooling fins):
  | Tier | Name | Price | Hash | Per Tap | Passive / hr |
  |------|------|-------|------|---------|--------------|
  | S1 | Genesis | **FREE** | 1 TH/s | 5 sats | 30 |
  | S2 | Scout | 0.1 RITUAL | 5 TH/s | 25 sats | 150 |
  | S9 | Veteran | 0.2 RITUAL | 15 TH/s | 80 sats | 480 |
  | S19 | Pro | 0.3 RITUAL | 50 TH/s | 280 sats | 1,680 |
  | S21 | Apex | 0.4 RITUAL | 150 TH/s | 900 sats | 5,400 |
- **Tap-to-Mine** — tap the rig, earn satoshis (off-chain, not on-chain).
- **Bitcoin Economy** — global block height increments per tap, block reward starts at 50 RBTC, **halves every 21,000 blocks**, 21M supply cap, halving flash animation.
- **Energy System** — 100 max, -1 per tap, regenerates +1 every 12s with live countdown.
- **Passive Income** — paid miners accrue sats per hour (8h cap), one-tap claim.
- **Per-user Mining Records** — every tap logged with miner tier, block height, reward, timestamp.
- **Leaderboard** — global ranking by total Ritual BTC, current user highlighted.
- **Ritual Payment Receiver** — on-chain RITUAL payments go to:
  `0x29337E84E6bD3C6cC1B766ab9E69CDF5BBb5AC7d`

---

## Local Development

```bash
# 1. Install deps
bun install   # or npm install / pnpm install

# 2. Set up the database (SQLite for local dev)
echo 'DATABASE_URL="file:./db/custom.db"' > .env
bun run db:push

# 3. Start dev server
bun run dev
# → http://localhost:3000
```

---

## Deploy to Vercel

> ⚠️ **Important:** Vercel's serverless filesystem is read-only in production.
> The local SQLite file (`db/custom.db`) **will not persist** on Vercel.
> You MUST use a serverless-friendly database. Two options below.

### Option A — Turso (libSQL, recommended)

Turso is SQLite-compatible — your existing Prisma schema works with **zero changes**.

1. Sign up at [turso.tech](https://turso.tech) (free tier: 500 DBs, 9 GB).
2. Create a database:
   ```bash
   pip install turso
   turso auth login
   turso db create ritual-mining
   turso db tokens create ritual-mining   # → prints a token
   turso db show ritual-mining --url      # → prints libsql://... URL
   ```
3. In Vercel, set these env vars:
   ```
   DATABASE_URL=libsql://ritual-mining-<your-user>.turso.io?authToken=<token>
   ```
4. Update `prisma/schema.prisma` datasource to use libSQL:
   ```prisma
   datasource db {
     provider = "sqlite"
     url      = env("DATABASE_URL")
   }
   ```
   (Already SQLite — no change needed. Prisma 6 supports libSQL URLs natively.)
5. Run `bun run db:push` once locally with the Turso URL to create tables.
6. Deploy on Vercel — done!

### Option B — Vercel Postgres (PostgreSQL)

1. In Vercel dashboard → Storage → Create Database → Postgres (free tier).
2. Vercel auto-sets `DATABASE_URL` and `POSTGRES_PRISMA_URL`.
3. Change `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
4. Run `bun run db:push` to create tables on the new Postgres.
5. Deploy — done.

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 + shadcn/ui |
| Database | Prisma ORM (SQLite locally, Turso/Postgres on Vercel) |
| Animations | Framer Motion |
| State | Zustand (session) |
| Icons | Lucide |

---

## Project Structure

```
src/
├── app/
│   ├── api/                  # API routes (auth, miners, mine/tap, mine/claim, stats, records, leaderboard)
│   ├── layout.tsx            # Root layout with Ritual branding
│   ├── page.tsx              # Login ↔ Dashboard router
│   └── globals.css
├── components/
│   ├── ui/                   # shadcn/ui primitives
│   ├── login-screen.tsx      # Twitter + wallet connect
│   ├── mining-dashboard.tsx  # Main tap-to-mine arena
│   ├── miner-visual.tsx      # Bitcoin ASIC SVG with animated fan
│   └── miner-store.tsx       # 5-tier store + payment flow
└── lib/
    ├── miners.ts             # 5 miner tier configs
    ├── economy.ts            # Bitcoin halving + energy + passive income
    ├── store.ts              # Zustand session
    ├── server.ts             # Global block height helpers
    └── db.ts                 # Prisma client
```

---

## Ritual Protocol

- **Receiver address:** `0x29337E84E6bD3C6cC1B766ab9E69CDF5BBb5AC7d`
- **Off-chain points:** Ritual BTC is awarded as satoshis stored in our database, not as on-chain tokens. Future versions may add a claim-to-chain bridge.
- **Halving schedule:** every 21,000 global taps (blocks), reward is cut in half.

---

Built for the Ritual community. Tap hard, hodl harder. ⛏️
