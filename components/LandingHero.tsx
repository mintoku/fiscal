"use client";

import Image from "next/image";
import Link from "next/link";

type LandingHeroProps = {
  onStart: () => void;
};

export default function LandingHero({ onStart }: LandingHeroProps) {
  return (
    <section className="relative flex min-h-[100dvh] flex-col overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--green-soft)_0%,_transparent_55%),linear-gradient(180deg,_#eef3ef_0%,_var(--background)_40%,_var(--background)_100%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-border"
      />

      <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center gap-10 px-5 pt-16 sm:px-8 lg:gap-12 lg:pt-20">
        <div className="flex max-w-2xl flex-col gap-5">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-green">
            Your financial snapshot
          </p>
          <h1 className="font-display text-5xl tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            Fiscal
          </h1>
          <p className="max-w-lg text-lg leading-relaxed text-muted sm:text-xl">
            See how Bank of America checking and credit-card exports become a
            clear picture of income, expenses, and transfers — starting with
            sample data.
          </p>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={onStart}
              className="w-full bg-green px-8 py-4 text-base font-semibold tracking-wide text-white shadow-sm transition-colors hover:bg-green-mid sm:w-auto sm:min-w-[14rem]"
            >
              Try the demo
            </button>
            <p className="text-xs leading-relaxed text-muted sm:max-w-xs">
              Explore with sample transactions. Upload your own files afterward
              in your workspace.
            </p>
          </div>
          <p className="text-sm text-muted">
            Already know the drill?{" "}
            <Link
              href="/workspace"
              className="font-semibold text-green underline underline-offset-2 hover:text-green-mid"
            >
              Open your workspace
            </Link>
          </p>
        </div>

        <div className="relative -mx-5 sm:-mx-8">
          <Image
            src="/images/dashboard-preview.png"
            alt="Fiscal dashboard showing income, expenses, net cash flow, and a daily spending trend chart"
            width={2964}
            height={1764}
            priority
            unoptimized
            className="h-auto w-full"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[var(--background)] to-transparent sm:h-28"
          />
        </div>

        <ul className="grid max-w-4xl gap-4 pb-16 text-sm text-muted sm:grid-cols-3">
          <li className="border-t border-border pt-3">
            <p className="font-medium text-foreground">1 · Try the demo</p>
            <p className="mt-1 leading-relaxed">
              Start with demo checking and card transactions already loaded.
            </p>
          </li>
          <li className="border-t border-border pt-3">
            <p className="font-medium text-foreground">2 · Explore insights</p>
            <p className="mt-1 leading-relaxed">
              Categorize expenses, filter the dashboard, and review the
              transaction list.
            </p>
          </li>
          <li className="border-t border-border pt-3">
            <p className="font-medium text-foreground">3 · Use your files</p>
            <p className="mt-1 leading-relaxed">
              Open your workspace to upload statements and build a lasting
              ledger in the cloud.
            </p>
          </li>
        </ul>
      </div>
    </section>
  );
}
