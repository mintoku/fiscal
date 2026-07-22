"use client";

import Image from "next/image";

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
            Turn Bank of America checking and credit-card exports into a clear
            picture of income, expenses, and transfers.
          </p>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={onStart}
              className="w-full bg-green px-8 py-4 text-base font-semibold tracking-wide text-white shadow-sm transition-colors hover:bg-green-mid sm:w-auto sm:min-w-[14rem]"
            >
              Start exploring
            </button>
            <p className="text-xs leading-relaxed text-muted sm:max-w-xs">
              Files stay in your browser. Only transaction descriptions are sent
              when you categorize.
            </p>
          </div>

          <p className="max-w-lg border border-warn/35 bg-warn-soft px-3 py-2 text-xs leading-relaxed text-warn">
            Temporary note: only Bank of America checking and credit-card CSV
            exports are supported right now.
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
            <p className="font-medium text-foreground">Explore a sample</p>
            <p className="mt-1 leading-relaxed">
              Start with demo checking and card transactions already loaded.
            </p>
          </li>
          <li className="border-t border-border pt-3">
            <p className="font-medium text-foreground">Smart categorization</p>
            <p className="mt-1 leading-relaxed">
              AI suggests expense categories in one click — you stay in control
              and can edit any label.
            </p>
          </li>
          <li className="border-t border-border pt-3">
            <p className="font-medium text-foreground">Use your own CSVs</p>
            <p className="mt-1 leading-relaxed">
              Clear the sample when ready and drop in your exports.
            </p>
          </li>
        </ul>
      </div>
    </section>
  );
}
