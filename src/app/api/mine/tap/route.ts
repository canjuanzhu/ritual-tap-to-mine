import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateGlobalState, incrementBlock } from "@/lib/server";
import {
  calculateEnergy,
  calculateTapReward,
  getBlockRewardSats,
  getHalvingEra,
  MAX_ENERGY,
} from "@/lib/economy";
import { MINERS, MinerTier } from "@/lib/miners";

// POST /api/mine/tap — tap to mine with active miner
// body: { userId, minerId }
export async function POST(req: NextRequest) {
  const { userId, minerId } = await req.json();
  if (!userId || !minerId) {
    return NextResponse.json({ error: "userId and minerId required" }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const miner = await db.miner.findUnique({ where: { id: minerId } });
  if (!miner || miner.userId !== userId || !miner.active) {
    return NextResponse.json({ error: "Miner not available" }, { status: 404 });
  }

  const cfg = MINERS[miner.tier as MinerTier];
  if (!cfg) return NextResponse.json({ error: "Bad tier" }, { status: 400 });

  // Energy check (server-authoritative)
  const now = new Date();
  const currentEnergy = calculateEnergy(user.lastEnergyAt, user.energy, now);
  if (currentEnergy < 1) {
    return NextResponse.json(
      { error: "Out of energy. Wait for regeneration or claim passive income.", energy: 0 },
      { status: 429 }
    );
  }

  // Global state
  const global = await getOrCreateGlobalState();
  const reward = calculateTapReward(cfg.perTapReward, global.blockHeight);
  const newGlobal = await incrementBlock(reward);

  // Update user + record (atomic)
  const newEnergy = currentEnergy - 1;
  const [updatedUser, record] = await db.$transaction([
    db.user.update({
      where: { id: userId },
      data: {
        totalRitualBtc: { increment: reward },
        totalTaps: { increment: 1 },
        energy: newEnergy,
        lastEnergyAt: now,
      },
    }),
    db.miningRecord.create({
      data: {
        userId,
        minerId: miner.id,
        minerTier: miner.tier,
        ritualBtcWon: reward,
        action: "tap",
        blockHeight: newGlobal.blockHeight,
      },
    }),
  ]);

  const newEra = getHalvingEra(newGlobal.blockHeight);
  const justHalved = newEra > global.halvingEra;

  return NextResponse.json({
    reward,
    totalRitualBtc: updatedUser.totalRitualBtc,
    totalTaps: updatedUser.totalTaps,
    energy: newEnergy,
    blockHeight: newGlobal.blockHeight,
    halvingEra: newEra,
    blockReward: getBlockRewardSats(newGlobal.blockHeight),
    justHalved,
  });
}
