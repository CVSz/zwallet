import React from "react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-9xl font-black text-indigo-500/20">404</h1>
      <div className="absolute flex flex-col items-center">
        <h2 className="text-4xl font-bold text-white mb-4">Void Detected</h2>
        <p className="text-slate-400 mb-8 max-w-md">
          The coordinates you've requested do not exist in the ZEA Protocol space-time.
        </p>
        <Link 
          href="/"
          className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-full hover:bg-indigo-500 transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)]"
        >
          RETURN TO DASHBOARD
        </Link>
      </div>
    </div>
  );
}
