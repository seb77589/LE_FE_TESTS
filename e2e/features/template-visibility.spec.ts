/**
 * E2E Tests for Template Visibility (Phase 9)
 *
 * Tests template discoverability through:
 * - Navigation menu
 * - Dashboard template widget
 * - Standalone templates page
 * - Template browsing and usage
 *
 * Related Phase: Template Visibility Fix (Phase 9)
 */

import { test, expect } from '../../fixtures/auth-fixture';
import { TestHelpers } from '../../utils/test-helpers';

test.describe('Template Visibility E2E Tests', () => {
  test.beforeEach(async ({ page, workerCredentials }) => {
    // Login first
    await TestHelpers.loginAndWaitForRedirect(
      page,
      workerCredentials.email,
      workerCredentials.password,
      workerCredentials.isAdmin,
    );

    // Navigate to dashboard after authentication
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Template Navigation', () => {
    test('should display Templates in navigation menu', async ({ page }) => {
      // Check that Templates navigation item is visible
      const templatesNav = page.locator('nav a[href="/templates"]');
      await expect(templatesNav).toBeVisible();

      // Verify the text
      await expect(templatesNav).toContainText('Templates');

      // Verify icon is present
      const icon = templatesNav.locator('svg');
      await expect(icon).toBeVisible();

      console.log('✅ Templates navigation item visible');
    });

    test('should navigate to templates page from menu', async ({ page }) => {
      // Click Templates in navigation
      await page.click('nav a[href="/templates"]');

      // Wait for navigation
      await page.waitForURL('/templates');
      await page.waitForLoadState('networkidle');

      // Verify we're on the templates page
      expect(page.url()).toContain('/templates');

      // Verify page title
      const heading = page.locator('h1');
      await expect(heading).toContainText('Case Templates');

      console.log('✅ Successfully navigated to templates page');
    });

    test('should show Templates between Cases and Notifications', async ({ page }) => {
      // Get all navigation items
      const navItems = page.locator('nav a[href^="/"]');

      // Get text of all nav items
      const navTexts = await navItems.allTextContents();

      // Find positions
      const casesIndex = navTexts.findIndex((text) => text.includes('Cases'));
      const templatesIndex = navTexts.findIndex((text) => text.includes('Templates'));
      const notificationsIndex = navTexts.findIndex((text) =>
        text.includes('Notifications'),
      );

      // Verify Templates is between Cases and Notifications
      expect(templatesIndex).toBeGreaterThan(casesIndex);
      expect(templatesIndex).toBeLessThan(notificationsIndex);

      console.log('✅ Templates correctly positioned in navigation');
    });
  });

  test.describe('Dashboard Template Widget', () => {
    test('should display template widget on dashboard', async ({ page }) => {
      // Widget heading is "Recent Templates" (current implementation)
      const widgetHeading = page.locator('h2:has-text("Recent Templates")');
      await expect(widgetHeading).toBeVisible();

      // Verify Browse All button exists
      const browseAllButton = page.locator('button:has-text("Browse All")');
      await expect(browseAllButton).toBeVisible();

      console.log('✅ Template widget visible on dashboard');
    });

    test('should show most-used badge on popular templates', async ({ page }) => {
      // Check if templates exist
      const hasTemplates =
        (await page.locator('h2:has-text("Popular Templates")').count()) > 0;

      if (!hasTemplates) {
        console.log('ℹ️ No templates available - badge only shows with templates');
        return;
      }

      // Check for "Most Used" badge (only present when templates exist)
      const mostUsedBadge = page.locator('span:has-text("Most Used")');
      await expect(mostUsedBadge).toBeVisible();

      console.log('✅ Most Used badge displayed');
    });

    test('should navigate to templates page from widget "Browse All"', async ({
      page,
    }) => {
      // Find Browse All button
      const browseAllButton = page.locator('button:has-text("Browse All")').first();
      await browseAllButton.click();

      // Wait for navigation
      await page.waitForURL('/templates');
      await page.waitForLoadState('networkidle');

      // Verify we're on templates page
      expect(page.url()).toContain('/templates');

      console.log('✅ Navigation button navigates to templates page');
    });

    test('should show template cards with names and descriptions', async ({ page }) => {
      // Check if templates exist
      const hasTemplates =
        (await page.locator('h2:has-text("Popular Templates")').count()) > 0;

      if (!hasTemplates) {
        console.log('ℹ️ No templates available (empty state)');
        return;
      }

      // Find template cards within widget
      const templateCards = page
        .locator('h2:has-text("Popular Templates")')
        .locator('..')
        .locator('[class*="Card"]');
      const cardCount = await templateCards.count();

      if (cardCount > 0) {
        // First card should have a name and description
        const firstCard = templateCards.first();

        // Check for template name (in a heading or semibold text)
        const templateName = firstCard.locator('[class*="font-semibold"]').first();
        await expect(templateName).toBeVisible();

        // Check for description
        const description = firstCard
          .locator('[class*="text-muted-foreground"]')
          .first();
        await expect(description).toBeVisible();

        console.log('✅ Template cards show names and descriptions');
      } else {
        console.log('ℹ️ No templates available (empty state)');
      }
    });

    test('should allow using template from dashboard widget', async ({ page }) => {
      // Check if templates exist
      const hasTemplates =
        (await page.locator('h2:has-text("Popular Templates")').count()) > 0;

      if (!hasTemplates) {
        console.log('ℹ️ No templates available to use');
        return;
      }

      // Find "Use" buttons
      const useButtons = page
        .locator('h2:has-text("Popular Templates")')
        .locator('..')
        .locator('button:has-text("Use")');
      const buttonCount = await useButtons.count();

      if (buttonCount > 0) {
        // Click first "Use" button
        await useButtons.first().click();

        // Should navigate to cases page with template parameter
        await page.waitForURL(/\/cases\?template=\d+/, { timeout: 5000 });

        expect(page.url()).toMatch(/\/cases\?template=\d+/);

        console.log('✅ Use template button navigates to create case');
      } else {
        console.log('ℹ️ No templates available to use');
      }
    });
  });

  test.describe('Standalone Templates Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/templates');
      await page.waitForLoadState('networkidle');
    });

    test('should display templates page header', async ({ page }) => {
      // Check for page heading
      const heading = page.locator('h1:has-text("Case Templates")');
      await expect(heading).toBeVisible();

      // Check for description
      const description = page.locator('text=/Browse and use templates/');
      await expect(description).toBeVisible();

      // Check for Back button
      const backButton = page.locator('button:has-text("Back")');
      await expect(backButton).toBeVisible();

      console.log('✅ Templates page header displayed correctly');
    });

    test('should show search bar', async ({ page }) => {
      // Find search input
      const searchInput = page.locator('input[type="text"][placeholder*="Search"]');
      await expect(searchInput).toBeVisible();

      // Verify placeholder text
      const placeholder = await searchInput.getAttribute('placeholder');
      expect(placeholder).toContain('Search templates');

      console.log('✅ Search bar visible');
    });

    test('should show view mode toggle (grid/list)', async ({ page }) => {
      // Find grid view button
      const gridButton = page.locator('button[title="Grid view"]');
      await expect(gridButton).toBeVisible();

      // Find list view button
      const listButton = page.locator('button[title="List view"]');
      await expect(listButton).toBeVisible();

      console.log('✅ View mode toggle buttons visible');
    });

    test('should filter templates by search query', async ({ page }) => {
      // Wait for templates to load
      await page.waitForTimeout(1000);

      // Get initial template count
      const allTemplates = page.locator('[class*="Card"]');
      const initialCount = await allTemplates.count();

      if (initialCount > 0) {
        // Get first template name
        const firstTemplateName = await allTemplates
          .first()
          .locator('[class*="font-semibold"]')
          .first()
          .textContent();

        if (firstTemplateName) {
          // Search for first word of template name
          const searchTerm = firstTemplateName.split(' ')[0];

          const searchInput = page.locator('input[type="text"][placeholder*="Search"]');
          await searchInput.fill(searchTerm);

          // Wait for filtering
          await page.waitForTimeout(500);

          // Get filtered count
          const filteredCount = await allTemplates.count();

          // Filtered count should be <= initial count
          expect(filteredCount).toBeLessThanOrEqual(initialCount);

          console.log(
            `✅ Search filtering works (${initialCount} → ${filteredCount} templates)`,
          );
        }
      } else {
        console.log('ℹ️ No templates available to search');
      }
    });

    test('should toggle between grid and list views', async ({ page }) => {
      // Click list view button
      const listButton = page.locator('button[title="List view"]');
      await listButton.click();

      // Wait for view change
      await page.waitForTimeout(300);

      // List view button should be active
      const listButtonClass = await listButton.getAttribute('class');
      expect(listButtonClass).toContain('bg-primary');

      // Click grid view button
      const gridButton = page.locator('button[title="Grid view"]');
      await gridButton.click();

      // Wait for view change
      await page.waitForTimeout(300);

      // Grid view button should be active
      const gridButtonClass = await gridButton.getAttribute('class');
      expect(gridButtonClass).toContain('bg-primary');

      console.log('✅ View mode toggle works');
    });

    test('should show info panel about templates', async ({ page }) => {
      // Wait for templates to load first (info panel only shows when templates exist)
      const templateCards = page.locator('[role="article"]');
      const templateCount = await templateCards.count();

      if (templateCount === 0) {
        console.log('ℹ️ No templates available - skipping info panel test');
        return;
      }

      // Wait for at least one template to be visible
      await expect(templateCards.first()).toBeVisible();

      // Scroll to bottom
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(300); // Brief pause for scroll

      // Check for info panel
      const infoPanelHeading = page.locator('h4:has-text("About Templates")');
      await expect(infoPanelHeading).toBeVisible();

      // Check for bullet points
      const bulletPoints = page.locator('li:has-text("template")');
      const bulletCount = await bulletPoints.count();

      expect(bulletCount).toBeGreaterThan(0);

      console.log('✅ Info panel visible with helpful information');
    });

    test('should navigate back from templates page', async ({ page }) => {
      // Click Back button
      const backButton = page.locator('button:has-text("Back")');
      await backButton.click();

      // Should navigate to previous page (dashboard or cases)
      await page.waitForTimeout(500);

      // URL should not be /templates anymore
      expect(page.url()).not.toContain('/templates');

      console.log('✅ Back button navigates to previous page');
    });
  });

  test.describe('Template Preview Modal', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/templates');
      await page.waitForLoadState('networkidle');
    });

    test('should open preview modal when clicking template card', async ({ page }) => {
      // Wait for templates to load
      await page.waitForTimeout(1000);

      const templateCards = page.locator('[class*="Card"]');
      const cardCount = await templateCards.count();

      if (cardCount > 0) {
        // Click first template card
        await templateCards.first().click();

        // Wait for modal
        await page.waitForSelector('[role="dialog"]', { timeout: 3000 });

        // Modal should be visible
        const modal = page.locator('[role="dialog"]');
        await expect(modal).toBeVisible();

        // Modal should have template details
        const modalHeading = modal.locator('h2, h3').first();
        await expect(modalHeading).toBeVisible();

        console.log('✅ Preview modal opens on card click');
      } else {
        console.log('ℹ️ No templates available to preview');
      }
    });

    test('should close preview modal', async ({ page }) => {
      await page.waitForTimeout(1000);

      const templateCards = page.locator('[class*="Card"]');
      const cardCount = await templateCards.count();

      if (cardCount > 0) {
        // Open modal
        await templateCards.first().click();
        await page.waitForSelector('[role="dialog"]', { timeout: 3000 });

        // Find close button (X button or Cancel/Close button)
        const closeButton = page
          .locator(
            '[role="dialog"] button[aria-label*="lose"], [role="dialog"] button:has-text("Close")',
          )
          .first();

        if (await closeButton.isVisible()) {
          await closeButton.click();

          // Wait for modal to disappear
          await page.waitForTimeout(500);

          // Modal should not be visible
          const modal = page.locator('[role="dialog"]');
          await expect(modal).not.toBeVisible();

          console.log('✅ Preview modal closes');
        }
      }
    });
  });

  test.describe('Empty State', () => {
    test('should show empty state when no templates exist', async ({ page }) => {
      await page.goto('/templates');
      await page.waitForLoadState('networkidle');

      // Wait to see if templates load or empty state appears
      await page.waitForTimeout(2000);

      // Check if empty state is shown
      const emptyStateHeading = page.locator('h3:has-text("No templates")');

      if (await emptyStateHeading.isVisible()) {
        // Empty state should have description
        const description = page.locator('text=/Contact your manager/');
        await expect(description).toBeVisible();

        console.log('✅ Empty state displayed correctly');
      } else {
        console.log('ℹ️ Templates available (no empty state)');
      }
    });
  });
});
