# v344 – PM Project Member Assignment Implementation Plan
**Feature:** Project Manager assigns and manages project members (Platform + Simulator)
**Date:** 2026-04-05
**Status:** Complete

---

## Overview

Allow a Project Manager to fully manage who is on their project — invite members, assign roles, change roles, and remove members — from a dedicated page accessible via the sidebar. The goal is to complete and wire up the largely stubbed `ProjectUsers.jsx` page, fix the data source inconsistency, register the route, and add the sidebar entry.

---

## Scope: Both Systems

This plan covers **both** the Platform and the Simulator. They share the same feature intent but use separate schemas, clients, and routes:

| Aspect | Platform | Simulator |
|---|---|---|
| Schema | `public` | `sim` |
| DB client | `platformDb` | `simDb` |
| Membership table | `project_memberships` | `sim.practice_project_memberships` |
| Role storage | FK to `project_roles` table | Plain `role_name` string |
| Invitation flow | Yes (email invite + token) | No — direct add only (practice environment) |
| Seat limits | Yes (`project_seat_allocations`) | No |
| Route prefix | `/platform/...` or `/app/...` | `/simulator/...` |
| Sidebar config | `pmMenuConfig.js` | `simulatorMenuConfig.js` |

---

## Todo List (completed)

### Phase 1 – Fix Data Source & Core Logic in ProjectUsers.jsx
- [x] **1.1** Replace member listing query — use `project_memberships` via `getProjectMembers(projectId)`
- [x] **1.2** Add project selector dropdown — PM sees their projects, PMO sees all (`listProjectsForMemberManagement`)
- [x] **1.3** Wire role change — `EditMemberRoleModal` + `updateMemberRole(membershipId, newProjectRoleId)`
- [x] **1.4** Wire member removal — confirm + `removeMemberFromProject(membershipId)`
- [x] **1.5** Wire resend invitation — `resendInvitation` + cancel option
- [x] **1.6** Invite roles — `getProjectManagerAssignableRoles()` (project_roles templates) + `resolveInvitationRoleIdForInsert` for `project_invitations.role_id` (legacy `roles` FK)

### Phase 2 – Missing UX Features
- [x] **2.1** Sortable column headers (Name, Role, Status, Joined)
- [x] **2.2** Card / Table toggle with `useViewMode` + localStorage
- [x] **2.3** Search bar
- [x] **2.4** Export via `ExportListMenu` (Excel, CSV, Word, PPT, XML, JSON, Print)
- [x] **2.5** Success confirmation banner after invite / role change / removal / resend

### Phase 3 – Route & Sidebar Registration
- [x] **3.1** Routes `/platform/project-members` and first-class `/app/project-members` → `ProjectUsers` (see `App.jsx`; `/app/project-members` is registered before `app/*` redirect)
- [x] **3.2** `pmMenuConfig` — “Manage Members” under Projects, permission `user.invite`

### Phase 4 – SQL Menu Registration (Platform)
- [x] **4.1** `SQL/v388_project_members_invitation_roles_and_menu.sql` — `pm_quality_assurance`, `pm_change_authority` seeds; `accept_project_invitation` writes `project_memberships`; menu `projects_manage_members`

### Phase 5 – Simulator: Service Layer
- [x] **5.1** `src/services/sim/simProjectMembershipService.js`

### Phase 6 – Simulator: Frontend
- [x] **6.1** `src/pages/simulator/SimProjectMembers.jsx`
- [x] **6.2** `src/components/sim/SimAddMemberModal.jsx`
- [x] **6.3** `src/components/sim/SimEditMemberRoleModal.jsx`

### Phase 7 – Simulator: Route & Sidebar
- [x] **7.1** `/simulator/practice-project-members`
- [x] **7.2** `simulatorMenuConfig.js` — Manage Members under Practice Projects

### Phase 8 – Theme & PWA
- [x] **8.1** Dark/light Tailwind classes on new UI
- [x] **8.2** Responsive layout

### Additional
- [x] **RLS** `SQL/v389_sim_practice_project_memberships_rls_owner_manage.sql` — project owner may add/update memberships for other users
- [x] **Unit test** `src/services/__tests__/projectMembershipMapping.test.js`

---

## Review Section

### Summary of changes

**Platform**
- `projectMembershipService.js`: Members read from `project_memberships` with `users` + `project_roles`; updates target `project_role_id`; invitations resolve `project_roles` → legacy `roles.id` for FK compatibility; `listProjectsForMemberManagement` for project dropdown.
- `projectRoleAssignmentService.js`: `getProjectManagerAssignableRoles()` reads PM-assignable templates from `project_roles`.
- `InviteUserModal.jsx`: Loads assignable roles via `getProjectManagerAssignableRoles()`.
- `ProjectUsers.jsx`: Project selector, sort/search, card/table, export, invitations (resend/cancel), seat widget, success banner, `EditMemberRoleModal`.
- `App.jsx`: Routes `platform/project-members` and `app/project-members`; `pmMenuConfig.js`: Manage Members link.
- `ProjectUsers.jsx`: Table view includes sortable **Status** column (Name, Role, Status, Joined); card view shows status line; export includes status.

**SQL**
- `v388`: Seeds `pm_quality_assurance` and `pm_change_authority`; replaces `accept_project_invitation` to upsert `project_memberships`; registers `projects_manage_members` menu for `project_manager` and `pmo_admin`.
- `v389`: Relaxes `sim.practice_project_memberships` RLS so practice project owners can manage other members’ rows.

**Simulator**
- `simProjectMembershipService.js`, `SimProjectMembers.jsx`, modals, route `simulator/practice-project-members`, sidebar entry.

### Operational notes

1. Apply SQL on Supabase in order: **v388**, then **v389** (after existing migrations through v387).
2. **Routing:** `/app/project-members` is a **first-class route** in `App.jsx` (same `Layout` + `ProjectUsers` as `/platform/project-members`). It is listed **before** `app/*` so it is not caught by `AppToPlatformRedirect`. Users can bookmark either URL; the menu/SQL canonical path remains `/app/project-members`.
3. Invitation acceptance now keeps `user_roles` (existing behaviour) and adds/updates `project_memberships` for RLS-aligned membership.

---

## Out of Scope (unchanged)

- Bulk invite
- Member audit log page
- In-app notifications on invite

---

## Final verification (100%)

| Check | Result |
|-------|--------|
| Platform members from `project_memberships` | `getProjectMembers` |
| PM / PMO project selector | `listProjectsForMemberManagement` |
| Invite, role change, remove, resend, cancel | Wired + toasts / success banner |
| Sort Name, Role, **Status**, Joined + search + card/table + export | `ProjectUsers.jsx` |
| `/app/project-members` stable URL (not caught by `app/*` redirect) | `App.jsx` order |
| `pmMenuConfig` + SQL `v388` menu | Yes |
| Simulator service, page, modals, RLS `v389`, route, `simulatorMenuConfig` | Yes |
| Unit test mapping | `projectMembershipMapping.test.js` |

**Apply on DB:** `v388` then `v389` (after your current migration sequence).
