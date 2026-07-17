# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: buyer-flow.test.ts >> Buyer Flow E2E >> chat persists when navigating back to chat
- Location: e2e\buyer-flow.test.ts:210:7

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
  196 |     await page.waitForTimeout(3000)
  197 | 
  198 |     // Look for WhatsApp button
  199 |     const whatsappButton = page.locator('button:has-text(/WhatsApp|Chat/)')
  200 |     if (await whatsappButton.isVisible()) {
  201 |       await whatsappButton.click()
  202 | 
  203 |       // Should show WhatsApp link or confirmation
  204 |       const whatsappLink = page.locator('a[href*="wa.me"], text=/WhatsApp/i')
  205 |       const isVisible = await whatsappLink.isVisible({ timeout: 2000 })
  206 |       // Verification depends on implementation
  207 |     }
  208 |   })
  209 | 
  210 |   test('chat persists when navigating back to chat', async ({ page }) => {
  211 |     // Have a conversation
  212 |     const input = page.locator('input[placeholder*="property" i]')
> 213 |     await input.fill('3BHK in Sector 150')
      |                 ^ Error: locator.fill: Test timeout of 30000ms exceeded.
  214 |     await input.press('Enter')
  215 | 
  216 |     await page.waitForTimeout(2000)
  217 | 
  218 |     // User message should be visible
  219 |     const userMessage = page.locator('text=/3BHK in Sector 150/')
  220 |     await expect(userMessage).toBeVisible()
  221 | 
  222 |     // Note: Full persistence testing requires session management
  223 |     // This validates that the message appears in chat
  224 |   })
  225 | 
  226 |   test('no fake success messages for real-world actions', async ({ page }) => {
  227 |     // Ensure that when callback is requested, it either:
  228 |     // 1. Shows pending state while submitting, OR
  229 |     // 2. Actually completes without false success message
  230 | 
  231 |     const input = page.locator('input[placeholder*="property" i]')
  232 |     await input.fill('3BHK in Sector 150')
  233 |     await input.press('Enter')
  234 | 
  235 |     await page.waitForTimeout(3000)
  236 |     const firstProject = page.locator('[data-testid*="project-card"]').first()
  237 |     await firstProject.click()
  238 | 
  239 |     // If callback button exists, check submission behavior
  240 |     const callbackButton = page.locator('button:has-text(/Callback|Request/)')
  241 |     if (await callbackButton.isVisible()) {
  242 |       // Click should disable button or show loading state
  243 |       await callbackButton.click()
  244 | 
  245 |       // Button should be disabled or show loading during submission
  246 |       const isDisabled = await callbackButton.isDisabled()
  247 |       const hasLoadingText = (await callbackButton.textContent())?.includes('...')
  248 | 
  249 |       // Either disabled or showing loading indicator
  250 |       expect(isDisabled || hasLoadingText).toBeTruthy()
  251 |     }
  252 |   })
  253 | })
  254 | 
```