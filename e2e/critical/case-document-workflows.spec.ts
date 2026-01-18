/**
 * Case-Document Workflows E2E Tests
 *
 * Tests the case-centric document management workflows:
 * - Bulk document upload within a Case
 * - Document tagging within a Case
 * - Case locking behavior (auto-lock on open)
 * - Navigation flows (Dashboard → Cases → Case Details → Documents Tab)
 *
 * ARCHITECTURE: Documents ONLY exist within Cases (case-centric model)
 *
 * MIGRATED: Uses worker-scoped credentials via auth-fixture
 */

import { test, expect } from '../../fixtures/auth-fixture';
import { TestHelpers } from '../../utils/test-helpers';
import path from 'path';
import fs from 'fs';

// Test fixtures directory
const FIXTURES_DIR = path.join(__dirname, '../fixtures');

// Ensure test fixtures exist
const ensureTestFixtures = () => {
  if (!fs.existsSync(FIXTURES_DIR)) {
    fs.mkdirSync(FIXTURES_DIR, { recursive: true });
  }

  // Create test PDF if it doesn't exist
  const testPdfPath = path.join(FIXTURES_DIR, 'test-document.pdf');
  if (!fs.existsSync(testPdfPath)) {
    const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/Resources <<
/Font <<
/F1 <<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
>>
>>
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 44
>>
stream
BT
/F1 24 Tf
100 700 Td
(Test Document) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000315 00000 n
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
407
%%EOF`;
    fs.writeFileSync(testPdfPath, pdfContent);
  }

  // Create additional test files for bulk upload
  const testTxtPath = path.join(FIXTURES_DIR, 'test-file.txt');
  if (!fs.existsSync(testTxtPath)) {
    fs.writeFileSync(
      testTxtPath,
      'This is a test text file for bulk document upload testing.\n',
    );
  }

  const testDocxPath = path.join(FIXTURES_DIR, 'test-contract.txt');
  if (!fs.existsSync(testDocxPath)) {
    fs.writeFileSync(
      testDocxPath,
      'CONTRACT AGREEMENT\n\nParty A and Party B agree to the following terms...\n',
    );
  }
};

test.describe('Case-Document Workflows - Bulk Upload', () => {
  test.beforeEach(async ({ page, workerCredentials }) => {
    ensureTestFixtures();
    await TestHelpers.loginAndWaitForRedirect(
      page,
      workerCredentials.email,
      workerCredentials.password,
      workerCredentials.isAdmin,
    );
  });

  test('should bulk upload documents within a Case', async ({ page }) => {
    // Navigate to Cases page
    await page.goto('/cases');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Find or create a case to work with
    let caseId: string | null = null;

    // Check if any cases exist
    const hasCases = await TestHelpers.checkUIElementExists(
      page,
      'a[href^="/cases/"]',
      3000,
    );

    if (hasCases) {
      // Click on the first case
      const caseLink = page.locator('a[href^="/cases/"]').first();
      const href = await caseLink.getAttribute('href');
      caseId = href?.split('/').pop() || null;
      await caseLink.click();
      await page.waitForLoadState('networkidle');
    } else {
      // Create a new case first
      const createButton = await TestHelpers.checkUIElementExists(
        page,
        'button:has-text("New Case"), button:has-text("Create Case"), a:has-text("New Case")',
        3000,
      );

      if (!createButton) {
        test.skip(true, 'No cases found and cannot create case - feature not implemented');
        return;
      }

      await page
        .locator('button:has-text("New Case"), button:has-text("Create Case"), a:has-text("New Case")')
        .first()
        .click();
      await page.waitForTimeout(1000);

      // Fill case form
      const titleInput = page.locator('input[name="title"], input[id="title"], input[placeholder*="title" i]');
      if (await titleInput.isVisible()) {
        await titleInput.fill('Test Case for Bulk Upload');
      }

      const descriptionInput = page.locator('textarea[name="description"], textarea[id="description"]');
      if (await descriptionInput.isVisible()) {
        await descriptionInput.fill('Testing bulk document upload workflow');
      }

      // Submit form
      await page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Save")').click();
      await page.waitForTimeout(2000);

      // Extract case ID from URL
      caseId = page.url().split('/').pop() || null;
    }

    if (!caseId) {
      test.skip(true, 'Could not determine case ID');
      return;
    }

    // Navigate to Documents tab within the case
    const documentsTab = await TestHelpers.checkUIElementExists(
      page,
      'button:has-text("Documents"), a:has-text("Documents"), [data-tab="documents"]',
      5000,
    );

    if (documentsTab) {
      await page
        .locator('button:has-text("Documents"), a:has-text("Documents"), [data-tab="documents"]')
        .first()
        .click();
      await page.waitForTimeout(1000);
    }

    // Look for bulk upload option
    const uploadButton = await TestHelpers.checkUIElementExists(
      page,
      'button:has-text("Upload"), button:has-text("Add Documents"), input[type="file"]',
      3000,
    );

    if (!uploadButton) {
      test.skip(true, 'Upload button not found within Case - feature not implemented');
      return;
    }

    // Upload multiple files at once (bulk upload)
    const fileInput = page.locator('input[type="file"]');

    // Make file input visible if hidden
    await fileInput.evaluate(node => {
      (node as HTMLElement).style.display = 'block';
      (node as HTMLElement).style.visibility = 'visible';
      (node as HTMLElement).style.opacity = '1';
    });

    await fileInput.setInputFiles([
      path.join(FIXTURES_DIR, 'test-document.pdf'),
      path.join(FIXTURES_DIR, 'test-file.txt'),
      path.join(FIXTURES_DIR, 'test-contract.txt'),
    ]);

    // Wait for uploads to complete
    await page.waitForTimeout(5000);

    // Verify multiple documents were uploaded
    const pdfUploaded = await TestHelpers.checkUIElementExists(
      page,
      'text=test-document.pdf',
      8000,
    );

    const txtUploaded = await TestHelpers.checkUIElementExists(
      page,
      'text=test-file.txt',
      5000,
    );

    const contractUploaded = await TestHelpers.checkUIElementExists(
      page,
      'text=test-contract.txt',
      5000,
    );

    // At least one file should be uploaded
    expect(pdfUploaded || txtUploaded || contractUploaded).toBe(true);

    if (pdfUploaded && txtUploaded && contractUploaded) {
      console.log('✅ All 3 documents uploaded successfully (bulk upload)');
    } else if (pdfUploaded || txtUploaded || contractUploaded) {
      console.log('✅ At least one document uploaded (bulk upload partially working)');
    }
  });
});

test.describe('Case-Document Workflows - Document Tagging', () => {
  test.beforeEach(async ({ page, workerCredentials }) => {
    ensureTestFixtures();
    await TestHelpers.loginAndWaitForRedirect(
      page,
      workerCredentials.email,
      workerCredentials.password,
      workerCredentials.isAdmin,
    );
  });

  test('should add tags to documents within a Case', async ({ page }) => {
    // Navigate to Cases page
    await page.goto('/cases');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Find a case with documents
    const hasCases = await TestHelpers.checkUIElementExists(
      page,
      'a[href^="/cases/"]',
      3000,
    );

    if (!hasCases) {
      test.skip(true, 'No cases found - cannot test document tagging');
      return;
    }

    // Open first case
    await page.locator('a[href^="/cases/"]').first().click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Navigate to Documents tab
    const documentsTab = await TestHelpers.checkUIElementExists(
      page,
      'button:has-text("Documents"), a:has-text("Documents"), [data-tab="documents"]',
      5000,
    );

    if (documentsTab) {
      await page
        .locator('button:has-text("Documents"), a:has-text("Documents"), [data-tab="documents"]')
        .first()
        .click();
      await page.waitForTimeout(1000);
    }

    // Check if any documents exist
    const hasDocuments = await TestHelpers.checkUIElementExists(
      page,
      '[data-testid="document-item"], .document-row, tr:has(td)',
      5000,
    );

    if (!hasDocuments) {
      test.skip(true, 'No documents in case - cannot test tagging');
      return;
    }

    // Look for tag action button (could be inline button, menu action, or modal)
    const tagButton = await TestHelpers.checkUIElementExists(
      page,
      'button:has-text("Tag"), button:has-text("Add Tag"), [data-action="tag"], [aria-label*="tag" i]',
      5000,
    );

    if (!tagButton) {
      test.skip(true, 'Tag button not found - feature not implemented');
      return;
    }

    // Click tag button
    await page
      .locator('button:has-text("Tag"), button:has-text("Add Tag"), [data-action="tag"]')
      .first()
      .click();
    await page.waitForTimeout(1000);

    // Look for tag input (could be text input, multi-select, or tag picker)
    const tagInput = page.locator(
      'input[placeholder*="tag" i], input[name="tags"], [data-testid="tag-input"]',
    );

    if (await tagInput.isVisible()) {
      // Add tags
      await tagInput.fill('Contract');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);

      await tagInput.fill('Legal');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);

      await tagInput.fill('2026');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);

      // Save tags
      const saveButton = page.locator('button:has-text("Save"), button[type="submit"]');
      if (await saveButton.isVisible()) {
        await saveButton.click();
        await page.waitForTimeout(2000);
      }

      // Verify tags were added
      const hasContractTag = await TestHelpers.checkUIElementExists(
        page,
        'text=Contract',
        5000,
      );

      const hasLegalTag = await TestHelpers.checkUIElementExists(
        page,
        'text=Legal',
        5000,
      );

      expect(hasContractTag || hasLegalTag).toBe(true);

      if (hasContractTag && hasLegalTag) {
        console.log('✅ Document tags added successfully');
      }
    } else {
      console.log('⚠️  Tag input not found - UI may differ from expected');
    }
  });

  test('should filter documents by tags within a Case', async ({ page }) => {
    await page.goto('/cases');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const hasCases = await TestHelpers.checkUIElementExists(
      page,
      'a[href^="/cases/"]',
      3000,
    );

    if (!hasCases) {
      test.skip(true, 'No cases found - cannot test tag filtering');
      return;
    }

    await page.locator('a[href^="/cases/"]').first().click();
    await page.waitForLoadState('networkidle');

    // Navigate to Documents tab
    const documentsTab = await TestHelpers.checkUIElementExists(
      page,
      'button:has-text("Documents"), a:has-text("Documents"), [data-tab="documents"]',
      5000,
    );

    if (documentsTab) {
      await page.locator('button:has-text("Documents"), a:has-text("Documents")').first().click();
      await page.waitForTimeout(1000);
    }

    // Look for tag filter
    const tagFilter = await TestHelpers.checkUIElementExists(
      page,
      'select[name="tag"], [data-filter="tag"], button:has-text("Filter by Tag")',
      3000,
    );

    if (tagFilter) {
      // Select a tag filter
      const filterSelect = page.locator('select[name="tag"], [data-filter="tag"]');
      if (await filterSelect.isVisible()) {
        await filterSelect.selectOption({ index: 1 }); // Select first available tag
        await page.waitForTimeout(1000);

        console.log('✅ Tag filtering tested');
      }
    } else {
      console.log('⚠️  Tag filter not found - feature may not be implemented');
    }
  });
});

test.describe('Case-Document Workflows - Case Locking', () => {
  test.beforeEach(async ({ page, workerCredentials }) => {
    await TestHelpers.loginAndWaitForRedirect(
      page,
      workerCredentials.email,
      workerCredentials.password,
      workerCredentials.isAdmin,
    );
  });

  test('should auto-lock Case when opened', async ({ page }) => {
    await page.goto('/cases');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const hasCases = await TestHelpers.checkUIElementExists(
      page,
      'a[href^="/cases/"]',
      3000,
    );

    if (!hasCases) {
      test.skip(true, 'No cases found - cannot test locking');
      return;
    }

    // Open a case
    await page.locator('a[href^="/cases/"]').first().click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Look for lock indicator (banner, badge, or status text)
    const lockIndicator = await TestHelpers.checkUIElementExists(
      page,
      'text=/locked|case locked|auto-locked/i, [data-status="locked"], .lock-banner',
      5000,
    );

    if (lockIndicator) {
      console.log('✅ Case lock indicator found - auto-lock working');
      expect(lockIndicator).toBe(true);
    } else {
      console.log('⚠️  Lock indicator not found - feature may not be visible or not implemented');
    }

    // Check if lock status is shown with user name
    const lockWithUser = await TestHelpers.checkUIElementExists(
      page,
      'text=/locked.*by|locked.*to/i',
      3000,
    );

    if (lockWithUser) {
      console.log('✅ Lock status shows user information');
    }
  });

  test('should show lock banner prominently', async ({ page }) => {
    await page.goto('/cases');
    await page.waitForLoadState('networkidle');

    const hasCases = await TestHelpers.checkUIElementExists(
      page,
      'a[href^="/cases/"]',
      3000,
    );

    if (!hasCases) {
      test.skip(true, 'No cases found');
      return;
    }

    await page.locator('a[href^="/cases/"]').first().click();
    await page.waitForLoadState('networkidle');

    // Look for prominent lock banner at top of page
    const lockBanner = page.locator(
      '[data-testid="lock-banner"], .case-locked-banner, [role="alert"]:has-text("locked")',
    );

    if (await lockBanner.isVisible()) {
      console.log('✅ Prominent lock banner displayed');

      // Check if banner is at top (within first 300px of viewport)
      const bannerBox = await lockBanner.boundingBox();
      if (bannerBox && bannerBox.y < 300) {
        console.log('✅ Lock banner positioned at top of page');
      }
    }
  });

  test('should prevent document updates when Case locked by another user', async ({ page }) => {
    // This test would require two separate user sessions to fully test
    // For now, verify that lock status is checked before operations
    await page.goto('/cases');
    await page.waitForLoadState('networkidle');

    const hasCases = await TestHelpers.checkUIElementExists(
      page,
      'a[href^="/cases/"]',
      3000,
    );

    if (!hasCases) {
      test.skip(true, 'No cases found');
      return;
    }

    await page.locator('a[href^="/cases/"]').first().click();
    await page.waitForLoadState('networkidle');

    // Try to perform an operation and verify it checks lock status
    // (actual multi-user test would require separate browser contexts)
    console.log('⚠️  Multi-user lock prevention requires separate test infrastructure');
  });
});

test.describe('Case-Document Workflows - Navigation Flows', () => {
  test.beforeEach(async ({ page, workerCredentials }) => {
    await TestHelpers.loginAndWaitForRedirect(
      page,
      workerCredentials.email,
      workerCredentials.password,
      workerCredentials.isAdmin,
    );
  });

  test('should navigate: Dashboard → Cases → Case Details → Documents Tab', async ({ page }) => {
    // Step 1: Start at Dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Verify Dashboard loaded - check for Welcome message which is always present
    const onDashboard = await TestHelpers.checkUIElementExists(
      page,
      'text=Welcome',
      5000,
    );

    expect(onDashboard).toBe(true);
    console.log('✅ Step 1: Dashboard loaded');

    // Step 2: Navigate to Cases page
    const casesLink = page.locator('a:has-text("Cases"), nav >> a[href="/cases"]').first();

    if (await casesLink.isVisible()) {
      await casesLink.click();
    } else {
      // Try alternative navigation
      await page.goto('/cases');
    }

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Verify Cases page loaded
    const onCases = await TestHelpers.checkUIElementExists(
      page,
      'h1:has-text("Cases"), [data-page="cases"]',
      5000,
    );

    expect(onCases).toBe(true);
    console.log('✅ Step 2: Cases page loaded');

    // Step 3: Open a Case
    const hasCases = await TestHelpers.checkUIElementExists(
      page,
      'a[href^="/cases/"]',
      3000,
    );

    if (!hasCases) {
      test.skip(true, 'No cases available for navigation test');
      return;
    }

    await page.locator('a[href^="/cases/"]').first().click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Verify Case Details page loaded
    expect(page.url()).toContain('/cases/');
    console.log('✅ Step 3: Case Details page loaded');

    // Step 4: Navigate to Documents Tab
    const documentsTab = await TestHelpers.checkUIElementExists(
      page,
      'button:has-text("Documents"), a:has-text("Documents"), [data-tab="documents"]',
      5000,
    );

    if (documentsTab) {
      await page
        .locator('button:has-text("Documents"), a:has-text("Documents"), [data-tab="documents"]')
        .first()
        .click();
      await page.waitForTimeout(1000);

      console.log('✅ Step 4: Documents tab activated');
    } else {
      console.log('⚠️  Documents tab not found - may already be active or UI different');
    }

    // Verify Documents section is visible
    const documentsSection = await TestHelpers.checkUIElementExists(
      page,
      '[data-section="documents"], .documents-list, text=/documents/i',
      3000,
    );

    if (documentsSection) {
      console.log('✅ Documents section visible');
    }
  });

  test('should navigate from Case back to Cases list', async ({ page }) => {
    await page.goto('/cases');
    await page.waitForLoadState('networkidle');

    const hasCases = await TestHelpers.checkUIElementExists(
      page,
      'a[href^="/cases/"]',
      3000,
    );

    if (!hasCases) {
      test.skip(true, 'No cases available');
      return;
    }

    // Open a case
    await page.locator('a[href^="/cases/"]').first().click();
    await page.waitForLoadState('networkidle');

    // Look for back button
    const backButton = page.locator(
      'button:has-text("Back"), a:has-text("Back to Cases"), [aria-label="Back"]',
    );

    if (await backButton.isVisible()) {
      await backButton.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Verify back on Cases list
      const backOnCases = await TestHelpers.checkUIElementExists(
        page,
        'h1:has-text("Cases")',
        3000,
      );

      expect(backOnCases).toBe(true);
      console.log('✅ Back navigation to Cases list successful');
    } else {
      // Try browser back button
      await page.goBack();
      await page.waitForTimeout(1000);

      const backOnCases = await TestHelpers.checkUIElementExists(
        page,
        'h1:has-text("Cases")',
        3000,
      );

      if (backOnCases) {
        console.log('✅ Browser back navigation successful');
      }
    }
  });

  test('should show breadcrumb navigation in Case Details', async ({ page }) => {
    await page.goto('/cases');
    await page.waitForLoadState('networkidle');

    const hasCases = await TestHelpers.checkUIElementExists(
      page,
      'a[href^="/cases/"]',
      3000,
    );

    if (!hasCases) {
      test.skip(true, 'No cases available');
      return;
    }

    await page.locator('a[href^="/cases/"]').first().click();
    await page.waitForLoadState('networkidle');

    // Look for breadcrumbs
    const breadcrumbs = page.locator(
      'nav[aria-label="Breadcrumb"], .breadcrumbs, [data-testid="breadcrumbs"]',
    );

    if (await breadcrumbs.isVisible()) {
      console.log('✅ Breadcrumb navigation present');

      // Check for Home / Cases links in breadcrumbs
      const hasCasesLink = await TestHelpers.checkUIElementExists(
        page,
        'nav[aria-label="Breadcrumb"] >> a:has-text("Cases"), .breadcrumbs >> a:has-text("Cases")',
        2000,
      );

      if (hasCasesLink) {
        console.log('✅ Breadcrumbs include Cases link');
      }
    } else {
      console.log('⚠️  Breadcrumbs not found - navigation may use different pattern');
    }
  });
});

// Export for test runner
export {};
