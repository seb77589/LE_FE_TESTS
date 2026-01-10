/**
 * Contract Tests: API Path Validation
 *
 * Validates that all API paths used by the frontend exist in the backend OpenAPI schema.
 * Prevents frontend/backend path mismatches (e.g., /logs vs /report).
 *
 * @description These tests catch path mismatches at build time instead of runtime 404s.
 * Run with: npm run test:contract
 *
 * @since 0.2.0
 */

/**
 * Complete map of all API endpoints used by frontend
 *
 * CRITICAL: This must be kept in sync with actual frontend API calls.
 * When adding new API calls, add the path here.
 */
const FRONTEND_API_PATHS = {
  // Authentication & Session Management
  login: '/api/v1/auth/login',
  logout: '/api/v1/auth/logout',
  refreshToken: '/api/v1/auth/refresh',
  validateSession: '/api/v1/auth/validate-session',

  // User Management
  usersMe: '/api/v1/users/me',
  usersProfile: '/api/v1/users/profile',
  usersAvatar: '/api/v1/users/me/avatar',
  usersSettings: '/api/v1/users/me/settings',
  usersPreferences: '/api/v1/users/me/preferences',
  usersActivity: '/api/v1/users/me/activity',

  // Password Management
  passwordChange: '/api/v1/auth/change-password',
  passwordReset: '/api/v1/auth/password-reset',
  passwordResetRequest: '/api/v1/auth/password-reset-request',
  passwordValidate: '/api/v1/auth/validate-password',

  // Documents
  documentsUpload: '/api/v1/documents/upload',
  documentsUploadMultiple: '/api/v1/documents/upload-multiple',
  documentsList: '/api/v1/documents/',
  documentsSearch: '/api/v1/documents/search',

  // Cases
  casesList: '/api/v1/cases/',

  // Admin (Manager/SuperAdmin only)
  adminUsers: '/api/v1/admin/users',
  adminUsersAnalytics: '/api/v1/admin/users/analytics',
  adminActivity: '/api/v1/admin/activity',
  adminDashboard: '/api/v1/admin/dashboard',
  adminSystemStatus: '/api/v1/admin/system/status',

  // Frontend Error Reporting (CRITICAL - path mismatch caused 2,161 404s)
  frontendErrorsReport: '/api/v1/frontend-errors/report',

  // Analytics
  analyticsEvents: '/api/v1/analytics/events',

  // Notifications
  notificationsList: '/api/v1/notifications/',
  notificationsMarkAllRead: '/api/v1/notifications/mark-all-read',

  // Health Check
  health: '/health',
  apiHealth: '/api/v1/health',

  // CSRF
  csrfToken: '/api/v1/csrf/token',
} as const;

describe('API Path Contract Tests', () => {
  let openApiSchema: any;

  beforeAll(async () => {
    // Fetch OpenAPI schema from backend
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const response = await fetch(`${backendUrl}/openapi.json`);

    if (!response.ok) {
      throw new Error(`Failed to fetch OpenAPI schema: ${response.statusText}`);
    }

    openApiSchema = await response.json();
  });

  test('OpenAPI schema should be loaded', () => {
    expect(openApiSchema).toBeDefined();
    expect(openApiSchema.paths).toBeDefined();
    expect(typeof openApiSchema.paths).toBe('object');
  });

  test('should have all frontend paths in backend OpenAPI', () => {
    const missingPaths: string[] = [];
    const pathDetails: Record<string, { exists: boolean; methods?: string[] }> = {};

    for (const [key, path] of Object.entries(FRONTEND_API_PATHS)) {
      const exists = openApiSchema.paths[path] !== undefined;
      pathDetails[path] = {
        exists,
        methods: exists ? Object.keys(openApiSchema.paths[path]) : undefined,
      };

      if (!exists) {
        missingPaths.push(`${key}: ${path}`);
      }
    }

    // Log all paths for debugging
    console.log('\n📋 Frontend API Paths Validation:');
    console.log('═'.repeat(60));
    for (const [path, details] of Object.entries(pathDetails)) {
      const status = details.exists ? '✅' : '❌';
      const methods = details.methods ? ` (${details.methods.join(', ')})` : '';
      console.log(`${status} ${path}${methods}`);
    }
    console.log('═'.repeat(60));

    if (missingPaths.length > 0) {
      const errorMessage = [
        '',
        '❌ FRONTEND/BACKEND PATH MISMATCH DETECTED',
        '═'.repeat(60),
        'The following paths are used by frontend but NOT in backend OpenAPI:',
        '',
        ...missingPaths.map((p) => `  - ${p}`),
        '',
        'This will cause 404 errors in production!',
        '',
        'Fix options:',
        '  1. Update frontend to use correct path (check backend OpenAPI)',
        '  2. Add missing endpoint to backend',
        '  3. Update FRONTEND_API_PATHS if path is outdated',
        '',
        'Check OpenAPI schema at: http://localhost:8000/docs',
        '═'.repeat(60),
      ].join('\n');

      throw new Error(errorMessage);
    }
  });

  test('should detect critical endpoint changes', () => {
    // Test specific high-risk endpoints
    const criticalEndpoints = {
      'Frontend Error Reporting': FRONTEND_API_PATHS.frontendErrorsReport,
      'User Authentication': FRONTEND_API_PATHS.login,
      'User Profile': FRONTEND_API_PATHS.usersMe,
      'Document Upload': FRONTEND_API_PATHS.documentsUpload,
    };

    const missingCritical: string[] = [];

    for (const [name, path] of Object.entries(criticalEndpoints)) {
      if (!openApiSchema.paths[path]) {
        missingCritical.push(`${name} (${path})`);
      }
    }

    if (missingCritical.length > 0) {
      throw new Error(
        `CRITICAL: The following high-priority endpoints are missing:\n${missingCritical.join('\n')}`,
      );
    }
  });

  test('should warn about unused backend paths', () => {
    // Find paths in OpenAPI that aren't referenced in frontend
    const frontendPathsSet = new Set(Object.values(FRONTEND_API_PATHS));
    const unusedPaths: string[] = [];

    for (const path of Object.keys(openApiSchema.paths)) {
      // Skip internal/test endpoints
      if (path.includes('/docs') || path.includes('/openapi')) continue;

      if (!frontendPathsSet.has(path)) {
        unusedPaths.push(path);
      }
    }

    if (unusedPaths.length > 0) {
      console.warn('\n⚠️  Backend paths NOT referenced in frontend:');
      console.warn('═'.repeat(60));
      unusedPaths.forEach((p) => console.warn(`  - ${p}`));
      console.warn('═'.repeat(60));
      console.warn('These may be deprecated or未使用 by frontend.');
      console.warn('Consider updating FRONTEND_API_PATHS if these are active.\n');
    }

    // This is a warning, not a failure
    expect(unusedPaths.length).toBeGreaterThanOrEqual(0);
  });
});
