import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateGlobalState } from "@/lib/server";
import {
  calculateEnergy,
  calculatePassiveReward,
  getBlockRewardSats,
  blocksUntilHalving,
  getNextHalvingBlock,
  MAX_ENERGY,
  MAX_SUPPLY_SATS,
} from "@/lib/economy";
import { MINERS, MinerTier } from "@/lib/miners";

// GET /api/stats?userId=...
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const miners = await db.miner.findMany({ where: { userId, active: true } });
  const global = await getOrCreateGlobalState();

  const now = new Date();
  const energy = calculateEnergy(user.lastEnergyAt, user.energy, now);

  // pending passive income
  let pendingPassive = 0;
  for (const m of miners) {
    const cfg = MINERS[m.tier as MinerTier];
    if (cfg) pendingPassive += calculatePassiveReward(cfg.passivePerHour, m.lastClaimAt, now);
  }

  const totalHashPower = miners.reduce((sum, m) => sum + m.hashPower, 0);

  return NextResponse.json({
    user: {
      twitterId: user.twitterId,
      walletAddress: user.walletAddress,
      totalRitualBtc: user.totalRitualBtc,
      totalTaps: user.totalTaps,
      energy,
      maxEnergy: MAX_ENERGY,
      createdAt: user.createdAt,
    },
    miners: miners.map((m) => ({
      id: m.id,
      tier: m.tier,
      hashPower: m.hashPower,
      isFree: m.isFree,
      lastClaimAt: m.lastClaimAt,
    })),
    totalHashPower,
    pendingPassive,
    global: {
      blockHeight: global.blockHeight,
      halvingEra: global.halvingEra,
      blockRewardSats: getBlockRewardSats(global.blockHeight),
      blocksUntilHalving: blocksUntilHalving(global.blockHeight),
      nextHalvingBlock: getNextHalvingBlock(global.blockHeight),
      totalSupplySats: global.totalSupply,
      maxSupplySats: MAX_SUPPLY_SATS,
      circulatingPct: (global.totalSupply / MAX_SUPPLY_SATS) * 100,
    },
  });
}
