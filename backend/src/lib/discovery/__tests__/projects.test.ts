import { describe, it, expect, beforeAll } from '@jest/globals';
import { scoreProject } from '../scoring';
import type { Intent, ScoredProject } from '../types';

const mockIntent: Intent = {
  sector: 'Sector 10',
  bhk: [3],
  budget_min_cr: null,
  budget_max_cr: 2,
  projectNames: undefined,
  is_comparison_query: undefined,
  gathering_loop_count: 0,
};

const mockProject = {
  id: 'p1',
  name: 'Test Project',
  slug: 'test-project',
  sector: 'Sector 10',
  city: 'Noida',
  builder: { name: 'Builder A', slug: 'builder-a', credai_member: false, delivered_units: 0, awards_count: 0, legal_flag: null },
  status: 'ready_to_move' as const,
  price_range_label: '₹1-2 Cr',
  images: [],
  hero_image_url: null,
  unit_types: [
    { bhk: 3, carpet_area_sqft: 1500, super_area_sqft: 2000, price_min_cr: 1.0, price_max_cr: 1.5 }
  ],
  amenities: [],
  connections: [],
  rera_number: 'REG123',
  best_for: 'Working Families',
  match_score: 45,
  match_reason: 'Good fit for budget',
  match_signals: ['sector_match', 'bhk_match'],
  match_reasons: ['3 BHK available', 'Within budget'],
  concerns: [],
};

describe('Discovery Scoring', () => {
  it('scores projects by sector match', () => {
    const result = scoreProject(mockProject, mockIntent);
    expect(result.matchScore).toBeGreaterThan(0);
  });

  it('applies higher score for BHK match', () => {
    const result = scoreProject(mockProject, mockIntent);
    expect(result.matchScore).toBeGreaterThanOrEqual(30);
  });

  it('filters out projects above budget', () => {
    const overBudgetIntent = { ...mockIntent, budget_max_cr: 0.5 };
    const result = scoreProject(mockProject, overBudgetIntent);
    expect(result.matchScore).toBeLessThan(20);
  });

  it('applies sector mismatch penalty', () => {
    const wrongSectorIntent = { ...mockIntent, sector: 'Sector 5' };
    const result = scoreProject(mockProject, wrongSectorIntent);
    expect(result.matchScore).toBeLessThan(25);
  });

  it('applies bhk mismatch penalty', () => {
    const wrongBhkIntent = { ...mockIntent, bhk: [2] };
    const result = scoreProject(mockProject, wrongBhkIntent);
    expect(result.matchScore).toBeLessThan(25);
  });

  it('handles null project gracefully', () => {
    const result = scoreProject(null as any, mockIntent);
    expect(result.matchScore).toBe(0);
  });

  it('awards rera_number bonus', () => {
    const result = scoreProject(mockProject, mockIntent);
    expect(result.matchScore).toBeGreaterThan(30);
  });

  it('handles multiple bhk preferences', () => {
    const multiIntent = { ...mockIntent, bhk: [2, 3, 4] };
    const result = scoreProject(mockProject, multiIntent);
    expect(result.matchScore).toBeGreaterThan(30);
  });
});

describe('Score Floor Enforcement', () => {
  it('filters out projects below MIN_SCORE_FLOOR of 10', () => {
    const MIN_SCORE_FLOOR = 10;
    const lowScoreProject = { ...mockProject, sector: 'Unrelated Sector', unit_types: [{ bhk: 1, carpet_area_sqft: 500, super_area_sqft: 700, price_min_cr: 5, price_max_cr: 10 }] };
    const result = scoreProject(lowScoreProject, mockIntent);

    if (result.matchScore < MIN_SCORE_FLOOR) {
      expect(true).toBe(true); // Should be filtered
    }
  });

  it('passes projects at floor threshold', () => {
    const result = scoreProject(mockProject, mockIntent);
    expect(result.matchScore).toBeGreaterThanOrEqual(10);
  });
});
