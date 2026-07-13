// frontend/components/skeletons/index.tsx
// Unified skeleton loading component library.
// Use these instead of spinners or empty divs anywhere data is being fetched.

'use client'

/** A horizontal shimmer bar — use for text lines */
export function TextSkeleton({ className = '' }: { className?: string }) {
  return <div className={`h-4 img-skeleton rounded ${className}`} />
}

/** A property card skeleton — matches the exact dimensions of a PropertyCard */
export function PropertyCardSkeleton() {
  return (
    <div className="rounded-[20px] overflow-hidden border border-black/5 bg-white shadow-sm">
      {/* Image area */}
      <div className="h-52 img-skeleton" />
      {/* Content area */}
      <div className="p-4 space-y-3">
        <TextSkeleton className="w-3/4" />
        <TextSkeleton className="w-1/2 h-3" />
        <div className="flex gap-2">
          <TextSkeleton className="w-14 h-6 rounded-full" />
          <TextSkeleton className="w-14 h-6 rounded-full" />
        </div>
        <TextSkeleton className="w-full h-1.5 rounded-full" />
      </div>
    </div>
  )
}

/** A grid of property card skeletons */
export function PropertyGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <PropertyCardSkeleton key={i} />
      ))}
    </div>
  )
}

/** A table row skeleton — use in admin pages while data loads */
export function TableRowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-slate-100">
      <TextSkeleton className="w-8 h-8 rounded-lg shrink-0" />
      <div className="flex-1 space-y-2">
        <TextSkeleton className="w-48" />
        <TextSkeleton className="w-32 h-3" />
      </div>
      <TextSkeleton className="w-20 h-6 rounded-full" />
    </div>
  )
}

/** A block of table row skeletons */
export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      {Array.from({ length: rows }).map((_, i) => (
        <TableRowSkeleton key={i} />
      ))}
    </div>
  )
}

/** A stat card skeleton — use in admin dashboard while metrics load */
export function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 img-skeleton rounded-xl" />
        <div className="w-12 h-5 img-skeleton rounded-full" />
      </div>
      <TextSkeleton className="w-24 h-3 mb-2" />
      <TextSkeleton className="w-20 h-8" />
    </div>
  )
}

/** Full-page skeleton for the discover/chat page */
export function DiscoverySkeleton() {
  return (
    <div className="flex h-screen">
      {/* Sidebar skeleton */}
      <div className="w-64 border-r border-slate-100 p-4 space-y-3 hidden md:block">
        <div className="h-8 img-skeleton rounded-lg" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 img-skeleton rounded-xl" />
        ))}
      </div>
      {/* Chat area skeleton */}
      <div className="flex-1 flex flex-col p-6 gap-4">
        <div className="flex-1 space-y-4">
          <div className="max-w-sm h-16 img-skeleton rounded-2xl" />
          <div className="max-w-md h-24 img-skeleton rounded-2xl ml-auto" />
          <div className="max-w-lg h-40 img-skeleton rounded-2xl" />
        </div>
        <div className="h-14 img-skeleton rounded-2xl" />
      </div>
    </div>
  )
}
