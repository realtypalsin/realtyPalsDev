import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StatCard } from '../StatCard';
import { Users } from 'lucide-react';

describe('StatCard', () => {
  it('renders the title and value correctly', () => {
    render(<StatCard title="Total Users" value="1,234" icon={Users} />);
    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('1,234')).toBeInTheDocument();
  });

  it('renders trend data appropriately', () => {
    render(<StatCard title="Active" value="500" icon={Users} trend={12} />);
    expect(screen.getByText(/12/)).toBeInTheDocument();
  });
});
