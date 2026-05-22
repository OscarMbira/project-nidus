# v592 — Decoupled Manager & Member Assignment System

**Date:** 2026-05-21  
**Status:** Implemented (2026-05-21)  
**Goal:** Allow Portfolio, Programme, and Project Managers to be assigned/invited and unassigned through dedicated, role-scoped "People & Assignments" pages — without opening or editing the portfolio/programme/project record. Project Managers and Team Managers/Leads can assign/invite project members the same way. All surfaces are accessible from the sidebar for each authorised role. Simulator must reach parity with Platform.

---

## Problem Statement

Currently:
- **PMO Admin** has a standalone `ManagerAssignments.jsx` page at `/platform/pmo-admin/manager-assignments` — this is already "decoupled" from the entity edit form. ✅
- **Portfolio Manager** has **no** dedicated assignment UI — to change a Programme Manager or Project Manager within their portfolio they must open the entity edit form.
- **Programme Manager** has **no** dedicated assignment UI — to change a Project Manager within their programme they must open the entity edit form.
- **Team Manager/Leader** may have no dedicated sidebar entry to the member management page.
- The **Simulator** mirrors the PMO-only gap.

**Desired state:** Every authorised role has a sidebar entry pointing to a people-and-assignment page that is scoped to exactly what they are allowed to manage.

---

## Scope of Authorised Actions per Role

| Role | Can Assign | Scope |
|---|---|---|
| PMO Admin | Portfolio Mgr, Programme Mgr, Project Mgr | System-wide (all entities) |
| Portfolio Manager | Programme Mgr, Project Mgr | Programmes/projects inside their portfolio |
| Programme Manager | Project Mgr | Projects inside their programme |
| Project Manager | Team members (invite/remove) | Members of their project |
| Team Manager / Team Lead | Team members (invite/remove) | Members of their project |

---

## Architecture Decisions

1. **Storage unchanged** — Assignments continue to be stored as `portfolio_manager_user_id`, `programme_manager_user_id`, `project_manager_user_id` on entity tables. No new junction table. This is the correct normalised approach and already well supported by the existing service.
2. **Decoupling is a UI concern** — A dedicated "People & Assignments" page per role ensures managers never need to open the entity edit form.
3. **Reuse existing components** — `AssignManagerModal`, `ProjectUsers.jsx`, and `managerAssignmentService` are reused or extended; no new modals are created.
4. **Scoped service functions** — New query helpers return only the entities a given user may manage.
5. **Simulator parity** — Every Platform page and route has a `Sim` counterpart.

---

## Todo List

### Phase 1 — SQL (RLS + scoped views) `SQL/v592_*.sql`
- [x] **1.1** `SQL/v592a_portfolio_mgr_assignments_rls.sql` — Add RLS UPDATE policies:
  - `programmes`: portfolio manager can update `programme_manager_user_id` when they own the parent portfolio
  - `projects`: portfolio manager can update `project_manager_user_id` when their portfolio contains the programme that owns the project
- [x] **1.2** `SQL/v592b_programme_mgr_assignments_rls.sql` — Add RLS UPDATE policy:
  - `projects`: programme manager can update `project_manager_user_id` when the project is in their programme
- [x] **1.3** `SQL/v592c_sim_scoped_manager_assignments_rls.sql` — Simulator practice entity scoped UPDATE policies (no new tables; `database_tables` registration not required)

### Phase 2 — Service layer
- [x] **2.1** Add to `src/services/managerAssignmentService.js`:
  - `listProgrammesForPortfolioManager(userId)` — programmes where `portfolios.portfolio_manager_user_id = userId`
  - `listProjectsForPortfolioManager(userId)` — projects whose programme belongs to one of that user's portfolios
  - `listProjectsForProgrammeManager(userId)` — projects where the programme has `programme_manager_user_id = userId`
  - `getCurrentPlatformUserId()`
- [x] **2.2** Add to `src/services/sim/simManagerAssignmentService.js` (Simulator):
  - `simListProgrammesForPortfolioManager(userId)`
  - `simListProjectsForPortfolioManager(userId)`
  - `simListProjectsForProgrammeManager(userId)`
  - Scoped assign/remove helpers and `getCurrentSimPublicUserId()`

### Phase 3 — Platform: Portfolio Manager assignment page
- [x] **3.1** Create `src/pages/portfolio-manager/PortfolioManagerAssignments.jsx`
  - Tabs: **Programmes** (assign Programme Manager) | **Projects** (assign Project Manager)
  - Uses `ManagerAssignmentsWorkbench` + scoped service helpers
- [x] **3.2** Register route in `App.jsx`: `/platform/portfolio-manager/assignments` (with `PMLayout`)

### Phase 4 — Platform: Programme Manager assignment page
- [x] **4.1** Create `src/pages/programme-manager/ProgrammeManagerAssignments.jsx`
  - Single tab: **Projects** (assign Project Manager)
- [x] **4.2** Register route in `App.jsx`: `/platform/programme-manager/assignments` (with `PMLayout`)

### Phase 5 — Sidebar menu entries (Platform)
- [x] **5.1** Add "People & Assignments" section to `src/config/pmDashboardMenuConfig.js` with sub-items per role
- [x] **5.2** Verify `PMSidebar.jsx` renders the new menu items correctly (config-driven; no code change required)

### Phase 6 — Simulator: Portfolio Manager assignment page
- [x] **6.1** Create `src/pages/sim/portfolio-manager/SimPortfolioManagerAssignments.jsx`
- [x] **6.2** Register route in `App.jsx`: `/simulator/pm/portfolio-manager/assignments`

### Phase 7 — Simulator: Programme Manager assignment page
- [x] **7.1** Create `src/pages/sim/programme-manager/SimProgrammeManagerAssignments.jsx`
- [x] **7.2** Register route in `App.jsx`: `/simulator/pm/programme-manager/assignments`

### Phase 8 — Simulator sidebar menu entries
- [x] **8.1** Add equivalent "People & Assignments" items to `src/config/simulatorPMMenuConfig.js`
- [x] **8.2** Verify `SimulatorPMSidebar.jsx` renders new items (config-driven)

### Phase 9 — Tests
- [x] **9.1** Unit tests for new service functions in `src/services/__tests__/managerAssignmentService.test.js`
- [x] **9.2** Unit tests for new sim service functions in `src/services/sim/__tests__/simManagerAssignmentService.test.js`
- [x] **9.3** Component smoke tests for new pages (`PortfolioManagerAssignments.test.jsx`, `ProgrammeManagerAssignments.test.jsx`)

### Phase 10 — Documentation
- [x] **10.1** Create `Documentation/Decoupled_Manager_Assignment_Guide.md`

---

## Files to Create / Modify

| File | Action |
|---|---|
| `SQL/v592a_portfolio_mgr_assignments_rls.sql` | CREATE ✅ |
| `SQL/v592b_programme_mgr_assignments_rls.sql` | CREATE ✅ |
| `SQL/v592c_sim_scoped_manager_assignments_rls.sql` | CREATE ✅ |
| `src/services/managerAssignmentService.js` | MODIFY ✅ |
| `src/services/sim/simManagerAssignmentService.js` | MODIFY ✅ |
| `src/components/pm/ManagerAssignmentsWorkbench.jsx` | CREATE ✅ |
| `src/pages/portfolio-manager/PortfolioManagerAssignments.jsx` | CREATE ✅ |
| `src/pages/programme-manager/ProgrammeManagerAssignments.jsx` | CREATE ✅ |
| `src/pages/sim/portfolio-manager/SimPortfolioManagerAssignments.jsx` | CREATE ✅ |
| `src/pages/sim/programme-manager/SimProgrammeManagerAssignments.jsx` | CREATE ✅ |
| `src/config/pmDashboardMenuConfig.js` | MODIFY ✅ |
| `src/config/simulatorPMMenuConfig.js` | MODIFY ✅ |
| `src/components/pm/PMSidebar.jsx` | VERIFY ✅ |
| `src/components/sim/pm/SimulatorPMSidebar.jsx` | VERIFY ✅ |
| `src/App.jsx` | MODIFY ✅ |
| `src/services/__tests__/managerAssignmentService.test.js` | MODIFY ✅ |
| `src/services/sim/__tests__/simManagerAssignmentService.test.js` | CREATE ✅ |
| `Documentation/Decoupled_Manager_Assignment_Guide.md` | CREATE ✅ |

---

## Key Design Constraints

- **No new modals** — reuse `AssignManagerModal` component.
- **No mock/fallback data** — all data from DB; show an empty-state message if the manager has no entities in scope.
- **Dark theme default** — all new pages use `dark:` Tailwind classes.
- **PWA-ready** — use responsive grid/flex layouts suitable for mobile.
- **Export** — include export dropdown on every list view (Excel, CSV, JSON, Print minimum).
- **Sortable columns + card/table toggle** — per CLAUDE.md rules for new list pages.
- **Do NOT bypass RLS** — scoped queries must filter on the correct `user_id` column; RLS provides the second layer of enforcement.

---

## Review Section

### Summary

v592 delivers decoupled manager assignment for Portfolio and Programme Managers on Platform and Simulator. A shared `ManagerAssignmentsWorkbench` component provides search, sortable columns, card/table toggle, export, and `AssignManagerModal` integration. Scoped list and assign/remove operations live in `managerAssignmentService` and `simManagerAssignmentService`. RLS policies in v592a/b/c enforce UPDATE scope at the database layer.

### Routes

| Surface | URL |
|---------|-----|
| Platform portfolio mgr | `/platform/portfolio-manager/assignments` |
| Platform programme mgr | `/platform/programme-manager/assignments` |
| Sim portfolio mgr | `/simulator/pm/portfolio-manager/assignments` |
| Sim programme mgr | `/simulator/pm/programme-manager/assignments` |

PMO system-wide page unchanged: `/platform/pmo-admin/manager-assignments`.

### Deployment checklist

1. Run `SQL/v592a_portfolio_mgr_assignments_rls.sql`, `v592b`, and `v592c` in Supabase.
2. Run `SQL/v605_v592_decoupled_manager_assignment_seed.sql` after **v334** (or **v305**) is loaded.
3. Hard refresh after deploy so PM sidebar config loads.
4. Verify portfolio/programme manager users see only in-scope entities and can assign/remove successfully.

### Notes

- Team member management remains on `/pm/team-members` (existing **Team & Members** sidebar section).
- Simulator menu links to `/simulator/pm/team-members` for practice team management when that route is registered separately.
