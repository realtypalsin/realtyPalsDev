#!/usr/bin/env node

/**
 * Weekly Analytics Aggregation Script
 * Runs every Sunday at 2 AM
 * Aggregates ChatAnalytics into WeeklyMetricsSummary
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function aggregateWeeklyAnalytics() {
  try {
    // Get week boundaries (Monday-Sunday)
    const now = new Date()
    const day = now.getDay()
    const diff = now.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
    const weekStart = new Date(now.setDate(diff))
    weekStart.setHours(0, 0, 0, 0)

    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    weekEnd.setHours(23, 59, 59, 999)

    console.log(`📊 [ANALYTICS] Aggregating week: ${weekStart.toISOString()} to ${weekEnd.toISOString()}`)

    // Check if already aggregated for this week
    const existing = await prisma.weeklyMetricsSummary.findUnique({
      where: { week_start: weekStart }
    })

    if (existing) {
      console.log('✓ Week already aggregated, skipping')
      return existing
    }

    // Get all analytics for the week
    const analytics = await prisma.chatAnalytics.findMany({
      where: {
        created_at: { gte: weekStart, lte: weekEnd }
      }
    })

    console.log(`Found ${analytics.length} chat sessions`)

    if (analytics.length === 0) {
      console.log('⚠ No data to aggregate')
      return null
    }

    // Aggregate by sector
    const sectors: Record<string, { count: number; conversions: number }> = {}
    const intents: Record<string, number> = {}
    const bhks: Record<number, number> = {}
    const budgets: Record<string, number> = {}

    let totalConverted = 0
    let totalTimeSpent = 0

    analytics.forEach(a => {
      // Sectors
      if (a.extracted_sector) {
        if (!sectors[a.extracted_sector]) {
          sectors[a.extracted_sector] = { count: 0, conversions: 0 }
        }
        sectors[a.extracted_sector].count++
        if (a.conversion_at) {
          sectors[a.extracted_sector].conversions++
          totalConverted++
        }
      }

      // Intents
      if (a.intent_type) {
        intents[a.intent_type] = (intents[a.intent_type] || 0) + 1
      }

      // BHKs
      if (a.extracted_bhk) {
        bhks[a.extracted_bhk] = (bhks[a.extracted_bhk] || 0) + 1
      }

      // Budget ranges
      if (a.extracted_budget_min && a.extracted_budget_max) {
        const range = `₹${Math.round(a.extracted_budget_min)}-${Math.round(a.extracted_budget_max)} Cr`
        budgets[range] = (budgets[range] || 0) + 1
      }

      totalTimeSpent += a.time_spent_seconds
    })

    // Calculate metrics
    const conversionRate = analytics.length > 0 ? (totalConverted / analytics.length) * 100 : 0
    const avgTimeSpent = Math.round(totalTimeSpent / analytics.length)

    // Sort and limit
    const topSectors = Object.entries(sectors)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([sector, data]) => ({
        sector,
        count: data.count,
        conversions: data.conversions,
        conversion_rate: parseFloat(((data.conversions / data.count) * 100).toFixed(1))
      }))

    const uniqueSessions = new Set(analytics.map(a => a.session_id)).size

    // Create summary
    const summary = await prisma.weeklyMetricsSummary.create({
      data: {
        week_start: weekStart,
        week_end: weekEnd,
        total_queries: analytics.length,
        unique_sessions: uniqueSessions,
        conversion_rate: parseFloat(conversionRate.toFixed(2)),
        drop_off_rate: parseFloat((100 - conversionRate).toFixed(2)),
        avg_time_spent_s: avgTimeSpent,
        top_sectors: topSectors,
        intent_breakdown: Object.entries(intents).map(([type, count]) => ({
          type,
          count
        })),
        budget_distribution: Object.entries(budgets).map(([range, count]) => ({
          range,
          count
        })),
        bhk_preferences: Object.entries(bhks).map(([bhk, count]) => ({
          bhk: parseInt(bhk),
          count
        }))
      }
    })

    console.log('✓ Weekly summary created:', summary.id)
    console.log(`  Sessions: ${uniqueSessions}`)
    console.log(`  Conversion rate: ${summary.conversion_rate}%`)
    console.log(`  Avg time spent: ${summary.avg_time_spent_s}s`)
    console.log(`  Top sectors: ${topSectors.map(s => s.sector).join(', ')}`)

    return summary
  } catch (err) {
    console.error('❌ Aggregation failed:', err)
    throw err
  } finally {
    await prisma.$disconnect()
  }
}

// Run if called directly
if (require.main === module) {
  aggregateWeeklyAnalytics()
    .then(() => {
      console.log('✓ Aggregation complete')
      process.exit(0)
    })
    .catch(err => {
      console.error(err)
      process.exit(1)
    })
}

export { aggregateWeeklyAnalytics }
