# Ritual · Tap-to-Mine ⛏️

**Gen Z's own bitcoin miner.** Tap your phone, mine Ritual BTC.

Built on the [Ritual.net](https://ritual.net) aesthetic — pure black, neon emerald, monospace, grid background, bitcoin-style economy.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fcanjuanzhu%2Fritual-tap-to-mine&env=DATABASE_URL,DATABASE_AUTH_TOKEN&envDescription=Turso%20libSQL%20database%20URL%20and%20auth%20token&project-name=ritual-tap-to-mine&repository-name=ritual-tap-to-mine)

---

## ✨ Features

- **One-tap login** — Twitter ID + wallet address (MetaMask auto-connect or manual)
- **5 Miner Tiers** (bitcoin ASIC-inspired with animated fans, LED strips, cooling fins):

  | Tier | Name    | Price       | Hash Power | /Tap    | Passive/hr |
  |------|---------|-------------|------------|---------|------------|
  | S1   | Genesis | **FREE**    | 1 TH/s     | 5 sats  | 30         |
  | S2   | Scout   | 0.1 RITUAL  | 5 TH/s     | 25 sats | 150        |
  | S9   | Veteran | 0.2 RITUAL  | 15 TH/s    | 80 sats | 480        |
  | S19  | Pro     | 0.3 RITUAL  | 50 TH/s    | 280 sats| 1,680      |
  | S21  | Apex    | 0.4 RITUAL  | 150 TH/s   | 900 sats| 5,400      |

- **Bitcoin-Style Economy**
  - Block reward starts at 50 RBTC, halves every 21,000 blocks
  - Total supply cap: 21,000,000 RBTC
  - Per-tap mining luck (±5% variance)
  - Halving event flash animation
- **Energy System** — 100 max, -1 per tap, regenerates +1 per 12 seconds
- **Passive Income** — paid miners accrue sats per hour (8h cap), one-tap claim
- **Off-chain Points** — Ritual BTC stored as satoshis in database, not on-chain
- **Per-user Mining Records** — every tap logged with block height + timestamp
- **Global Leaderboard** — ranks all miners by total Ritual BTC
- **Real Ritual Payment Address** — `0x29337E84E6bD3C6cC1B766ab9E69CDF5BBb5AC7d`

---

## 🛠 Tech Stack

- **Framework**: Next.js 16 (App Router) + TypeScript 5
- **Styling**: Tailwind CSS 4 + shadcn/ui (New York)
- **Database**: Prisma ORM + SQLite (local) / Turso libSQL (production)
- **Animations**: Framer Motion
- **State**: Zustand (session persistence)
- **Icons**: Lucide React

The `src/lib/db.ts` auto-detects the `DATABASE_URL` scheme — uses the libSQL adapter for `libsql://` / `https://` URLs (Turso / Vercel), and the default Prisma client for `file:` URLs (local SQLite). Same code, both environments.

---

## 🚀 Deploy to Vercel (5 minutes)

The fastest path uses **Turso** (free serverless SQLite — perfect for Vercel).

### Step 1 — Push to GitHub

This repo is already at `github.com/canjuanzhu/ritual-tap-to-mine`. If you forked it, push to your own account first.

### Step 2 — Create a free Turso database

1. Sign up at [turso.tech](https://turso.tech) (free, no credit card)
2. Create a database:
   ```bash
   # install turso cli
   curl -sSfL https://get.tur.so/install.sh | bash

   # sign in + create db
   turso auth login
   turso db create ritual-mining

   # get your connection URL + auth token
   turso db show ritual-mining --url
   turso db tokens create ritual-mining
   ```

You'll get two values:
- `DATABASE_URL` — looks like `libsql://ritual-mining-<your-name>.turso.io`
- `DATABASE_AUTH_TOKEN` — a long JWT token

### Step 3 — Import to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import the GitHub repo `canjuanzhu/ritual-tap-to-mine`
3. In **Configure Project → Environment Variables**, add:
   - `DATABASE_URL` = your Turso URL from Step 2
   - `DATABASE_AUTH_TOKEN` = your Turso token from Step 2
4. Click **Deploy** — Vercel runs `prisma generate && next build` automatically (see `vercel.json`)

### Step 4 — Initialize the database schema

After the first deploy, push the Prisma schema to your Turso DB:

```bash
# clone + install locally
git clone https://github.com/canjuanzhu/ritual-tap-to-mine.git
cd ritual-tap-to-mine
bun install

# create a .env file with your Turso credentials
echo 'DATABASE_URL="libsql://your-db.turso.io"' > .env
echo 'DATABASE_AUTH_TOKEN="your-token"' >> .env

# push schema
bun run db:push
```

Your app is now live at `https://ritual-tap-to-mine.vercel.app` 🎉

---

## 💻 Run Locally

### Prerequisites

- [Bun](https://bun.sh) runtime (or Node.js 18+)
- (Optional) [Turso CLI](https://turso.tech) for cloud DB

### Setup with local SQLite (fastest)

```bash
# 1. Clone
git clone https://github.com/canjuanzhu/ritual-tap-to-mine.git
cd ritual-tap-to-mine

# 2. Install
bun install

# 3. Configure local SQLite
cp .env.example .env
# .env should contain: DATABASE_URL="file:./db/custom.db"

# 4. Push schema + start dev server
bun run db:push
bun run dev
```

Open `http://localhost:3000`.

### Setup with Turso (mirrors production)

```bash
# Same as above, but in .env use:
DATABASE_URL="libsql://your-db.turso.io"
DATABASE_AUTH_TOKEN="your-turso-token"
```

---

## 📁 Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/route.ts         # POST /api/auth — login
│   │   ├── miners/route.ts       # GET /api/miners — list / POST — buy
│   │   ├── mine/tap/route.ts     # POST — tap to mine
│   │   ├── mine/claim/route.ts   # POST — claim passive income
│   │   ├── stats/route.ts        # GET — user + global stats
│   │   ├── records/route.ts      # GET — mining history
│   │   └── leaderboard/route.ts  # GET — global top miners
│   ├── layout.tsx
│   ├── page.tsx                  # root — login or dashboard
│   └── globals.css
├── components/
│   ├── miner-visual.tsx          # bitcoin ASIC SVG rig with animated fan
│   ├── login-screen.tsx
│   ├── miner-store.tsx           # 5-tier purchase flow
│   └── mining-dashboard.tsx      # main game screen
├── lib/
│   ├── miners.ts                 # 5 tier configs + receiver address
│   ├── economy.ts                # bitcoin halving + energy + passive model
│   ├── server.ts                 # global block state helpers
│   ├── store.ts                  # zustand session store
│   └── db.ts                     # prisma client (auto SQLite/libSQL)
└── prisma/
    └── schema.prisma             # User / Miner / MiningRecord / Payment / GlobalState
```

---

## 🔐 Environment Variables

| Name                    | Required | Description                                   |
|-------------------------|----------|-----------------------------------------------|
| `DATABASE_URL`          | Yes      | `file:./db/custom.db` (local) or `libsql://...` (Turso) |
| `DATABASE_AUTH_TOKEN`   | Turso only | Turso auth token (JWT)                      |

---

## 🎮 How to Play

1. Open the app → enter your **Twitter ID** and connect your **wallet**
2. You'll receive a free **Genesis S1** miner automatically
3. **Tap the rig** to mine Ritual BTC — each tap = 1 global block
4. Energy depletes as you tap; it regenerates +1 every 12 seconds
5. Buy higher-tier miners (S2 → S21) by sending RITUAL tokens to the protocol address shown in-app
6. Paid miners earn **passive income** even when you're away — claim anytime
7. Watch your rank on the global leaderboard
8. Every 21,000 blocks the block reward **halves** — get in early!

---

## ⚠️ Notes

- Ritual BTC is an **off-chain point system** — it is NOT a real cryptocurrency and is not transferable on-chain
- Real RITUAL token payments for miner purchases go to the protocol address shown in-app
- One Twitter ID + one wallet = one account (enforced server-side)
- Vercel's serverless filesystem is read-only in production, which is why we use Turso (libSQL) for the database instead of a local SQLite file

---

## 📜 License

MIT — do whatever you want, just don't blame us when your S21 burns a hole in your screen.

---

Built with ⚡ by the Ritual mining community.
