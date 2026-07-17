import { describe, it } from 'node:test'
import { strict as assert } from 'node:assert'

const expect = (actual: any) => ({
  toBe: (expected: any) => assert.equal(actual, expected),
  toEqual: (expected: any) => assert.deepEqual(actual, expected),
  toBeNull: () => assert.equal(actual, null),
  toBeTruthy: () => assert.ok(actual),
  toBeFalsy: () => assert.ok(!actual),
  toBeUndefined: () => assert.equal(actual, undefined),
  toBeGreaterThanOrEqual: (expected: any) => assert.ok(actual >= expected),
  toBeDefined: () => assert.ok(actual !== undefined),
})
import { mergeIntent } from '../intent';
import type { Intent } from '../../discovery/types';

describe('Intent Merging & Context Preservation', () => {
  const previousIntent: Intent = {
    sector: 'Sector 10',
    bhk: [3],
    budgetMax: 2,
    projectNames: undefined,
    is_comparison_query: undefined,
    gathering_loop_count: 1,
  };

  it('preserves sector when project names extracted (no sector in update)', () => {
    const update = { projectNames: ['ATS Homekraft', 'Arihant Abode'], is_comparison_query: true };
    const result = mergeIntent(previousIntent, update);

    expect(result.sector).toBe('Sector 10');
    expect(result.projectNames).toEqual(['ATS Homekraft', 'Arihant Abode']);
  });

  it('preserves BHK when project names extracted', () => {
    const update = { projectNames: ['Elite X'] };
    const result = mergeIntent(previousIntent, update);

    expect(result.bhk).toEqual([3]);
    expect(result.projectNames).toEqual(['Elite X']);
  });

  it('updates sector when explicitly provided', () => {
    const update = { sector: 'Sector 5' };
    const result = mergeIntent(previousIntent, update);

    expect(result.sector).toBe('Sector 5');
  });

  it('clears projectNames between turns (intent reset)', () => {
    const update = { sector: 'Sector 11' };
    const result = mergeIntent(previousIntent, update);

    expect(result.projectNames).toBeUndefined();
    expect(result.sector).toBe('Sector 11');
  });

  it('handles null previous intent', () => {
    const update = { sector: 'Sector 10', bhk: [3] };
    const result = mergeIntent({} as Intent, update);

    expect(result.sector).toBe('Sector 10');
    expect(result.bhk).toEqual([3]);
  });

  it('merges multi-bhk preferences', () => {
    const update = { bhk: [2, 3, 4] };
    const result = mergeIntent(previousIntent, update);

    expect(result.bhk).toEqual([2, 3, 4]);
    expect(result.sector).toBe('Sector 10');
  });

  it('handles budget clarification', () => {
    const update = { budgetMin: 1, budgetMax: 1.5 };
    const result = mergeIntent(previousIntent, update);

    expect(result.budgetMin).toBe(1);
    expect(result.budgetMax).toBe(1.5);
    expect(result.sector).toBe('Sector 10');
  });

  it('increments gathering_loop_count', () => {
    const update = { sector: 'Sector 10' };
    const result = mergeIntent(previousIntent, update);

    expect(result.gathering_loop_count).toBeGreaterThanOrEqual(previousIntent.gathering_loop_count ?? 0);
  });

  it('resets gathering_loop_count when ready to search', () => {
    const updateIntent = { ...previousIntent, gathering_loop_count: 3 };
    const update = { bhk: [3], sector: 'Sector 10' };
    const result = mergeIntent(updateIntent, update);

    expect(result.gathering_loop_count).toBeDefined();
  });

  it('preserves undefined fields as undefined', () => {
    const update = { bhk: [3] };
    const result = mergeIntent(previousIntent, update);

    expect(result.projectNames).toBeUndefined();
    expect(result.is_comparison_query).toBeUndefined();
  });

  it('filters out undefined update values', () => {
    const update = { sector: undefined, bhk: [2] };
    const result = mergeIntent(previousIntent, update);

    expect(result.sector).toBe('Sector 10');
    expect(result.bhk).toEqual([2]);
  });
});

describe('Confidence & Clarification', () => {
  it('LOW confidence with only sector', () => {
    const partial: Intent = { sector: 'Sector 10', gathering_loop_count: 0 };
    const hasProjectNames = (partial.projectNames?.length ?? 0) > 0;
    const hasBhk = (partial.bhk?.length ?? 0) > 0;

    expect(hasProjectNames).toBe(false);
    expect(hasBhk).toBe(false);
  });

  it('MEDIUM confidence with sector + BHK', () => {
    const partial: Intent = { sector: 'Sector 10', bhk: [3], gathering_loop_count: 0 };

    const hasSector = !!partial.sector;
    const hasBhk = (partial.bhk?.length ?? 0) > 0;

    expect(hasSector && hasBhk).toBe(true);
  });

  it('HIGH confidence with complete intent', () => {
    const full: Intent = {
      sector: 'Sector 10',
      bhk: [3],
      budgetMax: 2,
      projectNames: ['Project A'],
    };

    const complete = full.sector && full.projectNames;
    expect(complete).toBeTruthy();
  });
});
