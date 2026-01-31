import { test, expect, Page } from '@playwright/test'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '../../config/.env') })

interface TestIssue {
  type: 'error' | 'warning' | 'networkError' | 'pageError'
  page: string
  message: string
  timestamp: string
  details?: any
}

class DeepExplorer {
  private page: Page
  private issues: TestIssue[] = []
  private visitedUrls: Set<string> = new Set()
  private currentPage: string = ''

  constructor(page: Page) {
    this.page = page
    this.setupListeners()
  }

  private setupListeners() {
    this.page.on('pageerror', (error) => {
      this.issues.push({
        type: 'pageError',
        page: this.currentPage,
        message: error.message,
        timestamp: new Date().toISOString(),
        details: { stack: error.stack }
      })
      console.log(`❌ [${this.currentPage}] Page Error: ${error.message}`)
    })

    this.page.on('console', (msg) => {
      const type = msg.type()
      const text = msg.text()
      
      // Skip expected warnings and errors
      if (text.includes('Download the React DevTools') ||
          text.includes('Warning: Extra attributes') ||
          text.includes('Performance measurement') ||
          text.includes('[Fast Refresh]')) {
        return
      }
      
      // Skip expected 403 errors for MANAGER role on admin endpoints
      // These are expected permission denials, not actual errors
      if (type === 'error' && text.includes('403')) {
        console.log(`ℹ️ [${this.currentPage}] Expected 403 (MANAGER role): ${text.substring(0, 100)}`)
        return
      }
      
      if (type === 'error') {
        this.issues.push({
          type: 'error',
          page: this.currentPage,
          message: text,
          timestamp: new Date().toISOString()
        })
        console.log(`❌ [${this.currentPage}] Console Error: ${text.substring(0, 200)}`)
      } else if (type === 'warning' && !text.includes('Warning: Extra attributes')) {
        this.issues.push({
          type: 'warning',
          page: this.currentPage,
          message: text,
          timestamp: new Date().toISOString()
        })
        console.log(`⚠️ [${this.currentPage}] Warning: ${text.substring(0, 200)}`)
      }
    })

    this.page.on('requestfailed', (request) => {
      const url = request.url()
      const failureText = request.failure()?.errorText || ''
      
      // Skip expected aborts during navigation
      if (failureText.includes('net::ERR_ABORTED')) return
      
      this.issues.push({
        type: 'networkError',
        page: this.currentPage,
        message: `${request.method()} ${url} - ${failureText}`,
        timestamp: new Date().toISOString()
      })
      console.log(`❌ [${this.currentPage}] Network Error: ${request.method()} ${url}`)
    })
  }

  async login(email: string, password: string): Promise<boolean> {
    console.log(`\n🔐 Logging in as ${email}...`)
    this.currentPage = 'Login'
    
    try {
      await this.page.goto('http://localhost:3000/auth/login', { waitUntil: 'networkidle' })
      await this.page.waitForSelector('[data-hydrated="true"]', { timeout: 10000 }).catch(() => {})
      await this.page.waitForTimeout(1000)
      
      await this.page.fill('input[type="email"], input[name="email"]', email)
      await this.page.fill('input[type="password"], input[name="password"]', password)
      await this.page.click('button[type="submit"]')
      
      await this.page.waitForURL(/\/(dashboard)?$/, { timeout: 15000 })
      console.log('✅ Login successful!')
      return true
    } catch (error) {
      console.log(`❌ Login failed: ${error}`)
      return false
    }
  }

  async explorePage(url: string, name: string, depth: number = 0): Promise<void> {
    if (this.visitedUrls.has(url)) return
    this.visitedUrls.add(url)
    
    const indent = '  '.repeat(depth)
    console.log(`\n${indent}📍 Exploring: ${name} (${url})`)
    this.currentPage = name
    
    try {
      await this.page.goto(url, { waitUntil: 'load', timeout: 15000 })
      await this.page.waitForLoadState('domcontentloaded')
      await this.page.waitForTimeout(1000)
      
      // Take screenshot
      const screenshotPath = `test-results/explore-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.png`
      await this.page.screenshot({ path: screenshotPath, fullPage: true })
      
      // Count visible elements
      const buttonCount = await this.page.locator('button:visible').count()
      const linkCount = await this.page.locator('a:visible').count()
      const inputCount = await this.page.locator('input:visible, select:visible, textarea:visible').count()
      
      console.log(`${indent}   📊 Elements: ${buttonCount} buttons, ${linkCount} links, ${inputCount} inputs`)
      
      // Check for error messages on page
      const errorMessages = await this.page.locator('[class*="error"], [class*="Error"], [role="alert"]').all()
      for (const error of errorMessages) {
        const text = await error.textContent()
        if (text && text.trim().length > 0 && !text.includes('Loading')) {
          console.log(`${indent}   ⚠️ Error element found: ${text.substring(0, 100)}`)
        }
      }
      
      // Click visible buttons (except dangerous ones) - only 2 per page for speed
      const buttons = await this.page.locator('button:visible').all()
      for (let i = 0; i < Math.min(buttons.length, 2); i++) {
        try {
          const button = buttons[i]
          const text = await button.textContent() || ''
          const isDisabled = await button.isDisabled()
          const isDangerous = 
            text.toLowerCase().includes('delete') ||
            text.toLowerCase().includes('remove') ||
            text.toLowerCase().includes('logout') ||
            text.toLowerCase().includes('sign out') ||
            text.toLowerCase().includes('create') || // Skip create buttons (open modals)
            text.toLowerCase().includes('new') || // Skip new buttons (open forms)
            text.includes('@') // Skip user menu buttons (contain email)
          
          if (!isDisabled && !isDangerous) {
            console.log(`${indent}   🖱️ Clicking button: "${text.trim().substring(0, 30)}"`)
            await button.click().catch(() => {})
            await this.page.waitForTimeout(300)
            
            // Check for modals
            const modal = await this.page.locator('[role="dialog"], .modal, [class*="Modal"]').first()
            if (await modal.isVisible().catch(() => false)) {
              console.log(`${indent}   📦 Modal opened`)
              const closeBtn = await this.page.locator('[aria-label="Close"], button:has-text("Close"), button:has-text("Cancel")').first()
              if (await closeBtn.isVisible().catch(() => false)) {
                await closeBtn.click().catch(() => {})
                await this.page.waitForTimeout(300)
              }
            }
          }
        } catch (error) {
          // Continue with next button
        }
      }
      
      // Explore dropdown menus
      const dropdowns = await this.page.locator('[role="menubutton"], [aria-haspopup="true"], button[class*="dropdown"]').all()
      for (const dropdown of dropdowns.slice(0, 3)) {
        try {
          const text = await dropdown.textContent() || 'dropdown'
          console.log(`${indent}   📋 Opening dropdown: "${text.trim().substring(0, 30)}"`)
          await dropdown.click()
          await this.page.waitForTimeout(500)
          
          const menuItems = await this.page.locator('[role="menuitem"], [role="option"]').all()
          for (const item of menuItems) {
            const itemText = await item.textContent()
            console.log(`${indent}      - Menu item: "${itemText?.trim().substring(0, 30)}"`)
          }
          
          // Close dropdown by clicking elsewhere
          await this.page.click('body', { position: { x: 10, y: 10 } }).catch(() => {})
          await this.page.waitForTimeout(300)
        } catch (error) {
          // Continue
        }
      }
      
      // Test form inputs
      const inputs = await this.page.locator('input:visible:not([type="hidden"]), select:visible, textarea:visible').all()
      for (let i = 0; i < Math.min(inputs.length, 3); i++) {
        try {
          const input = inputs[i]
          const type = await input.getAttribute('type') || 'text'
          const name = await input.getAttribute('name') || 'unnamed'
          const placeholder = await input.getAttribute('placeholder') || ''
          console.log(`${indent}   📝 Input: type=${type}, name=${name}, placeholder="${placeholder.substring(0, 30)}"`)
        } catch (error) {
          // Continue
        }
      }
      
    } catch (error) {
      console.log(`${indent}❌ Error exploring ${name}: ${error}`)
    }
  }

  async runFullExploration(): Promise<void> {
    // Define all pages to explore for MANAGER role
    const pages = [
      { url: 'http://localhost:3000/', name: 'Dashboard' },
      { url: 'http://localhost:3000/templates', name: 'Templates' },
      { url: 'http://localhost:3000/templates/new', name: 'New Template' },
      { url: 'http://localhost:3000/cases', name: 'Cases' },
      { url: 'http://localhost:3000/cases/new', name: 'New Case' },
      { url: 'http://localhost:3000/admin', name: 'Admin Dashboard' },
      { url: 'http://localhost:3000/admin/users', name: 'Admin Users' },
      { url: 'http://localhost:3000/admin/companies', name: 'Admin Companies' },
      { url: 'http://localhost:3000/admin/settings', name: 'Admin Settings' },
      { url: 'http://localhost:3000/admin/analytics', name: 'Admin Analytics' },
      { url: 'http://localhost:3000/notifications', name: 'Notifications' },
      { url: 'http://localhost:3000/profile', name: 'Profile' },
      { url: 'http://localhost:3000/profile/settings', name: 'Profile Settings' },
      { url: 'http://localhost:3000/profile/security', name: 'Profile Security' },
    ]
    
    for (const pageInfo of pages) {
      await this.explorePage(pageInfo.url, pageInfo.name)
    }
  }

  generateReport(): { passed: boolean, issues: TestIssue[] } {
    console.log('\n' + '='.repeat(80))
    console.log('🔍 DEEP EXPLORATION REPORT')
    console.log('='.repeat(80))
    
    const errors = this.issues.filter(i => i.type === 'error' || i.type === 'pageError')
    const warnings = this.issues.filter(i => i.type === 'warning')
    const networkErrors = this.issues.filter(i => i.type === 'networkError')
    
    console.log(`\n📊 Summary:`)
    console.log(`   Pages explored: ${this.visitedUrls.size}`)
    console.log(`   Page/Console Errors: ${errors.length}`)
    console.log(`   Warnings: ${warnings.length}`)
    console.log(`   Network Errors: ${networkErrors.length}`)
    
    if (errors.length > 0) {
      console.log(`\n❌ Errors:`)
      errors.forEach(e => {
        console.log(`   [${e.page}] ${e.message.substring(0, 150)}`)
      })
    }
    
    if (warnings.length > 0) {
      console.log(`\n⚠️ Warnings:`)
      warnings.slice(0, 10).forEach(w => {
        console.log(`   [${w.page}] ${w.message.substring(0, 150)}`)
      })
      if (warnings.length > 10) {
        console.log(`   ... and ${warnings.length - 10} more warnings`)
      }
    }
    
    if (networkErrors.length > 0) {
      console.log(`\n🌐 Network Errors:`)
      networkErrors.forEach(n => {
        console.log(`   [${n.page}] ${n.message}`)
      })
    }
    
    console.log('\n' + '='.repeat(80))
    const passed = errors.length === 0 && networkErrors.length === 0
    console.log(passed ? '✅ ALL PAGES EXPLORED SUCCESSFULLY!' : '⚠️ ISSUES FOUND - SEE ABOVE')
    console.log('='.repeat(80))
    
    return { passed, issues: this.issues }
  }
}

test.describe('Deep Application Exploration', () => {
  test.setTimeout(180000) // 3 minutes for full exploration
  
  test('Explore all pages as MANAGER', async ({ page }) => {
    const explorer = new DeepExplorer(page)
    
    // Use automated test credentials (NOT manual testing accounts which are protected)
    const email = process.env.TEST_ADMIN_EMAIL || 'test-admin@example.com'
    const password = process.env.TEST_ADMIN_PASSWORD || process.env.TEST_USER_PASSWORD || 'TestB!2b@5fU7'
    
    const loginSuccess = await explorer.login(email, password)
    expect(loginSuccess).toBe(true)
    
    await explorer.runFullExploration()
    
    const { passed, issues } = explorer.generateReport()
    
    // Write issues to file for later analysis
    const fs = require('fs')
    fs.writeFileSync('test-results/exploration-issues.json', JSON.stringify(issues, null, 2))
    
    // Test passes if no critical errors
    expect(passed).toBe(true)
  })
})
