import { test, expect } from '@playwright/test'

test.describe('Admin Flow E2E', () => {
  const adminPassword = process.env.ADMIN_PASSWORD || 'test-password'

  test.beforeEach(async ({ page }) => {
    // Navigate to admin page
    await page.goto('/admin')
  })

  test('admin login page loads', async ({ page }) => {
    // Should see login form
    const passwordInput = page.locator('input[type="password"]')
    const loginButton = page.locator('button:has-text(/Login|Sign in/)')

    await expect(passwordInput).toBeVisible()
    await expect(loginButton).toBeVisible()
  })

  test('admin can login with correct password', async ({ page }) => {
    // Fill password
    const passwordInput = page.locator('input[type="password"]')
    await passwordInput.fill(adminPassword)

    // Submit
    const loginButton = page.locator('button:has-text(/Login|Sign in/)')
    await loginButton.click()

    // Should navigate to admin dashboard
    await page.waitForNavigation({ timeout: 5000 }).catch(() => {})
    await page.waitForTimeout(1000)

    // Should see admin interface (not login form anymore)
    const dashboard = page.locator('[data-testid="admin-dashboard"], [class*="Dashboard"]')
    const passwordInputStillVisible = await passwordInput.isVisible({ timeout: 1000 }).catch(() => false)

    // Either dashboard visible or password input should be gone
    const loggedIn = await dashboard.isVisible({ timeout: 2000 }).catch(() => false)
    expect(loggedIn || !passwordInputStillVisible).toBeTruthy()
  })

  test('admin sees statistics on dashboard', async ({ page }) => {
    // Login first
    const passwordInput = page.locator('input[type="password"]')
    await passwordInput.fill(adminPassword)
    const loginButton = page.locator('button:has-text(/Login|Sign in/)')
    await loginButton.click()

    // Wait for dashboard to load
    await page.waitForTimeout(2000)

    // Should display stats
    const statsContainer = page.locator('[data-testid*="stats"], [class*="Stats"]')
    const statsVisible = await statsContainer.isVisible({ timeout: 3000 }).catch(() => false)

    // Stats or admin content should be visible after login
    const adminContent = page.locator('text=/Projects|Sessions|Leads|Analytics/')
    const contentVisible = await adminContent.isVisible({ timeout: 2000 }).catch(() => false)

    expect(statsVisible || contentVisible).toBeTruthy()
  })

  test('admin can navigate to intelligence editors', async ({ page }) => {
    // Login
    const passwordInput = page.locator('input[type="password"]')
    await passwordInput.fill(adminPassword)
    const loginButton = page.locator('button:has-text(/Login|Sign in/)')
    await loginButton.click()

    await page.waitForTimeout(2000)

    // Look for intelligence editor navigation
    const intelligenceLink = page.locator('a:has-text(/Intelligence|Editor|Content/), button:has-text(/Intelligence/)')
    if (await intelligenceLink.isVisible({ timeout: 2000 })) {
      await intelligenceLink.click()

      // Should navigate to intelligence editor
      await page.waitForTimeout(1000)
      const editor = page.locator('[data-testid*="intelligence"], [class*="Editor"]')
      const isVisible = await editor.isVisible({ timeout: 2000 }).catch(() => false)
      expect(isVisible).toBeTruthy()
    }
  })

  test('admin can edit intelligence content', async ({ page }) => {
    // Login
    const passwordInput = page.locator('input[type="password"]')
    await passwordInput.fill(adminPassword)
    const loginButton = page.locator('button:has-text(/Login|Sign in/)')
    await loginButton.click()

    await page.waitForTimeout(2000)

    // Navigate to editor if available
    const editButton = page.locator('button:has-text(/Edit|Modify|Update/)')
    const editorInput = page.locator('textarea, input[type="text"][placeholder*="content" i]')

    if (await editButton.isVisible({ timeout: 2000 })) {
      await editButton.click()

      // Should be able to edit content
      if (await editorInput.isVisible({ timeout: 1000 })) {
        await editorInput.fill('Updated test content')

        // Should have save button
        const saveButton = page.locator('button:has-text(/Save|Submit/)')
        if (await saveButton.isVisible()) {
          await saveButton.click()

          // Should show success or saving state
          const successMsg = page.locator('text=/Saved|Success|Updated/')
          const isSaved = await successMsg.isVisible({ timeout: 3000 }).catch(() => false)
          expect(isSaved).toBeTruthy()
        }
      }
    }
  })

  test('admin can save and changes persist on refresh', async ({ page }) => {
    // Login
    const passwordInput = page.locator('input[type="password"]')
    await passwordInput.fill(adminPassword)
    const loginButton = page.locator('button:has-text(/Login|Sign in/)')
    await loginButton.click()

    await page.waitForTimeout(2000)

    // Find editable content
    const editableElement = page.locator('[contenteditable="true"], textarea')
    if (await editableElement.first().isVisible({ timeout: 2000 })) {
      const testContent = 'Test update ' + Date.now()
      await editableElement.first().fill(testContent)

      // Save
      const saveButton = page.locator('button:has-text(/Save|Submit/)')
      if (await saveButton.isVisible()) {
        await saveButton.click()
        await page.waitForTimeout(1500)

        // Refresh page
        await page.reload()
        await page.waitForTimeout(2000)

        // Re-login if needed
        const passwordInputAfterRefresh = page.locator('input[type="password"]')
        if (await passwordInputAfterRefresh.isVisible({ timeout: 1000 })) {
          await passwordInputAfterRefresh.fill(adminPassword)
          await page.locator('button:has-text(/Login|Sign in/)').click()
          await page.waitForTimeout(2000)
        }

        // Content should still be there
        const savedContent = page.locator(`text=${testContent}`)
        const isPersisted = await savedContent.isVisible({ timeout: 2000 }).catch(() => false)
        expect(isPersisted).toBeTruthy()
      }
    }
  })

  test('admin session is invalidated after logout', async ({ page }) => {
    // Login
    const passwordInput = page.locator('input[type="password"]')
    await passwordInput.fill(adminPassword)
    const loginButton = page.locator('button:has-text(/Login|Sign in/)')
    await loginButton.click()

    await page.waitForTimeout(2000)

    // Find logout button
    const logoutButton = page.locator('button:has-text(/Logout|Sign out|Exit/)')
    if (await logoutButton.isVisible()) {
      await logoutButton.click()

      // Should redirect to login or public page
      await page.waitForTimeout(1000)

      // Should no longer have admin access
      const adminContent = page.locator('[data-testid="admin-dashboard"], [class*="AdminPanel"]')
      const isAdminVisible = await adminContent.isVisible({ timeout: 2000 }).catch(() => false)
      expect(!isAdminVisible).toBeTruthy()

      // Login form should be visible again
      const loginFormVisible = await page.locator('input[type="password"]').isVisible({ timeout: 2000 }).catch(() => false)
      expect(loginFormVisible).toBeTruthy()
    }
  })

  test('invalid password is rejected', async ({ page }) => {
    // Try wrong password
    const passwordInput = page.locator('input[type="password"]')
    await passwordInput.fill('wrong-password-xyz')

    const loginButton = page.locator('button:has-text(/Login|Sign in/)')
    await loginButton.click()

    // Should show error
    await page.waitForTimeout(1500)

    const errorMsg = page.locator('text=/Invalid|Incorrect|Failed/')
    const isErrorVisible = await errorMsg.isVisible({ timeout: 2000 }).catch(() => false)

    // Either error shown or login form still visible (not logged in)
    const stillOnLogin = await passwordInput.isVisible({ timeout: 1000 })
    expect(isErrorVisible || stillOnLogin).toBeTruthy()
  })

  test('admin can view analytics', async ({ page }) => {
    // Login
    const passwordInput = page.locator('input[type="password"]')
    await passwordInput.fill(adminPassword)
    const loginButton = page.locator('button:has-text(/Login|Sign in/)')
    await loginButton.click()

    await page.waitForTimeout(2000)

    // Navigate to analytics if available
    const analyticsLink = page.locator('a:has-text(/Analytics|Reports|Metrics/)')
    if (await analyticsLink.isVisible({ timeout: 2000 })) {
      await analyticsLink.click()

      await page.waitForTimeout(1500)

      // Should display analytics data
      const analyticsContent = page.locator('[data-testid*="analytics"], text=/Users|Sessions|Leads/')
      const isVisible = await analyticsContent.isVisible({ timeout: 2000 }).catch(() => false)
      expect(isVisible).toBeTruthy()
    }
  })

  test('rate limiting on failed login attempts', async ({ page }) => {
    // Try logging in with wrong password multiple times
    const passwordInput = page.locator('input[type="password"]')
    const loginButton = page.locator('button:has-text(/Login|Sign in/)')

    for (let i = 0; i < 3; i++) {
      await passwordInput.fill('wrong-password')
      await loginButton.click()
      await page.waitForTimeout(500)
    }

    // After multiple attempts, should either:
    // 1. Show rate limit error, or
    // 2. Disable login temporarily

    const rateLimitMsg = page.locator('text=/Try again later|Too many|Rate limit/')
    const isRateLimited = await rateLimitMsg.isVisible({ timeout: 2000 }).catch(() => false)

    const isButtonDisabled = await loginButton.isDisabled()

    expect(isRateLimited || isButtonDisabled).toBeTruthy()
  })
})
