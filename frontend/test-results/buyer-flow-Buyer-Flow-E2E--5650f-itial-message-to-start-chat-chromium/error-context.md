# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: buyer-flow.test.ts >> Buyer Flow E2E >> user can send initial message to start chat
- Location: e2e\buyer-flow.test.ts:18:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('input[placeholder*="property" i]')

```

# Page snapshot

```yaml
- generic [ref=e2]: missing required error components, refreshing...
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test'
  2   | 
  3   | test.describe('Buyer Flow E2E', () => {
  4   |   test.beforeEach(async ({ page }) => {
  5   |     // Navigate to the app
  6   |     await page.goto('/')
  7   |   })
  8   | 
  9   |   test('landing page loads with discovery UI', async ({ page }) => {
  10  |     // Verify landing page
  11  |     await expect(page).toHaveTitle(/RealtyPals|Property/i)
  12  | 
  13  |     // Should see discovery/search UI
  14  |     const chatInput = page.locator('input[placeholder*="property" i]')
  15  |     await expect(chatInput).toBeVisible()
  16  |   })
  17  | 
  18  |   test('user can send initial message to start chat', async ({ page }) => {
  19  |     // Enter first message
  20  |     const input = page.locator('input[placeholder*="property" i]')
> 21  |     await input.fill('I need a 3BHK property in Sector 150 under 2 crore')
      |                 ^ Error: locator.fill: Test timeout of 30000ms exceeded.
  22  | 
  23  |     // Submit message
  24  |     const sendButton = page.locator('button[aria-label*="Send" i], button:has-text("Send")')
  25  |     if (await sendButton.isVisible()) {
  26  |       await sendButton.click()
  27  |     } else {
  28  |       await input.press('Enter')
  29  |     }
  30  | 
  31  |     // Wait for response from AI (database results)
  32  |     await page.waitForTimeout(2000)
  33  | 
  34  |     // Message should appear in chat
  35  |     await expect(page.locator('text=3BHK')).toBeVisible({ timeout: 5000 })
  36  |   })
  37  | 
  38  |   test('clarification chips appear for partial intent', async ({ page }) => {
  39  |     // Send vague message
  40  |     const input = page.locator('input[placeholder*="property" i]')
  41  |     await input.fill('Show me some properties')
  42  |     await input.press('Enter')
  43  | 
  44  |     // Wait for response
  45  |     await page.waitForTimeout(2000)
  46  | 
  47  |     // Chips should appear to clarify intent
  48  |     const chips = page.locator('button:has-text(/Sector|BHK|Budget|₹/)')
  49  |     const chipCount = await chips.count()
  50  |     expect(chipCount).toBeGreaterThan(0)
  51  |     expect(chipCount).toBeLessThanOrEqual(4) // Cap at 4
  52  |   })
  53  | 
  54  |   test('chips do not repeat previously suggested values', async ({ page }) => {
  55  |     // Start with sector-specific query
  56  |     const input = page.locator('input[placeholder*="property" i]')
  57  |     await input.fill('Properties in Sector 150')
  58  |     await input.press('Enter')
  59  | 
  60  |     await page.waitForTimeout(2000)
  61  | 
  62  |     // Get visible chips text
  63  |     const firstChips = await page.locator('button:has-text(/Sector|Budget|BHK/)').allTextContents()
  64  | 
  65  |     // Send another message in same sector
  66  |     await input.fill('What about 3BHK options?')
  67  |     await input.press('Enter')
  68  | 
  69  |     await page.waitForTimeout(2000)
  70  | 
  71  |     // Sector 150 should not be repeated as a chip
  72  |     const sectorChips = page.locator('button:has-text("Sector 150")')
  73  |     const sectorChipCount = await sectorChips.count()
  74  |     expect(sectorChipCount).toBeLessThanOrEqual(1) // At most once
  75  |   })
  76  | 
  77  |   test('database results display for valid search', async ({ page }) => {
  78  |     // Search with full intent
  79  |     const input = page.locator('input[placeholder*="property" i]')
  80  |     await input.fill('3BHK properties in Sector 150 under ₹2 Crore')
  81  |     await input.press('Enter')
  82  | 
  83  |     // Wait for results
  84  |     await page.waitForTimeout(3000)
  85  | 
  86  |     // Results cards should appear
  87  |     const projectCards = page.locator('[data-testid*="project-card"], [class*="ProjectCard"]')
  88  |     const cardCount = await projectCards.count()
  89  |     expect(cardCount).toBeGreaterThan(0)
  90  |   })
  91  | 
  92  |   test('user can open property detail from results', async ({ page }) => {
  93  |     // Get search results
  94  |     const input = page.locator('input[placeholder*="property" i]')
  95  |     await input.fill('3BHK in Sector 150')
  96  |     await input.press('Enter')
  97  | 
  98  |     await page.waitForTimeout(3000)
  99  | 
  100 |     // Click first result
  101 |     const firstProject = page.locator('[data-testid*="project-card"], [class*="ProjectCard"]').first()
  102 |     await firstProject.click()
  103 | 
  104 |     // Detail panel should open
  105 |     await page.waitForTimeout(1000)
  106 |     const detailPanel = page.locator('[data-testid="project-detail"], [class*="DetailPanel"]')
  107 |     await expect(detailPanel).toBeVisible()
  108 |   })
  109 | 
  110 |   test('detail panel loads all tabs correctly', async ({ page }) => {
  111 |     // Open a property detail
  112 |     const input = page.locator('input[placeholder*="property" i]')
  113 |     await input.fill('3BHK in Sector 150')
  114 |     await input.press('Enter')
  115 | 
  116 |     await page.waitForTimeout(3000)
  117 |     const firstProject = page.locator('[data-testid*="project-card"]').first()
  118 |     await firstProject.click()
  119 | 
  120 |     await page.waitForTimeout(1000)
  121 | 
```