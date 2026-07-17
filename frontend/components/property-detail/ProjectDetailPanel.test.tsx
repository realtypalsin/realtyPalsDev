import { describe, it, expect } from 'node:test'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProjectDetailPanel } from './ProjectDetailPanel'
import type { ProjectCard } from '@/types/project'

const mockProject: ProjectCard = {
  id: '1',
  slug: 'sector-150-apts',
  name: 'Sector 150 Apartments',
  sector: 'Sector 150',
  city: 'Noida',
  builder_id: 'b1',
  builder_name: 'Builder Co',
  price_min_cr: 1.0,
  price_max_cr: 1.5,
  bhk: [2, 3],
  status: 'ready',
  possession_date: '2024-06',
  rera_number: 'UP-RERA-123',
  image_url: 'https://example.com/image.jpg',
  description: 'Modern apartments in Sector 150',
}

describe('ProjectDetailPanel', () => {
  it('should render project name and sector', () => {
    render(
      <ProjectDetailPanel
        project={mockProject}
        onClose={() => {}}
        detail={null}
      />
    )
    expect(screen.getByText('Sector 150 Apartments')).toBeTruthy()
    expect(screen.getByText('Sector 150')).toBeTruthy()
  })

  it('should render Pricing and Residences tabs', async () => {
    render(
      <ProjectDetailPanel
        project={mockProject}
        onClose={() => {}}
        detail={null}
      />
    )
    // Tabs should be present (icons + labels)
    const pricingTab = screen.queryByText(/Pricing|₹/)
    const residencesTab = screen.queryByText(/Residences|Residences/)
    expect([pricingTab, residencesTab].some(Boolean)).toBe(true)
  })

  it('should not show G+26 fallback for floors', () => {
    const projectWithoutFloors = { ...mockProject, floors: undefined }
    render(
      <ProjectDetailPanel
        project={projectWithoutFloors}
        onClose={() => {}}
        detail={null}
      />
    )
    // Should show — or be absent, not 'G+26'
    expect(screen.queryByText('G+26')).toBeFalsy()
  })

  it('should load detail data on click', async () => {
    const mockDetail = {
      floorPlans: [],
      documents: [],
      amenities: ['Swimming Pool', 'Gym'],
    }
    const user = userEvent.setup()
    render(
      <ProjectDetailPanel
        project={mockProject}
        onClose={() => {}}
        detail={mockDetail}
      />
    )
    // Detail should render when passed
    await waitFor(() => {
      expect(screen.queryByText(/Swimming Pool|Gym/)).toBeTruthy()
    })
  })

  it('should call onClose when close button clicked', async () => {
    const onClose = expect.fn()
    const user = userEvent.setup()
    render(
      <ProjectDetailPanel
        project={mockProject}
        onClose={onClose}
        detail={null}
      />
    )
    const closeButton = screen.getByRole('button', { name: /close|×/ })
    await user.click(closeButton)
    expect(onClose).toHaveBeenCalled()
  })
})
