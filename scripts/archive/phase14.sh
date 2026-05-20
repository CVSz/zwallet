#!/usr/bin/env bash
set -euo pipefail

cd /opt/zwallet

echo "=================================================="
echo "Phase 14 — React/Next.js Web3 Frontend Migration"
echo "=================================================="

############################################
# CREATE NEXT APP
############################################

echo
echo "== Create Next.js app =="

mkdir -p apps

if [ ! -d apps/web ]; then
  pnpm dlx create-next-app@latest apps/web \
    --ts \
    --tailwind \
    --eslint \
    --app \
    --src-dir \
    --use-pnpm \
    --no-import-alias
fi

cd apps/web

############################################
# INSTALL WEB3/UI STACK
############################################

echo
echo "== Install frontend dependencies =="

pnpm add \
  framer-motion \
  lucide-react \
  recharts \
  zustand \
  @tanstack/react-query \
  axios \
  clsx \
  tailwind-merge \
  class-variance-authority \
  next-themes \
  socket.io-client \
  date-fns \
  react-hot-toast \
  viem \
  wagmi \
  @rainbow-me/rainbowkit \
  @walletconnect/modal \
  ethers

echo
echo "== Install shadcn dependencies =="

pnpm add \
  tailwindcss-animate \
  class-variance-authority

############################################
# SHADCN INIT
############################################

echo
echo "== Initialize shadcn/ui =="

yes | pnpm dlx shadcn@latest init

############################################
# CREATE STRUCTURE
############################################

echo
echo "== Create architecture =="

mkdir -p \
src/components/layout \
src/components/dashboard \
src/components/treasury \
src/components/wallet \
src/components/defi \
src/components/nft \
src/components/governance \
src/components/charts \
src/components/activity \
src/components/providers \
src/components/ui \
src/lib \
src/store \
src/hooks \
src/styles \
src/services \
src/types \
src/app/dashboard \
src/app/transfers \
src/app/wallets \
src/app/treasury \
src/app/defi \
src/app/nft \
src/app/governance \
public/images

############################################
# TAILWIND THEME
############################################

echo
echo "== Configure Tailwind =="

cat > tailwind.config.ts <<'EOF'
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],

  content: [
    "./src/**/*.{ts,tsx}",
  ],

  theme: {
    extend: {

      colors: {
        background: "#020617",
        panel: "#0f172a",
        primary: "#38bdf8",
        secondary: "#8b5cf6",
        success: "#22c55e",
        warning: "#f59e0b",
        danger: "#ef4444",
      },

      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
      },

      boxShadow: {
        glow: "0 0 30px rgba(56,189,248,.25)",
      },

      backgroundImage: {
        mesh:
          "radial-gradient(circle at top left,#0f172a,#020617 45%)",
      },

      animation: {
        float: "float 6s ease-in-out infinite",
      },

      keyframes: {
        float: {
          "0%,100%": {
            transform: "translateY(0px)",
          },

          "50%": {
            transform: "translateY(-8px)",
          },
        },
      },
    },
  },

  plugins: [
    require("tailwindcss-animate"),
  ],
};

export default config;
EOF

############################################
# GLOBAL CSS
############################################

echo
echo "== Create global styles =="

cat > src/app/globals.css <<'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

html,
body{
  background:#020617;
  color:white;
}

body{
  min-height:100vh;
  background:
    radial-gradient(circle at top left,#0f172a,#020617 45%);
}

*{
  border-color:rgba(255,255,255,.06);
}

.glass{
  background:rgba(15,23,42,.72);
  backdrop-filter:blur(18px);
  border:1px solid rgba(255,255,255,.08);
}

.metric-card{
  @apply glass rounded-2xl p-6 shadow-2xl;
}

.sidebar-link{
  @apply flex items-center gap-3 rounded-xl px-4 py-3 text-slate-400 transition-all hover:bg-sky-500/10 hover:text-white;
}
EOF

############################################
# WAGMI PROVIDER
############################################

echo
echo "== Create wallet provider =="

cat > src/components/providers/wallet-provider.tsx <<'EOF'
"use client";

import "@rainbow-me/rainbowkit/styles.css";

import {
  RainbowKitProvider,
  getDefaultConfig,
} from "@rainbow-me/rainbowkit";

import {
  WagmiProvider,
} from "wagmi";

import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

import {
  mainnet,
  polygon,
  arbitrum,
  optimism,
} from "wagmi/chains";

const config = getDefaultConfig({
  appName: "zWallet",
  projectId: "zwallet-dev",
  chains: [
    mainnet,
    polygon,
    arbitrum,
    optimism,
  ],
});

const queryClient =
  new QueryClient();

export function WalletProvider({
  children,
}:{
  children: React.ReactNode;
}){

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
EOF

############################################
# ROOT LAYOUT
############################################

echo
echo "== Create root layout =="

cat > src/app/layout.tsx <<'EOF'
import "./globals.css";

import {
  WalletProvider,
} from "@/components/providers/wallet-provider";

export default function RootLayout({
  children,
}:{
  children: React.ReactNode;
}){

  return (
    <html lang="en">
      <body>
        <WalletProvider>
          {children}
        </WalletProvider>
      </body>
    </html>
  );
}
EOF

############################################
# SIDEBAR
############################################

echo
echo "== Create sidebar =="

cat > src/components/layout/sidebar.tsx <<'EOF'
"use client";

import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  Shield,
  Landmark,
  Image,
  Vote,
} from "lucide-react";

export function Sidebar(){

  const links = [
    {
      label:"Dashboard",
      icon:LayoutDashboard,
    },
    {
      label:"Wallets",
      icon:Wallet,
    },
    {
      label:"Transfers",
      icon:ArrowLeftRight,
    },
    {
      label:"Treasury",
      icon:Landmark,
    },
    {
      label:"DeFi",
      icon:Shield,
    },
    {
      label:"NFT",
      icon:Image,
    },
    {
      label:"Governance",
      icon:Vote,
    },
  ];

  return (
    <aside className="w-[260px] border-r border-white/5 bg-black/20 backdrop-blur-xl p-6">
      <div className="mb-10 text-3xl font-black">
        zWallet
      </div>

      <nav className="flex flex-col gap-2">
        {links.map((item)=>{

          const Icon = item.icon;

          return (
            <a
              key={item.label}
              href="#"
              className="sidebar-link"
            >
              <Icon size={18} />
              {item.label}
            </a>
          );
        })}
      </nav>
    </aside>
  );
}
EOF

############################################
# DASHBOARD METRIC CARD
############################################

echo
echo "== Create metric card =="

cat > src/components/dashboard/metric-card.tsx <<'EOF'
"use client";

import { motion } from "framer-motion";

export function MetricCard({
  title,
  value,
}:{
  title:string;
  value:string|number;
}){

  return (
    <motion.div
      whileHover={{
        y:-4,
      }}
      className="metric-card"
    >
      <div className="text-sm text-slate-400">
        {title}
      </div>

      <div className="mt-3 text-4xl font-black">
        {value}
      </div>
    </motion.div>
  );
}
EOF

############################################
# DASHBOARD PAGE
############################################

echo
echo "== Create dashboard =="

cat > src/app/page.tsx <<'EOF'
"use client";

import {
  ConnectButton,
} from "@rainbow-me/rainbowkit";

import {
  Sidebar,
} from "@/components/layout/sidebar";

import {
  MetricCard,
} from "@/components/dashboard/metric-card";

export default function HomePage(){

  return (
    <div className="flex min-h-screen">

      <Sidebar />

      <main className="flex-1 p-8">

        <div className="mb-10 flex items-center justify-between">

          <div>
            <h1 className="text-5xl font-black">
              Treasury Control Plane
            </h1>

            <p className="mt-2 text-slate-400">
              Institutional multi-chain operations
            </p>
          </div>

          <ConnectButton />
        </div>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">

          <MetricCard
            title="Portfolio Value"
            value="$12.8M"
          />

          <MetricCard
            title="Pending Transfers"
            value="18"
          />

          <MetricCard
            title="Wallet Accounts"
            value="42"
          />

          <MetricCard
            title="Treasury Balance"
            value="$6.1M"
          />

        </section>

      </main>

    </div>
  );
}
EOF

############################################
# WEBSOCKET CLIENT
############################################

echo
echo "== Create websocket service =="

cat > src/services/ws.ts <<'EOF'
import { io } from "socket.io-client";

export const socket =
  io(
    process.env.NEXT_PUBLIC_WS_URL ||
    "wss://admin-wallet.zeaz.dev",
    {
      transports:["websocket"],
    }
  );
EOF

############################################
# ZUSTAND STORE
############################################

echo
echo "== Create app store =="

cat > src/store/app-store.ts <<'EOF'
import { create } from "zustand";

interface AppState {

  sidebarOpen:boolean;

  setSidebarOpen:(v:boolean)=>void;
}

export const useAppStore =
  create<AppState>((set)=>({

    sidebarOpen:true,

    setSidebarOpen:(v)=>
      set({
        sidebarOpen:v,
      }),
  }));
EOF

############################################
# API CLIENT
############################################

echo
echo "== Create API client =="

cat > src/lib/api.ts <<'EOF'
import axios from "axios";

export const api =
  axios.create({
    baseURL:
      process.env.NEXT_PUBLIC_API_URL ||
      "https://admin-wallet.zeaz.dev",
  });
EOF

############################################
# NEXT ENV
############################################

echo
echo "== Create env =="

cat > .env.local <<'EOF'
NEXT_PUBLIC_API_URL=https://admin-wallet.zeaz.dev
NEXT_PUBLIC_WS_URL=wss://admin-wallet.zeaz.dev
EOF

############################################
# PACKAGE JSON PATCH
############################################

echo
echo "== Patch scripts =="

node <<'EOF'
const fs = require("fs");

const path = "package.json";

const pkg =
  JSON.parse(
    fs.readFileSync(path,"utf8")
  );

pkg.scripts.dev = "next dev";
pkg.scripts.build = "next build";
pkg.scripts.start = "next start";

fs.writeFileSync(
  path,
  JSON.stringify(pkg,null,2)
);
EOF

############################################
# BUILD
############################################

echo
echo "== Build frontend =="

pnpm build

############################################
# SYSTEMD SERVICE
############################################

echo
echo "== Create systemd service =="

sudo tee /etc/systemd/system/zwallet-web.service >/dev/null <<EOF
[Unit]
Description=zWallet Web Frontend
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/zwallet/apps/web
ExecStart=/usr/bin/pnpm start
Restart=always
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
EOF

############################################
# ENABLE SERVICE
############################################

echo
echo "== Enable service =="

sudo systemctl daemon-reload
sudo systemctl enable zwallet-web
sudo systemctl restart zwallet-web

############################################
# STATUS
############################################

echo
echo "== Frontend status =="

sudo systemctl status zwallet-web --no-pager

echo
echo "=================================================="
echo "Phase 14 React Web3 frontend COMPLETE"
echo "=================================================="
