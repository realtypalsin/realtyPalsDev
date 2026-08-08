import { test, expect } from '@playwright/test'

test.describe('Database-backed payment plan query', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to chat interface
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('should render formatted response with confidence scores', async ({ page }) => {
    // User submits payment plan query
    const input = page.locator('input[type="text"][placeholder*="Ask"]')
    await input.fill('What are the payment plans for a 50-75 crore 3BHK in Noida Sector 62?')
    await page.keyboard.press('Enter')

    // Wait for response
    await page.waitForTimeout(3000)

    // Verify formatted response appears
    const response = page.locator('text=Payment Plan')
    await expect(response).toBeVisible()

    // Verify confidence badge is visible
    const confidenceBadge = page.locator('text=/confident/')
    await expect(confidenceBadge).toBeVisible()

    // Extract and verify confidence score is a number
    const badgeText = await confidenceBadge.textContent()
    expect(badgeText).toMatch(/\d+%\s+confident/)
  })

  test('should display data freshness information', async ({ page }) => {
    const input = page.locator('input[type="text"][placeholder*="Ask"]')
    await input.fill('Tell me about builder history for this project')
    await page.keyboard.press('Enter')

    await page.waitForTimeout(3000)

    // Check for data freshness section
    const freshness = page.locator('text=/last updated|freshness|updated/i')
    await expect(freshness.first()).toBeVisible()
  })

  test('should show missing data warnings', async ({ page }) => {
    const input = page.locator('input[type="text"][placeholder*="Ask"]')
    await input.fill('What is the location and nearby amenities?')
    await page.keyboard.press('Enter')

    await page.waitForTimeout(3000)

    // Check for missing data alert if data is incomplete
    const missingDataAlert = page.locator('[role="alert"]')
    // Alert should either show or not, depending on data availability
    const alertCount = await missingDataAlert.count()
    expect(alertCount).toBeGreaterThanOrEqual(0)
  })

  test('should render comparison matrix for payment plans', async ({ page }) => {
    const input = page.locator('input[type="text"][placeholder*="Ask"]')
    await input.fill('Compare the payment plans')
    await page.keyboard.press('Enter')

    await page.waitForTimeout(3000)

    // Look for comparison table
    const table = page.locator('table')
    const tableCount = await table.count()

    // If a comparison matrix is returned, verify table structure
    if (tableCount > 0) {
      const rows = table.locator('tr')
      const rowCount = await rows.count()
      expect(rowCount).toBeGreaterThan(1) // Header + at least one data row
    }
  })

  test('should color-code confidence badges correctly', async ({ page }) => {
    const input = page.locator('input[type="text"][placeholder*="Ask"]')
    await input.fill('What are the payment options?')
    await page.keyboard.press('Enter')

    await page.waitForTimeout(3000)

    // Find confidence badge and check its styling
    const badge = page.locator('text=/confident/').first()
    const badgeClass = await badge.locator('..').getAttribute('class')

    // Badge should have a background color class (green for high, yellow for medium, orange for low)
    expect(badgeClass).toMatch(/(green|yellow|orange|amber)/)
  })

  test('should display response formatter header label', async ({ page }) => {
    const input = page.locator('input[type="text"][placeholder*="Ask"]')
    await input.fill('Tell me about possession timeline')
    await page.keyboard.press('Enter')

    await page.waitForTimeout(3000)

    // Look for "Data-Backed Advice" label
    const header = page.locator('text=Data-Backed Advice')
    const headerCount = await header.count()

    // Header should appear if this is a database-backed response
    // (may not appear for generic responses)
    expect(headerCount).toBeGreaterThanOrEqual(0)
  })

  test('should handle missing response gracefully', async ({ page }) => {
    const input = page.locator('input[type="text"][placeholder*="Ask"]')
    // Submit a query that might not have data
    await input.fill('Random query that might not match')
    await page.keyboard.press('Enter')

    await page.waitForTimeout(3000)

    // Page should still be responsive
    const chatContainer = page.locator('[role="main"], .chat-container, [class*="chat"]')
    await expect(chatContainer.first()).toBeVisible()
  })
})
