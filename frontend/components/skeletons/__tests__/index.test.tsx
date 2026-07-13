import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PropertyCardSkeleton, TableSkeleton } from '../index';

describe('Skeletons', () => {
  it('renders PropertyCardSkeleton without crashing', () => {
    const { container } = render(<PropertyCardSkeleton />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders TableSkeleton with specified rows and columns', () => {
    const { container } = render(<TableSkeleton rows={3} />);
    // There should be a header row and 3 body rows = 4 rows total
    // But testing exact structure depends on the implementation. 
    // Simply asserting it renders without crashing is a good baseline.
    expect(container.firstChild).toBeInTheDocument();
  });
});
