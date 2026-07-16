// frontend/app/sector/[id]/page.tsx
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { API_BASE } from '@/lib/env'
import { PropertyGridSkeleton } from '@/components/skeletons'
import PropertyCard from '@/components/PropertyCard'

interface PageProps {
  params: { id: string }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const sectorName = decodeURIComponent(params.id).replace(/-/g, ' ')
  return {
    title: `Properties in ${sectorName} | RealtyPals`,
    description: `Discover top real estate projects and properties in ${sectorName}. View prices, RERA compliance, and builder track records.`,
  }
}

async function getSectorProjects(sector: string) {
  // TODO: Implement sector-filtered endpoint in backend.
  // Currently no backend endpoint exists for filtering projects by sector.
  // Use discovery API instead or add sector filtering to /api/v1/projects.
  return []
}

export default async function SectorPage({ params }: PageProps) {
  const sectorName = decodeURIComponent(params.id).replace(/-/g, ' ')
  const projects = await getSectorProjects(sectorName)

  return (
    <div className="min-h-screen bg-[#E4E4E5]">
      <main className="max-w-6xl mx-auto px-4 py-8 pt-12" id="main-content">
        <h1 className="text-4xl font-bold text-gray-900 mb-2 capitalize">Properties in {sectorName}</h1>
        <p className="text-gray-600 mb-8">
          Explore {projects.length} verified projects in {sectorName}.
        </p>

        {projects.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-medium text-gray-600 mb-2">No projects found</h2>
            <p className="text-gray-400">We couldn&apos;t find any properties in this sector.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((p: any) => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
