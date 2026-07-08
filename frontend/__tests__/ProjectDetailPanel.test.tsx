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
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} alt={props.alt} />,
}));

jest.mock('@/lib/analytics', () => ({
  track: jest.fn(),
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

  it('switches to Analysis tab when clicked', () => {
    render(<ProjectDetailPanel project={mockProject} initialDetail={mockDetail} onClose={jest.fn()} />);
    
    const analysisTabBtn = screen.getAllByText('Analysis')[0];
    fireEvent.click(analysisTabBtn);
    
    expect(screen.getAllByTestId('analysis-tab').length).toBeGreaterThan(0);
  });

  it('switches to Pricing tab when clicked', () => {
    render(<ProjectDetailPanel project={mockProject} initialDetail={mockDetail} onClose={jest.fn()} />);
    
    const pricingTabBtn = screen.getAllByText('Pricing')[0];
    fireEvent.click(pricingTabBtn);
    
    expect(screen.getAllByTestId('pricing-tab').length).toBeGreaterThan(0);
  });
});
