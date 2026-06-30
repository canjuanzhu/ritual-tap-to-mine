// Server-side helpers for global state + auth
import { db } from "@/lib/db";

export async function getOrCreateGlobalState() {
  let state = await db.globalState.findUnique({ where: { id: 1 } });
  if (!state) {
    state = await db.globalState.create({
      data: { id: 1, blockHeight: 0, halvingEra: 0, totalSupply: 0 },
    });
  }
  return state;
}

export async function incrementBlock(rewardMintedSats: number) {
  const state = await getOrCreateGlobalState();
  const newHeight = state.blockHeight + 1;
  const newEra = Math.floor(newHeight / 21000);
  const newSupply = Math.min(21_000_000 * 1e8, state.totalSupply + rewardMintedSats);
  return db.globalState.update({
    where: { id: 1 },
    data: {
      blockHeight: newHeight,
      halvingEra: newEra,
      totalSupply: newSupply,
    },
  });
}

// Lightweight session check — user id from header
export async function getUserFromRequest(req: Request) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return null;
  return db.user.findUnique({ where: { id: userId } });
}
