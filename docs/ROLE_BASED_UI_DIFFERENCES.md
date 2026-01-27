# Role-Based UI Differences - Dashboard and Cases Pages

This document outlines the UI differences between ASSISTANT, MANAGER, and SUPERADMIN roles on the Dashboard and Cases pages.

## Navigation (Global - All Pages)

**Component:** `/home/duck/legalease/frontend/src/components/ui/Navigation.tsx`

### Admin Navigation Link

**Location:** Main navigation bar (line 55)

| Role                                    | UI Behavior                      |
| --------------------------------------- | -------------------------------- |
| **ASSISTANT**                           | ❌ NO "Admin" navigation link    |
| **MANAGER** (isAdmin)                   | ✅ Shows "Admin" navigation link |
| **SUPERADMIN** (isAdmin + isSuperAdmin) | ✅ Shows "Admin" navigation link |

**Implementation:**

```typescript
{ name: 'Admin', href: '/admin', icon: Shield, show: isAdmin() }
```

**Filtering Logic:** Navigation items are filtered with `.filter((item) => item.show)` before rendering

---

## Dashboard Page

**Component:** `/home/duck/legalease/frontend/src/app/(protected)/dashboard/page.tsx`

### Administrator Access Section

**Location:** Previously at bottom of dashboard page (REMOVED as of 2026-01-25)

**Status:** ⚠️ **REMOVED** - This section was redundant and has been permanently removed.

**Rationale for Removal:**

1. Both MANAGER and SUPERADMIN roles already have "Admin" link in top navigation bar
2. "Manage Users" link was redundant (accessible via Admin > Users tab)
3. "System Admin" link duplicated the navigation "Admin" link
4. Removal improves UX by eliminating clutter and redundancy

**Access Path Changes:**

- ✅ Admin Dashboard: Navigate via "Admin" link in top navigation
- ✅ User Management: Navigate to Admin > Users tab
- ✅ All admin functionality remains fully accessible via navigation menu

| Role           | UI Behavior                                                 |
| -------------- | ----------------------------------------------------------- |
| **ASSISTANT**  | ❌ NO admin access (no changes)                             |
| **MANAGER**    | ✅ Access admin features via "Admin" link in top navigation |
| **SUPERADMIN** | ✅ Access admin features via "Admin" link in top navigation |

**Previous Implementation (deprecated):**

```typescript
// REMOVED CODE (for historical reference only)
{isAdminUser && (
  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
    <h3 className="text-lg font-semibold text-blue-900 mb-2">
      Administrator Access
    </h3>
    {/* ... */}
    <Link href="/admin/users">Manage Users</Link>
    {isSuperAdminUser && (
      <Link href="/admin">System Admin</Link>
    )}
  </div>
)}
```

**Visual Design:**

- Blue background (bg-blue-50)
- Blue border (border-blue-200)
- Rounded corners
- Action buttons styled with Tailwind classes

---

## Cases Page

**Component:** `/home/duck/legalease/frontend/src/app/(protected)/cases/page.tsx`

### UI Differences

| Role           | UI Behavior                          |
| -------------- | ------------------------------------ |
| **ASSISTANT**  | ✅ Identical UI to MANAGER           |
| **MANAGER**    | ✅ Identical UI to ASSISTANT         |
| **SUPERADMIN** | ✅ Identical UI to MANAGER/ASSISTANT |

**No visible UI differences** - All roles see the same:

- Case status stat cards (Closed Cases, In Progress, To Review)
- Case Trends analytics chart
- Cases table with columns (Title, Status, Updated, Actions)
- Search and filter controls
- Checkbox for bulk selection

### Data Scoping Differences

**API Endpoint:** `/api/v1/cases` (company-scoped access)

| Role           | Data Access                           |
| -------------- | ------------------------------------- |
| **ASSISTANT**  | ✅ Cases within their company only    |
| **MANAGER**    | ✅ Cases within their company only    |
| **SUPERADMIN** | ✅ **ALL cases across ALL companies** |

**Implementation Note (line 114):**

```typescript
// - SUPERADMIN: sees all cases across all companies
// - MANAGER/ASSISTANT: sees all cases within their company
```

---

## Profile Menu (Global - All Pages)

**Component:** `/home/duck/legalease/frontend/src/components/ui/Navigation.tsx`

### Profile Submenu Items

**Location:** User dropdown menu (lines 59-64)

| Role          | Available Menu Items                                                                                                               |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **ALL ROLES** | ✅ Profile → `/profile`<br>✅ Settings → `/settings`<br>✅ Security → `/dashboard/security`<br>✅ Sessions → `/dashboard/sessions` |

**No role-based filtering** - All users see the same profile menu items.

---

## Summary

### ASSISTANT Role

- **Navigation:** Dashboard, Cases, Templates, Notifications (NO Admin link)
- **Dashboard:** No "Administrator Access" section
- **Cases:** Company-scoped case data only
- **Profile Menu:** Profile, Settings, Security, Sessions

### MANAGER Role

- **Navigation:** Dashboard, Cases, Templates, Notifications, **Admin**
- **Dashboard:** Clean dashboard without redundant admin section (use top navigation for admin access)
- **Cases:** Company-scoped case data only
- **Profile Menu:** Profile, Settings, Security, Sessions

### SUPERADMIN Role

- **Navigation:** Dashboard, Cases, Templates, Notifications, **Admin**
- **Dashboard:** Clean dashboard without redundant admin section (use top navigation for admin access)
- **Cases:** **ALL cases across ALL companies**
- **Profile Menu:** Profile, Settings, Security, Sessions

---

## Testing Implications

### Dashboard Tests

- ASSISTANT: Should NOT see admin features on dashboard
- MANAGER: Should NOT see "Administrator Access" section (removed as redundant)
- SUPERADMIN: Should NOT see "Administrator Access" section (removed as redundant)
- ALL ROLES: Admin features accessible via "Admin" navigation link (for admin roles only)

### Navigation Tests

- ASSISTANT: Should NOT see "Admin" navigation link
- MANAGER: Should see "Admin" navigation link
- SUPERADMIN: Should see "Admin" navigation link

### Cases Tests

- ASSISTANT: Should see cases from their company (count check)
- MANAGER: Should see cases from their company (count check)
- SUPERADMIN: Should see cases from ALL companies (higher count)

---

## Test Credential Mapping

**From:** `/home/duck/legalease/config/.env`

| Role           | Email                          | Company                          | Usage                              |
| -------------- | ------------------------------ | -------------------------------- | ---------------------------------- |
| **ASSISTANT**  | `test_assistant_1@example.com` | company_id: 1 (default-company)  | E2E tests for ASSISTANT role       |
| **MANAGER**    | `admin@legalease.com`          | company_id: 1 (default-company)  | E2E tests for MANAGER role         |
| **MANAGER**    | `ws-test-admin-1@example.com`  | company_id: 1 (default-company)  | Parallel E2E tests (worker-scoped) |
| **SUPERADMIN** | `test_superadmin@example.com`  | company_id: null (all companies) | E2E tests for SUPERADMIN role      |

---

## Related Files

- Navigation Component: `/home/duck/legalease/frontend/src/components/ui/Navigation.tsx`
- Dashboard Page: `/home/duck/legalease/frontend/src/app/(protected)/dashboard/page.tsx`
- Cases Page: `/home/duck/legalease/frontend/src/app/(protected)/cases/page.tsx`
- Auth Context: `/home/duck/legalease/frontend/src/lib/context/ConsolidatedAuthContext.tsx`
- Test Credentials: `/home/duck/legalease/frontend/tests/test-credentials.ts`
