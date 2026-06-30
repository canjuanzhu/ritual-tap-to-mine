// Server-side helpers for global state + auth
import { isUsingMemoryStore, memStore } from "@/lib/memory-store";

// Conditional Prisma import — only loaded if not using memory store
async function getDb() {
  if (isUsingMemoryStore()) return null;
  const { db } = await import("@/lib/db");
  return db;
}

export async function getOrCreateGlobalState() {
  const db = await getDb();
  if (!db) {
    return memStore.globalState;
  }
  let state = await db.globalState.findUnique({ where: { id: 1 } });
  if (!state) {
    state = await db.globalState.create({
      data: { id: 1, blockHeight: 0, halvingEra: 0, totalSupply: 0 },
    });
  }
  return state;
}

export async function incrementBlock(rewardMintedSats: number) {
  const db = await getDb();
  if (!db) {
    memStore.globalState.blockHeight += 1;
    memStore.globalState.halvingEra = Math.floor(
      memStore.globalState.blockHeight / 21000
    );
    memStore.globalState.totalSupply = Math.min(
      21_000_000 * 1e8,
      memStore.globalState.totalSupply + rewardMintedSats
    );
    return memStore.globalState;
  }
  const state = await getOrCreateGlobalState();
  const newHeight = state.blockHeight + 1;
  const newEra = Math.floor(newHeight / 21000);
  const newSupply = Math.min(
    21_000_000 * 1e8,
    state.totalSupply + rewardMintedSats
  );
  return db.globalState.update({
    where: { id: 1 },
    data: {
      blockHeight: newHeight,
      halvingEra: newEra,
      totalSupply: newSupply,
    },
  });
}
