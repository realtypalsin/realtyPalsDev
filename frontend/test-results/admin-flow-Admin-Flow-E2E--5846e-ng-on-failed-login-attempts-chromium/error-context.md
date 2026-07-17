# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin-flow.test.ts >> Admin Flow E2E >> rate limiting on failed login attempts
- Location: e2e\admin-flow.test.ts:230:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('input[type="password"]')

```

# Page snapshot

```yaml
- generic [ref=e2]: missing required error components, refreshing...
```

# Test source

```ts
  136 |       if (await saveButton.isVisible()) {
  137 |         await saveButton.click()
  138 |         await page.waitForTimeout(1500)
  139 | 
  140 |         // Refresh page
  141 |         await page.reload()
  142 |         await page.waitForTimeout(2000)
  143 | 
  144 |         // Re-login if needed
  145 |         const passwordInputAfterRefresh = page.locator('input[type="password"]')
  146 |         if (await passwordInputAfterRefresh.isVisible({ timeout: 1000 })) {
  147 |           await passwordInputAfterRefresh.fill(adminPassword)
  148 |           await page.locator('button:has-text(/Login|Sign in/)').click()
  149 |           await page.waitForTimeout(2000)
  150 |         }
  151 | 
  152 |         // Content should still be there
  153 |         const savedContent = page.locator(`text=${testContent}`)
  154 |         const isPersisted = await savedContent.isVisible({ timeout: 2000 }).catch(() => false)
  155 |         expect(isPersisted).toBeTruthy()
  156 |       }
  157 |     }
  158 |   })
  159 | 
  160 |   test('admin session is invalidated after logout', async ({ page }) => {
  161 |     // Login
  162 |     const passwordInput = page.locator('input[type="password"]')
  163 |     await passwordInput.fill(adminPassword)
  164 |     const loginButton = page.locator('button:has-text(/Login|Sign in/)')
  165 |     await loginButton.click()
  166 | 
  167 |     await page.waitForTimeout(2000)
  168 | 
  169 |     // Find logout button
  170 |     const logoutButton = page.locator('button:has-text(/Logout|Sign out|Exit/)')
  171 |     if (await logoutButton.isVisible()) {
  172 |       await logoutButton.click()
  173 | 
  174 |       // Should redirect to login or public page
  175 |       await page.waitForTimeout(1000)
  176 | 
  177 |       // Should no longer have admin access
  178 |       const adminContent = page.locator('[data-testid="admin-dashboard"], [class*="AdminPanel"]')
  179 |       const isAdminVisible = await adminContent.isVisible({ timeout: 2000 }).catch(() => false)
  180 |       expect(!isAdminVisible).toBeTruthy()
  181 | 
  182 |       // Login form should be visible again
  183 |       const loginFormVisible = await page.locator('input[type="password"]').isVisible({ timeout: 2000 }).catch(() => false)
  184 |       expect(loginFormVisible).toBeTruthy()
  185 |     }
  186 |   })
  187 | 
  188 |   test('invalid password is rejected', async ({ page }) => {
  189 |     // Try wrong password
  190 |     const passwordInput = page.locator('input[type="password"]')
  191 |     await passwordInput.fill('wrong-password-xyz')
  192 | 
  193 |     const loginButton = page.locator('button:has-text(/Login|Sign in/)')
  194 |     await loginButton.click()
  195 | 
  196 |     // Should show error
  197 |     await page.waitForTimeout(1500)
  198 | 
  199 |     const errorMsg = page.locator('text=/Invalid|Incorrect|Failed/')
  200 |     const isErrorVisible = await errorMsg.isVisible({ timeout: 2000 }).catch(() => false)
  201 | 
  202 |     // Either error shown or login form still visible (not logged in)
  203 |     const stillOnLogin = await passwordInput.isVisible({ timeout: 1000 })
  204 |     expect(isErrorVisible || stillOnLogin).toBeTruthy()
  205 |   })
  206 | 
  207 |   test('admin can view analytics', async ({ page }) => {
  208 |     // Login
  209 |     const passwordInput = page.locator('input[type="password"]')
  210 |     await passwordInput.fill(adminPassword)
  211 |     const loginButton = page.locator('button:has-text(/Login|Sign in/)')
  212 |     await loginButton.click()
  213 | 
  214 |     await page.waitForTimeout(2000)
  215 | 
  216 |     // Navigate to analytics if available
  217 |     const analyticsLink = page.locator('a:has-text(/Analytics|Reports|Metrics/)')
  218 |     if (await analyticsLink.isVisible({ timeout: 2000 })) {
  219 |       await analyticsLink.click()
  220 | 
  221 |       await page.waitForTimeout(1500)
  222 | 
  223 |       // Should display analytics data
  224 |       const analyticsContent = page.locator('[data-testid*="analytics"], text=/Users|Sessions|Leads/')
  225 |       const isVisible = await analyticsContent.isVisible({ timeout: 2000 }).catch(() => false)
  226 |       expect(isVisible).toBeTruthy()
  227 |     }
  228 |   })
  229 | 
  230 |   test('rate limiting on failed login attempts', async ({ page }) => {
  231 |     // Try logging in with wrong password multiple times
  232 |     const passwordInput = page.locator('input[type="password"]')
  233 |     const loginButton = page.locator('button:has-text(/Login|Sign in/)')
  234 | 
  235 |     for (let i = 0; i < 3; i++) {
> 236 |       await passwordInput.fill('wrong-password')
      |                           ^ Error: locator.fill: Test timeout of 30000ms exceeded.
  237 |       await loginButton.click()
  238 |       await page.waitForTimeout(500)
  239 |     }
  240 | 
  241 |     // After multiple attempts, should either:
  242 |     // 1. Show rate limit error, or
  243 |     // 2. Disable login temporarily
  244 | 
  245 |     const rateLimitMsg = page.locator('text=/Try again later|Too many|Rate limit/')
  246 |     const isRateLimited = await rateLimitMsg.isVisible({ timeout: 2000 }).catch(() => false)
  247 | 
  248 |     const isButtonDisabled = await loginButton.isDisabled()
  249 | 
  250 |     expect(isRateLimited || isButtonDisabled).toBeTruthy()
  251 |   })
  252 | })
  253 | 
```