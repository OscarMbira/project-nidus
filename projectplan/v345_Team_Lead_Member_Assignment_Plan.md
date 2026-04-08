# v345 – Team Lead/Manager Member Assignment Implementation Plan
**Feature:** Team Lead / Team Manager assigns, manages team members, and manages functional roles for their team; PMO can manage roles across all teams, portfolios, and programmes (Platform + Simulator)
**Date:** 2026-04-05
**Status:** Implemented (2026-04-05)

---

## Overview

Allow a **Team Lead / Team Manager** to manage the membership of their own team — adding project members to the team, updating their functional role and allocation, and removing them from the team — via a dedicated page accessible from the sidebar.

This is distinct from Plan v344 (PM assigning project members):

| Who | What they manage | Scope |
|-----|-----------------|-------|
| **Project Manager** (v344) | Project membership & roles | `project_memberships` table — who is on the project |
| **Team Lead / Manager** (this plan) | Team composition & allocation | `team_members` table — who is on the team within a project |

A Team Lead does **not** invite new users to the project or change project-level roles — that remains the PM's responsibility. They only pick from users already on the project, add them to their team, and manage what functional roles are available within their team.

The PMO Admin has an elevated view allowing them to manage functional roles and team composition across **all** teams in the system.

---

## Scope: Both Systems

This plan covers **both** the Platform and the Simulator. The Simulator already has equivalent tables that mirror the Platform schema closely:

| Aspect | Platform | Simulator |
|---|---|---|
| Schema | `public` | `sim` |
| DB client | `platformDb` | `simDb` |
| Teams table | `teams` | `sim.practice_teams` |
| Team members table | `team_members` | `sim.practice_team_members` |
| Team lead field | `teams.team_lead_user_id` → `users.id` | `sim.practice_teams.team_lead_user_id` → `auth.users.id` |
| Allocation field | `team_members.allocation_percentage` | `sim.practice_team_members.allocation_percentage` |
| Project FK | `teams.project_id` | `sim.practice_teams.practice_project_id` |
| Existing route | `/platform/teams` | `/simulator/practice-teams` |
| New route | `/platform/teams/my-team` | `/simulator/practice-teams/my-team` |
| Sidebar config | `pmMenuConfig.js` | `simulatorMenuConfig.js` |

---

## Current State (findings from exploration)

| Capability | Status | Notes |
|---|---|---|
| `teams` table | EXISTS | Has `team_lead_user_id`, `team_name`, `project_id` |
| `team_members` table | EXISTS | Has `team_id`, `user_id`, `member_role`, `allocation_percentage` |
| `teamService.js` | EXISTS | Has `addMember()`, `removeMember()`, `updateTeam()` |
| Existing Teams.jsx | EXISTS | Org-level team list — not focused on a single team lead's view |
| Team member add/remove UI | PARTIAL | Exists in Teams.jsx but mixed with admin views |
| Dedicated Team Lead page | MISSING | No focused "Manage My Team" page |
| Sidebar entry for Team Lead | MISSING | Current Teams menu is only gated by `team.view` (admin-style) |
| Route for team lead view | MISSING | No `/platform/teams/my-team` or `/platform/my-team` route |
| team_manager permissions | `team.view`, `team.manage` | No `user.invite` — correct; team lead only manages team composition |

---

## Architecture Decisions

1. **Separate page** (`MyTeam.jsx`) — Team Lead gets a focused "My Team" view showing only their team(s), not the org-wide list. This keeps concerns clean and avoids cluttering the existing Teams.jsx.
2. **Source users from project members** — When adding someone to the team, the dropdown lists only users already in `project_memberships` for that project who are not already on this team. Team Lead cannot add people who are not yet on the project.
3. **`member_role` is a functional label** (e.g., "Developer", "Tester", "Designer") — separate from the project role in `project_memberships`. It describes the person's function within the team, not their project authority.
4. **`allocation_percentage`** — Team Lead sets what percentage of each member's time is allocated to this team (0–100%).
5. **Two-tab page layout** — Tab 1: **Members** (add/manage people on the team); Tab 2: **Functional Roles** (manage the role labels available for this team).
6. **Functional Role management** — The `member_role` field is a free-text VARCHAR but the UI provides a managed list of preferred functional roles per team. These are stored in a new `team_functional_roles` lookup table (`team_id`, `role_label`, `sort_order`). Team Lead can add/rename/delete entries. On member add/edit, the role dropdown is populated from this list with an "Other (custom)" escape option for one-off entries.
7. **PMO elevated view** — PMO Admin sees an "All Teams" mode (toggle at top of page) that lists every active team across all projects with all their members and functional roles, and can edit any member's role or allocation inline.
8. **Multi-team support** — A Team Lead may lead more than one team. The page shows a team selector if they lead multiple teams.
9. **Sidebar placement** — Add "My Team" as a child under the existing **Teams** section, gated by `team.manage` permission (so only Team Leads/Managers and above see it).
10. **Team Lead identified via** `teams.team_lead_user_id` matching the current user's `users.id`.

---

## Todo List

### Phase 1 – SQL: Functional Roles Lookup Table
- [ ] **1.0** Create `SQL/v388_team_functional_roles.sql`
  - New table `team_functional_roles`: `id`, `team_id UUID FK teams`, `role_label VARCHAR(100)`, `sort_order INT`, `is_active BOOL`, `created_by`, `created_at`, `updated_at`
  - Unique constraint on `(team_id, role_label)`
  - RLS: team lead of the team can insert/update/delete; all project members can read
  - Seed default labels for new teams via an insert triggered when a team is created (Developer, Tester, Designer, Analyst, Scrum Master, Tech Lead, Business Analyst, Other)
  - Simulator equivalent: `SQL/v389_sim_practice_team_functional_roles.sql` for `sim.practice_team_functional_roles`

### Phase 1B – Service Layer
- [ ] **1B.1** Add to `src/services/teamService.js`:
  - `getMyTeams(authUserId)` — returns teams where `team_lead_user_id` matches current user (active teams only, joined with project name)
  - `getTeamMembers(teamId)` — returns active `team_members` rows joined with `users` (name, email, avatar)
  - `getAssignableProjectMembers(projectId, teamId)` — returns `project_memberships` for the project excluding users already on the team
  - `addTeamMember(teamId, userId, memberRole, allocationPct)` — inserts into `team_members`
  - `updateTeamMember(teamMemberId, memberRole, allocationPct)` — updates role/allocation
  - `removeTeamMember(teamMemberId)` — soft deletes from `team_members` (`is_active = false`, `left_at = now()`)
  - `getTeamFunctionalRoles(teamId)` — returns active `team_functional_roles` for the team, ordered by `sort_order`
  - `addTeamFunctionalRole(teamId, roleLabel)` — inserts into `team_functional_roles`
  - `updateTeamFunctionalRole(roleId, roleLabel)` — updates label
  - `deleteTeamFunctionalRole(roleId)` — deletes (only if no team_members currently hold this role_label)
  - `getAllTeamsWithMembers()` — PMO only: returns all active teams across all projects, each with their member list and functional roles

### Phase 2 – Frontend Page
- [ ] **2.1** Create `src/pages/platform-app/MyTeam.jsx`
  - PMO mode toggle at top: "My Teams" ↔ "All Teams" (PMO Admin only)
  - Team selector dropdown (if user leads multiple teams; hides if only one)
  - Shows team name, project name, team type as header info
  - **Two tabs: [ Members ] [ Functional Roles ]**

  - **Members tab:**
    - Table/card list of current team members: Name, email, avatar, Functional Role, Allocation %, Actions (Edit, Remove)
    - Add Member button → `AddTeamMemberModal`
    - Search, sortable columns (Name ↑↓, Role ↑↓, Allocation ↑↓, Joined ↑↓), card/table toggle, export (per CLAUDE.md rules 38, 40, 41)
    - Success confirmation after each action

  - **Functional Roles tab:**
    - Lists all `team_functional_roles` for the selected team
    - Each row: Role Label, Members using this role (count), Actions (Edit, Delete — disabled if in use)
    - [+ Add Role] button → inline input or small modal
    - Preset defaults shown if no custom roles yet (Developer, Tester, Designer, Analyst, etc.)
    - PMO All-Teams mode: shows role labels used across all teams in a summary view

- [ ] **2.2** Create `src/components/teams/AddTeamMemberModal.jsx`
  - Searchable dropdown of assignable project members (from `getAssignableProjectMembers()`)
  - Each option shows user name, email, and their project role
  - Functional Role: dropdown populated from `getTeamFunctionalRoles(teamId)` + "Other (custom)" option
  - Allocation % (numeric, 0–100)
  - Add / Cancel buttons
  - Warning if user is already allocated 100% across other teams (informational only, not blocking)

- [ ] **2.3** Create `src/components/teams/EditTeamMemberModal.jsx`
  - Pre-populated with current member_role and allocation_percentage
  - Same role dropdown as add modal
  - Save / Cancel buttons

- [ ] **2.4** Create `src/components/teams/ManageFunctionalRoleModal.jsx`
  - Single field: Role Label (text input)
  - Used for both Add and Edit of a functional role entry
  - Save / Cancel

### Phase 3 – Route & Sidebar Registration
- [ ] **3.1** Register route in `src/App.jsx`
  - `/platform/teams/my-team` → `MyTeam` (lazy import)

- [ ] **3.2** Add sidebar entry in `src/config/pmMenuConfig.js`
  - Under **Teams** section, add child item:
    - Label: "My Team"
    - Path: `/platform/teams/my-team`
    - Icon: `Users`
    - Permission: `team.manage` (shown to Team Managers and above; hidden from viewers)

### Phase 4 – SQL (Platform)
- [ ] **4.1** Create `SQL/v387_my_team_sidebar_menu.sql`
  - Insert `teams_my_team` menu item as child of the Teams parent menu item
  - Grant `can_view = true`, `can_use = true` to `team_manager` role (and `project_manager`, `pmo_admin` for visibility)

### Phase 5 – Simulator: Service Layer
- [ ] **5.1** Create `src/services/sim/simTeamService.js` using `simDb`
  - `getSimMyTeams(authUserId)` — returns `sim.practice_teams` where `team_lead_user_id = authUserId` and `is_deleted = false` and `team_status = 'active'`, joined with practice project name
  - `getSimTeamMembers(practiceTeamId)` — returns active `sim.practice_team_members` joined with `auth.users`
  - `getSimAssignablePracticeMembers(practiceProjectId, practiceTeamId)` — returns `sim.practice_project_memberships` for the practice project, excluding users already on this team
  - `addSimTeamMember(practiceTeamId, userId, memberRole, allocationPct)` — inserts into `sim.practice_team_members`
  - `updateSimTeamMember(teamMemberId, memberRole, allocationPct)` — updates role/allocation
  - `removeSimTeamMember(teamMemberId)` — soft deletes (`is_active = false`, `left_at = now()`)
  - `getSimTeamFunctionalRoles(practiceTeamId)` — returns active `sim.practice_team_functional_roles` for the team
  - `addSimTeamFunctionalRole(practiceTeamId, roleLabel)` — inserts functional role
  - `updateSimTeamFunctionalRole(roleId, roleLabel)` — updates label
  - `deleteSimTeamFunctionalRole(roleId)` — deletes if not in use

### Phase 6 – Simulator: Frontend Page
- [ ] **6.1** Create `src/pages/simulator/SimMyTeam.jsx`
  - Same two-tab layout as Platform `MyTeam.jsx` (Members + Functional Roles tabs)
  - Team selector dropdown (if user leads multiple practice teams)
  - Shows practice team name, practice project name, team type
  - **Members tab**: add/edit/remove members with functional role and allocation %
  - **Functional Roles tab**: manage `sim.practice_team_functional_roles` — add/rename/delete labels
  - Search, sortable columns, card/table toggle, export
  - Uses `simDb` exclusively via `simTeamService`

- [ ] **6.2** Create `src/components/sim/SimAddTeamMemberModal.jsx`
  - Searchable dropdown of sim project members not yet on the team
  - Functional Role dropdown from `getSimTeamFunctionalRoles()` + "Other" option
  - Allocation % field
  - Add / Cancel buttons

- [ ] **6.3** Create `src/components/sim/SimEditTeamMemberModal.jsx`
  - Pre-populated member_role (from functional roles list) and allocation_percentage
  - Save / Cancel

- [ ] **6.4** Create `src/components/sim/SimManageFunctionalRoleModal.jsx`
  - Add/Edit functional role label for a practice team
  - Save / Cancel

### Phase 7 – Simulator: Route & Sidebar Registration
- [ ] **7.1** Register route in `src/App.jsx`
  - `/simulator/practice-teams/my-team` → `SimMyTeam` (lazy import, wrapped in same ProtectedRoute/Layout pattern as `/simulator/practice-teams`)

- [ ] **7.2** Add sidebar entry in `src/config/simulatorMenuConfig.js`
  - Under the **Teams** section (alongside `/simulator/practice-teams`), add child item:
    - Label: "My Practice Team"
    - Path: `/simulator/practice-teams/my-team`
    - Icon: `Users`

### Phase 8 – Theme & PWA
- [ ] **8.1** All components (Platform + Simulator) use dark/light Tailwind dark: classes
- [ ] **8.2** Mobile-responsive layout for both

---

## Page Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  My Team                          [My Teams ↔ All Teams (PMO)] │
│                                                                 │
│  Team: [ Alpha Delivery Team (Project: Alpha Project)  ▼ ]     │
│  Type: Delivery  │  Project: Alpha Project  │  Members: 4      │
│                                                                 │
│  [ Members (4) ]  [ Functional Roles (6) ]                     │
│  ─────────────────────────────────────────────────────────     │
│                                                                 │
│  ── MEMBERS TAB ───────────────────────────────────────────    │
│  Search: [___________]  View: [⊞ Cards] [≡ Table]  [Export ▼] │
│                                              [+ Add Member]    │
│                                                                 │
│  ┌──────────────┬───────────────┬────────────┬───────────────┐ │
│  │ Name ↑       │ Functional Role│ Allocation │ Actions       │ │
│  ├──────────────┼───────────────┼────────────┼───────────────┤ │
│  │ Jane Smith   │ Developer     │ 80%        │ [Edit][Remove] │ │
│  │ John Doe     │ Tester        │ 100%       │ [Edit][Remove] │ │
│  │ Mary Johnson │ Designer      │ 50%        │ [Edit][Remove] │ │
│  └──────────────┴───────────────┴────────────┴───────────────┘ │
│                                                                 │
│  ── FUNCTIONAL ROLES TAB ──────────────────────────────────    │
│  ┌─────────────────────┬───────────────┬──────────────────┐    │
│  │ Role Label ↑        │ Members Using │ Actions          │    │
│  ├─────────────────────┼───────────────┼──────────────────┤    │
│  │ Developer           │      2        │ [Edit] [Delete]  │    │
│  │ Tester              │      1        │ [Edit] [Delete]  │    │
│  │ Designer            │      1        │ [Edit] [Delete]  │    │
│  │ Analyst             │      0        │ [Edit] [Delete]  │    │
│  └─────────────────────┴───────────────┴──────────────────┘    │
│                                              [+ Add Role]      │
└─────────────────────────────────────────────────────────────────┘

Add Member Modal:
┌────────────────────────────────────────┐
│  Add Member to Alpha Delivery Team     │
│                                        │
│  Select Member (project members only): │
│  [ Search by name or email...     ▼ ]  │
│   ● Bob Walker  (Team Member)          │
│   ● Sue Peters  (Team Manager)         │
│                                        │
│  Functional Role: [ Developer     ▼ ]  │
│    Developer / Tester / Designer /     │
│    Analyst / Other (custom)            │
│  Allocation %:    [80              ]   │
│                                        │
│  [ Cancel ]        [ Add to Team ]     │
└────────────────────────────────────────┘
```

---

## Comparison with v344 (PM Plan)

| Aspect | v344 – PM Member Assignment | v345 – Team Lead Assignment |
|---|---|---|
| Page | `ProjectUsers.jsx` (modified) | `MyTeam.jsx` (new) |
| Route | `/app/project-members` | `/platform/teams/my-team` |
| Sidebar parent | Projects section | Teams section |
| Who can use | Project Manager, PMO Admin | Team Manager, Project Manager, PMO Admin |
| Manages | `project_memberships` table | `team_members` table |
| User pool | All users in system (invite) | Only existing project members |
| Assigns | Project roles (team_member, team_manager…) | Functional labels + allocation % |
| Can invite new users | Yes (via InviteUserModal) | No — must go to PM first |

---

## Files to Create / Modify

### Platform
| Action | File | What changes |
|---|---|---|
| CREATE | `SQL/v388_team_functional_roles.sql` | New `team_functional_roles` lookup table + RLS |
| MODIFY | `src/services/teamService.js` | Add 10 new functions (members + functional roles) |
| CREATE | `src/pages/platform-app/MyTeam.jsx` | Two-tab page: Members + Functional Roles |
| CREATE | `src/components/teams/AddTeamMemberModal.jsx` | Add member modal with role dropdown |
| CREATE | `src/components/teams/EditTeamMemberModal.jsx` | Edit member modal |
| CREATE | `src/components/teams/ManageFunctionalRoleModal.jsx` | Add/edit functional role label |
| MODIFY | `src/App.jsx` | Register `/platform/teams/my-team` and `/simulator/practice-teams/my-team` routes |
| MODIFY | `src/config/pmMenuConfig.js` | Add "My Team" under Teams section |
| CREATE | `SQL/v387_my_team_sidebar_menu.sql` | DB-side menu registration (Platform) |

### Simulator
| Action | File | What changes |
|---|---|---|
| CREATE | `SQL/v389_sim_practice_team_functional_roles.sql` | Sim equivalent of functional roles table |
| CREATE | `src/services/sim/simTeamService.js` | New sim team service with functional roles functions |
| CREATE | `src/pages/simulator/SimMyTeam.jsx` | Two-tab simulator my-team page |
| CREATE | `src/components/sim/SimAddTeamMemberModal.jsx` | Add member modal (sim) |
| CREATE | `src/components/sim/SimEditTeamMemberModal.jsx` | Edit member modal (sim) |
| CREATE | `src/components/sim/SimManageFunctionalRoleModal.jsx` | Add/edit functional role (sim) |
| MODIFY | `src/config/simulatorMenuConfig.js` | Add "My Practice Team" under Teams section |

---

## Key Simulator Differences from Platform

| Feature | Platform | Simulator |
|---|---|---|
| User ID reference | `users.id` (app users table) | `auth.users.id` (Supabase auth directly) |
| Member pool source | `project_memberships` | `sim.practice_project_memberships` |
| Team status values | `active`, `inactive`, `disbanded` | Same (`team_status` column) |
| No seat limits | N/A | N/A (neither system has per-team seat limits) |

---

## Out of Scope (future)
- Allocation conflict detection across teams (e.g. user at 200% total — informational warning only for now)
- Team capacity heatmap / calendar view
- Bulk add multiple members at once

---

## Review Section

### Completed deliverables
- **SQL:** `SQL/v390_team_functional_roles.sql`, `SQL/v391_sim_practice_team_functional_roles.sql`, `SQL/v392_my_team_sidebar_menu.sql` (apply in order on Supabase after prior migrations).
- **Services:** `teamService.js` (My Team helpers + functional roles + `getAllTeamsWithMembers` / allocation warning); `sim/simTeamService.js` (parity + `getSimUserTotalTeamAllocation`).
- **Platform UI:** `MyTeam.jsx`, `AddTeamMemberModal`, `EditTeamMemberModal`, `ManageFunctionalRoleModal`; route `platform/teams/my-team`; `pmMenuConfig` entry **My Team** (`team.manage`).
- **Simulator UI:** `SimMyTeam.jsx`, `SimAddTeamMemberModal`, `SimEditTeamMemberModal`, `SimManageFunctionalRoleModal` (reuses platform modal); route `simulator/practice-teams/my-team`; `simulatorMenuConfig` **Teams** group with Practice Teams + My Practice Team.
- **PMO “All teams”:** Toggle loads all teams; management actions bypass `PermissionGate` in this mode so PMO is not blocked by per-project `team.manage` RPC where not a member (RLS still applies).
- **Tests:** `src/services/__tests__/sim/simTeamService.v345.test.js` (sort helper used by tables).
- **Build:** `npm run build` succeeded.

### Notes
- Apply SQL v390–392 on the database before relying on functional roles or the `teams_my_team` menu row.
- `PermissionGate` with `projectId` is used for non–PMO-all modes so team leads keep project-scoped checks.
