# v591 — Invitation Status Tracker (Accepted / Declined / Pending)

## Overview
Extend the invitation system so PMO and Project Managers can see the full status of every invitation they have sent — Accepted, Declined, Pending, and Expired — across Portfolio, Programme, and Project entities. Sidebar menus for all four roles (PMO, PM, Simulator PMO, Simulator PM) are updated to link directly to the tracker.

---

## Current State (as-is)
| Area | Status |
|---|---|
| `project_invitations` table | Exists; `invitation_status` = pending/accepted/declined/expired/cancelled; **project_id is NOT NULL** — no portfolio/programme scope |
| PM Dashboard sidebar | Has "Pending Invitations" link (`/pm/team-members?tab=pending`) — shows only pending |
| PMO People & Resources sidebar | No invitation tracker entry |
| Simulator PMO sidebar | Has "Invitation expiry" link only |
| Simulator PM sidebar | No invitation tracking entry |
| PMO Send Invites page | `/platform/admin/send-role-invites` — project-only scope |

---

## Goals
1. Show all invitation statuses (Pending, Accepted, Declined, Expired, Cancelled) in one dashboard.
2. Scope: PMO can see Portfolio + Programme + Project invitations; PM can see Project invitations they sent.
3. Extend `project_invitations` table to optionally scope to portfolio or programme (with `entity_type` discriminator).
4. Add sidebar links for PMO, PM, SimPMO, SimPM.
5. Platform–Simulator parity: Simulator PMO/PM get equivalent tracker views against the `sim` schema.

---

## Architecture Decisions
- **Extend `project_invitations`** with nullable `portfolio_id`, `programme_id`, and a new `entity_type` column ('project' | 'portfolio' | 'programme'). `project_id` becomes nullable with a CHECK ensuring exactly one entity FK is set.
- **No separate tables** for portfolio/programme invitations — keeps the service and RLS surface small.
- **New `invitationTrackerService.js`** — thin service that fetches invitation rows for the current user, keyed by entity_type.
- **One shared page component** `InvitationTracker.jsx` — used by both PMO and PM routes, parameterised by `scope` prop ('pmo' | 'pm').
- **Simulator**: `sim_entity_invitations` table mirrors the extended schema in the `sim` schema; Simulator tracker pages use `simDb`.

---

## Todo List

### Phase 1 — Database (Platform)
- [x] **SQL v591** — Extend `project_invitations`: add `entity_type`, `portfolio_id`, `programme_id`; make `project_id` nullable; add CHECK constraint; add indexes; register columns.
- [x] **SQL v592** — Create `get_sent_invitations_by_user` RPC (SECURITY DEFINER): returns all invitations sent by the calling user, with entity type, name, status, invitee, role, sent/expires dates.
- [x] **SQL v593** — RLS: allow invited_by_user_id to SELECT their own rows; PMO can see all rows in their organisation.

### Phase 2 — Database (Simulator)
- [x] **SQL v594** — Create `sim.sim_entity_invitations` table in the `sim` schema mirroring the extended project_invitations structure (no real project/portfolio FKs — uses sim.scenarios as the entity reference + a free-text entity_name). Add RLS. Register in `database_tables`.

### Phase 3 — Service Layer
- [x] **`src/services/invitationTrackerService.js`** — new file with:
  - `getSentInvitations(filters)` — fetch from `project_invitations` for current user; supports status filter, entity_type filter, date range.
  - `cancelInvitation(id)` — set status = 'cancelled'.
  - `resendInvitationReminder(id)` — calls existing `sendInvitationReminder`.
- [x] **`src/services/sim/simInvitationTrackerService.js`** — Simulator equivalent using `simDb`.
- [x] **Unit tests**: `src/services/__tests__/invitationTrackerService.test.js`

### Phase 4 — Frontend: PMO Invitation Tracker
- [x] **`src/pages/pmo/InvitationTracker.jsx`** — Tracker page for PMO role.
  - Header stats bar: total sent, # pending, # accepted, # declined.
  - Status filter tabs: All | Pending | Accepted | Declined | Expired | Cancelled.
  - Entity filter: All | Portfolio | Programme | Project (dropdown).
  - Table view (default): columns = Entity Type, Entity Name, Invitee, Role, Status badge, Sent Date, Expires, Actions.
  - Card view: collapsible cards grouped by status.
  - Card ⊞ / Table ≡ toggle persisted in `localStorage`.
  - Sortable column headers (↑ ↓ ⇅).
  - Search bar (invitee email/name, entity name).
  - Actions per row: Resend (pending only), Cancel (pending only), View Details.
  - Export dropdown: Excel, CSV, JSON, Print.
  - Dark/light theme aware.
  - PWA / mobile responsive.
  - Success/error toast on cancel & resend.

### Phase 5 — Frontend: PM Invitation Tracker
- [x] **`src/pages/pm/InvitationTracker.jsx`** — Tracker page for PM role (project-scoped only; same structure as PMO but entity_type filter hidden).
  - Same status tabs, table/card toggle, sort, search, export, actions.

### Phase 6 — Frontend: Simulator Tracker Pages
- [x] **`src/pages/simulator/pmo/SimulatorPMOInvitationTracker.jsx`** — mirrors PMO tracker using `simDb`.
- [x] **`src/pages/simulator/pm/SimulatorPMInvitationTracker.jsx`** — mirrors PM tracker using `simDb`.

### Phase 7 — Menu Config Updates
- [x] **`src/config/pmoMenuConfig.js`** — Add to `pmo-people-resources` children:
  - `{ id: 'pmo-people-invitation-tracker', label: 'Invitation Tracker', path: '/pmo/invitation-tracker', icon: MailCheck }`
  - Also add "Send Invitations" shortcut: `{ id: 'pmo-people-send-invites', label: 'Send Invitations', path: '/platform/admin/send-role-invites', icon: Send }`
- [x] **`src/config/pmDashboardMenuConfig.js`** — Update `pm-team-members` children:
  - Replace `pm-pending-invitations` (points to `?tab=pending`) with two entries:
    - `{ id: 'pm-invitation-tracker', label: 'Invitation Status', path: '/pm/invitation-tracker', icon: MailCheck }`
    - Keep existing "Pending Invitations" shortcut at `?tab=pending` for backward-compat (remove once tracker is validated).
- [x] **`src/config/simulatorPMOMenuConfig.js`** — Add to `sim-pmo-people-resources` children:
  - `{ id: 'sim-pmo-invitation-tracker', label: 'Invitation Tracker', path: '/simulator/pmo/invitation-tracker', icon: MailCheck }`
- [x] **`src/config/simulatorPMMenuConfig.js`** — Add to `sim-pm-people-stakeholders` (or Team & Members) children:
  - `{ id: 'sim-pm-invitation-tracker', label: 'Invitation Status', path: '/simulator/pm/invitation-tracker', icon: MailCheck }`

### Phase 8 — Router Registration
- [x] Register new PMO route: `/pmo/invitation-tracker` → `InvitationTracker` (lazy import).
- [x] Register new PM route: `/pm/invitation-tracker` → PM `InvitationTracker`.
- [x] Register Simulator PMO route: `/simulator/pmo/invitation-tracker`.
- [x] Register Simulator PM route: `/simulator/pm/invitation-tracker`.

### Phase 9 — Unit Tests
- [x] `src/services/__tests__/invitationTrackerService.test.js` — tests for getSentInvitations, cancelInvitation filters.
- [x] `src/services/__tests__/simInvitationTrackerService.test.js` — simulator equivalent.

---

## File Map

| File | Action |
|---|---|
| `SQL/v591_invitation_entity_scope.sql` | New — extend project_invitations |
| `SQL/v592_get_sent_invitations_rpc.sql` | New — RPC function |
| `SQL/v593_invitation_tracker_rls.sql` | New — RLS for tracker |
| `SQL/v594_sim_entity_invitations.sql` | New — sim schema table |
| `src/services/invitationTrackerService.js` | New |
| `src/services/sim/simInvitationTrackerService.js` | New |
| `src/services/__tests__/invitationTrackerService.test.js` | New |
| `src/pages/pmo/InvitationTracker.jsx` | New |
| `src/pages/pm/InvitationTracker.jsx` | New |
| `src/pages/simulator/pmo/SimulatorPMOInvitationTracker.jsx` | New |
| `src/pages/simulator/pm/SimulatorPMInvitationTracker.jsx` | New |
| `src/components/invitations/InvitationTrackerView.jsx` | New — shared UI |
| `src/config/pmoMenuConfig.js` | Update — add tracker + send invites to People & Resources |
| `src/config/pmDashboardMenuConfig.js` | Update — add Invitation Status link |
| `src/config/simulatorPMOMenuConfig.js` | Update — add tracker link |
| `src/config/simulatorPMMenuConfig.js` | Update — add tracker link |
| `src/App.jsx` | Update — register 4 new routes |

---

## SQL Summary (v591)

```sql
-- Add entity scope to project_invitations
ALTER TABLE project_invitations
  ADD COLUMN IF NOT EXISTS entity_type VARCHAR(20) NOT NULL DEFAULT 'project'
    CHECK (entity_type IN ('project','portfolio','programme')),
  ADD COLUMN IF NOT EXISTS portfolio_id UUID REFERENCES portfolios(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS programme_id UUID REFERENCES programmes(id) ON DELETE SET NULL;

-- Make project_id nullable
ALTER TABLE project_invitations ALTER COLUMN project_id DROP NOT NULL;

-- Ensure exactly one entity FK per row
ALTER TABLE project_invitations ADD CONSTRAINT chk_invitation_entity_set
  CHECK (
    (entity_type = 'project'   AND project_id IS NOT NULL   AND portfolio_id IS NULL AND programme_id IS NULL) OR
    (entity_type = 'portfolio' AND portfolio_id IS NOT NULL AND project_id IS NULL   AND programme_id IS NULL) OR
    (entity_type = 'programme' AND programme_id IS NOT NULL AND project_id IS NULL   AND portfolio_id IS NULL)
  );
```

---

## UI Wireframe (Invitation Tracker)

```
┌────────────────────────────────────────────────────────────┐
│ Invitation Tracker                          [⊞ Card][≡ List]│
│                                                             │
│ [12 Sent] [5 Pending] [4 Accepted] [2 Declined] [1 Expired]│
│                                                             │
│ Filter: [All ▼ Entity] [All ▼ Status]  🔍 Search...  [Export ▼]│
├──────────┬──────────┬──────────┬──────────┬────────┬───────┤
│ Entity ⇅ │ Name ⇅   │ Invitee ⇅│ Role ⇅   │ Status │ Action│
├──────────┼──────────┼──────────┼──────────┼────────┼───────┤
│ Project  │ Nidus v2 │ john@… │ Team Mgr │ Pending│ ↺ ✕   │
│ Portfolio│ Alpha    │ mary@…  │ Director │ Accepted│ 👁     │
│ Programme│ Beta     │ bob@…   │ Sponsor  │ Declined│ 👁     │
└──────────┴──────────┴──────────┴──────────┴────────┴───────┘
```

---

## Review

**Completed:** May 2026

### Summary
- Extended `project_invitations` for portfolio/programme scope (`v591`).
- Added `get_sent_invitations_by_user` RPC with PM (sender + project-only) and PMO (org-scoped via account-linked entities) modes (`v592`).
- Added sender SELECT/UPDATE and PMO org SELECT RLS policies (`v593`).
- Created `sim.entity_invitations` with RLS for simulator tracker (`v594`).
- Implemented shared `InvitationTrackerView` with stats, status tabs, entity filter (PMO), search, sortable table, card groups, export menu, resend/cancel/details actions, and theme-aware styling.
- Wired Platform PMO/PM and Simulator PMO/PM routes and sidebar menu entries.
- Unit tests: 10 passing in `invitationTrackerService` and `simInvitationTrackerService` test files.

### Deployment
Run SQL in order on Supabase: `v591` → `v592` → `v593` → `v594` → **`v595`** (Platform sidebar menu items), then hard-refresh the app.

### Platform sidebar (important)
The **Project Nidus Platform** sidebar (`Sidebar.jsx` + `useMenu.js`) loads menus from the **`menu_items`** table, not `pmoMenuConfig.js`. PMO users see **Invitation Tracker** under **People & Stakeholders** at `/platform/admin/invitation-tracker` after `v595` is applied (virtual fallback in `useMenu.js` also injects the link if the DB row is missing).

### Notes
- Simulator tracker reads `sim.entity_invitations`; populate rows when practice invite flows write to that table.
- PM “Pending Invitations” shortcut on Team & Members retained for backward compatibility.
- Portfolio/programme invitations without linked projects may not appear in PMO org filter until a project link exists.
