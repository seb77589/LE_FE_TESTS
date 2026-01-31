import { test, expect } from '@playwright/test'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '../../config/.env') })

test.describe('Authentication Flow', () => {
  test('Login should redirect to dashboard', async ({ page }) => {
    // Use automated test credentials (NOT manual testing accounts which are protected)
    const email = process.env.TEST_ADMIN_EMAIL || 'test-admin@example.com'
    const password = process.env.TEST_ADMIN_PASSWORD || process.env.TEST_USER_PASSWORD || 'TestB!2b@5fU7'
    
    console.log(`Testing login for: ${email}`)
    
    // Track console for errors
    const consoleErrors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })
    
    // Step 1: Navigate to login page
    await page.goto('http://localhost:3000/auth/login', { waitUntil: 'networkidle' })
    expect(page.url()).toContain('/auth/login')
    
    // Step 2: Fill in credentials
    const emailInput = page.locator('input[type="email"], input[name="email"]').first()
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first()
    const submitButton = page.locator('button[type="submit"]')
    
    await emailInput.fill(email)
    await passwordInput.fill(password)
    
    // Step 3: Submit and wait for navigation
    console.log('Submitting login form...')
    
    // Click submit button
    await submitButton.click()
    
    // Wait for navigation to dashboard (with extended timeout for slow responses)
    try {
      await page.waitForURL('**/dashboard**', { timeout: 30000 })
      console.log('✅ Successfully redirected to dashboard!')
      
      // Verify we're authenticated by checking for dashboard elements
      const dashboardContent = page.locator('main, [data-testid="dashboard"], .dashboard')
      await expect(dashboardContent).toBeVisible({ timeout: 5000 })
      
      // Check for any console errors during login
      if (consoleErrors.length > 0) {
        console.log('Console errors during login:')
        consoleErrors.forEach(err => console.log(`  - ${err}`))
      }
    } catch (error) {
      // Still on login page - check for error messages
      const currentUrl = page.url()
      const errorMessages = await page.locator('.error, [role="alert"], .text-red-500, .text-destructive').allTextContents()
      console.log(`❌ Login failed. Still on: ${currentUrl}`)
      if (errorMessages.length > 0) {
        console.log('Error messages:', errorMessages)
      }
      
      // Check console errors
      if (consoleErrors.length > 0) {
        console.log('Console errors:')
        consoleErrors.forEach(err => console.log(`  - ${err}`))
      }
      
      // Take screenshot for debugging
      await page.screenshot({ path: 'test-results/login-failure.png', fullPage: true })
      
      // Re-throw to fail the test
      throw error
    }
  })
  
  test('Protected pages should redirect to login when not authenticated', async ({ page }) => {
    // Clear cookies to ensure unauthenticated state
    await page.context().clearCookies()
    
    // Try to access dashboard directly
    await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle' })
    
    // Should be redirected to login
    const currentUrl = page.url()
    console.log(`Accessing /dashboard without auth, redirected to: ${currentUrl}`)
    
    // Check if redirected to login
    expect(currentUrl).toContain('/auth/login')
  })
  
  test('Login and verify cookie-based auth works', async ({ page }) => {
    // Use automated test credentials (NOT manual testing accounts which are protected)
    const email = process.env.TEST_ADMIN_EMAIL || 'test-admin@example.com'
    const password = process.env.TEST_ADMIN_PASSWORD || process.env.TEST_USER_PASSWORD || 'TestB!2b@5fU7'
    
    // Navigate to login
    await page.goto('http://localhost:3000/auth/login', { waitUntil: 'networkidle' })
    
    // Fill and submit
    await page.locator('input[type="email"]').first().fill(email)
    await page.locator('input[type="password"]').first().fill(password)
    
    // Submit
    await page.locator('button[type="submit"]').click()
    
    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard**', { timeout: 30000 })
    
    console.log('Logged in successfully')
    
    // Check cookies
    const cookies = await page.context().cookies()
    const accessTokenCookie = cookies.find(c => c.name === 'legalease_access_token')
    const csrfCookie = cookies.find(c => c.name === 'csrftoken')
    
    console.log('Cookies after login:')
    console.log(`  - legalease_access_token: ${accessTokenCookie ? 'PRESENT (HttpOnly)' : 'MISSING'}`)
    console.log(`  - csrftoken: ${csrfCookie ? 'PRESENT' : 'MISSING'}`)
    
    // HttpOnly cookies won't be visible via page.context().cookies() in newer Playwright
    // But we can verify auth works by navigating to a protected page
    
    // Navigate to profile page (protected)
    await page.goto('http://localhost:3000/profile', { waitUntil: 'networkidle' })
    
    const profileUrl = page.url()
    console.log(`After navigating to /profile: ${profileUrl}`)
    
    // Should stay on profile, not redirect to login
    expect(profileUrl).toContain('/profile')
  })
})
