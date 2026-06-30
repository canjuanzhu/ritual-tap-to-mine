// Bitcoin-style economy model for Ritual Tap-to-Mine
//
// Core rules (mirrors Bitcoin's monetary policy):
//   1. Block reward starts at 50 Ritual BTC (5,000,000,000 sats)
//   2. Halving every 21,000 global blocks (taps)
//   3. Total supply capped at 21,000,000 Ritual BTC
//   4. Per-tap reward = miner.perTapReward * (1 + difficultyLuck)
//      where difficultyLuck = (blockHeightInEra / blocksPerEra) * 0.2
//      — small boost early in each era, fading toward the halving
//   5. Energy system: each tap costs 1 energy, regenerates 1 per 12s, max 100

export const BLOCKS_PER_HALVING = 21000;
export const INITIAL_BLOCK_REWARD_SATS = 5_000_000_000; // 50 RBTC in sats
export const MAX_SUPPLY_SATS = 21_000_000 * 1e8; // 21M RBTC cap
export const ENERGY_REGEN_MS = 12_000; // 1 energy per 12s
export const MAX_ENERGY = 100;

export function getHalvingEra(blockHeight: number): number {
  return Math.floor(blockHeight / BLOCKS_PER_HALVING);
}

export function getBlockRewardSats(blockHeight: number): number {
  const era = getHalvingEra(blockHeight);
  let reward = INITIAL_BLOCK_REWARD_SATS;
  for (let i = 0; i < era && reward > 1; i++) {
    reward = Math.floor(reward / 2);
  }
  return Math.max(reward, 1);
}

export function getNextHalvingBlock(blockHeight: number): number {
  const era = getHalvingEra(blockHeight);
  return (era + 1) * BLOCKS_PER_HALVING;
}

export function blocksUntilHalving(blockHeight: number): number {
  return getNextHalvingBlock(blockHeight) - blockHeight;
}

// Per-tap reward calculation
// Base reward from miner + era progress luck bonus (0% → +20%)
export function calculateTapReward(
  baseRewardSats: number,
  blockHeight: number
): number {
  const progressInEra = blockHeight % BLOCKS_PER_HALVING;
  const luckMultiplier = 1 + (progressInEra / BLOCKS_PER_HALVING) * 0.2;
  // small variance ±5% for "mining luck"
  const variance = 0.95 + Math.random() * 0.1;
  return Math.floor(baseRewardSats * luckMultiplier * variance);
}

// Passive income accrual for paid miners (satoshis since lastClaimAt)
export function calculatePassiveReward(
  perHourSats: number,
  lastClaimAt: Date,
  now: Date = new Date()
): number {
  const elapsedMs = now.getTime() - lastClaimAt.getTime();
  const hours = elapsedMs / (1000 * 60 * 60);
  // cap passive accrual at 8 hours to prevent infinite farming
  const cappedHours = Math.min(hours, 8);
  return Math.floor(perHourSats * cappedHours);
}

// Energy calculation given lastEnergyAt
export function calculateEnergy(
  lastEnergyAt: Date,
  currentEnergy: number,
  now: Date = new Date()
): number {
  const elapsedMs = now.getTime() - lastEnergyAt.getTime();
  const regenerated = Math.floor(elapsedMs / ENERGY_REGEN_MS);
  return Math.min(MAX_ENERGY, currentEnergy + regenerated);
}

export function msUntilNextEnergy(
  lastEnergyAt: Date,
  currentEnergy: number,
  now: Date = new Date()
): number {
  if (currentEnergy >= MAX_ENERGY) return 0;
  const elapsedMs = now.getTime() - lastEnergyAt.getTime();
  const remainder = elapsedMs % ENERGY_REGEN_MS;
  return Math.max(0, ENERGY_REGEN_MS - remainder);
}

export function formatDuration(ms: number): string {
  if (ms <= 0) return "0s";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  if (m < 60) return `${m}m ${rs}s`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return `${h}h ${rm}m`;
}
