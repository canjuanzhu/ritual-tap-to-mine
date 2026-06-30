// In-memory storage fallback for when DATABASE_URL is not configured.
// This is used on Vercel demo deployments without a Postgres database.
//
// NOT for production — data resets when serverless function instances
// recycle. Useful for demos and tests.

export interface MemUser {
  id: string;
  twitterId: string;
  walletAddress: string;
  totalRitualBtc: number;
  totalTaps: number;
  energy: number;
  lastEnergyAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemMiner {
  id: string;
  userId: string;
  tier: string;
  hashPower: number;
  isFree: boolean;
  active: boolean;
  purchasedAt: Date;
  lastClaimAt: Date;
}

export interface MemRecord {
  id: string;
  userId: string;
  minerId: string | null;
  minerTier: string;
  ritualBtcWon: number;
  action: string;
  blockHeight: number;
  createdAt: Date;
}

export interface MemPayment {
  id: string;
  userId: string;
  tier: string;
  amountRitual: number;
  toAddress: string;
  fromAddress: string;
  txHash: string | null;
  status: string;
  createdAt: Date;
}

export interface MemGlobalState {
  id: number;
  blockHeight: number;
  halvingEra: number;
  totalSupply: number;
}

class MemoryStore {
  users: Map<string, MemUser> = new Map();
  usersByTwitter: Map<string, string> = new Map(); // twitterId -> userId
  usersByWallet: Map<string, string> = new Map(); // walletAddress -> userId
  miners: Map<string, MemMiner> = new Map();
  records: MemRecord[] = [];
  payments: MemPayment[] = [];
  globalState: MemGlobalState = {
    id: 1,
    blockHeight: 0,
    halvingEra: 0,
    totalSupply: 0,
  };

  reset() {
    this.users.clear();
    this.usersByTwitter.clear();
    this.usersByWallet.clear();
    this.miners.clear();
    this.records = [];
    this.payments = [];
    this.globalState = { id: 1, blockHeight: 0, halvingEra: 0, totalSupply: 0 };
  }
}

// Persist across hot reloads in dev, single instance per serverless fn invocation in prod
const g = globalThis as unknown as { __ritualMemStore?: MemoryStore };
export const memStore = g.__ritualMemStore ?? new MemoryStore();
if (!g.__ritualMemStore) g.__ritualMemStore = memStore;

export function isUsingMemoryStore(): boolean {
  // Use memory store if DATABASE_URL is missing, or explicitly set to "memory"
  const url = process.env.DATABASE_URL;
  if (!url) return true;
  if (url === "memory" || url.startsWith("memory:")) return true;
  // If it's a file: URL pointing to a non-existent file in production (Vercel),
  // fall back to memory to avoid crashes
  if (
    process.env.NODE_ENV === "production" &&
    url.startsWith("file:") &&
    !url.includes("./db/")
  ) {
    return true;
  }
  return false;
}
