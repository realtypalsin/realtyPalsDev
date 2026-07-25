import UniversalLoader from '@/components/ui/universal-loader'

export default function Loading() {
  return <div className="p-6"><UniversalLoader variant="skeleton-list" rows={10} /></div>
}
