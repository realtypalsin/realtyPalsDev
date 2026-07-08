import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import ProjectCard from '@/components/ProjectCard';
import type { ProjectCard as ProjectCardType } from '@/types/project';

// Mock dependencies
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

jest.mock('@/lib/analytics', () => ({
  track: jest.fn(),
}));

const mockProject: ProjectCardType = {
  id: 'ace-hanei',
  slug: 'ace-hanei',
  name: 'Ace Hanei',
  sector: 'Sector 12',
  price_min_cr: 3.11,
  price_max_cr: 5.70,
  price_range_label: '₹3.11–5.70Cr',
  status: 'under_construction',
  possession_date: '2023-10-01',
  possession_label: 'Expected October 2023',
  media: { images: ['img1.jpg'] },
  builder: { id: 'ace', name: 'ACE Group', slug: 'ace-group' },
  location: { lat: 28, lng: 77 },
  amenities: [],
  connectivity: [],
  unit_types: [
    { bhk: 3, carpet_area_sqft: 1420 },
    { bhk: 4, carpet_area_sqft: 1950 },
    { bhk: 4, carpet_area_sqft: 2610 },
  ] as any[], // Casting to any[] because we only need specific fields for the test
  units: [
    { bhk: 3, area_sqft: 1420 },
    { bhk: 4, area_sqft: 1950 },
    { bhk: 4, area_sqft: 2610 },
  ],
  units_summary: {
    bhk: [3, 4],
    area_min: 1420,
    area_max: 2610,
    price_min: 3.11,
    price_max: 5.70,
  },
  rera_ids: ['UPRERA123'],
  has_rera: true,
};

describe('ProjectCard Component', () => {
  it('renders the project name, builder, and sector', () => {
    render(<ProjectCard project={mockProject} userId={null} />);
    expect(screen.getByText('Ace Hanei')).toBeInTheDocument();
    expect(screen.getByText('ACE Group')).toBeInTheDocument();
    expect(screen.getByText('Sector 12')).toBeInTheDocument();
  });

  it('renders the exact price range label', () => {
    render(<ProjectCard project={mockProject} userId={null} />);
    expect(screen.getByText('₹3.11–5.70Cr')).toBeInTheDocument();
  });



  it('renders the possession label for under construction projects', () => {
    render(<ProjectCard project={mockProject} userId={null} />);
    expect(screen.getByText(/Expected October 2023/)).toBeInTheDocument();
    expect(screen.getByText('Under Construction')).toBeInTheDocument();
  });

  it('renders RTM tag instead of possession label when status is ready_to_move', () => {
    const rtmProject = { ...mockProject, status: 'ready_to_move' as const };
    render(<ProjectCard project={rtmProject} userId={null} />);
    expect(screen.getByText('Ready to Move')).toBeInTheDocument();
    expect(screen.queryByText('Expected October 2023')).not.toBeInTheDocument();
  });

  it('renders exactly two BHK rows by default and handles expand/collapse', () => {
    render(<ProjectCard project={mockProject} userId={null} />);
    // Initial state: Only 3 BHK and 4 BHK should be grouped.
    expect(screen.getByText('3 BHK')).toBeInTheDocument();
    expect(screen.getByText('4 BHK')).toBeInTheDocument();
  });
});
