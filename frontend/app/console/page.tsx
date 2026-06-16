"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";
import type { MetaResponse } from "@/lib/types";
import { Dashboard } from "@/components/console/dashboard";
import { Button } from "@/components/ui/button";

export default function ConsolePage() {
  const [meta, setMeta] = useState<MetaResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.meta().then(setMeta).catch((e) => setError(String(e)));
  }, []);

  return (
    <main className="mx-auto max-w-7xl px-5 py-6">
      {/* Status bar */}
      <header className="glass mb-6 flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg border border-amber/40 bg-graphite-700 text-amber shadow-[0_0_18px_rgba(255,158,44,0.25)]">
            ◈
          </span>
          <div>
            <div className="font-display text-sm font-extrabold tracking-wide">
              VEHICLE INTELLIGENCE <span className="text-amber">CONSOLE</span>
            </div>
            <div className="font-mono text-[0.62rem] tracking-[0.18em] text-muted-foreground">
              RESALE VALUATION · VOLKSWAGEN GROUP
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden items-center gap-2 font-mono text-[0.62rem] tracking-[0.16em] text-muted-foreground sm:flex">
            <span className="h-2 w-2 animate-pulse rounded-full bg-amber shadow-[0_0_10px_#ff9e2c]" />
            ENGINE ONLINE
          </span>
          <Button asChild variant="ghost" size="sm">
            <Link href="/">Home</Link>
          </Button>
        </div>
      </header>

      {error ? (
        <div className="glass flex items-center gap-3 p-6 text-sm text-muted-foreground">
          <AlertTriangle className="h-5 w-5 text-amber" />
          <div>
            <p className="font-semibold text-foreground">Backend unavailable.</p>
            <p>
              Set <code className="text-amber">NEXT_PUBLIC_API_URL</code> to your
              deployed FastAPI backend, or start it locally on port 8000.
            </p>
          </div>
        </div>
      ) : meta ? (
        <Dashboard meta={meta} />
      ) : (
        <div className="glass grid h-72 place-items-center p-6 font-mono text-sm text-muted-foreground">
          <span className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 animate-ping rounded-full bg-amber" />
            Connecting to valuation engine…
          </span>
        </div>
      )}

      <footer className="mt-8 text-center font-mono text-[0.7rem] text-muted-foreground/60">
        Estimates are for internal pricing reference only and are not a formal
        valuation.
      </footer>
    </main>
  );
}
