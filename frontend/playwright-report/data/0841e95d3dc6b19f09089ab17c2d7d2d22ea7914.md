# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: buyer-flow.test.ts >> Buyer Flow E2E >> user can open property detail from results
- Location: e2e\buyer-flow.test.ts:92:7

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
  21  |     await input.fill('I need a 3BHK property in Sector 150 under 2 crore')
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
> 95  |     await input.fill('3BHK in Sector 150')
      |                 ^ Error: locator.fill: Test timeout of 30000ms exceeded.
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
  122 |     // Check for tab navigation
  123 |     const overviewTab = page.locator('button:has-text("Overview"), [role="tab"]:has-text("Overview")')
  124 |     const locationTab = page.locator('button:has-text("Location"), [role="tab"]:has-text("Location")')
  125 |     const pricingTab = page.locator('button:has-text("Pricing"), [role="tab"]:has-text("Pricing")')
  126 | 
  127 |     if (await overviewTab.isVisible()) {
  128 |       await expect(overviewTab).toBeVisible()
  129 |     }
  130 |     if (await locationTab.isVisible()) {
  131 |       await expect(locationTab).toBeVisible()
  132 |     }
  133 |   })
  134 | 
  135 |   test('user can compare two properties', async ({ page }) => {
  136 |     // Get search results with multiple properties
  137 |     const input = page.locator('input[placeholder*="property" i]')
  138 |     await input.fill('3BHK in Sector 150')
  139 |     await input.press('Enter')
  140 | 
  141 |     await page.waitForTimeout(3000)
  142 | 
  143 |     // Select comparison option if available
  144 |     const compareButton = page.locator('button:has-text(/Compare|Add to comparison/)')
  145 |     if (await compareButton.isVisible({ timeout: 2000 })) {
  146 |       await compareButton.click()
  147 | 
  148 |       // Add another property to comparison
  149 |       const compareButtons = page.locator('button:has-text(/Compare|Add to comparison/)')
  150 |       const count = await compareButtons.count()
  151 |       if (count > 1) {
  152 |         await compareButtons.nth(1).click()
  153 |       }
  154 | 
  155 |       // Comparison view should appear
  156 |       const comparisonView = page.locator('[data-testid*="comparison"], text=/Compare/')
  157 |       const isVisible = await comparisonView.isVisible({ timeout: 2000 })
  158 |       // Comparison may or may not be visible depending on implementation
  159 |     }
  160 |   })
  161 | 
  162 |   test('user can request callback/site visit', async ({ page }) => {
  163 |     // Open property detail
  164 |     const input = page.locator('input[placeholder*="property" i]')
  165 |     await input.fill('3BHK in Sector 150')
  166 |     await input.press('Enter')
  167 | 
  168 |     await page.waitForTimeout(3000)
  169 |     const firstProject = page.locator('[data-testid*="project-card"]').first()
  170 |     await firstProject.click()
  171 | 
  172 |     await page.waitForTimeout(1000)
  173 | 
  174 |     // Look for callback/visit request button
  175 |     const callbackButton = page.locator('button:has-text(/Callback|Request Site|Schedule/)')
  176 |     if (await callbackButton.isVisible()) {
  177 |       await callbackButton.click()
  178 | 
  179 |       // Modal should appear
  180 |       const modal = page.locator('[role="dialog"], [class*="Modal"]')
  181 |       await expect(modal).toBeVisible({ timeout: 2000 })
  182 | 
  183 |       // Should have form fields
  184 |       const inputs = page.locator('input[type="text"], input[type="email"], input[type="tel"]')
  185 |       const inputCount = await inputs.count()
  186 |       expect(inputCount).toBeGreaterThan(0)
  187 |     }
  188 |   })
  189 | 
  190 |   test('user can request WhatsApp handoff', async ({ page }) => {
  191 |     // Get search results
  192 |     const input = page.locator('input[placeholder*="property" i]')
  193 |     await input.fill('3BHK in Sector 150')
  194 |     await input.press('Enter')
  195 | 
```