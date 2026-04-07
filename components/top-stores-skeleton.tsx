/** Placeholder grid while stores load (e.g. future async / Suspense). */
export function TopStoresSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="flex gap-4">
            <div className="size-[72px] shrink-0 rounded-full bg-slate-200 dark:bg-slate-700" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-5 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-3 w-1/2 rounded bg-muted" />
              <div className="h-4 w-24 rounded bg-muted" />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="h-3 w-full rounded bg-muted" />
            <div className="h-3 w-4/5 rounded bg-muted" />
          </div>
          <div className="mt-5 flex gap-2">
            <div className="h-10 flex-1 rounded-xl bg-muted" />
            <div className="h-10 flex-1 rounded-xl bg-slate-200 dark:bg-slate-700" />
          </div>
        </div>
      ))}
    </div>
  );
}
