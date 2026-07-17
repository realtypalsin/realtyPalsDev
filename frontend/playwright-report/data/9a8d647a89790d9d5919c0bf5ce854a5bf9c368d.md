# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin-flow.test.ts >> Admin Flow E2E >> admin login page loads
- Location: e2e\admin-flow.test.ts:11:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('input[type="password"]')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('input[type="password"]')

```

```yaml
- text: missing required error components, refreshing...
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test'
  2   | 
  3   | test.describe('Admin Flow E2E', () => {
  4   |   const adminPassword = process.env.ADMIN_PASSWORD || 'test-password'
  5   | 
  6   |   test.beforeEach(async ({ page }) => {
  7   |     // Navigate to admin page
  8   |     await page.goto('/admin')
  9   |   })
  10  | 
  11  |   test('admin login page loads', async ({ page }) => {
  12  |     // Should see login form
  13  |     const passwordInput = page.locator('input[type="password"]')
  14  |     const loginButton = page.locator('button:has-text(/Login|Sign in/)')
  15  | 
> 16  |     await expect(passwordInput).toBeVisible()
      |                                 ^ Error: expect(locator).toBeVisible() failed
  17  |     await expect(loginButton).toBeVisible()
  18  |   })
  19  | 
  20  |   test('admin can login with correct password', async ({ page }) => {
  21  |     // Fill password
  22  |     const passwordInput = page.locator('input[type="password"]')
  23  |     await passwordInput.fill(adminPassword)
  24  | 
  25  |     // Submit
  26  |     const loginButton = page.locator('button:has-text(/Login|Sign in/)')
  27  |     await loginButton.click()
  28  | 
  29  |     // Should navigate to admin dashboard
  30  |     await page.waitForNavigation({ timeout: 5000 }).catch(() => {})
  31  |     await page.waitForTimeout(1000)
  32  | 
  33  |     // Should see admin interface (not login form anymore)
  34  |     const dashboard = page.locator('[data-testid="admin-dashboard"], [class*="Dashboard"]')
  35  |     const passwordInputStillVisible = await passwordInput.isVisible({ timeout: 1000 }).catch(() => false)
  36  | 
  37  |     // Either dashboard visible or password input should be gone
  38  |     const loggedIn = await dashboard.isVisible({ timeout: 2000 }).catch(() => false)
  39  |     expect(loggedIn || !passwordInputStillVisible).toBeTruthy()
  40  |   })
  41  | 
  42  |   test('admin sees statistics on dashboard', async ({ page }) => {
  43  |     // Login first
  44  |     const passwordInput = page.locator('input[type="password"]')
  45  |     await passwordInput.fill(adminPassword)
  46  |     const loginButton = page.locator('button:has-text(/Login|Sign in/)')
  47  |     await loginButton.click()
  48  | 
  49  |     // Wait for dashboard to load
  50  |     await page.waitForTimeout(2000)
  51  | 
  52  |     // Should display stats
  53  |     const statsContainer = page.locator('[data-testid*="stats"], [class*="Stats"]')
  54  |     const statsVisible = await statsContainer.isVisible({ timeout: 3000 }).catch(() => false)
  55  | 
  56  |     // Stats or admin content should be visible after login
  57  |     const adminContent = page.locator('text=/Projects|Sessions|Leads|Analytics/')
  58  |     const contentVisible = await adminContent.isVisible({ timeout: 2000 }).catch(() => false)
  59  | 
  60  |     expect(statsVisible || contentVisible).toBeTruthy()
  61  |   })
  62  | 
  63  |   test('admin can navigate to intelligence editors', async ({ page }) => {
  64  |     // Login
  65  |     const passwordInput = page.locator('input[type="password"]')
  66  |     await passwordInput.fill(adminPassword)
  67  |     const loginButton = page.locator('button:has-text(/Login|Sign in/)')
  68  |     await loginButton.click()
  69  | 
  70  |     await page.waitForTimeout(2000)
  71  | 
  72  |     // Look for intelligence editor navigation
  73  |     const intelligenceLink = page.locator('a:has-text(/Intelligence|Editor|Content/), button:has-text(/Intelligence/)')
  74  |     if (await intelligenceLink.isVisible({ timeout: 2000 })) {
  75  |       await intelligenceLink.click()
  76  | 
  77  |       // Should navigate to intelligence editor
  78  |       await page.waitForTimeout(1000)
  79  |       const editor = page.locator('[data-testid*="intelligence"], [class*="Editor"]')
  80  |       const isVisible = await editor.isVisible({ timeout: 2000 }).catch(() => false)
  81  |       expect(isVisible).toBeTruthy()
  82  |     }
  83  |   })
  84  | 
  85  |   test('admin can edit intelligence content', async ({ page }) => {
  86  |     // Login
  87  |     const passwordInput = page.locator('input[type="password"]')
  88  |     await passwordInput.fill(adminPassword)
  89  |     const loginButton = page.locator('button:has-text(/Login|Sign in/)')
  90  |     await loginButton.click()
  91  | 
  92  |     await page.waitForTimeout(2000)
  93  | 
  94  |     // Navigate to editor if available
  95  |     const editButton = page.locator('button:has-text(/Edit|Modify|Update/)')
  96  |     const editorInput = page.locator('textarea, input[type="text"][placeholder*="content" i]')
  97  | 
  98  |     if (await editButton.isVisible({ timeout: 2000 })) {
  99  |       await editButton.click()
  100 | 
  101 |       // Should be able to edit content
  102 |       if (await editorInput.isVisible({ timeout: 1000 })) {
  103 |         await editorInput.fill('Updated test content')
  104 | 
  105 |         // Should have save button
  106 |         const saveButton = page.locator('button:has-text(/Save|Submit/)')
  107 |         if (await saveButton.isVisible()) {
  108 |           await saveButton.click()
  109 | 
  110 |           // Should show success or saving state
  111 |           const successMsg = page.locator('text=/Saved|Success|Updated/')
  112 |           const isSaved = await successMsg.isVisible({ timeout: 3000 }).catch(() => false)
  113 |           expect(isSaved).toBeTruthy()
  114 |         }
  115 |       }
  116 |     }
```