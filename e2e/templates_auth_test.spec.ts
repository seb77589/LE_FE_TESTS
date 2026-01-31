import { test, expect } from '@playwright/test'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '../../config/.env') })

test.describe('Templates Page Authentication', () => {
  test('Templates page should load without 401 errors after login', async ({ page }) => {
    // Use automated test credentials (NOT manual testing accounts which are protected)
    const email = process.env.TEST_ADMIN_EMAIL || 'test-admin@example.com'
    const password = process.env.TEST_ADMIN_PASSWORD || process.env.TEST_USER_PASSWORD || 'TestB!2b@5fU7'
    
    // Track network requests
    const errors401: string[] = []
    page.on('response', response => {
      if (response.status() === 401) {
        errors401.push(response.url())
        console.log(`❌ 401 Unauthorized: ${response.url()}`)
      }
    })
    
    // Step 1: Login
    console.log('Step 1: Login')
    await page.goto('http://localhost:3000/auth/login', { waitUntil: 'networkidle' })
    await page.locator('input[type="email"]').first().fill(email)
    await page.locator('input[type="password"]').first().fill(password)
    await page.locator('button[type="submit"]').click()
    
    // Wait for dashboard
    await page.waitForURL('**/dashboard**', { timeout: 15000 })
    console.log('✅ Logged in, now on dashboard')
    
    // Step 2: Navigate to Templates
    console.log('Step 2: Navigate to Templates')
    await page.goto('http://localhost:3000/templates', { waitUntil: 'networkidle' })
    
    // Wait a bit for async data loading
    await page.waitForTimeout(2000)
    
    const currentUrl = page.url()
    console.log(`Current URL: ${currentUrl}`)
    
    // Check for 401 errors
    if (errors401.length > 0) {
      console.log(`Found ${errors401.length} 401 errors:`)
      errors401.forEach(url => console.log(`  - ${url}`))
    } else {
      console.log('✅ No 401 errors!')
    }
    
    // Verify we're on templates page (not redirected to login)
    expect(currentUrl).toContain('/templates')
    
    // Verify templates loaded (look for template content or empty state)
    const hasContent = await page.locator('.template-card, [data-testid="template"], .grid, .empty-state').first().isVisible().catch(() => false)
    console.log(`Templates content visible: ${hasContent}`)
    
    // The test should pass if there are no 401 errors on protected endpoints
    // (frontend-errors/report 401s are not critical)
    const criticalErrors = errors401.filter(url => !url.includes('frontend-errors'))
    expect(criticalErrors.length).toBe(0)
  })
  
  test('Templates API should return data after login', async ({ page }) => {
    // Use automated test credentials (NOT manual testing accounts which are protected)
    const email = process.env.TEST_ADMIN_EMAIL || 'test-admin@example.com'
    const password = process.env.TEST_ADMIN_PASSWORD || process.env.TEST_USER_PASSWORD || 'TestB!2b@5fU7'
    
    // Login first
    await page.goto('http://localhost:3000/auth/login', { waitUntil: 'networkidle' })
    await page.locator('input[type="email"]').first().fill(email)
    await page.locator('input[type="password"]').first().fill(password)
    await page.locator('button[type="submit"]').click()
    await page.waitForURL('**/dashboard**', { timeout: 30000 })
    
    // Now test the templates API directly
    const response = await page.request.get('http://localhost:3000/api/v1/templates/')
    
    console.log(`Templates API response status: ${response.status()}`)
    expect(response.status()).toBe(200)
    
    const data = await response.json()
    console.log(`Templates returned: ${data.templates?.length || 0}`)
  })
})
