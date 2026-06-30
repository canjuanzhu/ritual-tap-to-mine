import { NextRequest, NextResponse } from "next/server";
import { isUsingMemoryStore, memStore } from "@/lib/memory-store";
import { genId } from "@/lib/id";
import { getOrCreateGlobalState, incrementBlock } from "@/lib/server";
import { calculatePassiveReward, getHalvingEra } from "@/lib/economy";
import { MINERS, MinerTier } from "@/lib/miners";

// POST /api/mine/claim — claim passive income from all owned miners
export async function POST(req: NextRequest) {
  const { userId } = await req.json();
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  if (isUsingMemoryStore()) {
    const user = memStore.users.get(userId);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const miners = Array.from(memStore.miners.values()).filter(
      (m) => m.userId === userId && m.active
    );
    const now = new Date();
    let totalReward = 0;
    const perMiner: { tier: string; reward: number }[] = [];

    for (const miner of miners) {
      const cfg = MINERS[miner.tier as MinerTier];
      if (!cfg) continue;
      const reward = calculatePassiveReward(cfg.passivePerHour, miner.lastClaimAt, now);
      if (reward > 0) {
        totalReward += reward;
        perMiner.push({ tier: miner.tier, reward });
        miner.lastClaimAt = now;
      }
    }

    if (totalReward === 0) {
      return NextResponse.json({
        ok: true,
        reward: 0,
        message: "No passive income to claim yet. Come back later.",
      });
    }

    const global = memStore.globalState;
    const newGlobal = await incrementBlock(totalReward);
    user.totalRitualBtc += totalReward;
    user.updatedAt = now;

    memStore.records.unshift({
      id: genId("rec"),
      userId,
      minerId: null,
      minerTier: "ALL",
      ritualBtcWon: totalReward,
      action: "auto",
      blockHeight: newGlobal.blockHeight,
      createdAt: now,
    });

    const newEra = getHalvingEra(newGlobal.blockHeight);
    const justHalved = newEra > global.halvingEra;

    return NextResponse.json({
      ok: true,
      reward: totalReward,
      totalRitualBtc: user.totalRitualBtc,
      perMiner,
      blockHeight: newGlobal.blockHeight,
      justHalved,
    });
  }

  // ============ PRISMA PATH ============
  const { db } = await import("@/lib/db");
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const miners = await db.miner.findMany({ where: { userId, active: true } });
  const now = new Date();
  let totalReward = 0;
  const perMiner: { tier: string; reward: number }[] = [];

  for (const miner of miners) {
    const cfg = MINERS[miner.tier as MinerTier];
    if (!cfg) continue;
    const reward = calculatePassiveReward(cfg.passivePerHour, miner.lastClaimAt, now);
    if (reward > 0) {
      totalReward += reward;
      perMiner.push({ tier: miner.tier, reward });
      await db.miner.update({
        where: { id: miner.id },
        data: { lastClaimAt: now },
      });
    }
  }

  if (totalReward === 0) {
    return NextResponse.json({
      ok: true,
      reward: 0,
      message: "No passive income to claim yet. Come back later.",
    });
  }

  const global = await getOrCreateGlobalState();
  const newGlobal = await incrementBlock(totalReward);

  const [updatedUser] = await db.$transaction([
    db.user.update({
      where: { id: userId },
      data: {
        totalRitualBtc: { increment: totalReward },
      },
    }),
    db.miningRecord.create({
      data: {
        userId,
        minerId: null,
        minerTier: "ALL",
        ritualBtcWon: totalReward,
        action: "auto",
        blockHeight: newGlobal.blockHeight,
      },
    }),
  ]);

  const newEra = getHalvingEra(newGlobal.blockHeight);
  const justHalved = newEra > global.halvingEra;

  return NextResponse.json({
    ok: true,
    reward: totalReward,
    totalRitualBtc: updatedUser.totalRitualBtc,
    perMiner,
    blockHeight: newGlobal.blockHeight,
    justHalved,
  });
}
