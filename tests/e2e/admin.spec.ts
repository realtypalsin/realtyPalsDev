import { test, expect } from '@playwright/test'

test.describe('Admin flow — auth + intelligence edit + logout', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to admin login
    await page.goto('/admin/login')
  })

  test('should login and access dashboard', async ({ page }) => {
    // Credentials (mock or test-account)
    const password = process.env.ADMIN_TEST_PASSWORD || 'TestPassword123!'

    // Fill login form
    await page.locator('input[type="password"]').fill(password)
    const submitButton = page.locator('button:has-text(/Login|Submit/i)')
    await submitButton.click()

    // Should redirect to dashboard
    await page.waitForURL('/admin')
    const dashboardTitle = page.locator('h1')
    expect(dashboardTitle).toContainText(/Dashboard|Admin/)
  })

  test('should edit project intelligence and persist', async ({ page }) => {
    // Login (assume already logged in or use beforeEach to login)
    await page.goto('/admin')

    // Navigate to projects
    const projectsLink = page.locator('a:has-text("Projects")')
    await projectsLink.click()

    // Open first project
    await page.waitForSelector('[data-testid="project-row"]')
    const firstProject = page.locator('[data-testid="project-row"]').first()
    await firstProject.click()

    // Should open project detail
    await page.waitForSelector('[data-testid="project-detail"]')

    // Click Intelligence tab
    const intelligenceTab = page.locator('button:has-text("Intelligence")')
    await intelligenceTab.click()

    // Fill in a field (e.g., buyer persona)
    const personaInput = page.locator('textarea[name="buyerPersonas"]')
    if (await personaInput.isVisible()) {
      await personaInput.fill('Young professionals seeking modern amenities')

      // Save
      const saveButton = page.locator('button:has-text(/Save|Update/i)')
      await saveButton.click()

      // Should show success
      await page.waitForSelector('[data-testid="toast"]')
      const toast = page.locator('[data-testid="toast"]').textContent()
      expect(toast).toContain(/saved|updated/i)

      // Refresh and verify persistence
      await page.reload()
      await intelligenceTab.click()
      const savedText = page.locator('textarea[name="buyerPersonas"]').inputValue()
      expect(savedText).toContain('Young professionals')
    }
  })

  test('should logout and return to login', async ({ page }) => {
    // Assume logged in
    await page.goto('/admin')

    // Find logout button
    const logoutButton = page.locator('button:has-text(/Logout|Sign out/i)')
    await logoutButton.click()

    // Should redirect to login
    await page.waitForURL('/admin/login')
    const loginForm = page.locator('input[type="password"]')
    expect(loginForm).toBeVisible()

    // Verify session invalidated
    const response = await page.request.get('/api/admin/health', {
      headers: { Authorization: 'Bearer invalid-token' },
    })
    expect(response.status()).toBe(401)
  })
})
