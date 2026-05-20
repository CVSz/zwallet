"use client";
import React from 'react';
export const dynamic = "force-dynamic";

export default function GlobalErrorPage({ error }: { error?: Error }) {
  const message = error?.message ?? 'An unexpected error occurred.';
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-8">
      <div className="industrial-panel max-w-lg">
        <h1 className="text-4xl font-bold text-amber-500 mb-4">🚨 Global Error</h1>
        <p className="text-sm text-slate-300 mb-6">{message}</p>
        <button
          onClick={() => window.location.reload()}
          className="btn-industrial"
        >
          Reload Dashboard
        </button>
      </div>
    </div>
  );
}
