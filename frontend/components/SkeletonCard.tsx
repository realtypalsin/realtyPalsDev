'use client'

'use client'

export default function SkeletonCard({ layout = 'grid' }: { layout?: 'grid' | 'list' }) {
  if (layout === 'list') {
    return (
      <div className="w-full rounded-2xl overflow-hidden bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm p-4 flex gap-4">
        <div className="w-36 h-28 img-skeleton rounded-xl shrink-0" />
        <div className="flex-1 space-y-2.5 py-1">
          <div className="h-4 img-skeleton rounded-lg w-2/3" />
          <div className="h-3 img-skeleton rounded-md w-1/3" />
          <div className="flex gap-2 pt-2">
            <div className="h-6 img-skeleton rounded-full w-16" />
            <div className="h-6 img-skeleton rounded-full w-20" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full rounded-2xl overflow-hidden bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-[0_2px_12px_rgba(0,0,0,0.04)] flex flex-col">
      <div className="h-48 img-skeleton w-full shrink-0" />
      <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
        <div className="space-y-2">
          <div className="h-5 img-skeleton rounded-lg w-3/4" />
          <div className="h-3.5 img-skeleton rounded-md w-1/2" />
        </div>
        <div className="space-y-2.5 pt-2">
          <div className="flex gap-1.5">
            <div className="h-6 img-skeleton rounded-full w-16" />
            <div className="h-6 img-skeleton rounded-full w-20" />
            <div className="h-6 img-skeleton rounded-full w-14" />
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
            <div className="h-6 img-skeleton rounded-lg w-28" />
            <div className="h-9 img-skeleton rounded-xl w-24" />
          </div>
        </div>
      </div>
    </div>
  )
}
