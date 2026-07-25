import UniversalLoader from '@/components/ui/universal-loader'

export default function DiscoverLoading() {
  return (
    <div className="flex h-[100dvh] bg-[#E6E6E6] overflow-hidden">
      {/* Sidebar skeleton */}
      <div className="hidden md:flex w-80 flex-col glass-surface border-r border-white/40 p-4 gap-3">
        <div className="h-12 w-32 rounded-lg bg-gray-200/60 animate-pulse" />
        <div className="mt-6 space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 rounded-xl bg-gray-200/50 animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
          ))}
        </div>
        <div className="mt-6 space-y-2">
          <div className="h-4 w-16 rounded bg-gray-200/60 animate-pulse" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-8 rounded-lg bg-gray-200/40 animate-pulse" style={{ animationDelay: `${(i + 5) * 80}ms` }} />
          ))}
        </div>
      </div>
      {/* Main content skeleton */}
      <main className="flex-1">
        <UniversalLoader variant="skeleton-page" label="Opening your advisor…" />
      </main>
    </div>
  );
}
