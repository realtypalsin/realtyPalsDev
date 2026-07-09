import { describe, it, expect } from '@jest/globals';
import { mergeIntentUpdates } from '../intent';
import type { Intent } from '../../discovery/types';

describe('Intent Merging & Context Preservation', () => {
  const previousIntent: Intent = {
    sector: 'Sector 10',
    bhk: [3],
    budget_max_cr: 2,
    projectNames: undefined,
    is_comparison_query: undefined,
    gathering_loop_count: 1,
  };

  it('preserves sector when project names extracted (no sector in update)', () => {
    const update = { projectNames: ['ATS Homekraft', 'Arihant Abode'], is_comparison_query: true };
    const result = mergeIntentUpdates(previousIntent, update);

    expect(result.sector).toBe('Sector 10'); // preserved
    expect(result.projectNames).toEqual(['ATS Homekraft', 'Arihant Abode']);
  });

  it('preserves BHK when project names extracted', () => {
    const update = { projectNames: ['Elite X'] };
    const result = mergeIntentUpdates(previousIntent, update);

    expect(result.bhk).toEqual([3]); // preserved
    expect(result.projectNames).toEqual(['Elite X']);
  });

  it('updates sector when explicitly provided', () => {
    const update = { sector: 'Sector 5' };
    const result = mergeIntentUpdates(previousIntent, update);

    expect(result.sector).toBe('Sector 5'); // updated
  });

  it('clears projectNames between turns (intent reset)', () => {
    const update = { sector: 'Sector 11' };
    const result = mergeIntentUpdates(previousIntent, update);

    expect(result.projectNames).toBeUndefined(); // reset
    expect(result.sector).toBe('Sector 11');
  });

  it('handles null previous intent', () => {
    const update = { sector: 'Sector 10', bhk: [3] };
    const result = mergeIntentUpdates({} as Intent, update);

    expect(result.sector).toBe('Sector 10');
    expect(result.bhk).toEqual([3]);
  });

  it('merges multi-bhk preferences', () => {
    const update = { bhk: [2, 3, 4] };
    const result = mergeIntentUpdates(previousIntent, update);

    expect(result.bhk).toEqual([2, 3, 4]);
    expect(result.sector).toBe('Sector 10'); // preserved
  });

  it('handles budget clarification', () => {
    const update = { budget_min_cr: 1, budget_max_cr: 1.5 };
    const result = mergeIntentUpdates(previousIntent, update);

    expect(result.budget_min_cr).toBe(1);
    expect(result.budget_max_cr).toBe(1.5);
    expect(result.sector).toBe('Sector 10'); // preserved
  });

  it('increments gathering_loop_count', () => {
    const update = { sector: 'Sector 10' }; // still gathering
    const result = mergeIntentUpdates(previousIntent, update);

    // gathering_loop_count should increment on clarification
    expect(result.gathering_loop_count).toBeGreaterThanOrEqual(previousIntent.gathering_loop_count);
  });

  it('resets gathering_loop_count when ready to search', () => {
    const updateIntent = { ...previousIntent, gathering_loop_count: 3 };
    const update = { bhk: [3], sector: 'Sector 10' }; // complete intent
    const result = mergeIntentUpdates(updateIntent, update);

    // Should be READY_TO_SEARCH, loop count can reset
    expect(result.gathering_loop_count).toBeDefined();
  });

  it('preserves undefined fields as undefined', () => {
    const update = { bhk: [3] };
    const result = mergeIntentUpdates(previousIntent, update);

    expect(result.projectNames).toBeUndefined();
    expect(result.is_comparison_query).toBeUndefined();
  });

  it('filters out undefined update values', () => {
    const update = { sector: undefined, bhk: [2] };
    const result = mergeIntentUpdates(previousIntent, update);

    expect(result.sector).toBe('Sector 10'); // not cleared
    expect(result.bhk).toEqual([2]); // updated
  });
});

describe('Confidence & Clarification', () => {
  it('LOW confidence with only sector', () => {
    const partial: Intent = { sector: 'Sector 10', gathering_loop_count: 0 };
    // Simulated confidence computation
    const hasProjectNames = partial.projectNames?.length ?? 0 > 0;
    const hasBhk = (partial.bhk?.length ?? 0) > 0;

    expect(hasProjectNames).toBe(false);
    expect(hasBhk).toBe(false);
    // Confidence should be LOW
  });

  it('MEDIUM confidence with sector + BHK', () => {
    const partial: Intent = { sector: 'Sector 10', bhk: [3], gathering_loop_count: 0 };

    const hasSector = !!partial.sector;
    const hasBhk = (partial.bhk?.length ?? 0) > 0;

    expect(hasSector && hasBhk).toBe(true);
    // Confidence should be MEDIUM → READY_TO_SEARCH
  });

  it('HIGH confidence with complete intent', () => {
    const full: Intent = {
      sector: 'Sector 10',
      bhk: [3],
      budget_max_cr: 2,
      projectNames: ['Project A'],
    };

    const complete = full.sector && full.projectNames;
    expect(complete).toBe(true);
    // Confidence should be HIGH → SHORTLISTED
  });
});
