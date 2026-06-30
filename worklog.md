---
Task ID: ritual-tap-to-mine
Agent: main (Super Z)
Task: Build a Ritual-branded tap-to-mine game with 5 bitcoin ASIC miner tiers, twitter+wallet login, bitcoin-style economy, off-chain points, per-user mining records.

Work Log:
- Initialized fullstack-dev env (Next.js 16 + TypeScript + Tailwind + shadcn + Prisma/SQLite)
- Designed Prisma schema: User / Miner / MiningRecord / Payment / GlobalState (block height + halving era + total supply)
- Wrote economy model (src/lib/economy.ts): 50 RBTC initial block reward, halving every 21,000 blocks, 21M supply cap, energy system (100 max, +1 per 12s), passive income accrual (8h cap), per-tap luck variance ±5%
- Wrote miner config (src/lib/miners.ts): 5 tiers S1/S2/S9/S19/S21 — free / 0.1 / 0.2 / 0.3 / 0.4 RITUAL, with bitcoin-ASIC-style visuals (cooling fins, LED strip, animated fan, rarity colors)
- Set Ritual payment receiver address to 0x29337E84E6bD3C6cC1B766ab9E69CDF5BBb5AC7d
- Built API routes: /api/auth (login), /api/miners (list+buy), /api/mine/tap, /api/mine/claim, /api/stats, /api/records, /api/leaderboard
- Built login screen (Twitter ID + MetaMask connect with manual fallback)
- Built miner store modal (5 tiers, payment flow with real Ritual address, tx hash input, mock confirm)
- Built mining dashboard: balance card, tap-to-mine arena with floating rewards, energy bar, global network stats (block height/reward/halving countdown/supply %), passive income claim, records modal, leaderboard modal
- Implemented halving flash overlay animation when era changes
- Lint passed clean, dev server compiles, Agent Browser verified end-to-end: login → dashboard → tap mine → buy S2 → switch miner → records → leaderboard → claim passive

Stage Summary:
- All 5 miner tiers working (1 free + 4 paid with correct 0.1/0.2/0.3/0.4 RITUAL prices)
- Tap-to-mine gives sats per tier (S1=5, S2=25, S9=80, S19=280, S21=900) with luck variance
- Bitcoin economy live: block height increments globally, halving at 21,000 blocks, supply tracks toward 21M cap
- Off-chain points (satoshis) stored in SQLite, not on-chain
- Per-user mining records persisted with miner tier, block height, reward, action type, timestamp
- Leaderboard ranks all users by total ritual BTC
- Ritual.net-inspired dark theme: black background, emerald accent, mono fonts, grid background, neon glow
- Mobile-first responsive design (max-w-md container)
- Zero console errors / zero Agent Browser failures across full golden path
