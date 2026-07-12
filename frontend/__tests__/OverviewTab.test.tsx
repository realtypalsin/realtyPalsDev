import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import OverviewTab from '@/components/property-detail/OverviewTab';
import type { ProjectCard as ProjectCardType, ProjectDetail, BuilderDetail } from '@/types/project';

jest.mock('@/lib/analytics', () => ({
  track: jest.fn(),
}));

jest.mock('@/components/MarketComparison', () => () => <div data-testid="market-comparison">MarketComparison</div>);

const mockBuilder: BuilderDetail = {
  name: 'Elite Builders',
  slug: 'elite',
  tagline: null,
  founder: null,
  company_overview: 'Elite Builders is a top builder in Noida.',
  logo_url: null,
  parent_group: null,
  founded_year: 2010,
  headquarters: null,
  website: null,
  email: null,
  phone: null,
  description: null,
  total_projects_count: null,
  delivered_units: 5000,
  delivered_projects: [],
  ongoing_projects: [],
  delayed_projects_count: null,
  average_delay_months: null,
  delivery_score: null,
  construction_quality_score: null,
  after_sales_score: null,
  buyer_satisfaction_score: null,
  rera_compliance_score: 95,
  litigation_count: null,
  insolvency_history: false,
  legal_flag: null,
  cin: null,
  rera_promoter_id: null,
  financial_hygiene_score: null,
  outstanding_dues_cr: null,
  legal_entities: null,
  executives: null,
  funding_banks: [],
  audit_flags_log: null,
  luxury_specialization: false,
  township_specialization: false,
  affordable_specialization: false,
  average_project_size: null,
  awards: [],
  awards_count: null,
  certifications: [],
  credai_member: false,
  iso_certified: true,
  verification_level: null,
  last_verified_at: null,
  data_source: null,
  intelligence_completeness: null,
};

const mockProject: ProjectCardType = {
  id: 'elite-x',
  slug: 'elite-x',
  name: 'Elite X',
  sector: 'Sector 10',
  city: 'Noida',
  price_range_label: '₹2.50–4.00Cr',
  status: 'under_construction',
  possession_date: '2024-12-01',
  marketing_claims: [],
  builder: { name: 'Elite Builders', slug: 'elite' },
  unit_types: [],
  top_amenities: [],
  top_connectivity: [],
  images: [],
};

const mockDetail: ProjectDetail = {
  ...mockProject,
  long_description: 'Premium living.',
  design_theme: null,
  total_units: 500,
  marketing_claims: [],
  all_amenities: [],
  all_connectivity: [],
  builder_detail: mockBuilder,
  dna: null,
  decision_profile: null,
  persona_profile: null,
  recommendation_profile: null,
  competitors: [],
  recommendation_score: null,
};

describe('OverviewTab Component', () => {
  it('shows builder loading skeleton when loading is true and detail is missing', () => {
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
    
    expect(screen.getByText('Elite Builders is a top builder in Noida.')).toBeInTheDocument();
  });
});
