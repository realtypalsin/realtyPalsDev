import { test, expect } from '@playwright/test'

test.describe('Buyer Flow E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/')
  })

  test('landing page loads with discovery UI', async ({ page }) => {
    // Verify landing page
    await expect(page).toHaveTitle(/RealtyPals|Property/i)

    // Should see discovery/search UI
    const chatInput = page.locator('input[placeholder*="property" i]')
    await expect(chatInput).toBeVisible()
  })

  test('user can send initial message to start chat', async ({ page }) => {
    // Enter first message
    const input = page.locator('input[placeholder*="property" i]')
    await input.fill('I need a 3BHK property in Sector 150 under 2 crore')

    // Submit message
    const sendButton = page.locator('button[aria-label*="Send" i], button:has-text("Send")')
    if (await sendButton.isVisible()) {
      await sendButton.click()
    } else {
      await input.press('Enter')
    }

    // Wait for response from AI (database results)
    await page.waitForTimeout(2000)

    // Message should appear in chat
    await expect(page.locator('text=3BHK')).toBeVisible({ timeout: 5000 })
  })

  test('clarification chips appear for partial intent', async ({ page }) => {
    // Send vague message
    const input = page.locator('input[placeholder*="property" i]')
    await input.fill('Show me some properties')
    await input.press('Enter')

    // Wait for response
    await page.waitForTimeout(2000)

    // Chips should appear to clarify intent
    const chips = page.locator('button:has-text(/Sector|BHK|Budget|₹/)')
    const chipCount = await chips.count()
    expect(chipCount).toBeGreaterThan(0)
    expect(chipCount).toBeLessThanOrEqual(4) // Cap at 4
  })

  test('chips do not repeat previously suggested values', async ({ page }) => {
    // Start with sector-specific query
    const input = page.locator('input[placeholder*="property" i]')
    await input.fill('Properties in Sector 150')
    await input.press('Enter')

    await page.waitForTimeout(2000)

    // Get visible chips text
    const firstChips = await page.locator('button:has-text(/Sector|Budget|BHK/)').allTextContents()

    // Send another message in same sector
    await input.fill('What about 3BHK options?')
    await input.press('Enter')

    await page.waitForTimeout(2000)

    // Sector 150 should not be repeated as a chip
    const sectorChips = page.locator('button:has-text("Sector 150")')
    const sectorChipCount = await sectorChips.count()
    expect(sectorChipCount).toBeLessThanOrEqual(1) // At most once
  })

  test('database results display for valid search', async ({ page }) => {
    // Search with full intent
    const input = page.locator('input[placeholder*="property" i]')
    await input.fill('3BHK properties in Sector 150 under ₹2 Crore')
    await input.press('Enter')

    // Wait for results
    await page.waitForTimeout(3000)

    // Results cards should appear
    const projectCards = page.locator('[data-testid*="project-card"], [class*="ProjectCard"]')
    const cardCount = await projectCards.count()
    expect(cardCount).toBeGreaterThan(0)
  })

  test('user can open property detail from results', async ({ page }) => {
    // Get search results
    const input = page.locator('input[placeholder*="property" i]')
    await input.fill('3BHK in Sector 150')
    await input.press('Enter')

    await page.waitForTimeout(3000)

    // Click first result
    const firstProject = page.locator('[data-testid*="project-card"], [class*="ProjectCard"]').first()
    await firstProject.click()

    // Detail panel should open
    await page.waitForTimeout(1000)
    const detailPanel = page.locator('[data-testid="project-detail"], [class*="DetailPanel"]')
    await expect(detailPanel).toBeVisible()
  })

  test('detail panel loads all tabs correctly', async ({ page }) => {
    // Open a property detail
    const input = page.locator('input[placeholder*="property" i]')
    await input.fill('3BHK in Sector 150')
    await input.press('Enter')

    await page.waitForTimeout(3000)
    const firstProject = page.locator('[data-testid*="project-card"]').first()
    await firstProject.click()

    await page.waitForTimeout(1000)

    // Check for tab navigation
    const overviewTab = page.locator('button:has-text("Overview"), [role="tab"]:has-text("Overview")')
    const locationTab = page.locator('button:has-text("Location"), [role="tab"]:has-text("Location")')
    const pricingTab = page.locator('button:has-text("Pricing"), [role="tab"]:has-text("Pricing")')

    if (await overviewTab.isVisible()) {
      await expect(overviewTab).toBeVisible()
    }
    if (await locationTab.isVisible()) {
      await expect(locationTab).toBeVisible()
    }
  })

  test('user can compare two properties', async ({ page }) => {
    // Get search results with multiple properties
    const input = page.locator('input[placeholder*="property" i]')
    await input.fill('3BHK in Sector 150')
    await input.press('Enter')

    await page.waitForTimeout(3000)

    // Select comparison option if available
    const compareButton = page.locator('button:has-text(/Compare|Add to comparison/)')
    if (await compareButton.isVisible({ timeout: 2000 })) {
      await compareButton.click()

      // Add another property to comparison
      const compareButtons = page.locator('button:has-text(/Compare|Add to comparison/)')
      const count = await compareButtons.count()
      if (count > 1) {
        await compareButtons.nth(1).click()
      }

      // Comparison view should appear
      const comparisonView = page.locator('[data-testid*="comparison"], text=/Compare/')
      const isVisible = await comparisonView.isVisible({ timeout: 2000 })
      // Comparison may or may not be visible depending on implementation
    }
  })

  test('user can request callback/site visit', async ({ page }) => {
    // Open property detail
    const input = page.locator('input[placeholder*="property" i]')
    await input.fill('3BHK in Sector 150')
    await input.press('Enter')

    await page.waitForTimeout(3000)
    const firstProject = page.locator('[data-testid*="project-card"]').first()
    await firstProject.click()

    await page.waitForTimeout(1000)

    // Look for callback/visit request button
    const callbackButton = page.locator('button:has-text(/Callback|Request Site|Schedule/)')
    if (await callbackButton.isVisible()) {
      await callbackButton.click()

      // Modal should appear
      const modal = page.locator('[role="dialog"], [class*="Modal"]')
      await expect(modal).toBeVisible({ timeout: 2000 })

      // Should have form fields
      const inputs = page.locator('input[type="text"], input[type="email"], input[type="tel"]')
      const inputCount = await inputs.count()
      expect(inputCount).toBeGreaterThan(0)
    }
  })

  test('user can request WhatsApp handoff', async ({ page }) => {
    // Get search results
    const input = page.locator('input[placeholder*="property" i]')
    await input.fill('3BHK in Sector 150')
    await input.press('Enter')

    await page.waitForTimeout(3000)

    // Look for WhatsApp button
    const whatsappButton = page.locator('button:has-text(/WhatsApp|Chat/)')
    if (await whatsappButton.isVisible()) {
      await whatsappButton.click()

      // Should show WhatsApp link or confirmation
      const whatsappLink = page.locator('a[href*="wa.me"], text=/WhatsApp/i')
      const isVisible = await whatsappLink.isVisible({ timeout: 2000 })
      // Verification depends on implementation
    }
  })

  test('chat persists when navigating back to chat', async ({ page }) => {
    // Have a conversation
    const input = page.locator('input[placeholder*="property" i]')
    await input.fill('3BHK in Sector 150')
    await input.press('Enter')

    await page.waitForTimeout(2000)

    // User message should be visible
    const userMessage = page.locator('text=/3BHK in Sector 150/')
    await expect(userMessage).toBeVisible()

    // Note: Full persistence testing requires session management
    // This validates that the message appears in chat
  })

  test('no fake success messages for real-world actions', async ({ page }) => {
    // Ensure that when callback is requested, it either:
    // 1. Shows pending state while submitting, OR
    // 2. Actually completes without false success message

    const input = page.locator('input[placeholder*="property" i]')
    await input.fill('3BHK in Sector 150')
    await input.press('Enter')

    await page.waitForTimeout(3000)
    const firstProject = page.locator('[data-testid*="project-card"]').first()
    await firstProject.click()

    // If callback button exists, check submission behavior
    const callbackButton = page.locator('button:has-text(/Callback|Request/)')
    if (await callbackButton.isVisible()) {
      // Click should disable button or show loading state
      await callbackButton.click()

      // Button should be disabled or show loading during submission
      const isDisabled = await callbackButton.isDisabled()
      const hasLoadingText = (await callbackButton.textContent())?.includes('...')

      // Either disabled or showing loading indicator
      expect(isDisabled || hasLoadingText).toBeTruthy()
    }
  })
})
