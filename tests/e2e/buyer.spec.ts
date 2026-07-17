import { test, expect } from '@playwright/test'

test.describe('Buyer flow — discovery to callback', () => {
  test('should progress through discovery chat without repeating chips', async ({ page }) => {
    await page.goto('/discover')

    // Step 1: Initial chat
    const input = page.locator('input[placeholder*="What do you"]')
    await input.fill('Show me 3BHK properties under 1.5 crore in Noida')
    await page.keyboard.press('Enter')

    // Wait for response
    await page.waitForSelector('[data-testid="message-chip"]')
    const firstChips = await page.locator('[data-testid="message-chip"]').allTextContents()
    expect(firstChips.length).toBeLessThanOrEqual(4)

    // Step 2: Click first chip
    const firstChip = page.locator('[data-testid="message-chip"]').first()
    await firstChip.click()

    // Wait for new response
    await page.waitForTimeout(500)
    const secondChips = await page.locator('[data-testid="message-chip"]').allTextContents()

    // Verify no repeating chip labels
    const allChipLabels = [...firstChips, ...secondChips]
    const uniqueLabels = new Set(allChipLabels)
    expect(uniqueLabels.size).toBe(allChipLabels.length)
  })

  test('should load detail panel without G+26 floors', async ({ page }) => {
    await page.goto('/discover')

    // Chat to get results
    const input = page.locator('input[placeholder*="What do you"]')
    await input.fill('properties in Sector 150')
    await page.keyboard.press('Enter')

    // Wait for property card
    await page.waitForSelector('[data-testid="property-card"]')

    // Click property card
    const card = page.locator('[data-testid="property-card"]').first()
    await card.click()

    // Detail panel opens
    await page.waitForSelector('[data-testid="detail-panel"]')

    // Check Pricing tab loads
    const pricingTab = page.locator('button:has-text("Pricing")')
    await pricingTab.click()

    // Should not see G+26
    const hasG26 = await page.locator('text=G+26').count()
    expect(hasG26).toBe(0)
  })

  test('should handle callback request without fake success', async ({ page }) => {
    await page.goto('/discover')

    // Get a property
    const input = page.locator('input[placeholder*="What do you"]')
    await input.fill('properties')
    await page.keyboard.press('Enter')

    await page.waitForSelector('[data-testid="property-card"]')

    // Open detail
    const card = page.locator('[data-testid="property-card"]').first()
    await card.click()

    await page.waitForSelector('[data-testid="detail-panel"]')

    // Click callback button
    const callbackButton = page.locator('button:has-text(/Request callback|Callback/i)')
    if (await callbackButton.isVisible()) {
      await callbackButton.click()

      // Form opens
      await page.waitForSelector('input[name="phone"]')

      // Fill form
      await page.locator('input[name="phone"]').fill('9876543210')
      const submitButton = page.locator('button:has-text(/Submit|Send/i)')
      await submitButton.click()

      // Success modal should appear
      await page.waitForSelector('[data-testid="success-modal"]')
      const successText = page.locator('[data-testid="success-modal"]').textContent()
      expect(successText).toContain('callback')
    }
  })
})
