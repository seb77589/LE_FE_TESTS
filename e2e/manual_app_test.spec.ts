import { test, expect, Browser, BrowserContext, Page } from '@playwright/test'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '../../config/.env') })

class ApplicationTester {
  private page: Page
  private testResults: {
    pageErrors: any[]
    consoleErrors: any[]
    consoleWarnings: any[]
    networkErrors: any[]
    interactiveElements: { [key: string]: any[] }
    screenshots: string[]
  }

  constructor(page: Page) {
    this.page = page
    this.testResults = {
      pageErrors: [],
      consoleErrors: [],
      consoleWarnings: [],
      networkErrors: [],
      interactiveElements: {},
      screenshots: []
    }
    this.setupPageListeners()
  }

  private setupPageListeners() {
    // Capture page errors
    this.page.on('pageerror', (error) => {
      this.testResults.pageErrors.push({
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      })
      console.log(`❌ Page Error: ${error.message}`)
    })

    // Capture console errors and warnings
    this.page.on('console', (msg) => {
      const type = msg.type()
      const text = msg.text()
      
      if (type === 'error') {
        this.testResults.consoleErrors.push({
          text,
          timestamp: new Date().toISOString()
        })
        console.log(`❌ Console Error: ${text}`)
      } else if (type === 'warning') {
        this.testResults.consoleWarnings.push({
          text,
          timestamp: new Date().toISOString()
        })
        console.log(`⚠️ Console Warning: ${text}`)
      }
    })

    // Capture network errors (excluding expected aborted requests during navigation)
    this.page.on('requestfailed', (request) => {
      const url = request.url()
      const failureText = request.failure()?.errorText || ''
      
      // Filter out expected aborted requests:
      // - frontend-errors/report: Error tracking tries to send before page unload
      // - ERR_ABORTED: Browser cancels requests when navigating away
      const isExpectedAbort = 
        url.includes('frontend-errors/report') && failureText.includes('net::ERR_ABORTED')
      
      if (!isExpectedAbort) {
        this.testResults.networkErrors.push({
          url,
          method: request.method(),
          failureText,
          timestamp: new Date().toISOString()
        })
        console.log(`❌ Network Error: ${request.method()} ${url} - ${failureText}`)
      } else {
        // Log as info, not error (expected behavior during navigation)
        console.log(`ℹ️ Expected navigation abort: ${request.method()} ${url}`)
      }
    })
  }

  async login(email: string, password: string): Promise<boolean> {
    console.log(`🔐 Attempting login with ${email}...`)
    
    try {
      // Go to login page
      await this.page.goto('http://localhost:3000/auth/login', { waitUntil: 'networkidle' })
      
      // Take screenshot of login page
      const loginScreenshot = `login-page-${Date.now()}.png`
      await this.page.screenshot({ path: `test-results/${loginScreenshot}`, fullPage: true })
      this.testResults.screenshots.push(loginScreenshot)
      
      // Wait for and fill login form
      await this.page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 })
      await this.page.fill('input[type="email"], input[name="email"]', email)
      await this.page.fill('input[type="password"], input[name="password"]', password)
      
      // Submit form
      await this.page.click('button[type="submit"], .submit-button')
      
      // Wait for redirect or response
      await this.page.waitForURL(/\/dashboard|\//, { timeout: 15000 })
      
      console.log('✅ Login successful')
      return true
    } catch (error) {
      console.log(`❌ Login failed: ${error}`)
      return false
    }
  }

  async navigateAndTest(url: string, pageName: string): Promise<void> {
    console.log(`\n📍 Testing page: ${pageName} (${url})`)
    
    try {
      // Navigate to page
      await this.page.goto(url, { waitUntil: 'networkidle' })
      
      // Take screenshot
      const screenshot = `${pageName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.png`
      await this.page.screenshot({ path: `test-results/${screenshot}`, fullPage: true })
      this.testResults.screenshots.push(screenshot)
      
      // Wait for page to be ready
      await this.page.waitForTimeout(2000)
      
      // Test interactive elements
      await this.testInteractiveElements(pageName)
      
      console.log(`✅ Page ${pageName} tested successfully`)
      
    } catch (error) {
      console.log(`❌ Error testing page ${pageName}: ${error}`)
    }
  }

  private async testInteractiveElements(pageName: string): Promise<void> {
    this.testResults.interactiveElements[pageName] = []
    
    try {
      // Find all buttons, links, and form inputs
      const buttons = await this.page.locator('button:visible').all()
      const links = await this.page.locator('a:visible').all()
      const inputs = await this.page.locator('input:visible, select:visible, textarea:visible').all()
      
      console.log(`   📊 Found ${buttons.length} buttons, ${links.length} links, ${inputs.length} inputs`)
      
      // Test buttons (click if not dangerous)
      for (let i = 0; i < Math.min(buttons.length, 10); i++) {
        try {
          const button = buttons[i]
          const text = await button.textContent()
          const role = await button.getAttribute('role')
          const type = await button.getAttribute('type')
          const className = await button.getAttribute('class')
          
          // Skip dangerous buttons
          const isDangerous = text && (
            text.includes('Delete') || 
            text.includes('Remove') || 
            text.includes('Logout') ||
            type === 'submit'
          )
          
          this.testResults.interactiveElements[pageName].push({
            type: 'button',
            text: text?.trim(),
            role,
            className,
            dangerous: isDangerous
          })
          
          if (!isDangerous) {
            await button.hover()
            // Don't actually click for safety
          }
        } catch (error) {
          // Continue with next button
        }
      }
      
      // Test navigation links (but don't click external ones)
      for (let i = 0; i < Math.min(links.length, 10); i++) {
        try {
          const link = links[i]
          const href = await link.getAttribute('href')
          const text = await link.textContent()
          
          this.testResults.interactiveElements[pageName].push({
            type: 'link',
            href,
            text: text?.trim()
          })
          
          // Only hover, don't navigate away
          await link.hover()
        } catch (error) {
          // Continue with next link
        }
      }
      
      // Test form inputs
      for (let i = 0; i < Math.min(inputs.length, 5); i++) {
        try {
          const input = inputs[i]
          const type = await input.getAttribute('type')
          const name = await input.getAttribute('name')
          const placeholder = await input.getAttribute('placeholder')
          
          this.testResults.interactiveElements[pageName].push({
            type: 'input',
            inputType: type,
            name,
            placeholder
          })
          
          // Just focus, don't fill
          await input.focus()
        } catch (error) {
          // Continue with next input
        }
      }
      
    } catch (error) {
      console.log(`   ⚠️ Error testing interactive elements: ${error}`)
    }
  }

  generateReport(): void {
    console.log('\n' + '='.repeat(80))
    console.log('🔍 COMPREHENSIVE APPLICATION TEST REPORT')
    console.log('='.repeat(80))
    
    console.log(`\n📸 Screenshots captured: ${this.testResults.screenshots.length}`)
    this.testResults.screenshots.forEach(screenshot => {
      console.log(`   - ${screenshot}`)
    })
    
    console.log(`\n❌ Page Errors: ${this.testResults.pageErrors.length}`)
    this.testResults.pageErrors.forEach(error => {
      console.log(`   - ${error.message}`)
      if (error.stack) {
        console.log(`     Stack: ${error.stack.split('\n')[0]}`)
      }
    })
    
    console.log(`\n❌ Console Errors: ${this.testResults.consoleErrors.length}`)
    this.testResults.consoleErrors.forEach(error => {
      console.log(`   - ${error.text}`)
    })
    
    console.log(`\n⚠️ Console Warnings: ${this.testResults.consoleWarnings.length}`)
    this.testResults.consoleWarnings.forEach(warning => {
      console.log(`   - ${warning.text}`)
    })
    
    console.log(`\n❌ Network Errors: ${this.testResults.networkErrors.length}`)
    this.testResults.networkErrors.forEach(error => {
      console.log(`   - ${error.method} ${error.url}: ${error.failureText}`)
    })
    
    console.log(`\n🔗 Interactive Elements by Page:`)
    Object.entries(this.testResults.interactiveElements).forEach(([page, elements]) => {
      console.log(`   ${page}: ${elements.length} elements`)
      const buttons = elements.filter(e => e.type === 'button')
      const links = elements.filter(e => e.type === 'link')
      const inputs = elements.filter(e => e.type === 'input')
      console.log(`     - Buttons: ${buttons.length}`)
      console.log(`     - Links: ${links.length}`)
      console.log(`     - Inputs: ${inputs.length}`)
    })
    
    // Summary
    const totalIssues = this.testResults.pageErrors.length + 
                       this.testResults.consoleErrors.length + 
                       this.testResults.networkErrors.length
    
    console.log('\n' + '='.repeat(80))
    if (totalIssues === 0) {
      console.log('✅ NO CRITICAL ISSUES FOUND!')
    } else {
      console.log(`⚠️ TOTAL ISSUES FOUND: ${totalIssues}`)
      console.log('   - Page Errors: ' + this.testResults.pageErrors.length)
      console.log('   - Console Errors: ' + this.testResults.consoleErrors.length)
      console.log('   - Network Errors: ' + this.testResults.networkErrors.length)
    }
    console.log('='.repeat(80))
  }
}

test.describe('LegalEase Application Manual Testing', () => {
  let tester: ApplicationTester

  test.beforeAll(async () => {
    // Create test-results directory
    const fs = require('fs')
    if (!fs.existsSync('test-results')) {
      fs.mkdirSync('test-results', { recursive: true })
    }
  })

  test('Comprehensive Application Test', async ({ page }) => {
    tester = new ApplicationTester(page)
    
    // Get credentials from environment
    const email = process.env.MANUAL_MANAGER_EMAIL || 'manual-manager@legalease.com'
    const password = process.env.MANUAL_MANAGER_PASSWORD || 'M@nager!Qw3rty$9'
    
    console.log('🚀 Starting comprehensive application test...')
    console.log(`📧 Using email: ${email}`)
    
    // Login
    const loginSuccess = await tester.login(email, password)
    expect(loginSuccess).toBe(true)
    
    // Test main application pages
    const pagesToTest = [
      { url: 'http://localhost:3000/', name: 'Dashboard' },
      { url: 'http://localhost:3000/templates', name: 'Templates' },
      { url: 'http://localhost:3000/cases', name: 'Cases' },
      { url: 'http://localhost:3000/admin', name: 'Admin' },
      { url: 'http://localhost:3000/admin/users', name: 'Admin Users' },
      { url: 'http://localhost:3000/notifications', name: 'Notifications' },
      { url: 'http://localhost:3000/profile', name: 'Profile' }
    ]
    
    // Test each page
    for (const pageInfo of pagesToTest) {
      await tester.navigateAndTest(pageInfo.url, pageInfo.name)
    }
    
    // Generate and print comprehensive report
    tester.generateReport()
  })
})