import Link from "next/link";

export default function TryItYourselfCta() {
  return (
    <section
      aria-labelledby="try-yourself-heading"
      className="border border-green/25 bg-green-soft/40 px-5 py-8 sm:px-8"
    >
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-green">
        When you&apos;re done
      </p>
      <h2
        id="try-yourself-heading"
        className="mt-2 font-display text-2xl tracking-tight text-foreground sm:text-3xl"
      >
        Ready to use your own statements?
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
        Upload your Bank of America CSVs in your workspace. Files are stored and
        processed in the cloud so your ledger persists beyond this browser
        session.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Link
          href="/workspace"
          className="inline-flex min-h-12 items-center justify-center bg-green px-8 py-3 text-base font-semibold tracking-wide text-white shadow-sm transition-colors hover:bg-green-mid"
        >
          Open your workspace
        </Link>
        <p className="text-xs leading-relaxed text-muted sm:max-w-xs">
          Cloud pipeline: secure upload, normalize transactions, then build your
          dashboard.
        </p>
      </div>
    </section>
  );
}
