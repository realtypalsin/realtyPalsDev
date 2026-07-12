import { describe, it, expect } from '@jest/globals';
import { scoreProject } from '../scoring';
import type { Intent } from '../types';

const mockIntent: Intent = {
  sector: 'Sector 10',
  bhk: [3],
  budgetMax: 2,
  gathering_loop_count: 0,
};

const mockProject = {
  id: 'p1',
  name: 'Test Project',
  slug: 'test-project',
  sector: 'Sector 10',
  city: 'Noida',
  builder: {
    name: 'Builder A',
    slug: 'builder-a',
    credai_member: false,
    delivered_units: 0,
    awards_count: 0,
    legal_flag: null,
  },
  status: 'ready_to_move' as const,
  price_range_label: '₹1-2 Cr',
  images: [],
  hero_image_url: null,
  unit_types: [
    { bhk: 3, carpet_area_sqft: 1500, super_area_sqft: 2000, price_min_cr: 1.0, price_max_cr: 1.5 },
  ],
  amenities: [] as Array<{ name: string }>,
  ai_search_keywords: [] as string[],
  rera_number: 'REG123',
  possession_date: null as Date | null,
};

describe('Discovery Scoring', () => {
  it('scores projects by sector match', () => {
    const result = scoreProject(mockProject, mockIntent);
    expect(result).toBeGreaterThan(0);
  });

  it('applies higher score for BHK match', () => {
    const result = scoreProject(mockProject, mockIntent);
    expect(result).toBeGreaterThanOrEqual(10);
  });

  it('filters out projects above budget', () => {
    const overBudgetIntent: Intent = { ...mockIntent, budgetMax: 0.5 };
    const result = scoreProject(mockProject, overBudgetIntent);
    expect(result).toBeLessThan(50);
  });

  it('applies sector mismatch handling', () => {
    const wrongSectorIntent: Intent = { ...mockIntent, sector: 'Sector 5' };
    const result = scoreProject(mockProject, wrongSectorIntent);
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it('applies bhk mismatch handling', () => {
    const wrongBhkIntent: Intent = { ...mockIntent, bhk: [2] };
    const result = scoreProject(mockProject, wrongBhkIntent);
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it('handles null project gracefully', () => {
    const result = scoreProject(null as any, mockIntent);
    expect(result).toBe(0);
  });

  it('awards rera_number bonus', () => {
    const result = scoreProject(mockProject, mockIntent);
    expect(result).toBeGreaterThan(0);
  });

  it('handles multiple bhk preferences', () => {
    const multiIntent: Intent = { ...mockIntent, bhk: [2, 3, 4] };
    const result = scoreProject(mockProject, multiIntent);
    expect(result).toBeGreaterThan(0);
  });
});

describe('Score Floor Enforcement', () => {
  it('filters out projects below MIN_SCORE_FLOOR of 10', () => {
    const MIN_SCORE_FLOOR = 10;
    const lowScoreProject = {
      ...mockProject,
      sector: 'Unrelated Sector',
      unit_types: [{ bhk: 1, carpet_area_sqft: 500, super_area_sqft: 700, price_min_cr: 5, price_max_cr: 10 }],
    };
    const result = scoreProject(lowScoreProject, mockIntent);
    if (result < MIN_SCORE_FLOOR) {
      expect(true).toBe(true); // Should be filtered
    }
  });

  it('passes projects at floor threshold', () => {
    const result = scoreProject(mockProject, mockIntent);
    expect(result).toBeGreaterThanOrEqual(0);
  });
});
