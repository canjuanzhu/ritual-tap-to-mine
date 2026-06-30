"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, Copy, Loader2, Lock, Zap, X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { MinerVisual } from "./miner-visual";
import { MinerTier, RITUAL_RECEIVER_ADDRESS } from "@/lib/miners";

interface MinerTierInfo {
  tier: MinerTier;
  name: string;
  tagline: string;
  priceRitual: number;
  hashPower: number;
  perTapReward: number;
  passivePerHour: number;
  color: string;
  rarity: string;
}

interface OwnedMiner {
  id: string;
  tier: MinerTier;
  hashPower: number;
  isFree: boolean;
  active: boolean;
  purchasedAt: string;
  lastClaimAt: string;
}

interface MinerStoreProps {
  userId: string;
  walletAddress: string;
  owned: OwnedMiner[];
  tiers: MinerTierInfo[];
  onChanged: () => void;
  onClose: () => void;
}

export function MinerStore({
  userId,
  walletAddress,
  owned,
  tiers,
  onChanged,
  onClose,
}: MinerStoreProps) {
  const { toast } = useToast();
  const [buyingTier, setBuyingTier] = useState<MinerTier | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [copied, setCopied] = useState(false);

  const ownedTiers = new Set(owned.map((m) => m.tier));
  const buyingCfg = tiers.find((t) => t.tier === buyingTier);

  useEffect(() => {
    if (buyingTier) {
      setTxHash("");
    }
  }, [buyingTier]);

  function copyAddress() {
    navigator.clipboard.writeText(RITUAL_RECEIVER_ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function confirmPurchase() {
    if (!buyingTier || !buyingCfg) return;
    setConfirming(true);
    try {
      const res = await fetch("/api/miners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, tier: buyingTier, txHash: txHash || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Purchase failed", description: data.error, variant: "destructive" });
        return;
      }
      toast({
        title: `${buyingCfg.name} unlocked!`,
        description: `Paid ${buyingCfg.priceRitual} RITUAL · mining at ${buyingCfg.hashPower} TH/s`,
      });
      setBuyingTier(null);
      onChanged();
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-5xl my-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              RITUAL MINER STORE
            </h2>
            <p className="text-xs text-zinc-500 font-mono mt-0.5">
              5 tiers · bitcoin-style economy · free S1 unlocked at signup
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-zinc-400 hover:text-white"
          >
            <X className="size-5" />
          </Button>
        </div>

        {/* Tier grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {tiers.map((t, i) => {
            const isOwned = ownedTiers.has(t.tier);
            const isFree = t.priceRitual === 0;
            return (
              <motion.div
                key={t.tier}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="relative rounded-xl border bg-zinc-950/80 p-4 flex flex-col gap-3 overflow-hidden"
                style={{
                  borderColor: isOwned ? `${t.color}88` : "#27272a",
                  boxShadow: isOwned ? `0 0 24px ${t.color}22` : "none",
                }}
              >
                {/* rarity stripe */}
                <div
                  className="absolute top-0 inset-x-0 h-0.5"
                  style={{ background: t.color }}
                />

                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold" style={{ color: t.color }}>
                        {t.tier}
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full border border-zinc-700 text-zinc-400">
                        {t.rarity.toUpperCase()}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-white mt-0.5">{t.name}</h3>
                    <p className="text-[10px] text-zinc-500 mt-0.5 leading-snug">{t.tagline}</p>
                  </div>
                  {isOwned && (
                    <div className="flex items-center justify-center size-6 rounded-full bg-emerald-500/20 border border-emerald-500/40">
                      <Check className="size-3.5 text-emerald-400" />
                    </div>
                  )}
                </div>

                {/* Miner visual */}
                <div className="flex justify-center py-2">
                  <MinerVisual tier={t.tier} size={180} active={isOwned} color={t.color} />
                </div>

                {/* Specs */}
                <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
                  <div className="rounded-md bg-black/40 border border-zinc-900 px-2 py-1.5">
                    <div className="text-zinc-600">HASH</div>
                    <div className="text-white font-bold">{t.hashPower} TH/s</div>
                  </div>
                  <div className="rounded-md bg-black/40 border border-zinc-900 px-2 py-1.5">
                    <div className="text-zinc-600">/TAP</div>
                    <div className="text-white font-bold">{t.perTapReward} sats</div>
                  </div>
                  <div className="rounded-md bg-black/40 border border-zinc-900 px-2 py-1.5">
                    <div className="text-zinc-600">PASSIVE</div>
                    <div className="text-white font-bold">{t.passivePerHour}/hr</div>
                  </div>
                  <div className="rounded-md bg-black/40 border border-zinc-900 px-2 py-1.5">
                    <div className="text-zinc-600">PRICE</div>
                    <div className="font-bold" style={{ color: isFree ? "#34D399" : t.color }}>
                      {isFree ? "FREE" : `${t.priceRitual} RITUAL`}
                    </div>
                  </div>
                </div>

                {/* Action */}
                {isOwned ? (
                  <div className="text-center text-[11px] font-mono text-emerald-400 py-2 border border-emerald-500/20 rounded-md bg-emerald-500/5">
                    OWNED · ACTIVE
                  </div>
                ) : (
                  <Button
                    onClick={() => setBuyingTier(t.tier)}
                    className="w-full h-9 font-bold text-xs"
                    style={{
                      background: t.color,
                      color: "#000",
                    }}
                  >
                    {isFree ? (
                      <>
                        <Lock className="size-3.5" /> UNLOCK FREE
                      </>
                    ) : (
                      <>
                        <Zap className="size-3.5" /> BUY · {t.priceRitual} RITUAL
                      </>
                    )}
                  </Button>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Buy modal */}
        {buyingTier && buyingCfg && (
          <div
            className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4"
            onClick={() => !confirming && setBuyingTier(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
              style={{ boxShadow: `0 0 48px ${buyingCfg.color}33` }}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-black text-white">{buyingCfg.name}</h3>
                  <p className="text-[10px] font-mono text-zinc-500">
                    {buyingCfg.rarity.toUpperCase()} · {buyingCfg.hashPower} TH/s
                  </p>
                </div>
                <MinerVisual tier={buyingTier} size={120} active color={buyingCfg.color} />
              </div>

              {buyingCfg.priceRitual === 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-zinc-300">
                    This free miner should already be in your inventory.
                  </p>
                  <Button
                    onClick={() => setBuyingTier(null)}
                    className="w-full bg-zinc-800 hover:bg-zinc-700 text-white"
                  >
                    Close
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Payment info */}
                  <div className="rounded-lg border border-zinc-800 bg-black/40 p-3 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-500 font-mono">AMOUNT</span>
                      <span className="text-white font-mono font-bold">
                        {buyingCfg.priceRitual} RITUAL
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-500 font-mono">FROM</span>
                      <span className="text-zinc-300 font-mono">
                        {walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-zinc-800">
                      <div className="text-[10px] font-mono text-zinc-500 mb-1">
                        SEND TO (Ritual protocol address)
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-[10px] font-mono text-emerald-400 break-all">
                          {RITUAL_RECEIVER_ADDRESS}
                        </code>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={copyAddress}
                          className="size-7 text-zinc-400 hover:text-white"
                        >
                          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* tx hash input */}
                  <div>
                    <label className="text-[10px] font-mono text-zinc-500 mb-1 block">
                      PASTE TX HASH (optional · auto-mock if empty)
                    </label>
                    <input
                      value={txHash}
                      onChange={(e) => setTxHash(e.target.value)}
                      placeholder="0x...txhash"
                      className="w-full rounded-md bg-black border border-zinc-800 px-3 py-2 text-xs font-mono text-white placeholder:text-zinc-700 focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>

                  <Button
                    onClick={confirmPurchase}
                    disabled={confirming}
                    className="w-full h-11 font-bold"
                    style={{ background: buyingCfg.color, color: "#000" }}
                  >
                    {confirming ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Check className="size-4" />
                    )}
                    I&apos;VE PAID · ACTIVATE MINER
                  </Button>

                  <p className="text-[10px] text-zinc-600 font-mono text-center leading-relaxed">
                    Demo mode: clicking activate will instantly unlock the miner.
                    <br />
                    For real on-chain payment, send RITUAL to the address above
                    and paste your tx hash.
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
