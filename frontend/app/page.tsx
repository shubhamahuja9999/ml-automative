import Link from "next/link";
import { ArrowRight, Gauge, LineChart, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    icon: Gauge,
    title: "Instant valuations",
    body: "A Random Forest trained on ~25,000 UK listings returns a resale estimate, confidence band and value index in milliseconds.",
  },
  {
    icon: Sparkles,
    title: "Explainable by design",
    body: "Every estimate ships with signed value drivers — see exactly why a vehicle is priced where it is.",
  },
  {
    icon: LineChart,
    title: "Market context",
    body: "Benchmark against comparable listings with depreciation curves and a live Below-Market / Fair / Premium meter.",
  },
  {
    icon: ShieldCheck,
    title: "Built for decisions",
    body: "Compare two vehicles side by side and run live What-If scenarios on mileage, age and engine size.",
  },
];

export default function LandingPage() {
  return (
    <main className="relative mx-auto max-w-6xl px-6 py-10">
      {/* Top bar */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-lg border border-amber/40 bg-graphite-700 text-amber shadow-[0_0_18px_rgba(255,158,44,0.25)]">
            ◈
          </span>
          <span className="font-display text-sm font-extrabold tracking-wide">
            VEHICLE INTELLIGENCE <span className="text-amber">CONSOLE</span>
          </span>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/console">Launch console</Link>
        </Button>
      </header>

      {/* Hero */}
      <section className="grid items-center gap-10 py-20 md:grid-cols-2 md:py-28">
        <div className="animate-fade-up">
          <div className="eyebrow mb-4">Resale valuation · Volkswagen Group</div>
          <h1 className="font-display text-5xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">
            Price any used car with{" "}
            <span className="text-amber-gradient">cockpit-grade</span> precision.
          </h1>
          <p className="mt-6 max-w-md text-lg text-muted-foreground">
            An explainable pricing platform for used Volkswagen &amp; Audi
            vehicles — instant valuations, market positioning and live scenario
            modelling in one console.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/console">
                Open the console <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <div className="flex items-center gap-6 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-2.5">
              <Stat k="R²" v="0.95" />
              <Stat k="MAE" v="£1,438" />
              <Stat k="Listings" v="25k" />
            </div>
          </div>
        </div>

        {/* Decorative gauge */}
        <div className="relative mx-auto hidden md:block">
          <div className="absolute inset-0 -z-10 rounded-full bg-amber/20 blur-[90px]" />
          <HeroGauge />
        </div>
      </section>

      {/* Features */}
      <section className="grid gap-5 pb-24 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f) => (
          <div key={f.title} className="glass p-6 transition-transform hover:-translate-y-1">
            <f.icon className="h-6 w-6 text-amber" />
            <h3 className="mt-4 font-display text-lg font-bold">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-white/10 py-8 text-center font-mono text-xs text-muted-foreground/70">
        Estimates are for internal pricing reference only. Volkswagen and Audi
        are trademarks of Volkswagen AG; this is an independent tool.
      </footer>
    </main>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="text-center">
      <div className="font-display text-lg font-extrabold text-foreground">{v}</div>
      <div className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-muted-foreground">
        {k}
      </div>
    </div>
  );
}

function HeroGauge() {
  const ARC = 376.99;
  return (
    <svg viewBox="0 0 200 200" className="w-[340px]">
      <defs>
        <linearGradient id="heroGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff8a00" />
          <stop offset="1" stopColor="#ffd27a" />
        </linearGradient>
      </defs>
      <g transform="rotate(135 100 100)">
        <circle cx="100" cy="100" r="80" fill="none" strokeWidth="14"
          strokeLinecap="round" stroke="rgba(255,255,255,0.07)" strokeDasharray={`${ARC} 999`} />
        <circle cx="100" cy="100" r="80" fill="none" strokeWidth="14"
          strokeLinecap="round" stroke="url(#heroGrad)" strokeDasharray={`${ARC * 0.74} 999`}
          style={{ filter: "drop-shadow(0 0 10px rgba(255,158,44,0.55))" }} />
      </g>
      <text x="100" y="98" textAnchor="middle" className="fill-white font-display"
        style={{ fontSize: 30, fontWeight: 800 }}>£23,510</text>
      <text x="100" y="120" textAnchor="middle" className="fill-amber font-mono" style={{ fontSize: 11 }}>
        VALUE INDEX 75
      </text>
    </svg>
  );
}
