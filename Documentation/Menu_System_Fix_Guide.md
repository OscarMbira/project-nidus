# Menu System Fix Guide

## Issue Summary

The dynamic role-based menu system was completely disabled due to RLS (Row Level Security) issues on multiple database tables. This caused all users, including Organization Admins, to see only a basic fallback menu instead of their full role-based menu.

### Symptoms

- Console warning: `"Using fallback menu (users table RLS disabled)"`
- Organization Admins only see Dashboard, Projects, and Tasks
- Missing menus: Teams, Reports, Administration
- Menu system code was commented out in `useMenu.js`

## Root Cause

The menu system requires querying several tables to load role-based menus:

1. **users** - To get the user's internal ID from auth_user_id
2. **user_roles** - To get the user's assigned roles
3. **roles** - To get role details
4. **menu_items** - To get available menu items
5. **role_menu_items** - To map roles to menu items

**All of these tables had RLS issues** preventing the menu system from querying them.

## Solution

Created comprehensive fix: `SQL/v129_fix_menu_system_rls.sql`

This script:
- ✅ Fixes RLS policies on `users` table
- ✅ Fixes RLS policies on `user_roles` table
- ✅ Fixes RLS policies on `menu_items` table
- ✅ Fixes RLS policies on `role_menu_items` table
- ✅ Verifies org_admin menu assignments
- ✅ Re-enables dynamic menu loading in `useMenu.js`

## Organization Admin Menu Structure

The **org_admin** role has access to **all menus** except these system-level admin menus:
- `admin_settings` (System Admin only)
- `admin_audit` (System Admin only)
- `admin_integrations` (System Admin only)

### Full org_admin Menu Access

| Top-Level Menu | Submenus | Description |
|----------------|----------|-------------|
| **Dashboard** | - | Main dashboard and overview |
| **Projects** | All Projects, My Projects, New Project, Archived Projects, Templates | Full project management |
| **Tasks** | All Tasks, My Tasks, Task Board, Calendar, Gantt Chart | Complete task management |
| **Teams** | All Teams, My Teams, Team Directory, Workload View | Team management and collaboration |
| **Reports** | Dashboard, Project Reports, Resource Reports, Time Reports, Budget Reports, Custom Reports | Comprehensive reporting and analytics |
| **Administration** | Users, Roles, Permissions (org-level only) | Organization administration |

## How to Apply the Fix

### Step 1: Run SQL Fix in Supabase

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your "Project Nidus" project
3. Navigate to **SQL Editor** → **New Query**
4. Open the file: `SQL/v129_fix_menu_system_rls.sql`
5. Copy entire contents
6. Paste into SQL Editor
7. Click **Run**

### Step 2: Verify Success

After running the script, you should see:

```
================================================
Menu System RLS Fix Complete
================================================
RLS POLICIES:
  users table: 4 policies
  user_roles table: 4 policies
  roles table: 2 policies
  menu_items table: 2 policies
  role_menu_items table: 1 policies

ORG_ADMIN MENU ACCESS:
  Menu items assigned: 40+ items
================================================
```

✅ **Success Indicators:**
- All tables have RLS policies
- org_admin has 40+ menu items assigned
- No warnings displayed

### Step 3: Test in Application

1. **Refresh your browser** (hard refresh: Ctrl+Shift+R)
2. Log in as an org_admin user
3. Check console - should **NOT** see "Using fallback menu" warning
4. Verify you see **full menu structure**:
   - ✅ Dashboard
   - ✅ Projects (with submenus)
   - ✅ Tasks (with submenus)
   - ✅ Teams (with submenus)
   - ✅ Reports (with submenus)
   - ✅ Administration (org-level only)

## What Changed

### Database Changes (v129)

#### 1. Users Table RLS
**Before:** No policies or restrictive policies preventing SELECT
**After:**
- Users can read their own record
- Users can read other users' basic info (for team views)
- Users can update their own record
- System can insert new users during registration

#### 2. User_Roles Table RLS
**Before:** No policies or restrictive policies
**After:**
- Users can read their own roles
- Users can read other users' roles (for team management)
- System can insert roles during registration
- Admins can update roles

#### 3. Menu_Items Table RLS
**Before:** No policies
**After:**
- Authenticated users can read active menu items
- Anonymous users can read menu items (for public pages)

#### 4. Role_Menu_Items Table RLS
**Before:** No policies
**After:**
- Authenticated users can read role-menu mappings

### Code Changes (useMenu.js)

**Before:**
```javascript
// USERS TABLE QUERY TEMPORARILY DISABLED
// Using fallback menu
setMenuItems(getFallbackMenuItems())
return

/* COMMENTED OUT - dynamic menu loading code */
```

**After:**
```javascript
// NOTE: RLS policies fixed in v129
// Dynamic menu loading is now enabled

// Get user record ID from users table
const { data: userRecord } = await supabase
  .from('users')
  .select('id')
  .eq('auth_user_id', user.id)
  .single()

// ... full dynamic menu loading logic enabled
```

**Enhanced Fallback Menu:**
- Added Teams, Reports, and Settings to fallback
- Provides better UX if menu system temporarily fails

## Troubleshooting

### Issue: Still seeing "Using fallback menu" warning

**Possible Causes:**
1. SQL fix not run yet
2. Browser cache not cleared
3. User doesn't have org_admin role assigned

**Solutions:**
1. Run `SQL/v129_fix_menu_system_rls.sql` in Supabase
2. Hard refresh browser (Ctrl+Shift+R)
3. Check user's roles:
   ```sql
   SELECT u.email, r.role_name, r.role_display_name
   FROM users u
   INNER JOIN user_roles ur ON u.id = ur.user_id
   INNER JOIN roles r ON ur.role_id = r.id
   WHERE u.email = 'user@example.com'
   AND ur.is_active = TRUE;
   ```

### Issue: Menu loads but submenu items missing

**Cause:** Menu items table might be incomplete

**Solution:**
Run menu seed script to populate missing menu items:
```bash
# Run in Supabase SQL Editor
SQL/v14_seed_data_menus.sql
```

### Issue: Different roles seeing wrong menus

**Cause:** Role-menu assignments might be missing

**Solution:**
Check role-menu assignments:
```sql
SELECT r.role_name, COUNT(rmi.id) as menu_count
FROM roles r
LEFT JOIN role_menu_items rmi ON r.id = rmi.role_id
WHERE r.is_active = TRUE
AND rmi.is_active = TRUE
GROUP BY r.role_name
ORDER BY menu_count DESC;
```

Expected counts:
- `system_admin`: 50+ items (all menus)
- `org_admin`: 40+ items (all except system admin)
- `project_manager`: 30+ items
- `team_lead`: 20+ items
- `team_member`: 10+ items

## Menu System Architecture

### How It Works

1. **User logs in** → Supabase Auth provides `auth_user_id`
2. **Query users table** → Get internal `user.id` from `auth_user_id`
3. **Query user_roles** → Get user's assigned `role_ids`
4. **Query role_menu_items** → Get menu items accessible to those roles
5. **Join with menu_items** → Get full menu details (label, icon, route)
6. **Build hierarchy** → Organize menus by parent-child relationships
7. **Sort by sort_order** → Display in correct order

### Key Tables

```
users
├─ id (internal ID)
└─ auth_user_id (from Supabase Auth)

user_roles
├─ user_id → users.id
└─ role_id → roles.id

roles
├─ id
└─ role_name (org_admin, project_manager, etc.)

role_menu_items
├─ role_id → roles.id
├─ menu_item_id → menu_items.id
├─ can_view (boolean)
└─ can_use (boolean)

menu_items
├─ id
├─ menu_code (dashboard, projects, etc.)
├─ parent_menu_id (for hierarchy)
└─ route_path (/app/dashboard, etc.)
```

## Security Considerations

- **RLS Enabled:** All tables have RLS enabled for security
- **Authenticated Access:** Only authenticated users can read menu data
- **Role-Based:** Users only see menus assigned to their roles
- **Admin Protection:** System-level admin menus excluded from org_admin
- **No Direct SQL:** All queries through Supabase RLS-protected API

## Related Files

### SQL Scripts
- `SQL/v05_configuration_menu_tables.sql` - Creates menu tables
- `SQL/v14_seed_data_menus.sql` - Seeds menu items and role assignments
- `SQL/v129_fix_menu_system_rls.sql` - Fixes RLS policies (THIS FIX)

### Frontend Code
- `src/hooks/useMenu.js` - Dynamic menu loading hook
- `src/components/Sidebar.jsx` - Menu rendering component

### Documentation
- `Documentation/Menu_System_Fix_Guide.md` - This guide

## Additional SQL Fixes Required

This menu fix is part of a series. Make sure you've also run:

1. `SQL/v126_fix_countries_rls_policies.sql` - Fixes countries table
2. `SQL/v127_ensure_org_admin_role_exists.sql` - Creates org_admin role
3. `SQL/v128_fix_organisation_setup_issues.sql` - Master organisation setup fix
4. `SQL/v129_fix_menu_system_rls.sql` - This menu system fix (CURRENT)

## Testing Checklist

After applying the fix:

- [ ] Run SQL script v129 in Supabase
- [ ] Hard refresh browser (Ctrl+Shift+R)
- [ ] Log in as org_admin user
- [ ] Verify NO "Using fallback menu" warning in console
- [ ] Check Dashboard menu visible
- [ ] Check Projects menu with submenus
- [ ] Check Tasks menu with submenus
- [ ] Check Teams menu with submenus
- [ ] Check Reports menu with submenus
- [ ] Check Administration menu visible
- [ ] Click each menu item - should navigate correctly
- [ ] Log out and log in again - menus persist

## Success!

After completing this fix, Organization Admins will see their **full role-based menu** with all features and functionality appropriate for their role.

No more fallback menu! 🎉
