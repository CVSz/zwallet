#!/usr/bin/env bash
set -euo pipefail

cd /opt/zwallet

echo "=================================================="
echo "Phase 14 FIX — Next.js Web3 Frontend"
echo "=================================================="

############################################
# CLEAN FAILED APP
############################################

echo
echo "== Remove broken app =="

rm -rf apps/web

############################################
# CREATE APP MANUALLY
############################################

echo
echo "== Create app structure =="

mkdir -p apps/web

cd apps/web

cat > package.json <<'EOT'
{
  "name": "@zwallet/web",
  "private": true,
  "version": "0.1.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "@rainbow-me/rainbowkit": "^2.1.7",
    "@tanstack/react-query": "^5.59.0",
    "axios": "^1.7.7",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "date-fns": "^4.1.0",
    "ethers": "^6.13.4",
    "framer-motion": "^11.11.11",
    "lucide-react": "^0.453.0",
    "next": "^15.0.2",
    "next-themes": "^0.3.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-hot-toast": "^2.4.1",
    "recharts": "^2.13.0",
    "socket.io-client": "^4.8.1",
    "tailwind-merge": "^2.5.4",
    "tailwindcss-animate": "^1.0.7",
    "viem": "^2.21.44",
    "wagmi": "^2.12.25",
    "zustand": "^5.0.1"
  },
  "devDependencies": {
    "@types/node": "^22.8.7",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.14",
    "typescript": "^5.6.3"
  }
}
EOT

############################################
# BASIC FILES
############################################

echo
echo "== Create config files =="

cat > tsconfig.json <<'EOT'
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": false,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ]
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx"
  ],
  "exclude": ["node_modules"]
}
EOT

cat > next-env.d.ts <<'EOT'
/// <reference types="next" />
/// <reference types="next/image-types/global" />
EOT

cat > next.config.js <<'EOT'
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone"
};

module.exports = nextConfig;
EOT

cat > postcss.config.js <<'EOT'
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
EOT

cat > tailwind.config.ts <<'EOT'
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],

  content: [
    "./src/**/*.{ts,tsx}"
  ],

  theme: {
    extend: {}
  },

  plugins: [
    require("tailwindcss-animate")
  ]
};

export default config;
EOT

############################################
# APP STRUCTURE
############################################

echo
echo "== Create source =="

mkdir -p \
src/app \
src/components/layout \
src/components/dashboard

cat > src/app/globals.css <<'EOT'
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
  font-family:Arial,sans-serif;
}
EOT

cat > src/components/layout/sidebar.tsx <<'EOT'
export function Sidebar(){

  return (
    <aside className="w-[240px] border-r border-white/10 bg-black/20 p-6">
      <div className="mb-8 text-3xl font-black">
        zWallet
      </div>

      <nav className="flex flex-col gap-3">
        <a href="#" className="rounded-xl bg-sky-500/10 p-3">
          Dashboard
        </a>

        <a href="#" className="rounded-xl p-3 text-slate-400">
          Wallets
        </a>

        <a href="#" className="rounded-xl p-3 text-slate-400">
          Treasury
        </a>

        <a href="#" className="rounded-xl p-3 text-slate-400">
          DeFi
        </a>

        <a href="#" className="rounded-xl p-3 text-slate-400">
          NFT
        </a>
      </nav>
    </aside>
  );
}
EOT

cat > src/app/layout.tsx <<'EOT'
import "./globals.css";

export default function RootLayout({
  children,
}:{
  children: React.ReactNode;
}){

  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
EOT

cat > src/app/page.tsx <<'EOT'
import { Sidebar } from "@/components/layout/sidebar";

export default function HomePage(){

  return (
    <div className="flex min-h-screen">

      <Sidebar />

      <main className="flex-1 p-8">

        <div className="mb-10">
          <h1 className="text-5xl font-black">
            zWallet Treasury Control Plane
          </h1>

          <p className="mt-3 text-slate-400">
            Institutional multi-chain wallet infrastructure
          </p>
        </div>

        <div className="grid grid-cols-4 gap-6">

          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6">
            <div className="text-slate-400">
              Portfolio
            </div>

            <div className="mt-4 text-4xl font-black">
              $12.8M
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6">
            <div className="text-slate-400">
              Transfers
            </div>

            <div className="mt-4 text-4xl font-black">
              182
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6">
            <div className="text-slate-400">
              Wallets
            </div>

            <div className="mt-4 text-4xl font-black">
              42
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6">
            <div className="text-slate-400">
              Treasury
            </div>

            <div className="mt-4 text-4xl font-black">
              $6.1M
            </div>
          </div>

        </div>

      </main>

    </div>
  );
}
EOT

############################################
# WORKSPACE PATCH
############################################

echo
echo "== Ensure workspace =="

if ! grep -q "apps/web" /opt/zwallet/pnpm-workspace.yaml; then
  echo "  - 'apps/web'" >> /opt/zwallet/pnpm-workspace.yaml
fi

############################################
# INSTALL
############################################

echo
echo "== Install dependencies =="

cd /opt/zwallet

pnpm install

############################################
# BUILD
############################################

echo
echo "== Build =="

pnpm --filter @zwallet/web build

############################################
# SYSTEMD
############################################

echo
echo "== Create systemd =="

sudo tee /etc/systemd/system/zwallet-web.service >/dev/null <<'EOT'
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
EOT

############################################
# START
############################################

echo
echo "== Start frontend =="

sudo systemctl daemon-reload
sudo systemctl enable zwallet-web
sudo systemctl restart zwallet-web

sleep 5

############################################
# STATUS
############################################

echo
echo "== Status =="

sudo systemctl status zwallet-web --no-pager

echo
echo "=================================================="
echo "Phase 14 frontend fixed + running"
echo "=================================================="
