export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Top Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/40">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-muted/60 rounded-md" />
          <div className="h-4 w-72 bg-muted/40 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-24 bg-muted/60 rounded-lg" />
          <div className="h-9 w-32 bg-primary/20 rounded-lg" />
        </div>
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-5 rounded-xl border border-border/60 bg-surface/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 bg-muted/60 rounded" />
              <div className="h-8 w-8 rounded-lg bg-muted/50" />
            </div>
            <div className="h-8 w-20 bg-muted/80 rounded" />
            <div className="h-3 w-32 bg-muted/40 rounded" />
          </div>
        ))}
      </div>

      {/* Main Content Table/Grid Skeleton */}
      <div className="rounded-xl border border-border/60 bg-surface/50 p-6 space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-border/40">
          <div className="h-5 w-36 bg-muted/60 rounded" />
          <div className="h-8 w-48 bg-muted/40 rounded-lg" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((row) => (
            <div key={row} className="h-12 w-full bg-muted/30 rounded-lg flex items-center px-4 gap-4">
              <div className="h-4 w-12 bg-muted/50 rounded" />
              <div className="h-4 w-32 bg-muted/60 rounded" />
              <div className="h-4 w-24 bg-muted/40 rounded" />
              <div className="h-4 w-20 bg-muted/40 rounded ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
