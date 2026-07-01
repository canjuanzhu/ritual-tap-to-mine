"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Twitter, Wallet, Zap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";

// OKX wallet injects itself as window.okxwallet (ETH chain) — same EIP-1193 API
type EIP1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

declare global {
  interface Window {
    ethereum?: EIP1193Provider & { isMetaMask?: boolean; isOKXWallet?: boolean };
    okxwallet?: EIP1193Provider & { isOKXWallet?: boolean };
  }
}

export function LoginScreen() {
  const { setUser } = useSession();
  const { toast } = useToast();
  const [twitterId, setTwitterId] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [connectingWallet, setConnectingWallet] = useState<"metamask" | "okx" | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function connectWallet(type: "metamask" | "okx") {
    setConnectingWallet(type);
    try {
      let provider: EIP1193Provider | null = null;
      let label = "";

      if (type === "okx") {
        // OKX wallet injects as window.okxwallet (preferred) OR window.ethereum with isOKXWallet flag
        provider = window.okxwallet || (window.ethereum?.isOKXWallet ? window.ethereum : null);
        label = "OKX Wallet";
      } else {
        // MetaMask injects as window.ethereum (with isMetaMask flag)
        provider = window.ethereum || null;
        label = "MetaMask";
      }

      if (!provider) {
        toast({
          title: `${label} not found`,
          description: type === "okx"
            ? "Install OKX Wallet extension from okx.com/wallet, or paste your 0x... address manually."
            : "Install MetaMask extension, or paste your 0x... address manually.",
          variant: "destructive",
        });
        setConnectingWallet(null);
        return;
      }

      const accounts = await provider.request({ method: "eth_requestAccounts" }) as string[];
      if (accounts && accounts[0]) {
        setWalletAddress(accounts[0]);
        toast({
          title: `${label} connected`,
          description: accounts[0].slice(0, 8) + "..." + accounts[0].slice(-4),
        });
      }
    } catch (err) {
      toast({
        title: "Wallet connection rejected",
        description: "Enter your wallet address manually below.",
        variant: "destructive",
      });
    } finally {
      setConnectingWallet(null);
    }
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

              {/* Wallet connect buttons — MetaMask + OKX side by side */}
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-zinc-800 hover:bg-zinc-900 text-zinc-300 gap-1.5 h-9"
                  onClick={() => connectWallet("metamask")}
                  disabled={connectingWallet !== null}
                >
                  {connectingWallet === "metamask" ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <FoxIcon className="size-3.5" />
                  )}
                  <span className="text-[11px] font-mono">MetaMask</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-zinc-800 hover:bg-zinc-900 text-zinc-300 gap-1.5 h-9"
                  onClick={() => connectWallet("okx")}
                  disabled={connectingWallet !== null}
                >
                  {connectingWallet === "okx" ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <OKXIcon className="size-3.5" />
                  )}
                  <span className="text-[11px] font-mono">OKX Wallet</span>
                </Button>
              </div>
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

/* ===== Inline wallet brand icons (SVG) ===== */

function FoxIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20.5 4L13.5 9.2L14.8 5.8L20.5 4Z" fill="#E2761B"/>
      <path d="M3.5 4L10.4 9.25L9.2 5.8L3.5 4Z" fill="#E4761B"/>
      <path d="M18 16.3L16.15 19.1L20.1 20.2L21.25 16.4L18 16.3Z" fill="#E4761B"/>
      <path d="M2.75 16.4L3.9 20.2L7.85 19.1L6 16.3L2.75 16.4Z" fill="#E4761B"/>
      <path d="M7.6 11.4L6.5 13.1L10.4 13.3L10.25 9.05L7.6 11.4Z" fill="#E4761B"/>
      <path d="M16.4 11.4L13.7 9L13.6 13.3L17.5 13.1L16.4 11.4Z" fill="#E4761B"/>
      <path d="M7.85 19.1L10.1 18L8.15 16.45L7.85 19.1Z" fill="#E4761B"/>
      <path d="M13.9 18L16.15 19.1L15.85 16.45L13.9 18Z" fill="#E4761B"/>
      <path d="M16.15 19.1L13.9 18L14.1 19.65L14.05 20.15L16.15 19.1Z" fill="#D7C1B3"/>
      <path d="M7.85 19.1L9.95 20.15L9.9 19.65L10.1 18L7.85 19.1Z" fill="#D7C1B3"/>
      <path d="M10 15.4L8.1 14.85L9.45 14.25L10 15.4Z" fill="#233447"/>
      <path d="M14 15.4L14.55 14.25L15.9 14.85L14 15.4Z" fill="#233447"/>
      <path d="M7.85 19.1L8.15 16.45L6 16.4L7.85 19.1Z" fill="#CD6116"/>
      <path d="M15.85 16.45L16.15 19.1L18 16.4L15.85 16.45Z" fill="#CD6116"/>
      <path d="M10.4 13.3L6.5 13.1L8.1 14.85L10 15.4L10.4 13.3Z" fill="#E4751F"/>
      <path d="M13.6 13.3L14 15.4L15.9 14.85L17.5 13.1L13.6 13.3Z" fill="#E4751F"/>
      <path d="M10.4 13.3L10 15.4L10.45 17.7L10.6 13.85L10.4 13.3Z" fill="#F6851B"/>
      <path d="M13.6 13.3L13.4 13.85L13.55 17.7L14 15.4L13.6 13.3Z" fill="#F6851B"/>
      <path d="M14 15.4L13.55 17.7L13.9 18L15.85 16.45L14 15.4Z" fill="#F6851B"/>
      <path d="M10 15.4L8.15 16.45L10.1 18L10.45 17.7L10 15.4Z" fill="#F6851B"/>
      <path d="M9.95 20.15L10 19.65L9.85 19.5H8.05L9.95 20.15Z" fill="#C0AD9E"/>
      <path d="M14.05 20.15L15.95 19.5H14.15L14 19.65L14.05 20.15Z" fill="#C0AD9E"/>
      <path d="M14.1 19.65L13.9 18L10.1 18L9.9 19.65L10.05 19.5H9.95L14.05 19.5L14.1 19.65Z" fill="#763D16"/>
      <path d="M20.1 20.2L20.7 17.5L18.5 16.4L20.1 20.2Z" fill="#E4751F"/>
      <path d="M3.3 17.5L3.9 20.2L5.5 16.4L3.3 17.5Z" fill="#E4751F"/>
      <path d="M9.55 13.3L8.1 14.85L8.15 16.45L9.55 13.3Z" fill="#E4751F"/>
      <path d="M15.85 16.45L15.9 14.85L14.45 13.3L15.85 16.45Z" fill="#E4751F"/>
      <path d="M17.5 13.1L13.6 13.3L14.45 13.3L15.9 14.85L17.5 13.1Z" fill="#E4751F"/>
      <path d="M6.5 13.1L8.1 14.85L9.55 13.3L6.5 13.1Z" fill="#E4751F"/>
    </svg>
  );
}

function OKXIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="4" fill="#000"/>
      <path d="M9.5 6H6.5C6.224 6 6 6.224 6 6.5V17.5C6 17.776 6.224 18 6.5 18H9.5C9.776 18 10 17.776 10 17.5V14.5C10 14.224 10.224 14 10.5 14H13.5C13.776 14 14 14.224 14 14.5V17.5C14 17.776 14.224 18 14.5 18H17.5C17.776 18 18 17.776 18 17.5V6.5C18 6.224 17.776 6 17.5 6H14.5C14.224 6 14 6.224 14 6.5V9.5C14 9.776 13.776 10 13.5 10H10.5C10.224 10 10 9.776 10 9.5V6.5C10 6.224 9.776 6 9.5 6Z" fill="#fff"/>
    </svg>
  );
}
