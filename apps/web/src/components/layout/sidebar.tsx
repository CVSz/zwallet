"use client";

import { PanelLeftClose } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const NAV_ITEMS = ["Dashboard", "Wallets", "Treasury", "Transfers", "Risk", "Audit"];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-30 bg-slate-950/70 backdrop-blur-sm md:hidden",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
      />

      <aside
        className={cn(
          "fixed left-0 top-0 z-40 flex h-full w-72 flex-col border-r border-white/10 bg-slate-950/70 p-5 backdrop-blur-2xl transition-transform md:sticky md:z-20 md:w-64 md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-cyan-300/80">zWallet</p>
            <h2 className="text-xl font-bold text-slate-100">Control Plane</h2>
          </div>

          <Button variant="ghost" size="icon" className="md:hidden" onClick={onClose}>
            <PanelLeftClose className="h-5 w-5" />
            <span className="sr-only">Close menu</span>
          </Button>
        </div>

        <nav className="space-y-2">
          {NAV_ITEMS.map((item, index) => {
            const active = index === 0;

            return (
              <a
                key={item}
                href="#"
                className={cn(
                  "block rounded-xl px-4 py-3 text-sm transition",
                  active
                    ? "border border-cyan-300/30 bg-cyan-400/10 text-cyan-100"
                    : "border border-transparent text-slate-400 hover:border-white/10 hover:bg-white/5 hover:text-slate-200"
                )}
              >
                {item}
              </a>
            );
          })}
        </nav>

        <div className="mt-auto rounded-2xl border border-cyan-400/20 bg-cyan-500/5 p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/80">Security Tier</p>
          <p className="mt-2 text-sm text-cyan-100">MPC signing and chain simulation active.</p>
        </div>
      </aside>
    </>
  );
}
