/**
 * Phase 5: Ranking implementation tests
 * Verify ranking profiles, sector tiers, market tiers, and ranking helpers
 */
import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import {
  inferRankingProfile,
  getRankingBasis,
  RANKING_PROFILES
} from './rankingProfiles'
import {
  computeSectorTier,
  getTierBoost
} from './sectorTiers'
import {
  getMarketTier,
  getMarketTierBias,
  getMarketTierLabel,
  getMarketTierRange,
  MARKET_TIERS
} from './marketTiers'

test('Phase 5: Ranking Profiles', async (t) => {
  await t.test('inferRankingProfile detects value queries', () => {
    assert.equal(inferRankingProfile('best value projects'), 'value')
    assert.equal(inferRankingProfile('best bang for buck'), 'value')
    assert.equal(inferRankingProfile('budget friendly'), 'value')
  })

  await t.test('inferRankingProfile detects speed queries', () => {
    assert.equal(inferRankingProfile('fastest possession'), 'speed')
    assert.equal(inferRankingProfile('quickest available'), 'speed')
    assert.equal(inferRankingProfile('ready soon'), 'speed')
  })

  await t.test('inferRankingProfile detects trust queries', () => {
    assert.equal(inferRankingProfile('safest builders'), 'trust')
    assert.equal(inferRankingProfile('most trusted builder'), 'trust')
    assert.equal(inferRankingProfile('credai member'), 'trust')
  })

  await t.test('inferRankingProfile detects family queries', () => {
    assert.equal(inferRankingProfile('best for families'), 'family')
    assert.equal(inferRankingProfile('schools nearby'), 'family')
  })

  await t.test('inferRankingProfile defaults to overall', () => {
    assert.equal(inferRankingProfile('best projects'), 'overall')
    assert.equal(inferRankingProfile('top options'), 'overall')
  })

  await t.test('getRankingBasis returns description for each profile', () => {
    assert.ok(getRankingBasis('overall').includes('verified'))
    assert.ok(getRankingBasis('value').includes('price'))
    assert.ok(getRankingBasis('trust').includes('builder'))
    assert.ok(getRankingBasis('speed').includes('possession'))
  })

  await t.test('RANKING_PROFILES are properly defined', () => {
    assert.ok(RANKING_PROFILES.overall)
    assert.ok(RANKING_PROFILES.value)
    assert.ok(RANKING_PROFILES.trust)
    assert.ok(RANKING_PROFILES.speed)
    assert.ok(RANKING_PROFILES.family)
    assert.ok(RANKING_PROFILES.premium)
  })
})

test('Phase 5: Sector Tiers', async (t) => {
  await t.test('computeSectorTier classifies established + high CAGR as Tier 1', () => {
    const tier = computeSectorTier({
      city: 'Noida',
      sector: 'Sector 150',
      sector_stage: 'established',
      avg_price_per_sqft: 5000,
      price_5yr_cagr_pct: 6,
    })
    assert.equal(tier.tier, 'tier1')
    assert.equal(tier.label, 'Premium')
  })

  await t.test('computeSectorTier classifies developing + mid CAGR as Tier 2', () => {
    const tier = computeSectorTier({
      city: 'Noida',
      sector: 'Sector 160',
      sector_stage: 'developing',
      avg_price_per_sqft: 3500,
      price_5yr_cagr_pct: 4,
    })
    assert.equal(tier.tier, 'tier2')
    assert.equal(tier.label, 'Growth')
  })

  await t.test('computeSectorTier defaults to Tier 3', () => {
    const tier = computeSectorTier({
      city: 'Noida',
      sector: 'Sector 99',
      sector_stage: 'emerging',
      avg_price_per_sqft: 2000,
      price_5yr_cagr_pct: 1,
    })
    assert.equal(tier.tier, 'tier3')
    assert.equal(tier.label, 'Budget')
  })

  await t.test('getTierBoost returns correct points', () => {
    assert.equal(getTierBoost('tier1'), 10)
    assert.equal(getTierBoost('tier2'), 5)
    assert.equal(getTierBoost('tier3'), 0)
  })
})

test('Phase 5: Market Tiers', async (t) => {
  await t.test('getMarketTier classifies by price range', () => {
    assert.equal(getMarketTier(0.3), 'budget')
    assert.equal(getMarketTier(0.8), 'mid')
    assert.equal(getMarketTier(2.5), 'premium')
    assert.equal(getMarketTier(5), 'luxury')
  })

  await t.test('getMarketTierBias scores exact matches higher', () => {
    assert.equal(getMarketTierBias('mid', 1), 20) // exact match
    assert.equal(getMarketTierBias('premium', 1), 5) // adjacent
    assert.equal(getMarketTierBias('luxury', 1), 0) // far
  })

  await t.test('getMarketTierLabel returns human-readable name', () => {
    assert.equal(getMarketTierLabel('budget'), 'Budget')
    assert.equal(getMarketTierLabel('mid'), 'Mid-range')
    assert.equal(getMarketTierLabel('premium'), 'Premium')
    assert.equal(getMarketTierLabel('luxury'), 'Luxury')
  })

  await t.test('getMarketTierRange returns price string', () => {
    assert.equal(getMarketTierRange('budget'), '₹0–50L')
    assert.equal(getMarketTierRange('mid'), '₹50L–1.5Cr')
    assert.equal(getMarketTierRange('premium'), '₹1.5–4Cr')
    assert.equal(getMarketTierRange('luxury'), '₹4Cr+')
  })

  await t.test('MARKET_TIERS are properly defined', () => {
    assert.equal(MARKET_TIERS.length, 4)
    assert.ok(MARKET_TIERS.every((t) => t.tier && t.label && t.minCr >= 0))
  })
})
