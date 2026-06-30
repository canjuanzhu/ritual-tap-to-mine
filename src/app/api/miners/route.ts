import { NextRequest, NextResponse } from "next/server";
import { isUsingMemoryStore, memStore } from "@/lib/memory-store";
import { genId } from "@/lib/id";
import { MINERS, MinerTier, RITUAL_RECEIVER_ADDRESS } from "@/lib/miners";

// GET /api/miners?userId=... — list user's owned miners + all tiers info
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  if (isUsingMemoryStore()) {
    const owned = Array.from(memStore.miners.values())
      .filter((m) => m.userId === userId)
      .sort((a, b) => a.purchasedAt.getTime() - b.purchasedAt.getTime());
    return NextResponse.json({
      owned: owned.map((m) => ({
        id: m.id,
        tier: m.tier,
        hashPower: m.hashPower,
        isFree: m.isFree,
        active: m.active,
        purchasedAt: m.purchasedAt,
        lastClaimAt: m.lastClaimAt,
      })),
      tiers: Object.values(MINERS).map((m) => ({
        tier: m.tier,
        name: m.name,
        tagline: m.tagline,
        priceRitual: m.priceRitual,
        hashPower: m.hashPower,
        perTapReward: m.perTapReward,
        passivePerHour: m.passivePerHour,
        color: m.color,
        rarity: m.rarity,
      })),
      receiverAddress: RITUAL_RECEIVER_ADDRESS,
    });
  }

  const { db } = await import("@/lib/db");
  const owned = await db.miner.findMany({
    where: { userId },
    orderBy: { purchasedAt: "asc" },
  });

  return NextResponse.json({
    owned: owned.map((m) => ({
      id: m.id,
      tier: m.tier,
      hashPower: m.hashPower,
      isFree: m.isFree,
      active: m.active,
      purchasedAt: m.purchasedAt,
      lastClaimAt: m.lastClaimAt,
    })),
    tiers: Object.values(MINERS).map((m) => ({
      tier: m.tier,
      name: m.name,
      tagline: m.tagline,
      priceRitual: m.priceRitual,
      hashPower: m.hashPower,
      perTapReward: m.perTapReward,
      passivePerHour: m.passivePerHour,
      color: m.color,
      rarity: m.rarity,
    })),
    receiverAddress: RITUAL_RECEIVER_ADDRESS,
  });
}

// POST /api/miners — purchase a paid miner (mock payment confirmation)
export async function POST(req: NextRequest) {
  const { userId, tier, txHash } = await req.json();
  if (!userId || !tier) {
    return NextResponse.json({ error: "userId and tier required" }, { status: 400 });
  }
  const cfg = MINERS[tier as MinerTier];
  if (!cfg) {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }
  if (cfg.priceRitual === 0) {
    return NextResponse.json({ error: "Free miner cannot be purchased" }, { status: 400 });
  }

  if (isUsingMemoryStore()) {
    const user = memStore.users.get(userId);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const existing = Array.from(memStore.miners.values()).find(
      (m) => m.userId === userId && m.tier === tier
    );
    if (existing) {
      return NextResponse.json({ error: "You already own this miner" }, { status: 409 });
    }

    const now = new Date();
    const minerId = genId("miner");
    memStore.miners.set(minerId, {
      id: minerId,
      userId,
      tier,
      hashPower: cfg.hashPower,
      isFree: false,
      active: true,
      purchasedAt: now,
      lastClaimAt: now,
    });
    const paymentId = genId("pay");
    memStore.payments.push({
      id: paymentId,
      userId,
      tier,
      amountRitual: cfg.priceRitual,
      toAddress: RITUAL_RECEIVER_ADDRESS,
      fromAddress: user.walletAddress,
      txHash: txHash || `mock_${Date.now()}_${userId.slice(-6)}`,
      status: "confirmed",
      createdAt: now,
    });

    return NextResponse.json({
      ok: true,
      miner: {
        id: minerId,
        tier,
        hashPower: cfg.hashPower,
        purchasedAt: now,
      },
      payment: {
        id: paymentId,
        amountRitual: cfg.priceRitual,
        toAddress: RITUAL_RECEIVER_ADDRESS,
        txHash: txHash || `mock_${Date.now()}_${userId.slice(-6)}`,
        status: "confirmed",
      },
    });
  }

  const { db } = await import("@/lib/db");
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const existing = await db.miner.findFirst({
    where: { userId, tier },
  });
  if (existing) {
    return NextResponse.json({ error: "You already own this miner" }, { status: 409 });
  }

  const [miner, payment] = await db.$transaction([
    db.miner.create({
      data: {
        userId,
        tier,
        hashPower: cfg.hashPower,
        isFree: false,
        active: true,
      },
    }),
    db.payment.create({
      data: {
        userId,
        tier,
        amountRitual: cfg.priceRitual,
        toAddress: RITUAL_RECEIVER_ADDRESS,
        fromAddress: user.walletAddress,
        txHash: txHash || `mock_${Date.now()}_${userId.slice(-6)}`,
        status: "confirmed",
      },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    miner: {
      id: miner.id,
      tier: miner.tier,
      hashPower: miner.hashPower,
      purchasedAt: miner.purchasedAt,
    },
    payment: {
      id: payment.id,
      amountRitual: payment.amountRitual,
      toAddress: payment.toAddress,
      txHash: payment.txHash,
      status: payment.status,
    },
  });
}
