"use client";

import { motion } from "framer-motion";
import { MinerTier } from "@/lib/miners";

interface MinerVisualProps {
  tier: MinerTier;
  size?: number; // width in px
  active?: boolean; // animate fans?
  color?: string;
}

// Tiers -> visual variant (more fins / LEDs for higher tiers)
const TIER_VISUALS: Record<
  MinerTier,
  { fins: number; ledCount: number; fanBlades: number; accent: string; bodyColor: string }
> = {
  S1: { fins: 6, ledCount: 2, fanBlades: 3, accent: "#9CA3AF", bodyColor: "#1f1f23" },
  S2: { fins: 7, ledCount: 3, fanBlades: 4, accent: "#34D399", bodyColor: "#1c2422" },
  S9: { fins: 9, ledCount: 4, fanBlades: 5, accent: "#22D3EE", bodyColor: "#1a2229" },
  S19: { fins: 11, ledCount: 5, fanBlades: 6, accent: "#A78BFA", bodyColor: "#201a2a" },
  S21: { fins: 13, ledCount: 6, fanBlades: 7, accent: "#F472B6", bodyColor: "#2a1a24" },
};

export function MinerVisual({
  tier,
  size = 220,
  active = true,
  color,
}: MinerVisualProps) {
  const v = TIER_VISUALS[tier];
  const accent = color || v.accent;
  const height = size * 0.62;

  return (
    <div
      className="relative"
      style={{ width: size, height }}
      aria-label={`${tier} miner`}
    >
      {/* Glow under rig */}
      <div
        className="absolute inset-x-4 -bottom-1 h-3 rounded-full blur-md opacity-60"
        style={{ background: accent }}
      />

      {/* Rig body — bitcoin ASIC-style rectangular box */}
      <div
        className="absolute inset-0 rounded-md border overflow-hidden"
        style={{
          background: `linear-gradient(180deg, ${v.bodyColor}, #0a0a0c)`,
          borderColor: `${accent}55`,
          boxShadow: `0 0 24px ${accent}22, inset 0 0 24px rgba(0,0,0,0.6)`,
        }}
      >
        {/* Top: LED strip + tier badge */}
        <div className="absolute top-0 inset-x-0 h-3 flex items-center justify-between px-2 border-b border-white/5">
          <div className="flex gap-1 items-center">
            {Array.from({ length: v.ledCount }).map((_, i) => (
              <motion.span
                key={i}
                className="inline-block rounded-full"
                style={{
                  width: 4,
                  height: 4,
                  background: accent,
                  boxShadow: `0 0 6px ${accent}`,
                }}
                animate={{ opacity: active ? [0.3, 1, 0.3] : 0.4 }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  delay: i * 0.18,
                }}
              />
            ))}
          </div>
          <span
            className="text-[8px] font-mono font-bold tracking-wider"
            style={{ color: accent }}
          >
            {tier}
          </span>
        </div>

        {/* Cooling fins (top half) */}
        <div className="absolute top-3 bottom-12 left-3 right-12 flex flex-col justify-between py-1">
          {Array.from({ length: v.fins }).map((_, i) => (
            <div
              key={i}
              className="h-px"
              style={{
                background: `linear-gradient(90deg, transparent, ${accent}33, transparent)`,
              }}
            />
          ))}
        </div>

        {/* Right side: fan */}
        <div
          className="absolute right-2 top-4 bottom-3 rounded-full border flex items-center justify-center overflow-hidden"
          style={{
            width: height * 0.55,
            borderColor: `${accent}44`,
            background: "radial-gradient(circle at 50% 50%, #14141a, #060608)",
          }}
        >
          <motion.div
            className="absolute inset-0"
            style={{ transformOrigin: "50% 50%" }}
            animate={active ? { rotate: 360 } : { rotate: 0 }}
            transition={
              active
                ? { duration: 1.2 / (v.fanBlades / 4), repeat: Infinity, ease: "linear" }
                : { duration: 0 }
            }
          >
            <svg viewBox="0 0 100 100" className="w-full h-full">
              {Array.from({ length: v.fanBlades }).map((_, i) => {
                const angle = (360 / v.fanBlades) * i;
                return (
                  <path
                    key={i}
                    d="M50 50 Q 60 20, 50 5 Q 40 20, 50 50 Z"
                    fill={accent}
                    opacity={0.7}
                    transform={`rotate(${angle} 50 50)`}
                  />
                );
              })}
              <circle cx="50" cy="50" r="6" fill={accent} />
              <circle cx="50" cy="50" r="3" fill="#000" />
            </svg>
          </motion.div>
        </div>

        {/* Bottom: hash rate ticker + status */}
        <div className="absolute bottom-0 inset-x-0 h-9 border-t border-white/5 bg-black/40 px-2 py-1 flex items-center justify-between">
          <span className="text-[8px] font-mono text-white/40">HASH</span>
          <motion.span
            className="text-[9px] font-mono font-bold"
            style={{ color: accent }}
            animate={active ? { opacity: [0.7, 1, 0.7] } : {}}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            {active ? "MINING" : "STANDBY"}
          </motion.span>
        </div>
      </div>

      {/* Antenna on top */}
      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-px h-2 bg-white/20" />
    </div>
  );
}
