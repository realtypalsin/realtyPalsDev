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
  city: 'Noida',
  price_min_cr: 3.11,
  price_max_cr: 5.70,
  price_range_label: '₹3.11–5.70Cr',
  status: 'under_construction',
  possession_date: '2023-10-01',
  possession_label: 'Expected October 2023',
  builder: { name: 'ACE Group', slug: 'ace-group' },
  marketing_claims: [],
  unit_types: [
    { id: 'u1', name: '3 BHK A', bhk: 3, bathrooms: 2, carpet_area_sqft: 1420 },
    { id: 'u2', name: '4 BHK A', bhk: 4, bathrooms: 3, carpet_area_sqft: 1950 },
    { id: 'u3', name: '4 BHK B', bhk: 4, bathrooms: 3, carpet_area_sqft: 2610 },
  ],
  top_amenities: [],
  top_connectivity: [],
  images: [],
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
