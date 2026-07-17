import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProjectDetailPanel from '@/components/ProjectDetailPanel';
import type { ProjectCard as ProjectCardType, ProjectDetail } from '@/types/project';

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
});

jest.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: any) => <>{children}</>,
  motion: {
    div: require('react').forwardRef(({ children, ...props }: any, ref: any) => {
      const { initial, animate, exit, transition, whileHover, whileTap, layoutId, ...validProps } = props;
      return <div ref={ref} {...validProps}>{children}</div>;
    }),
  },
  m: {
    div: require('react').forwardRef(({ children, ...props }: any, ref: any) => {
      const { initial, animate, exit, transition, whileHover, whileTap, layoutId, ...validProps } = props;
      return <div ref={ref} {...validProps}>{children}</div>;
    }),
  },
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} alt={props.alt} />,
}));

jest.mock('@/lib/analytics', () => ({
  track: jest.fn(),
  trackPropertyEvent: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/components/property-detail/OverviewTab', () => () => <div data-testid="overview-tab">OverviewTab</div>);
jest.mock('@/components/property-detail/IntelligenceTab', () => () => <div data-testid="analysis-tab">AnalysisTab</div>);
jest.mock('@/components/property-detail/ResidencesTab', () => () => <div data-testid="residences-tab">ResidencesTab</div>);
jest.mock('@/components/property-detail/ProjectPricingTab', () => () => <div data-testid="pricing-tab">PricingTab</div>);
jest.mock('@/components/property-detail/LocationTab', () => () => <div data-testid="location-tab">LocationTab</div>);
jest.mock('@/components/property-detail/DocumentsTab', () => () => <div data-testid="documents-tab">DocumentsTab</div>);

const mockProject: ProjectCardType = {
  id: 'elite-x',
  slug: 'elite-x',
  name: 'Elite X',
  sector: 'Sector 10',
  city: 'Noida',
  price_min_cr: 2.5,
  price_max_cr: 4.0,
  price_range_label: '₹2.50–4.00Cr',
  status: 'under_construction',
  possession_date: '2024-12-01',
  possession_label: 'Expected Dec 2024',
  builder: { name: 'Elite Builders', slug: 'elite' },
  marketing_claims: [],
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
  builder_detail: {
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
  },
  dna: null,
  decision_profile: null,
  persona_profile: null,
  recommendation_profile: null,
  competitors: [],
  recommendation_score: null,
};

describe('ProjectDetailPanel Component', () => {
  it('renders the project name and closes when X is clicked', () => {
    const onClose = jest.fn();
    render(<ProjectDetailPanel project={mockProject} initialDetail={mockDetail} onClose={onClose} />);
    
    expect(screen.getAllByText('Elite X')[0]).toBeInTheDocument();
    
    // There are multiple close buttons (one for modal, maybe one inside), we find the first one
    const closeButtons = screen.getAllByRole('button');
    // Assuming the first button is the X close button (usually true in these panels)
    fireEvent.click(closeButtons[0]);
    expect(onClose).toHaveBeenCalled();
  });

  it('renders OverviewTab by default', () => {
    render(<ProjectDetailPanel project={mockProject} initialDetail={mockDetail} onClose={jest.fn()} />);
    expect(screen.getAllByTestId('overview-tab').length).toBeGreaterThan(0);
  });

  it('switches to Analysis tab when clicked', async () => {
    render(<ProjectDetailPanel project={mockProject} initialDetail={mockDetail} onClose={jest.fn()} />);
    
    const analysisTabBtn = screen.getAllByText('Analysis')[0];
    fireEvent.click(analysisTabBtn);
    
    const { waitFor } = require('@testing-library/react');
    await waitFor(() => {
      expect(screen.getAllByTestId('analysis-tab').length).toBeGreaterThan(0);
    });
  });

  it('switches to Pricing tab when clicked', () => {
    render(<ProjectDetailPanel project={mockProject} initialDetail={mockDetail} onClose={jest.fn()} />);
    
    const pricingTabBtn = screen.getAllByText('Pricing')[0];
    fireEvent.click(pricingTabBtn);
    
    expect(screen.getAllByTestId('pricing-tab').length).toBeGreaterThan(0);
  });
});
