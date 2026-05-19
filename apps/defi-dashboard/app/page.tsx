import React from "react";
import NextDynamic from "next/dynamic";

const DashboardContent = NextDynamic(() => import("./components/DashboardContent"), { ssr: false });

export const dynamic = "force-dynamic";

export default function DeFiDashboard() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-200 selection:bg-indigo-500/30">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-900/10 blur-[120px] rounded-full animate-pulse delay-700"></div>
      </div>

      <DashboardContent />
    </main>
  );
}
