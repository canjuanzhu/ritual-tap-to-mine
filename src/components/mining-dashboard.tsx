"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  Battery,
  Clock,
  Flame,
  Gift,
  Loader2,
  LogOut,
  Trophy,
  Zap,
  ChevronDown,
  Cpu,
  Gauge,
  TrendingUp,
  Sparkles,
  Wallet,
  Copy,
  Check,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/lib/store";
import { MinerVisual } from "./miner-visual";
import { MinerStore } from "./miner-store";
import {
  MinerTier,
  MINERS,
  formatSats,
  RITUAL_RECEIVER_ADDRESS,
} from "@/lib/miners";
import {
  formatDuration,
  getBlockRewardSats,
  MAX_ENERGY,
  ENERGY_REGEN_MS,
} from "@/lib/economy";

interface OwnedMiner {
  id: string;
  tier: MinerTier;
  hashPower: number;
  isFree: boolean;
  active: boolean;
  lastClaimAt: string;
}

interface Stats {
  user: {
    twitterId: string;
    walletAddress: string;
    totalRitualBtc: number;
    totalTaps: number;
    energy: number;
    maxEnergy: number;
    createdAt: string;
  };
  miners: OwnedMiner[];
  totalHashPower: number;
  pendingPassive: number;
  global: {
    blockHeight: number;
    halvingEra: number;
    blockRewardSats: number;
    blocksUntilHalving: number;
    nextHalvingBlock: number;
    totalSupplySats: number;
    maxSupplySats: number;
    circulatingPct: number;
  };
}

interface Record {
  id: string;
  minerTier: string;
  ritualBtcWon: number;
  action: string;
  blockHeight: number;
  createdAt: string;
}

interface LeaderEntry {
  rank: number;
  twitterId: string;
  totalRitualBtc: number;
  totalTaps: number;
  isYou?: boolean;
}

interface FloatingReward {
  id: number;
  amount: number;
  x: number;
  y: number;
}

const REFRESH_INTERVAL = 5000; // 5s for passive income + energy

export function MiningDashboard() {
  const { user, logout } = useSession();
  const { toast } = useToast();
  const [stats, setStats] = useState<Stats | null>(null);
  const [records, setRecords] = useState<Record[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([]);
  const [activeMinerId, setActiveMinerId] = useState<string | null>(null);
  const [showStore, setShowStore] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showRecords, setShowRecords] = useState(false);
  const [hasSeenStoreIntro, setHasSeenStoreIntro] = useState(false);
  const [tapping, setTapping] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [floatingRewards, setFloatingRewards] = useState<FloatingReward[]>([]);
  const [nextEnergyMs, setNextEnergyMs] = useState(0);
  const [halvingFlash, setHalvingFlash] = useState(false);
  const [walletMenuOpen, setWalletMenuOpen] = useState(false);
  const [walletCopied, setWalletCopied] = useState(false);
  const rewardIdRef = useRef(0);
  const lastEnergyRef = useRef({ at: Date.now(), energy: 100 });
  const tapLockRef = useRef(false);

  const userId = user?.userId || "";

  // initial load
  const loadStats = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/stats?userId=${userId}`);
      // AUTO-RECOVERY: if user not found (stale session from old memory-store era),
      // clear localStorage and force re-login instead of spinning forever
      if (res.status === 404) {
        console.warn("[ritual] User not found in DB, clearing stale session");
        logout();
        return;
      }
      if (!res.ok) return;
      const data: Stats = await res.json();
      setStats(data);
      // set active miner if not yet
      if (!activeMinerId && data.miners.length > 0) {
        // pick the highest-tier miner as default
        const sorted = [...data.miners].sort(
          (a, b) =>
            MINERS[b.tier].hashPower - MINERS[a.tier].hashPower
        );
        setActiveMinerId(sorted[0].id);
      }
      lastEnergyRef.current = { at: Date.now(), energy: data.user.energy };
    } catch {
      // silent
    }
  }, [userId, activeMinerId, logout]);

  const loadRecords = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/records?userId=${userId}&limit=30`);
      if (res.ok) setRecords((await res.json()).records);
    } catch {}
  }, [userId]);

  const loadLeaderboard = useCallback(async () => {
    try {
      const res = await fetch(`/api/leaderboard?limit=20`);
      if (!res.ok) return;
      const data = await res.json();
      const lb: LeaderEntry[] = data.leaderboard.map((e: LeaderEntry) => ({
        ...e,
        isYou: e.twitterId === user?.twitterId,
      }));
      setLeaderboard(lb);
    } catch {}
  }, [user?.twitterId]);

  useEffect(() => {
    loadStats();
    loadRecords();
    loadLeaderboard();
  }, [loadStats, loadRecords, loadLeaderboard]);

  // ===== FIRST-LOGIN STORE INTRO =====
  // After login, auto-open the miner store so user picks/sees their miner first.
  // Only show once per Twitter handle (tracked in localStorage).
  useEffect(() => {
    if (!stats || showStore) return;
    const twitterId = stats.user.twitterId;
    const seenKey = `ritual-store-intro-${twitterId}`;
    const hasSeen = localStorage.getItem(seenKey) === "1";
    if (!hasSeen) {
      setShowStore(true);
      setHasSeenStoreIntro(true);
      localStorage.setItem(seenKey, "1");
    }
  }, [stats, showStore]);

  // periodic refresh
  useEffect(() => {
    const id = setInterval(() => {
      loadStats();
    }, REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [loadStats]);

  // energy countdown ticker
  useEffect(() => {
    const id = setInterval(() => {
      if (!stats) return;
      const elapsed = Date.now() - lastEnergyRef.current.at;
      const regenerated = Math.floor(elapsed / ENERGY_REGEN_MS);
      const currentEnergy = Math.min(
        MAX_ENERGY,
        lastEnergyRef.current.energy + regenerated
      );
      if (currentEnergy < MAX_ENERGY) {
        const remainder = elapsed % ENERGY_REGEN_MS;
        setNextEnergyMs(ENERGY_REGEN_MS - remainder);
      } else {
        setNextEnergyMs(0);
      }
    }, 250);
    return () => clearInterval(id);
  }, [stats]);

  // tap to mine
  async function tap(e?: React.MouseEvent) {
    if (tapLockRef.current || !stats || !activeMinerId) return;
    tapLockRef.current = true;
    setTapping(true);

    // optimistic energy decrement
    const optimisticEnergy = Math.max(0, stats.user.energy - 1);
    setStats({
      ...stats,
      user: { ...stats.user, energy: optimisticEnergy },
    });
    lastEnergyRef.current = { at: Date.now(), energy: optimisticEnergy };

    // floating reward preview position
    if (e) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const activeMiner = stats.miners.find((m) => m.id === activeMinerId);
      const previewAmt = activeMiner
        ? MINERS[activeMiner.tier].perTapReward
        : 5;
      const id = ++rewardIdRef.current;
      setFloatingRewards((prev) => [
        ...prev,
        { id, amount: previewAmt, x, y },
      ]);
      setTimeout(() => {
        setFloatingRewards((prev) => prev.filter((r) => r.id !== id));
      }, 1100);
    }

    try {
      const res = await fetch("/api/mine/tap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, minerId: activeMinerId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({
          title: "Out of energy",
          description: "Wait for regeneration or claim passive income.",
          variant: "destructive",
        });
        // revert optimistic
        setStats((s) =>
          s ? { ...s, user: { ...s.user, energy: data.energy ?? s.user.energy } } : s
        );
      } else {
        // correct floating reward amount to actual reward
        if (e) {
          const correctedId = rewardIdRef.current;
          setFloatingRewards((prev) =>
            prev.map((r) =>
              r.id === correctedId ? { ...r, amount: data.reward } : r
            )
          );
        }
        setStats((s) =>
          s
            ? {
                ...s,
                user: {
                  ...s.user,
                  totalRitualBtc: data.totalRitualBtc,
                  totalTaps: data.totalTaps,
                  energy: data.energy,
                },
                global: {
                  ...s.global,
                  blockHeight: data.blockHeight,
                  halvingEra: data.halvingEra,
                  blockRewardSats: data.blockReward,
                },
              }
            : s
        );
        lastEnergyRef.current = { at: Date.now(), energy: data.energy };
        if (data.justHalved) {
          setHalvingFlash(true);
          setTimeout(() => setHalvingFlash(false), 2500);
          toast({
            title: "HALVING EVENT",
            description: `Block reward cut to ${formatSats(data.blockReward)} per block!`,
          });
        }
        // refresh records occasionally
        if (data.totalTaps % 5 === 0) loadRecords();
      }
    } catch {
      // revert
      setStats((s) =>
        s ? { ...s, user: { ...s.user, energy: s.user.energy + 1 } } : s
      );
    } finally {
      setTapping(false);
      setTimeout(() => {
        tapLockRef.current = false;
      }, 60); // throttle to ~16 taps/sec
    }
  }

  async function claimPassive() {
    if (!stats || stats.pendingPassive <= 0) return;
    setClaiming(true);
    try {
      const res = await fetch("/api/mine/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Claim failed", description: data.error, variant: "destructive" });
        return;
      }
      if (data.reward > 0) {
        toast({
          title: "Passive income claimed",
          description: `+${formatSats(data.reward)} from idle miners`,
        });
        loadStats();
        loadRecords();
      } else {
        toast({ title: "Nothing to claim yet" });
      }
    } finally {
      setClaiming(false);
    }
  }

  function copyWallet() {
    if (!stats) return;
    navigator.clipboard.writeText(stats.user.walletAddress);
    setWalletCopied(true);
    setTimeout(() => setWalletCopied(false), 1500);
  }

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="size-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  const activeMiner = stats.miners.find((m) => m.id === activeMinerId);
  const activeCfg = activeMiner ? MINERS[activeMiner.tier] : MINERS.S1;
  const myRank =
    leaderboard.findIndex((l) => l.isYou) !== -1
      ? leaderboard.findIndex((l) => l.isYou) + 1
      : null;
  const shortWallet = `${stats.user.walletAddress.slice(0, 6)}...${stats.user.walletAddress.slice(-4)}`;

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Halving flash overlay */}
      <AnimatePresence>
        {halvingFlash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] pointer-events-none flex items-center justify-center"
          >
            <div className="absolute inset-0 bg-emerald-500/10" />
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              className="relative text-center"
            >
              <Sparkles className="size-16 text-emerald-400 mx-auto mb-2" />
              <h2 className="text-4xl font-black text-emerald-300 tracking-tighter">
                HALVING!
              </h2>
              <p className="text-emerald-200/70 font-mono text-sm mt-1">
                Block reward slashed in half
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(52,211,153,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(52,211,153,0.06) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          maskImage: "radial-gradient(ellipse at 50% 30%, black, transparent 70%)",
        }}
      />
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] pointer-events-none"
        style={{
          background: `radial-gradient(ellipse, ${activeCfg.color}22, transparent 70%)`,
        }}
      />

      {/* ===== STICKY TOP HEADER — Twitter avatar + Ritual BTC balance + wallet ===== */}
      <div className="sticky top-0 z-30 bg-black/95 backdrop-blur-md border-b border-zinc-900">
        <div className="max-w-md mx-auto px-3 py-2 flex items-center justify-between gap-2">
          {/* LEFT: Twitter avatar + handle + Ritual BTC balance */}
          <div className="flex items-center gap-2 min-w-0">
            {/* Twitter avatar (via unavatar.io — free, no API key) */}
            <div className="relative shrink-0">
              <img
                src={`https://unavatar.io/twitter/${stats.user.twitterId}?fallback=https://ui-avatars.com/api/?name=${stats.user.twitterId}&background=064e3b&color=34d399&size=64`}
                alt={`@${stats.user.twitterId}`}
                className="size-9 rounded-full border-2 border-emerald-500/40 object-cover bg-zinc-800"
                onError={(e) => {
                  // fallback to letter avatar if unavatar fails
                  const t = e.currentTarget;
                  t.src = `https://ui-avatars.com/api/?name=${stats.user.twitterId[0]?.toUpperCase() || "R"}&background=064e3b&color=34d399&size=64&bold=true`;
                }}
              />
              {/* online dot */}
              <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-400 border-2 border-black" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1 leading-tight">
                <span className="text-xs font-bold text-white truncate max-w-[100px]">
                  @{stats.user.twitterId}
                </span>
              </div>
              <div className="flex items-center gap-1 leading-tight">
                <Zap className="size-2.5 text-emerald-400 shrink-0" fill="currentColor" />
                <span className="text-sm font-black text-emerald-400 font-mono">
                  {formatSats(stats.user.totalRitualBtc)}
                </span>
                <span className="text-[8px] text-zinc-600 font-mono">RBTC</span>
              </div>
            </div>
          </div>

          {/* RIGHT: Wallet address button */}
          <div className="relative shrink-0">
            <button
              onClick={() => setWalletMenuOpen((v) => !v)}
              className="flex items-center gap-1.5 h-9 px-2.5 rounded-lg border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 hover:border-zinc-700 transition-colors"
            >
              <Wallet className="size-3.5 text-zinc-400" />
              <span className="text-[11px] font-mono text-zinc-300 hidden sm:inline">
                {shortWallet}
              </span>
              <span className="text-[11px] font-mono text-zinc-300 sm:hidden">
                {stats.user.walletAddress.slice(0, 4)}...{stats.user.walletAddress.slice(-2)}
              </span>
              {walletMenuOpen ? (
                <ChevronUp className="size-3 text-zinc-500" />
              ) : (
                <ChevronDown className="size-3 text-zinc-500" />
              )}
            </button>

            {/* Wallet dropdown */}
            {walletMenuOpen && (
              <>
                {/* Click-away catcher */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setWalletMenuOpen(false)}
                />
                <div className="absolute right-0 top-11 z-50 w-72 rounded-lg border border-zinc-800 bg-zinc-950 shadow-2xl p-3 space-y-3">
                  {/* Twitter profile */}
                  <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
                    <img
                      src={`https://unavatar.io/twitter/${stats.user.twitterId}?fallback=https://ui-avatars.com/api/?name=${stats.user.twitterId}&background=064e3b&color=34d399&size=64`}
                      alt={`@${stats.user.twitterId}`}
                      className="size-10 rounded-full border border-emerald-500/40 object-cover bg-zinc-800"
                      onError={(e) => {
                        const t = e.currentTarget;
                        t.src = `https://ui-avatars.com/api/?name=${stats.user.twitterId[0]?.toUpperCase() || "R"}&background=064e3b&color=34d399&size=64&bold=true`;
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-white truncate">
                        @{stats.user.twitterId}
                      </div>
                      <div className="text-[10px] text-emerald-400 font-mono">
                        {formatSats(stats.user.totalRitualBtc)} RBTC
                      </div>
                    </div>
                    <a
                      href={`https://twitter.com/${stats.user.twitterId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="size-7 rounded-md flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-900 shrink-0"
                      title="Open Twitter profile"
                    >
                      <ExternalLink className="size-3.5" />
                    </a>
                  </div>
                  {/* Wallet address */}
                  <div>
                    <div className="text-[9px] font-mono text-zinc-500 tracking-widest mb-1">
                      CONNECTED WALLET
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-[10px] font-mono text-emerald-400 break-all leading-tight">
                        {stats.user.walletAddress}
                      </code>
                      <button
                        onClick={copyWallet}
                        className="size-7 rounded-md flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-900 shrink-0"
                      >
                        {walletCopied ? (
                          <Check className="size-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-zinc-800">
                    <button
                      onClick={() => {
                        setWalletMenuOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center justify-center gap-1.5 text-[11px] font-mono font-bold text-zinc-300 hover:text-white bg-zinc-900 hover:bg-red-950/50 border border-zinc-800 hover:border-red-800 rounded-md py-2 transition-colors"
                    >
                      <LogOut className="size-3.5" /> EXIT TO LOGIN
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-md mx-auto px-4 pt-4 pb-32">
        {/* Mini status row (live + taps + rank) */}
        <div className="flex items-center justify-between mb-3 text-[10px] font-mono">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/5">
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-300 tracking-widest">LIVE</span>
          </div>
          <div className="flex items-center gap-3 text-zinc-500">
            <span>
              TAPS <span className="text-white font-bold">{stats.user.totalTaps.toLocaleString()}</span>
            </span>
            <span>
              HASH <span className="text-white font-bold">{stats.totalHashPower} TH/s</span>
            </span>
            <span>
              RANK <span className="text-emerald-400 font-bold">{myRank ? `#${myRank}` : "—"}</span>
            </span>
          </div>
        </div>

        {/* Mining arena */}
        <div className="relative rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-950/80 to-black p-4 mb-4">
          {/* Active miner selector */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Cpu className="size-3.5 text-zinc-500" />
              <span className="text-[10px] font-mono text-zinc-500 tracking-widest">
                ACTIVE MINER
              </span>
            </div>
            <div className="flex gap-1">
              {stats.miners.map((m) => {
                const cfg = MINERS[m.tier];
                const isActive = m.id === activeMinerId;
                return (
                  <button
                    key={m.id}
                    onClick={() => setActiveMinerId(m.id)}
                    className={`px-2 py-1 rounded-md text-[10px] font-mono font-bold transition-all ${
                      isActive
                        ? "bg-white text-black"
                        : "bg-zinc-900 text-zinc-500 hover:text-white"
                    }`}
                    style={
                      isActive
                        ? { background: cfg.color, color: "#000" }
                        : { borderColor: `${cfg.color}33` }
                    }
                  >
                    {m.tier}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tap zone */}
          <div className="relative flex flex-col items-center py-4">
            <motion.button
              onClick={tap}
              whileTap={{ scale: 0.94 }}
              disabled={stats.user.energy <= 0 || tapping}
              className="relative cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none"
              style={{ touchAction: "manipulation" }}
            >
              <MinerVisual
                tier={activeMiner.tier}
                size={240}
                active={stats.user.energy > 0}
                color={activeCfg.color}
              />
              {/* pulse ring on tap */}
              {tapping && (
                <motion.div
                  initial={{ scale: 1, opacity: 0.6 }}
                  animate={{ scale: 1.4, opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="absolute inset-0 rounded-md border-2"
                  style={{ borderColor: activeCfg.color }}
                />
              )}
            </motion.button>

            {/* floating rewards */}
            <AnimatePresence>
              {floatingRewards.map((r) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 1, y: 0, scale: 0.8 }}
                  animate={{ opacity: 0, y: -80, scale: 1.2 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.1, ease: "easeOut" }}
                  className="absolute pointer-events-none font-black text-lg"
                  style={{
                    left: r.x,
                    top: r.y,
                    color: activeCfg.color,
                    textShadow: `0 0 12px ${activeCfg.color}`,
                  }}
                >
                  +{formatSats(r.amount)}
                </motion.div>
              ))}
            </AnimatePresence>

            <p className="text-[10px] text-zinc-500 font-mono mt-3 tracking-widest text-center">
              {stats.user.energy > 0 ? (
                <>
                  TAP THE RIG TO MINE ·{" "}
                  <span style={{ color: activeCfg.color }}>
                    {activeCfg.perTapReward} SATS / TAP
                  </span>
                </>
              ) : (
                <span className="text-amber-400">OUT OF ENERGY · REGENERATING</span>
              )}
            </p>
          </div>

          {/* Energy bar */}
          <div className="mt-3">
            <div className="flex justify-between text-[10px] font-mono mb-1">
              <span className="text-zinc-500 flex items-center gap-1">
                <Battery className="size-3" /> ENERGY
              </span>
              <span className="text-zinc-400">
                {stats.user.energy}/{stats.user.maxEnergy}
                {stats.user.energy < stats.user.maxEnergy && (
                  <span className="text-zinc-600 ml-1">
                    · +1 in {formatDuration(nextEnergyMs)}
                  </span>
                )}
              </span>
            </div>
            <div className="h-2 rounded-full bg-zinc-900 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: `linear-gradient(90deg, ${activeCfg.color}, ${activeCfg.color}aa)`,
                  width: `${(stats.user.energy / stats.user.maxEnergy) * 100}%`,
                }}
                animate={{ width: `${(stats.user.energy / stats.user.maxEnergy) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        </div>

        {/* Passive income claim */}
        {stats.pendingPassive > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3 mb-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Gift className="size-4 text-amber-400" />
              <div>
                <div className="text-[10px] font-mono text-amber-300/70 tracking-widest">
                  PASSIVE INCOME READY
                </div>
                <div className="text-sm font-bold text-amber-300">
                  +{formatSats(stats.pendingPassive)}
                </div>
              </div>
            </div>
            <Button
              size="sm"
              onClick={claimPassive}
              disabled={claiming}
              className="bg-amber-400 hover:bg-amber-300 text-black font-bold h-8"
            >
              {claiming ? <Loader2 className="size-3.5 animate-spin" /> : "CLAIM"}
            </Button>
          </motion.div>
        )}

        {/* Global stats — bitcoin economy */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="size-3.5 text-emerald-400" />
              <span className="text-[10px] font-mono text-zinc-400 tracking-widest">
                GLOBAL NETWORK
              </span>
            </div>
            <span className="text-[9px] font-mono text-zinc-600">
              ERA #{stats.global.halvingEra}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <div className="text-[9px] font-mono text-zinc-600">BLOCK HEIGHT</div>
              <div className="text-base font-bold font-mono">
                #{stats.global.blockHeight.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-[9px] font-mono text-zinc-600">BLOCK REWARD</div>
              <div className="text-base font-bold font-mono text-emerald-400">
                {formatSats(stats.global.blockRewardSats)}
              </div>
            </div>
            <div>
              <div className="text-[9px] font-mono text-zinc-600">NEXT HALVING</div>
              <div className="text-sm font-bold font-mono">
                {stats.global.blocksUntilHalving.toLocaleString()} blocks
              </div>
            </div>
            <div>
              <div className="text-[9px] font-mono text-zinc-600">SUPPLY MINED</div>
              <div className="text-sm font-bold font-mono">
                {stats.global.circulatingPct.toFixed(4)}%
              </div>
            </div>
          </div>
          {/* supply progress */}
          <div className="h-1.5 rounded-full bg-zinc-900 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400"
              style={{ width: `${Math.max(0.1, stats.global.circulatingPct)}%` }}
            />
          </div>
          <div className="flex justify-between text-[9px] font-mono text-zinc-600 mt-1">
            <span>0</span>
            <span>21,000,000 RBTC CAP</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <Button
            variant="outline"
            onClick={() => setShowStore(true)}
            className="border-zinc-800 bg-zinc-950 hover:bg-zinc-900 text-white h-16 flex-col gap-1"
          >
            <Cpu className="size-4 text-emerald-400" />
            <span className="text-[10px] font-mono">STORE</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setShowRecords(true);
              loadRecords();
            }}
            className="border-zinc-800 bg-zinc-950 hover:bg-zinc-900 text-white h-16 flex-col gap-1"
          >
            <Activity className="size-4 text-cyan-400" />
            <span className="text-[10px] font-mono">RECORDS</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setShowLeaderboard(true);
              loadLeaderboard();
            }}
            className="border-zinc-800 bg-zinc-950 hover:bg-zinc-900 text-white h-16 flex-col gap-1"
          >
            <Trophy className="size-4 text-amber-400" />
            <span className="text-[10px] font-mono">RANK</span>
          </Button>
        </div>

        {/* Receiver address footer */}
        <div className="rounded-lg border border-zinc-900 bg-zinc-950/60 p-3">
          <div className="text-[9px] font-mono text-zinc-600 mb-1">
            RITUAL PROTOCOL · PAYMENT RECEIVER
          </div>
          <code className="text-[10px] font-mono text-emerald-400/80 break-all">
            {RITUAL_RECEIVER_ADDRESS}
          </code>
        </div>
      </div>

      {/* Store modal */}
      <AnimatePresence>
        {showStore && (
          <MinerStore
            userId={userId}
            walletAddress={stats.user.walletAddress}
            owned={stats.miners}
            tiers={Object.values(MINERS).map((m) => ({
              tier: m.tier,
              name: m.name,
              tagline: m.tagline,
              priceRitual: m.priceRitual,
              hashPower: m.hashPower,
              perTapReward: m.perTapReward,
              passivePerHour: m.passivePerHour,
              color: m.color,
              rarity: m.rarity,
            }))}
            onChanged={() => {
              loadStats();
              loadLeaderboard();
            }}
            onClose={() => {
              setShowStore(false);
              setHasSeenStoreIntro(false);
            }}
            isIntro={hasSeenStoreIntro}
          />
        )}
      </AnimatePresence>

      {/* Leaderboard modal */}
      <AnimatePresence>
        {showLeaderboard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowLeaderboard(false)}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-4 max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Trophy className="size-4 text-amber-400" /> LEADERBOARD
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowLeaderboard(false)}
                  className="size-7 text-zinc-500"
                >
                  ✕
                </Button>
              </div>
              <div className="space-y-1">
                {leaderboard.length === 0 && (
                  <div className="text-center text-xs text-zinc-500 font-mono py-8">
                    No miners yet. Be the first!
                  </div>
                )}
                {leaderboard.map((l) => (
                  <div
                    key={l.twitterId}
                    className={`flex items-center gap-3 rounded-md px-3 py-2 ${
                      l.isYou ? "bg-emerald-500/10 border border-emerald-500/30" : "bg-zinc-900/40"
                    }`}
                  >
                    <span
                      className={`text-sm font-mono font-bold w-6 ${
                        l.rank === 1
                          ? "text-amber-400"
                          : l.rank === 2
                          ? "text-zinc-300"
                          : l.rank === 3
                          ? "text-orange-700"
                          : "text-zinc-600"
                      }`}
                    >
                      {l.rank}
                    </span>
                    <span className="flex-1 text-sm font-mono text-white">
                      @{l.twitterId}
                      {l.isYou && (
                        <span className="ml-1 text-[9px] text-emerald-400">YOU</span>
                      )}
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      {formatSats(l.totalRitualBtc)}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Records modal */}
      <AnimatePresence>
        {showRecords && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowRecords(false)}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-4 max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Activity className="size-4 text-cyan-400" /> MINING RECORDS
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowRecords(false)}
                  className="size-7 text-zinc-500"
                >
                  ✕
                </Button>
              </div>
              {records.length === 0 ? (
                <div className="text-center text-xs text-zinc-500 font-mono py-8">
                  No mining records yet. Tap the rig!
                </div>
              ) : (
                <div className="space-y-1 max-h-[60vh] overflow-y-auto pr-1">
                  {records.map((r) => {
                    const cfg = MINERS[r.minerTier as MinerTier];
                    const color = cfg?.color || "#666";
                    return (
                      <div
                        key={r.id}
                        className="flex items-center gap-3 rounded-md bg-zinc-900/40 px-3 py-2"
                      >
                        <div
                          className="size-7 rounded-md flex items-center justify-center text-[10px] font-mono font-bold border"
                          style={{
                            color,
                            borderColor: `${color}55`,
                            background: `${color}11`,
                          }}
                        >
                          {r.minerTier.slice(0, 2)}
                        </div>
                        <div className="flex-1">
                          <div className="text-xs font-mono text-white">
                            {r.action === "tap"
                              ? "Tap mine"
                              : r.action === "auto"
                              ? "Passive claim"
                              : r.action}
                          </div>
                          <div className="text-[9px] font-mono text-zinc-600">
                            Block #{r.blockHeight.toLocaleString()} ·{" "}
                            {new Date(r.createdAt).toLocaleTimeString()}
                          </div>
                        </div>
                        <span
                          className="text-xs font-mono font-bold"
                          style={{ color }}
                        >
                          +{formatSats(r.ritualBtcWon)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
