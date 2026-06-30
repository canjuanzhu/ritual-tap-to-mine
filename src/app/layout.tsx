import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ritual · Tap-to-Mine — Gen Z's Own Bitcoin Miner",
  description:
    "Tap your phone, mine Ritual BTC. 5 ritual miners, bitcoin-style halving economy, off-chain points. Open the rig, link your wallet, start mining.",
  keywords: [
    "Ritual",
    "Ritual.net",
    "Tap to Mine",
    "Bitcoin Miner",
    "Ritual BTC",
    "Web3 Game",
    "Move to Earn",
    "Gen Z Crypto",
  ],
  authors: [{ name: "Ritual Mining Protocol" }],
  openGraph: {
    title: "Ritual · Tap-to-Mine",
    description: "Gen Z's own bitcoin miner. Tap the rig, earn Ritual BTC.",
    siteName: "Ritual",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ritual · Tap-to-Mine",
    description: "Gen Z's own bitcoin miner. Tap the rig, earn Ritual BTC.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black text-white`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
