import { NextRequest, NextResponse } from "next/server";
import { isUsingMemoryStore, memStore } from "@/lib/memory-store";
import type { MemUser } from "@/lib/memory-store";
import { MINERS, RITUAL_RECEIVER_ADDRESS } from "@/lib/miners";

// Generate a cuid-like ID
function genId(prefix = "id"): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

// POST /api/auth — login with Twitter ID + wallet address
export async function POST(req: NextRequest) {
  try {
    const { twitterId, walletAddress } = await req.json();

    if (!twitterId || !walletAddress) {
      return NextResponse.json(
        { error: "Twitter ID and wallet address are required" },
        { status: 400 }
      );
    }

    const cleanTwitter = twitterId.trim().replace(/^@/, "").toLowerCase();
    const cleanWallet = walletAddress.trim().toLowerCase();

    if (!/^0x[a-f0-9]{40}$/.test(cleanWallet)) {
      return NextResponse.json(
        { error: "Invalid wallet address format" },
        { status: 400 }
      );
    }

    // ============ MEMORY STORE PATH ============
    if (isUsingMemoryStore()) {
      const existingByTwitter = memStore.usersByTwitter.get(cleanTwitter);
      if (existingByTwitter) {
        const user = memStore.users.get(existingByTwitter)!;
        if (user.walletAddress !== cleanWallet) {
          return NextResponse.json(
            {
              error:
                "This Twitter ID is already linked to a different wallet. Use the original wallet or pick another Twitter handle.",
            },
            { status: 409 }
          );
        }
        return NextResponse.json({
          userId: user.id,
          twitterId: user.twitterId,
          walletAddress: user.walletAddress,
          createdAt: user.createdAt,
        });
      }
      const existingByWallet = memStore.usersByWallet.get(cleanWallet);
      if (existingByWallet) {
        return NextResponse.json(
          {
            error:
              "This wallet is already linked to another Twitter ID. Log in with that Twitter handle instead.",
          },
          { status: 409 }
        );
      }
      const now = new Date();
      const userId = genId("user");
      const newUser: MemUser = {
        id: userId,
        twitterId: cleanTwitter,
        walletAddress: cleanWallet,
        totalRitualBtc: 0,
        totalTaps: 0,
        energy: 100,
        lastEnergyAt: now,
        createdAt: now,
        updatedAt: now,
      };
      memStore.users.set(userId, newUser);
      memStore.usersByTwitter.set(cleanTwitter, userId);
      memStore.usersByWallet.set(cleanWallet, userId);
      // auto-grant free S1 miner
      const minerId = genId("miner");
      memStore.miners.set(minerId, {
        id: minerId,
        userId,
        tier: "S1",
        hashPower: 1,
        isFree: true,
        active: true,
        purchasedAt: now,
        lastClaimAt: now,
      });
      return NextResponse.json({
        userId: newUser.id,
        twitterId: newUser.twitterId,
        walletAddress: newUser.walletAddress,
        createdAt: newUser.createdAt,
      });
    }

    // ============ PRISMA PATH ============
    const { db } = await import("@/lib/db");
    let user = await db.user.findUnique({
      where: { twitterId: cleanTwitter },
    });

    if (user) {
      if (user.walletAddress !== cleanWallet) {
        return NextResponse.json(
          {
            error:
              "This Twitter ID is already linked to a different wallet. Use the original wallet or pick another Twitter handle.",
          },
          { status: 409 }
        );
      }
    } else {
      const walletUsed = await db.user.findUnique({
        where: { walletAddress: cleanWallet },
      });
      if (walletUsed) {
        return NextResponse.json(
          {
            error:
              "This wallet is already linked to another Twitter ID. Log in with that Twitter handle instead.",
          },
          { status: 409 }
        );
      }
      user = await db.user.create({
        data: {
          twitterId: cleanTwitter,
          walletAddress: cleanWallet,
          energy: 100,
        },
      });
      await db.miner.create({
        data: {
          userId: user.id,
          tier: "S1",
          hashPower: 1,
          isFree: true,
          active: true,
        },
      });
    }

    return NextResponse.json({
      userId: user.id,
      twitterId: user.twitterId,
      walletAddress: user.walletAddress,
      createdAt: user.createdAt,
    });
  } catch (e) {
    console.error("[auth] error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
