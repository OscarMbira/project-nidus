# PMO Sidebar Consolidation Plan

## Objective
Merge the old "UnPreferred" PMO sidebar (`/pmo/dashboard`) into the "Preferred" platform sidebar (`/platform/*`) so PMO Admin users see only the unified platform sidebar across the entire app.

## Todo Items

- [x] Fix post-login routing: `pmo_admin` role now routes to `/platform/dashboard` (was `/pmo/dashboard`)
- [x] Update `PMOLayout.jsx` to use platform `Sidebar` + `PlatformAppHeader` (replaces `PMOSidebar` + `SystemHeader`)
- [x] Redirect `Route path="pmo/dashboard"` → `<Navigate to="/platform/dashboard" replace />`
- [x] Update `pmMenuConfig.js` (static fallback) with all missing PMO items:
  - Governance: Communication Strategy, Configuration Strategy, Quality Strategy, Risk Strategy
  - PMO Admin: Business Cases section, Benefits Review Plans section
  - New "Project Oversight" top-level section: Risk Register, Issue Register, Quality Register, Lessons Log
  - Reports & Analytics: Highlight Reports, Exception Reports, End Stage Reports, End Project Reports
  - Procurement: RFP Register (renamed), Load RFP, RFP Drafts
- [x] Add missing Lucide icons to `Sidebar.jsx` `iconMap` (Eye, ShoppingCart, Flag, FileWarning, FileClock, AlertTriangle, AlertCircle, ClipboardList, GraduationCap, Megaphone, Settings2, FileSpreadsheet, FilePlus, Pause)
- [x] Create SQL migration `v265_pmo_admin_consolidated_sidebar_menu.sql` to add all new menu items to DB and assign them to the `pmo_admin` role

## Files Changed

| File | Change |
|------|--------|
| `src/services/roleRouter.js` | `pmo_admin` route: `/pmo/dashboard` → `/platform/dashboard` |
| `src/components/pmo/PMOLayout.jsx` | Replaced `PMOSidebar` + `SystemHeader` with `Sidebar` + `PlatformAppHeader` |
| `src/App.jsx` | `pmo/dashboard` route now redirects to `/platform/dashboard` |
| `src/config/pmMenuConfig.js` | Added all missing PMO items as static fallback config |
| `src/components/Sidebar.jsx` | Added 14 new icon imports and iconMap entries |
| `SQL/v265_pmo_admin_consolidated_sidebar_menu.sql` | DB migration for all new menu items |

## Review

### What Changed
1. **Routing**: PMO Admin now lands on `/platform/dashboard` after login (same dashboard as all other roles, just with PMO-specific sidebar items).
2. **PMOLayout**: All `/pmo/*` routes still work with the same URLs, but now show the unified platform sidebar (DB-driven, role-aware) instead of the old static PMO sidebar.
3. **Database**: New `menu_items` entries are created for all missing PMO sections and assigned to the `pmo_admin` role via `role_menu_items`.
4. **Static config**: `pmMenuConfig.js` is updated as a static reference/fallback matching the DB structure.

### Items Added to Platform Sidebar for PMO Admin
- **Governance**: + Communication Strategy, Configuration Strategy, Quality Management Strategy, Risk Management Strategy
- **Reports & Analytics**: + Highlight Reports, Exception Reports, End Stage Reports, End Project Reports
- **Project Oversight** (new section): Risk Register, Issue Register, Quality Register, Lessons Log
- **PMO Admin**: + Business Cases, Benefits Review Plans
- **Procurement**: RFP Register, Load RFP, RFP Drafts

### No Duplications
- Project Mandate (already in PMO Admin > Project Mandates) ✓
- Project Brief (already in PMO Admin > Project Briefs) ✓
- Approval/Authorisation (already in PMO Admin > Project Mandates > Pending Approvals) ✓
