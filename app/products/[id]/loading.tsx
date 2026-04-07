export default function ProductLoading() {
  return (
    <div className="bg-background">
      <div className="mx-auto max-w-6xl animate-pulse px-4 py-10 sm:px-6">
        <div className="h-4 w-32 rounded bg-muted" />
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <div className="aspect-square rounded-2xl bg-muted" />
          <div className="space-y-4">
            <div className="h-6 w-3/4 rounded bg-muted" />
            <div className="h-10 w-1/2 rounded bg-muted" />
            <div className="h-24 w-full rounded bg-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}
