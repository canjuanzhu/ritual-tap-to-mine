"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Twitter, Wallet, Zap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";

export function LoginScreen() {
  const { setUser } = useSession();
  const { toast } = useToast();
  const [twitterId, setTwitterId] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function connectWallet() {
    setConnecting(true);
    const eth = (window as unknown as { ethereum?: any }).ethereum;
    if (eth) {
      try {
        const accounts: string[] = await eth.request({
          method: "eth_requestAccounts",
        });
        if (accounts[0]) {
          setWalletAddress(accounts[0]);
          toast({ title: "Wallet connected", description: accounts[0].slice(0, 10) + "..." });
        }
      } catch {
        toast({
          title: "Wallet connection rejected",
          description: "Enter your wallet address manually below.",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "No wallet extension found",
        description: "Paste your 0x... address manually.",
      });
    }
    setConnecting(false);
  }

  async function submit() {
    if (!twitterId.trim() || !walletAddress.trim()) {
      toast({ title: "Missing info", description: "Twitter ID + wallet required.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ twitterId, walletAddress }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Login failed", description: data.error, variant: "destructive" });
        return;
      }
      setUser(data);
      toast({ title: "Welcome to Ritual", description: "Free S1 miner unlocked." });
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* ===== HERO IMAGE BACKGROUND ===== */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-40"
        style={{ backgroundImage: "url(/hero.png)" }}
      />
      {/* Dark gradient overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/90" />
      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(52,211,153,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(52,211,153,0.08) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          maskImage: "radial-gradient(ellipse at 50% 40%, black, transparent 75%)",
        }}
      />
      {/* Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-emerald-500/15 rounded-full blur-[120px] pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          {/* Logo */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 backdrop-blur mb-4">
              <Zap className="size-3 text-emerald-400" fill="currentColor" />
              <span className="text-[11px] font-mono text-emerald-300 tracking-widest">
                RITUAL · TAP-TO-MINE
              </span>
            </div>
            <h1 className="text-5xl font-black tracking-tighter text-white drop-shadow-lg">
              RITUAL<span className="text-emerald-400">.</span>
            </h1>
            <p className="mt-2 text-sm text-zinc-300 font-mono drop-shadow">
              Gen Z&apos;s own bitcoin miner
            </p>
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-zinc-700/60 bg-zinc-950/85 backdrop-blur-xl p-6 space-y-5 shadow-2xl">
            <div>
              <label className="flex items-center gap-2 text-xs font-mono text-zinc-400 mb-2">
                <Twitter className="size-3.5" /> TWITTER ID
              </label>
              <Input
                value={twitterId}
                onChange={(e) => setTwitterId(e.target.value)}
                placeholder="@yourhandle"
                className="bg-black border-zinc-800 font-mono text-white placeholder:text-zinc-600"
                autoFocus
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-xs font-mono text-zinc-400 mb-2">
                <Wallet className="size-3.5" /> WALLET ADDRESS
              </label>
              <Input
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="0x..."
                className="bg-black border-zinc-800 font-mono text-xs text-white placeholder:text-zinc-600"
              />
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full border-zinc-800 hover:bg-zinc-900 text-zinc-300"
                onClick={connectWallet}
                disabled={connecting}
              >
                {connecting ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Wallet className="size-3.5" />
                )}
                {connecting ? "Connecting..." : "Connect Wallet (MetaMask)"}
              </Button>
            </div>

            <Button
              onClick={submit}
              disabled={submitting}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold tracking-wide h-11"
            >
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}
              ENTER MINE
            </Button>

            <p className="text-[10px] text-zinc-600 font-mono text-center leading-relaxed">
              By entering you accept the Ritual Mining Protocol.
              <br />
              One Twitter ID + one wallet = one account.
            </p>
          </div>

          {/* Mini stats */}
          <div className="grid grid-cols-3 gap-2 mt-4 text-center">
            {[
              { label: "BLOCK / TAP", value: "50 RBTC" },
              { label: "HALVING", value: "21,000" },
              { label: "MAX SUPPLY", value: "21M RBTC" },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border border-zinc-800/60 bg-zinc-950/70 backdrop-blur py-2">
                <div className="text-[9px] text-zinc-500 font-mono">{s.label}</div>
                <div className="text-xs text-emerald-400 font-mono font-bold">{s.value}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
