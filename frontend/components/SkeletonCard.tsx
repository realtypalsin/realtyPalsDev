'use client'

export default function SkeletonCard() {
  return (
    <div className="w-full rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm animate-pulse">
      <div className="h-[220px] bg-gray-200" />
      <div className="p-5 space-y-3">
        <div className="h-5 bg-gray-200 rounded-lg w-3/4" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
        <div className="h-8 bg-gray-200 rounded-lg w-1/3 mt-2" />
        <div className="flex gap-1.5 mt-2">
          {[1,2,3].map(i => (
            <div key={i} className="h-5 bg-gray-100 rounded-full w-16" />
          ))}
        </div>
        <div className="flex gap-2 pt-2">
          <div className="flex-1 h-10 bg-gray-200 rounded-xl" />
          <div className="w-10 h-10 bg-gray-100 rounded-xl" />
        </div>
      </div>
    </div>
  )
}
