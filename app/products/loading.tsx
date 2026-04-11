export default function ProductsLoading() {
  return (
    <main className="mx-auto w-full min-w-0 max-w-brand px-3 py-5 text-foreground sm:px-6">
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,260px)_1fr] lg:gap-5">
        <aside className="hidden h-64 min-w-0 animate-pulse rounded-2xl border border-border bg-muted/40 lg:block" />
        <div className="min-w-0 space-y-4">
          <div className="flex flex-col gap-2 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="h-7 w-48 animate-pulse rounded-md bg-muted sm:h-8 sm:w-56" />
            <div className="h-4 w-36 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-11 w-full animate-pulse rounded-xl bg-muted" />
          <div className="flex gap-2 overflow-hidden">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-8 w-20 shrink-0 animate-pulse rounded-full bg-muted" />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-6 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex min-h-[220px] flex-col overflow-hidden rounded-2xl border border-border bg-card"
              >
                <div className="aspect-square w-full animate-pulse bg-muted" />
                <div className="space-y-2 p-3">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
