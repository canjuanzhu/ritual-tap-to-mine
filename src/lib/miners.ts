// Ritual miner tiers — 5 levels, bitcoin ASIC-inspired
// Free tier (S1) + 4 paid tiers (0.1 / 0.2 / 0.3 / 0.4 RITUAL)

export type MinerTier = "S1" | "S2" | "S9" | "S19" | "S21";

export interface MinerConfig {
  tier: MinerTier;
  name: string;
  tagline: string;
  priceRitual: number; // 0 = free
  hashPower: number; // TH/s
  perTapReward: number; // base ritual BTC per tap (satoshis, 1e-8 = 1 sat)
  passivePerHour: number; // passive income per hour (satoshis)
  color: string; // hex accent
  fanSpeed: number; // visual rotation speed (deg/sec)
  rarity: "Common" | "Rare" | "Epic" | "Legendary" | "Mythic";
}

export const MINERS: Record<MinerTier, MinerConfig> = {
  S1: {
    tier: "S1",
    name: "Genesis S1",
    tagline: "Free starter rig · Gen Z's first miner",
    priceRitual: 0,
    hashPower: 1,
    perTapReward: 5, // 5 sats per tap
    passivePerHour: 30,
    color: "#9CA3AF",
    fanSpeed: 1.2,
    rarity: "Common",
  },
  S2: {
    tier: "S2",
    name: "Scout S2",
    tagline: "Entry-level workhorse · 5x the punch",
    priceRitual: 0.1,
    hashPower: 5,
    perTapReward: 25,
    passivePerHour: 150,
    color: "#34D399",
    fanSpeed: 1.8,
    rarity: "Rare",
  },
  S9: {
    tier: "S9",
    name: "Veteran S9",
    tagline: "Battle-tested industrial rig",
    priceRitual: 0.2,
    hashPower: 15,
    perTapReward: 80,
    passivePerHour: 480,
    color: "#22D3EE",
    fanSpeed: 2.4,
    rarity: "Epic",
  },
  S19: {
    tier: "S19",
    name: "Pro S19",
    tagline: "The new standard · Pro hash rate",
    priceRitual: 0.3,
    hashPower: 50,
    perTapReward: 280,
    passivePerHour: 1680,
    color: "#A78BFA",
    fanSpeed: 3.0,
    rarity: "Legendary",
  },
  S21: {
    tier: "S21",
    name: "Apex S21",
    tagline: "Apex predator of the hash war",
    priceRitual: 0.4,
    hashPower: 150,
    perTapReward: 900,
    passivePerHour: 5400,
    color: "#F472B6",
    fanSpeed: 3.8,
    rarity: "Mythic",
  },
};

export const MINER_TIERS = Object.values(MINERS);

// Ritual payment receiver address (on-chain Ritual tokens go here)
export const RITUAL_RECEIVER_ADDRESS =
  "0x29337E84E6bD3C6cC1B766ab9E69CDF5BBb5AC7d";

// Convert satoshis (1e-8 BTC) to display string
export function formatRitualBtc(satoshis: number): string {
  const btc = satoshis / 1e8;
  if (btc === 0) return "0";
  if (btc < 0.01) return satoshis.toLocaleString() + " sats";
  return btc.toFixed(8).replace(/0+$/, "").replace(/\.$/, "") + " RBTC";
}

export function formatSats(satoshis: number): string {
  if (satoshis >= 1e6) return (satoshis / 1e6).toFixed(2) + "M sats";
  if (satoshis >= 1e3) return (satoshis / 1e3).toFixed(1) + "K sats";
  return Math.floor(satoshis).toLocaleString() + " sats";
}
