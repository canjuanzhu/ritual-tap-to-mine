"use client";

import { useSession } from "@/lib/store";
import { LoginScreen } from "@/components/login-screen";
import { MiningDashboard } from "@/components/mining-dashboard";

export default function Home() {
  const user = useSession((s) => s.user);

  if (!user) return <LoginScreen />;
  return <MiningDashboard />;
}
