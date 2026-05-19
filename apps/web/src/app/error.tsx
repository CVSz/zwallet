"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-xl rounded-2xl border border-rose-300/25 bg-rose-500/10 p-6 text-rose-100 backdrop-blur-xl">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <AlertTriangle className="h-5 w-5" />
          Dashboard error boundary
        </div>
        <p className="mt-3 text-sm text-rose-200/95">{error.message}</p>
        <Button className="mt-5" variant="secondary" onClick={reset}>
          Try again
        </Button>
      </div>
    </main>
  );
}
