import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import OverviewTab from '@/components/property-detail/OverviewTab';
import type { ProjectCard as ProjectCardType, ProjectDetail } from '@/types/project';

jest.mock('@/lib/analytics', () => ({
  track: jest.fn(),
}));

jest.mock('@/components/MarketComparison', () => () => <div data-testid="market-comparison">MarketComparison</div>);

const mockProject: ProjectCardType = {
  id: 'elite-x',
  slug: 'elite-x',
  name: 'Elite X',
  sector: 'Sector 10',
  price_min_cr: 2.5,
  price_max_cr: 4.0,
  price_range_label: '₹2.50–4.00Cr',
  status: 'under_construction',
  possession_date: '2024-12-01',
  possession_label: 'Expected Dec 2024',
  media: { images: [] },
  builder: { id: 'elite', name: 'Elite Builders', slug: 'elite' },
  location: { lat: 28, lng: 77 },
  amenities: [],
  connectivity: [],
  units: [],
  unit_types: [],
  units_summary: { bhk: [3, 4], area_min: 1500, area_max: 2500, price_min: 2.5, price_max: 4.0 },
  has_rera: true,
  rera_ids: ['RERA123']
};

const mockDetail: ProjectDetail = {
  id: 'elite-x',
  name: 'Elite X',
  description: 'Premium living.',
  slug: 'elite-x',
  builder_name: 'Elite Builders',
  sector: 'Sector 10',
  city: 'Noida',
  possession_date: '2024-12-01',
  possession_status: 'under_construction',
  pricing_min_cr: 2.5,
  pricing_max_cr: 4.0,
  configuration: '3 & 4 BHK',
  units_count: 500,
  towers_count: 5,
  floors_count: 30,
  area_acres: 10,
  rera_ids: ['RERA123'],
  brochure_url: null,
  lat: 28,
  lng: 77,
  score: 85,
  rec_tier: 'STRONG_BUY',
  persona: 'Luxury',
  decision_thesis: 'Great project.',
  pros: [],
  cons: [],
  risks: [],
  amenities: [],
  connectivity: [],
  units: [],
  construction_updates: [],
  promotions: [],
  images: [],
  builder_detail: {
    id: 'elite',
    name: 'Elite Builders',
    slug: 'elite',
    founded_year: 2010,
    delivered_units: 5000,
    rera_compliance_score: 95,
    iso_certified: true,
    company_overview: 'Elite Builders is a top builder in Noida.'
  }
};

describe('OverviewTab Component', () => {
  it('shows builder loading skeleton when loading is true and detail is missing', () => {
    // Override detail to null to simulate loading state
    const { container } = render(
      <OverviewTab
        project={mockProject}
        detail={null}
        d={mockProject}
        loading={true}
        documents={[]}
        aqi={null}
        floorPlanImages={[]}
        decisionThesis={null}
        whyBuy={[]}
        whyAvoid={[]}
        onViewFloorPlans={jest.fn()}
        onGoToLocation={jest.fn()}
        onGoToDocuments={jest.fn()}
        onGoToPricing={jest.fn()}
      />
    );
    
    // Check for the animate-pulse skeleton element inside Built by section
    const pulseElements = container.querySelectorAll('.animate-pulse');
    expect(pulseElements.length).toBeGreaterThan(0);
  });

  it('renders builder details properly when data is available', () => {
    render(
      <OverviewTab
        project={mockProject}
        detail={mockDetail}
        d={mockDetail}
        loading={false}
        documents={[]}
        aqi={null}
        floorPlanImages={[]}
        decisionThesis={null}
        whyBuy={[]}
        whyAvoid={[]}
        onViewFloorPlans={jest.fn()}
        onGoToLocation={jest.fn()}
        onGoToDocuments={jest.fn()}
        onGoToPricing={jest.fn()}
      />
    );
    
    // Should render company overview text
    expect(screen.getByText('Elite Builders is a top builder in Noida.')).toBeInTheDocument();
    
    // Should render stats
    expect(screen.getByText('5,000+ Units')).toBeInTheDocument();
    expect(screen.getByText('95%')).toBeInTheDocument();
    expect(screen.getByText('Certified')).toBeInTheDocument();
  });
});
