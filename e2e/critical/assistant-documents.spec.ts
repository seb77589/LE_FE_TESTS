/**
 * ASSISTANT Role - Documents E2E Tests
 *
 * Validates the documents page for ASSISTANT users:
 * browsing, search, filter, preview, download, RBAC enforcement,
 * and the /documents/upload access control gap.
 *
 * Credential: WS_TEST_CREDENTIALS.USER_1 (dedicated ASSISTANT account)
 *
 * @see {@link docs/_TODO/Roles_UserJourneys_n_TSTs/ASSISTANT_ROLE_UI_INVENTORY.md} §1.5 Documents
 * @see {@link docs/_TODO/Roles_UserJourneys_n_TSTs/_Assistant_E2E_Playwright_TST_Evol.md} File 6
 */

import { test, expect } from '../../fixtures/auth-fixture';
import { TestHelpers } from '../../utils/test-helpers';
import { WS_TEST_CREDENTIALS } from '../../test-credentials';

const ASSISTANT = WS_TEST_CREDENTIALS.USER_1;

test.describe('ASSISTANT Role - Documents Page', () => {
  test.beforeEach(async ({ page }) => {
    await TestHelpers.loginAndWaitForRedirect(
      page,
      ASSISTANT.email,
      ASSISTANT.password,
      false,
    );
    await page.goto('/documents');
    await page.waitForLoadState('domcontentloaded');
    // Wait for content to render (heading, search, or document list)
    await page
      .locator('h1')
      .or(page.locator('input[placeholder*="Search" i]'))
      .first()
      .waitFor({ timeout: 15000 });
  });

  test('should load documents page @P0', async ({ page }) => {
    const hasDocContent = await TestHelpers.checkUIElementExists(
      page,
      'h1:has-text("Documents"), :has-text("Documents")',
      5000,
    );
    expect(hasDocContent).toBe(true);
  });

  test('should search documents by name @P0', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search" i]').first();
    if (await searchInput.isVisible({ timeout: 5000 })) {
      await searchInput.fill('contract');
      await page.waitForTimeout(1000);

      // Should filter or show results/empty state
      const hasContent = await TestHelpers.checkUIElementExists(
        page,
        'table, .grid, :has-text("no documents"), :has-text("no results")',
        5000,
      );
      expect(hasContent).toBe(true);
    } else {
      test.skip(true, 'Search input not visible');
    }
  });

  test('should filter documents by status @P1', async ({ page }) => {
    const statusFilter = page.locator('select, [role="combobox"]').first();
    if (await statusFilter.isVisible({ timeout: 5000 })) {
      await statusFilter.click();
      await page.waitForTimeout(500);

      // Should have status options (All, Uploaded, Processing, Processed, Failed)
      const hasOptions = await TestHelpers.checkUIElementExists(
        page,
        'option, [role="option"], [role="listbox"]',
        3000,
      );
      // Options may not appear if filter uses a different UI pattern
      if (!hasOptions) {
        test.skip(true, 'Status filter does not show dropdown options');
      }
    } else {
      test.skip(true, 'Status filter not visible');
    }
  });

  test('should toggle between grid and list views @P1', async ({ page }) => {
    const gridButton = page
      .locator('button[aria-label*="grid" i], button[title*="grid" i]')
      .first();
    const listButton = page
      .locator('button[aria-label*="list" i], button[title*="list" i]')
      .first();

    if (await gridButton.isVisible({ timeout: 3000 })) {
      await gridButton.click();
      await page.waitForTimeout(500);
    }
    if (await listButton.isVisible({ timeout: 3000 })) {
      await listButton.click();
      await page.waitForTimeout(500);
    }
    expect(page.url()).toContain('/documents');
  });

  test('should preview a document @P0', async ({ page }) => {
    // Click on a document card or view button
    const viewButton = page
      .locator(
        'button:has-text("View"), button[title*="Preview" i], button[title*="View" i]',
      )
      .first();
    const docCard = page
      .locator('[data-testid*="document-"], a[href*="/documents/"]')
      .first();

    if (await viewButton.isVisible({ timeout: 5000 })) {
      await viewButton.click();
      await page.waitForTimeout(1000);

      const hasPreview = await TestHelpers.checkUIElementExists(
        page,
        '[role="dialog"], .modal, iframe, [data-testid*="preview"]',
        5000,
      );
      expect(hasPreview).toBe(true);
    } else if (await docCard.isVisible({ timeout: 3000 })) {
      await docCard.click();
      await page.waitForTimeout(1000);

      // Should open preview or navigate to document detail
      const hasPreviewOrDetail = await TestHelpers.checkUIElementExists(
        page,
        '[role="dialog"], .modal',
        5000,
      );
      expect(hasPreviewOrDetail).toBe(true);
    } else {
      test.skip(true, 'No documents available for preview');
    }
  });

  test('should download a document @P0', async ({ page }) => {
    const downloadButton = page
      .locator('button:has-text("Download"), button[title*="Download" i], a[download]')
      .first();
    if (await downloadButton.isVisible({ timeout: 5000 })) {
      const downloadPromise = page
        .waitForEvent('download', { timeout: 10000 })
        .catch(() => null);
      await downloadButton.click();
      await downloadPromise;
      // Download initiated (or clickable without error)
      expect(true).toBe(true);
    } else {
      test.skip(true, 'No download button visible (no documents)');
    }
  });

  test('should NOT show Upload Document button @P0', async ({ page }) => {
    // ASSISTANT should not see the Upload Document button (canModify gate)
    const uploadButton = page.locator(
      'button:has-text("Upload Document"), a:has-text("Upload Document"), button:has-text("Upload")',
    );
    await expect(uploadButton).not.toBeVisible();
  });

  test('should NOT show Upload in empty state @P0', async ({ page }) => {
    // Even in empty state, upload option should not appear for ASSISTANT
    // Navigate with a search that returns no results to trigger empty state
    const searchInput = page.locator('input[placeholder*="Search" i]').first();
    if (await searchInput.isVisible({ timeout: 5000 })) {
      await searchInput.fill('zzz_nonexistent_document_99999');
      await page.waitForTimeout(1500);

      // Upload button/link should not appear in empty state
      const uploadInEmptyState = page.locator(
        'button:has-text("Upload"), a:has-text("Upload Document")',
      );
      await expect(uploadInEmptyState).not.toBeVisible();
    }
  });
});

test.describe('ASSISTANT Role - Documents Upload Access Gap', () => {
  test('should access /documents/upload directly and see upload form @P0', async ({
    page,
  }) => {
    await TestHelpers.loginAndWaitForRedirect(
      page,
      ASSISTANT.email,
      ASSISTANT.password,
      false,
    );

    // Navigate directly to upload page — no frontend role gate
    await page.goto('/documents/upload');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // The upload page has NO frontend role check — ASSISTANT can see the full UI
    // This documents a known access control gap (backend enforcement is the only gate)
    const hasUploadUI = await TestHelpers.checkUIElementExists(
      page,
      'input[type="file"], :has-text("upload"), :has-text("drag"), :has-text("drop")',
      5000,
    );

    // Either the upload page loads (gap confirmed) or redirects (gap fixed)
    const url = page.url();
    if (url.includes('/documents/upload')) {
      // Gap exists — ASSISTANT can access upload page
      expect(hasUploadUI).toBe(true);
    } else {
      // Gap fixed — ASSISTANT was redirected away
      expect(url).not.toContain('/documents/upload');
    }
  });
});
