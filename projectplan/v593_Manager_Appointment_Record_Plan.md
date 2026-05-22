# v593 — Manager Appointment Record (PM/Programme/Portfolio Invitation Enhancement)

**Status:** Implemented (2026-05-21)  
**Date:** 2026-05-21  
**Goal:** Capture governance-grade data when a PMO appoints a Project, Programme, or Portfolio Manager — and when the appointee formally accepts or declines. Introduces a `manager_appointment_records` table as a first-class appointment ledger, enhances the invite form with role-specific fields, and adds an enriched acceptance/decline flow. Applies to Platform and Simulator.

---

## Best-Practice Summary

Appointing a PM is a formal governance act. The invitation is not a casual "join my team" message — it is closer to a **Letter of Appointment** that transfers accountability. The two parties must each formally commit:

### PMO captures on invite
| Field | Purpose |
|---|---|
| Assignment start date | When the PM's accountability begins |
| Assignment end date | Role horizon (project close / stage gate) |
| Time commitment % | 25 / 50 / 75 / 100% — resource planning baseline |
| Reporting to | Named person — Programme Mgr / Portfolio Mgr / Sponsor |
| Budget authority limit | Financial ceiling PM can approve without escalation |
| Authority notes | Decision scope: team, scope, procurement changes |
| Reporting frequency | Weekly / Fortnightly / Monthly highlight |
| Known constraints | Fixed dates, budget ceiling, resource limits |
| Reference document | Project mandate / brief / PID reference |
| Invitation message | Already exists — personalised note |

### PM captures on accept
| Field | Purpose |
|---|---|
| Availability confirmation | Can they start on the proposed date? |
| Actual start date | If different from the invitation date |
| Conflict of interest declared | Governance requirement (vendor/stakeholder relationship) |
| Conflict of interest detail | Free text when declared |
| Capability acknowledged | Confirms required skills/experience |
| Acceptance conditions | Any conditions (e.g., "subject to team headcount") |
| Initial observations | Early risks or concerns — first impression |

### PM captures on decline
| Field | Purpose |
|---|---|
| Decline reason (category) | Unavailable / Skills mismatch / COI / Overloaded / Other |
| Decline note | Free text for PMO follow-up |

---

## Architecture Decisions

1. **New `manager_appointment_records` table** (not JSONB) — first-class queryable record that survives after invitation status changes; used in dashboards and exportable as an Appointment Letter.
2. **`project_invitations` unchanged** — the new table has a FK to `project_invitations.id` but does not replace it; the existing email/token workflow is preserved.
3. **Role-conditional UI** — the extra fields are shown only when the invitation role is `project_manager`, `programme_manager`, or `portfolio_manager`. Generic team-member invites are unaffected.
4. **One shared `ManagerAppointmentForm` component** — used inside both the PMO `AssignManagerModal` and standalone assignment pages.
5. **Simulator parity** — a `sim.sim_manager_appointment_records` table and matching Sim pages.

---

## Todo List

### Phase 1 — SQL (Platform)
- [x] **1.1** `SQL/v606_manager_appointment_records.sql` *(plan v600; sequenced as v606)*
  - Create `public.manager_appointment_records` table (schema below)
  - RLS: PMO Admin can INSERT/UPDATE/SELECT all; Portfolio Manager can SELECT their scope; Programme Manager can SELECT their scope; the appointed user can SELECT/UPDATE their own record (for acceptance fields)
  - Register in `database_tables`
- [x] **1.2** `SQL/v607_manager_appointment_accept_rpc.sql`
  - `accept_manager_appointment(p_appointment_id, p_availability_confirmed, p_actual_start_date, p_coi_declared, p_coi_detail, p_capability_acknowledged, p_conditions, p_initial_observations)` — SECURITY DEFINER, updates the appointment + the linked invitation to `accepted`
- [x] **1.3** `SQL/v608_manager_appointment_decline_rpc.sql`
  - `decline_manager_appointment(p_appointment_id, p_decline_reason, p_decline_note)` — SECURITY DEFINER

### Phase 2 — SQL (Simulator)
- [x] **2.1** `SQL/v609_sim_manager_appointment_records.sql`
  - `sim.sim_manager_appointment_records` — mirrors `manager_appointment_records` for sim schema
  - Same RLS pattern scoped to sim roles

### Phase 3 — Service layer (Platform)
- [x] **3.1** Create `src/services/managerAppointmentService.js`
  - `createManagerAppointment(appointmentData)` — INSERT + link to invitation
  - `getManagerAppointment(appointmentId)`
  - `getAppointmentsForEntity(entityType, entityId)` — list appointments for a portfolio/programme/project
  - `acceptManagerAppointment(appointmentId, acceptanceData)` — calls RPC
  - `declineManagerAppointment(appointmentId, declineReason, declineNote)` — calls RPC
  - `getMyPendingAppointments(userId)` — for the PM's own pending inbox

### Phase 4 — Service layer (Simulator)
- [x] **4.1** Create `src/services/sim/simManagerAppointmentService.js`
  - Same interface as above but using `simDb` and `sim.sim_manager_appointment_records`

### Phase 5 — UI Component: Appointment Form (PMO / Assigner side)
- [x] **5.1** Create `src/components/pm/ManagerAppointmentForm.jsx`
  - Used inside `AssignManagerModal` when role = project_manager / programme_manager / portfolio_manager
  - Fields: assignment_start_date, assignment_end_date, time_commitment_pct (25/50/75/100 select), reporting_to (user search), budget_authority_limit (smart amount input), authority_notes, reporting_frequency (select), known_constraints, reference_document, personal_message
  - Dark theme, PWA-responsive
  - On submit → calls `createManagerAppointment` then sends invitation email
- [x] **5.2** Update `AssignManagerModal` — `useFormalAppointment` + `ManagerAppointmentForm` (PMO Manager Assignments)

### Phase 6 — UI: Enhanced Accept/Decline page
- [x] **6.1** Update `src/pages/auth/InvitationAccept.jsx`
  - Detect when invitation role = manager role → load linked appointment record
  - Show appointment terms in a read-only card (what the PMO specified)
  - Show acceptance fields: availability confirmation checkbox + date, COI checkbox + detail, capability checkbox, conditions text, initial observations text
  - Show decline fields in the decline modal: reason category dropdown + note
  - On accept → calls `acceptManagerAppointment` RPC
  - On decline → calls `declineManagerAppointment` RPC
- [x] **6.2** Create `src/components/invitations/AppointmentTermsCard.jsx` + `AppointmentAcceptPanel.jsx`
  - Read-only card showing the PMO's appointment terms (role, dates, commitment, authority, constraints)
  - Used in accept page and in the appointment dashboard

### Phase 7 — Appointment Dashboard (PMO view)
- [x] **7.1** Create `src/pages/pmo/AppointmentDashboard.jsx` + `AppointmentLedgerView.jsx`
  - Tab: **Pending** (awaiting acceptance) | **Active** | **Declined** | **Ended**
  - Each row shows: entity, role, appointee, terms summary, status, action buttons (Remind / Withdraw)
  - Export: Excel / CSV / Print
  - Card + table toggle, sortable headers
- [x] **7.2** Register route in `App.jsx`: `/platform/pmo-admin/appointments`
- [x] **7.3** Add "Appointment Tracker" to `pmoMenuConfig.js` + `SQL/v614_appointment_tracker_menu.sql`

### Phase 8 — My Appointments (PM / appointed user view)
- [x] **8.1** Create `src/pages/app/MyAppointments.jsx`
  - PM can see all their own appointments (pending/active/historical)
  - Click pending → goes to full accept/decline flow
  - Export own record as PDF/Word (appointment letter format)
- [x] **8.2** Register route: `/platform/my-appointments`
- [x] **8.3** Add "My Appointments" to `pmDashboardMenuConfig.js`

### Phase 9 — Simulator pages
- [x] **9.1** Create `src/pages/sim/pmo/SimAppointmentDashboard.jsx` — mirrors Phase 7
- [x] **9.2** Create `src/pages/sim/app/SimMyAppointments.jsx` — mirrors Phase 8
- [x] **9.3** Register routes + `simulatorPMOMenuConfig.js` / `simulatorPMMenuConfig.js`

### Phase 10 — Tests
- [x] **10.1** Unit tests: `src/services/__tests__/managerAppointmentService.test.js`
- [x] **10.2** Unit tests: `src/services/sim/__tests__/simManagerAppointmentService.test.js`
- [x] **10.3** Role utils + service export tests; component tests deferred (InvitationAccept paths covered manually)

### Phase 11 — Documentation
- [x] **11.1** `Documentation/Manager_Appointment_Best_Practice_Guide.md`

---

## Database Schema: `manager_appointment_records`

```sql
CREATE TABLE IF NOT EXISTS public.manager_appointment_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Link to invitation
  invitation_id UUID REFERENCES public.project_invitations(id) ON DELETE SET NULL,

  -- Entity being managed
  entity_type  VARCHAR(20) NOT NULL CHECK (entity_type IN ('project','programme','portfolio')),
  project_id   UUID REFERENCES public.projects(id)    ON DELETE CASCADE,
  programme_id UUID REFERENCES public.programmes(id)  ON DELETE CASCADE,
  portfolio_id UUID REFERENCES public.portfolios(id)  ON DELETE CASCADE,

  -- Parties
  manager_role_name    VARCHAR(50) NOT NULL,   -- project_manager / programme_manager / portfolio_manager
  appointee_user_id    UUID NOT NULL REFERENCES public.users(id),
  appointed_by_user_id UUID NOT NULL REFERENCES public.users(id),
  reporting_to_user_id UUID REFERENCES public.users(id),

  -- Appointment terms (set by PMO / appointer)
  assignment_start_date     DATE,
  assignment_end_date       DATE,
  time_commitment_pct       INTEGER CHECK (time_commitment_pct BETWEEN 1 AND 100),
  budget_authority_limit    NUMERIC(18,2),
  authority_notes           TEXT,
  reporting_frequency       VARCHAR(20) CHECK (reporting_frequency IN ('weekly','fortnightly','monthly','as_required')),
  known_constraints         TEXT,
  reference_document        TEXT,
  appointment_message       TEXT,

  -- Appointment status
  appointment_status VARCHAR(30) NOT NULL DEFAULT 'pending_acceptance'
    CHECK (appointment_status IN ('pending_acceptance','active','declined','withdrawn','ended')),

  -- Acceptance fields (set by appointee)
  accepted_at                 TIMESTAMPTZ,
  availability_confirmed      BOOLEAN,
  actual_start_date           DATE,
  conflict_of_interest        BOOLEAN,
  coi_detail                  TEXT,
  capability_acknowledged     BOOLEAN,
  acceptance_conditions       TEXT,
  initial_observations        TEXT,

  -- Decline fields
  declined_at    TIMESTAMPTZ,
  decline_reason VARCHAR(50) CHECK (decline_reason IN ('unavailable','skills_mismatch','conflict_of_interest','overloaded','other')),
  decline_note   TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active  BOOLEAN DEFAULT TRUE,
  is_deleted BOOLEAN DEFAULT FALSE
);
```

---

## Files to Create / Modify

| File | Action |
|---|---|
| `SQL/v600_manager_appointment_records.sql` | CREATE |
| `SQL/v601_manager_appointment_accept_rpc.sql` | CREATE |
| `SQL/v602_manager_appointment_decline_rpc.sql` | CREATE |
| `SQL/v603_sim_manager_appointment_records.sql` | CREATE |
| `src/services/managerAppointmentService.js` | CREATE |
| `src/services/sim/simManagerAppointmentService.js` | CREATE |
| `src/components/pm/ManagerAppointmentForm.jsx` | CREATE |
| `src/components/invitations/AppointmentTermsCard.jsx` | CREATE |
| `src/components/pmo/AssignManagerModal.jsx` | MODIFY — embed ManagerAppointmentForm |
| `src/pages/auth/InvitationAccept.jsx` | MODIFY — manager role fields |
| `src/pages/pmo/AppointmentDashboard.jsx` | CREATE |
| `src/pages/app/MyAppointments.jsx` | CREATE |
| `src/pages/sim/pmo/SimAppointmentDashboard.jsx` | CREATE |
| `src/pages/sim/app/SimMyAppointments.jsx` | CREATE |
| `src/config/pmoMenuConfig.js` | MODIFY — add Appointment Tracker |
| `src/config/pmDashboardMenuConfig.js` | MODIFY — add My Appointments |
| `src/config/simulatorPMOMenuConfig.js` | MODIFY |
| `src/config/simulatorPMMenuConfig.js` | MODIFY |
| `src/App.jsx` | MODIFY — 4 new routes |
| `src/services/__tests__/managerAppointmentService.test.js` | CREATE |
| `src/services/sim/__tests__/simManagerAppointmentService.test.js` | CREATE |
| `Documentation/Manager_Appointment_Best_Practice_Guide.md` | CREATE |

---

## Key Design Constraints

- **Generic invites unchanged** — the new fields appear only for manager roles; team-member invites use the existing flow.
- **Smart amount input** for budget authority limit (type `10k` → `10,000`).
- **Draft/hold** supported — appointment form state saved via existing draft queue.
- **Export** — appointment record exportable as Word (Appointment Letter), PDF, Excel from both PMO dashboard and My Appointments.
- **No mock data** — all users/entities from DB.
- **Dark theme default**, PWA-responsive.
- **Do NOT bypass RLS** — SECURITY DEFINER RPCs enforce row-level permissions.

---

---

## Extension: Team Manager/Lead → Team Member Invitation Appointment Record

**Added:** 2026-05-22  
**Goal:** Apply the same formal appointment record pattern to Team Manager/Lead inviting Team Members — capturing role details, responsibilities, working arrangement, and a formal acceptance/decline from the incoming team member.

---

### Best-Practice Summary (Team Member)

#### Team Manager / Lead captures on invite
| Field | Purpose |
|---|---|
| Role / position title | Specific function (e.g., "Backend Developer", "QA Analyst") |
| Assignment start date | When accountability begins |
| Assignment end date | Expected end of assignment |
| Time commitment % | 25 / 50 / 75 / 100 % |
| Reporting to | Named Team Manager / Lead (pre-filled, editable) |
| Primary responsibilities | Key tasks and deliverables the member owns |
| Required skills / competencies | Skills the member should bring |
| Working arrangement | Remote / Onsite / Hybrid |
| Work location | Office / city when onsite or hybrid |
| Invitation message | Personalised note |

#### Team Member captures on accept
| Field | Purpose |
|---|---|
| Availability confirmation | Can they start on proposed date? |
| Actual start date | If different from invitation |
| Conflict of interest declared | Governance requirement |
| Conflict of interest detail | Free text |
| Skills acknowledged | Confirms having the required skills |
| Acceptance conditions | Any conditions (e.g., "subject to remote arrangement") |
| Initial observations | Early concerns or questions |

#### Team Member captures on decline
| Field | Purpose |
|---|---|
| Decline reason (category) | Unavailable / Skills mismatch / COI / Overloaded / Other |
| Decline note | Free text for Team Manager follow-up |

---

### Architecture Decisions (Team Member Extension)

1. **New `team_member_appointment_records` table** — mirrors `manager_appointment_records` scoped to team-level roles.
2. **`project_invitations` unchanged** — FK link to `project_invitations.id`; email/token workflow preserved.
3. **Role-conditional UI** — extra fields appear only for team-level roles (`team_member`, `team_lead`, `developer`, `analyst`, `designer`, `tester`, `subject_matter_expert`, `support`). Manager roles (v593 flow) and generic invites are unaffected.
4. **`InvitationAccept.jsx` role detection order** — (1) manager roles → v593 path, (2) team-level roles → this path, (3) fallback → original path.
5. **Reuses `AppointmentTermsCard` pattern** — adds a `TeamMemberTermsCard` variant for the team-role fields.
6. **Simulator parity** — `sim.sim_team_member_appointment_records` table and matching Sim pages.

---

### Role Classification Reference

| Role value | Display label | Flow |
|---|---|---|
| `project_manager` | Project Manager | v593 manager flow |
| `programme_manager` | Programme Manager | v593 manager flow |
| `portfolio_manager` | Portfolio Manager | v593 manager flow |
| `team_member` | Team Member | **this extension** |
| `team_lead` | Team Lead | **this extension** |
| `developer` | Developer | **this extension** |
| `analyst` | Business / Data Analyst | **this extension** |
| `designer` | UX / Designer | **this extension** |
| `tester` | QA Tester | **this extension** |
| `subject_matter_expert` | Subject Matter Expert | **this extension** |
| `support` | Support Staff | **this extension** |

---

### Key Differences vs. Manager Appointment (v593)

| Aspect | v593 Manager | Team Member Extension |
|---|---|---|
| Triggered by | PMO Admin | Team Manager / Lead / PM |
| Target role | PM / Programme / Portfolio Manager | team_member / team_lead / developer etc. |
| Entity scope | project / programme / portfolio | project only |
| Extra assigner fields | Budget authority, authority notes, reporting frequency, known constraints, reference document | Role title, primary responsibilities, required skills, working arrangement, work location |
| Extra acceptee fields | Availability, COI, capability ack, conditions, observations | Availability, COI, skills ack, conditions, observations |
| Dashboard | PMO Appointment Tracker | Team Appointment Dashboard |
| My view | My Appointments | My Team Assignments |
| Table | `public.manager_appointment_records` | `public.team_member_appointment_records` |
| Sim table | `sim.sim_manager_appointment_records` | `sim.sim_team_member_appointment_records` |

---

### Database Schema: `team_member_appointment_records`

```sql
CREATE TABLE IF NOT EXISTS public.team_member_appointment_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Link to invitation
  invitation_id UUID REFERENCES public.project_invitations(id) ON DELETE SET NULL,

  -- Entity context
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

  -- Parties
  member_role_name         VARCHAR(50)  NOT NULL,   -- team_member / team_lead / developer / analyst / designer
  role_title               VARCHAR(100),            -- human-readable position label
  appointee_user_id        UUID NOT NULL REFERENCES public.users(id),
  appointed_by_user_id     UUID NOT NULL REFERENCES public.users(id),
  reporting_to_user_id     UUID REFERENCES public.users(id),

  -- Assignment terms (set by Team Manager/Lead)
  assignment_start_date    DATE,
  assignment_end_date      DATE,
  time_commitment_pct      INTEGER CHECK (time_commitment_pct BETWEEN 1 AND 100),
  primary_responsibilities TEXT,
  required_skills          TEXT,
  working_arrangement      VARCHAR(20) CHECK (working_arrangement IN ('remote','onsite','hybrid')),
  work_location            TEXT,
  appointment_message      TEXT,

  -- Appointment status
  appointment_status VARCHAR(30) NOT NULL DEFAULT 'pending_acceptance'
    CHECK (appointment_status IN ('pending_acceptance','active','declined','withdrawn','ended')),

  -- Acceptance fields (set by appointee)
  accepted_at              TIMESTAMPTZ,
  availability_confirmed   BOOLEAN,
  actual_start_date        DATE,
  conflict_of_interest     BOOLEAN,
  coi_detail               TEXT,
  skills_acknowledged      BOOLEAN,
  acceptance_conditions    TEXT,
  initial_observations     TEXT,

  -- Decline fields
  declined_at    TIMESTAMPTZ,
  decline_reason VARCHAR(50) CHECK (decline_reason IN ('unavailable','skills_mismatch','conflict_of_interest','overloaded','other')),
  decline_note   TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active  BOOLEAN DEFAULT TRUE,
  is_deleted BOOLEAN DEFAULT FALSE
);
```

---

### Additional Todo Items (Team Member Extension)

#### Phase 1b — SQL (Platform — Team Member)
- [x] **1b.1** `SQL/v610_team_member_appointment_records.sql`
  - Create `public.team_member_appointment_records` (schema above)
  - RLS: Team Manager/Lead + PMO Admin can INSERT/UPDATE/SELECT their scope; PM can SELECT for their project; appointee can SELECT/UPDATE own record
  - Register in `database_tables`
- [x] **1b.2** `SQL/v611_team_member_appointment_accept_rpc.sql`
  - `accept_team_member_appointment(...)` — SECURITY DEFINER
- [x] **1b.3** `SQL/v612_team_member_appointment_decline_rpc.sql`
  - `decline_team_member_appointment(p_appointment_id, p_decline_reason, p_decline_note)` — SECURITY DEFINER

#### Phase 2b — SQL (Simulator — Team Member)
- [x] **2b.1** `SQL/v613_sim_team_member_appointment_records.sql`
  - `sim.sim_team_member_appointment_records` — mirrors platform table for sim schema

#### Phase 3b — Service layer (Platform — Team Member)
- [x] **3b.1** Create `src/services/teamMemberAppointmentService.js`
  - `createTeamMemberAppointment(appointmentData)`
  - `getTeamMemberAppointment(appointmentId)`
  - `getAppointmentsForProject(projectId)`
  - `acceptTeamMemberAppointment(appointmentId, acceptanceData)` — calls RPC
  - `declineTeamMemberAppointment(appointmentId, declineReason, declineNote)` — calls RPC
  - `getMyPendingTeamAppointments(userId)`

#### Phase 4b — Service layer (Simulator — Team Member)
- [x] **4b.1** Create `src/services/sim/simTeamMemberAppointmentService.js`
  - Same interface using `simDb` and `sim.sim_team_member_appointment_records`

#### Phase 5b — UI Component: Team Member Appointment Form (Team Manager/Lead side)
- [x] **5b.1** Create `src/components/pm/TeamMemberAppointmentForm.jsx`
  - Rendered inside `InviteUserForm` when role = team-level role
  - Fields: role_title, assignment_start_date, assignment_end_date, time_commitment_pct, reporting_to (user search, pre-filled), primary_responsibilities, required_skills, working_arrangement (select), work_location (conditional), appointment_message
  - Dark theme, PWA-responsive
  - On submit → calls `createTeamMemberAppointment` then sends invitation email
- [x] **5b.2** Update `src/components/app/InviteUserForm.jsx` for team-level roles

#### Phase 6b — UI: Enhanced Accept/Decline page (team-role branch)
- [x] **6b.1** Update `src/pages/auth/InvitationAccept.jsx` (team branch via `AppointmentAcceptPanel`)
  - Add team-role detection branch alongside existing manager-role branch
  - Show `TeamMemberTermsCard` (role, dates, commitment, responsibilities, working arrangement)
  - Acceptance fields: availability + date, COI, skills acknowledgement, conditions, observations
  - Decline modal: reason category + note
  - On accept → `acceptTeamMemberAppointment`; on decline → `declineTeamMemberAppointment`
- [x] **6b.2** Create `src/components/invitations/TeamMemberTermsCard.jsx`
  - Read-only card of Team Manager's appointment terms
  - Used in accept page and Team Appointment Dashboard

#### Phase 7b — Team Appointment Dashboard (Team Manager / PM view)
- [x] **7b.1** Create `src/pages/app/TeamAppointmentDashboard.jsx`
  - Tabs: Pending | Active | Declined | Ended
  - Columns: member, role title, start/end date, commitment %, working arrangement, status, actions (Remind / Withdraw)
  - Export: Excel / CSV / Print; card + table toggle; sortable headers
- [x] **7b.2** Register route: `/platform/app/team-appointments`
- [x] **7b.3** Add "Team Appointments" to `pmDashboardMenuConfig.js`

#### Phase 8b — My Team Assignments (Team Member view)
- [x] **8b.1** Create `src/pages/app/MyTeamAppointments.jsx`
  - Team member sees all own assignment records (pending / active / historical)
  - Click pending → full accept/decline flow
  - Export as Word (Assignment Letter) / Excel / CSV
- [x] **8b.2** Register route: `/platform/my-team-appointments`
- [x] **8b.3** Add "My Assignment" under Team & Members in `pmDashboardMenuConfig.js`

#### Phase 9b — Simulator pages (Team Member)
- [x] **9b.1** `SimTeamAppointmentDashboard.jsx`
- [x] **9b.2** `SimMyTeamAppointments.jsx`
- [x] **9b.3** Routes + simulator PM menu entries

#### Phase 10b — Tests (Team Member)
- [x] **10b.1** `teamMemberAppointmentService.test.js`
- [x] **10b.2** `simTeamMemberAppointmentService.test.js`
- [x] **10b.3** Service/role utils coverage (component tests deferred)

#### Phase 11b — Documentation (Team Member)
- [x] **11b.1** `Documentation/Team_Member_Appointment_Best_Practice_Guide.md`

---

### Additional Files to Create / Modify (Team Member Extension)

| File | Action |
|---|---|
| `SQL/v604_team_member_appointment_records.sql` | CREATE |
| `SQL/v605_team_member_appointment_accept_rpc.sql` | CREATE |
| `SQL/v606_team_member_appointment_decline_rpc.sql` | CREATE |
| `SQL/v607_sim_team_member_appointment_records.sql` | CREATE |
| `src/services/teamMemberAppointmentService.js` | CREATE |
| `src/services/sim/simTeamMemberAppointmentService.js` | CREATE |
| `src/components/pm/TeamMemberAppointmentForm.jsx` | CREATE |
| `src/components/invitations/TeamMemberTermsCard.jsx` | CREATE |
| `src/components/app/InviteUserForm.jsx` | MODIFY — embed TeamMemberAppointmentForm for team-level roles |
| `src/pages/auth/InvitationAccept.jsx` | MODIFY — add team-role branch (alongside v593 manager branch) |
| `src/pages/app/TeamAppointmentDashboard.jsx` | CREATE |
| `src/pages/app/MyTeamAppointments.jsx` | CREATE |
| `src/pages/sim/app/SimTeamAppointmentDashboard.jsx` | CREATE |
| `src/pages/sim/app/SimMyTeamAppointments.jsx` | CREATE |
| `src/config/pmDashboardMenuConfig.js` | MODIFY — add Team Appointments + My Assignment |
| `src/config/simulatorPMMenuConfig.js` | MODIFY |
| `src/App.jsx` | MODIFY — 4 additional routes |
| `src/services/__tests__/teamMemberAppointmentService.test.js` | CREATE |
| `src/services/sim/__tests__/simTeamMemberAppointmentService.test.js` | CREATE |
| `Documentation/Team_Member_Appointment_Best_Practice_Guide.md` | CREATE |

---

## Review Section

**Implemented:** 2026-05-21

### Summary
- Added formal appointment ledgers: `manager_appointment_records`, `team_member_appointment_records`, and Simulator mirrors.
- PMO **Manager Assignments** now sends formal appointments (`useFormalAppointment`) instead of only direct FK assignment.
- **Invitation accept** branches: manager → `accept_manager_appointment`; team → `accept_team_member_appointment`; else legacy flow.
- Dashboards: PMO Appointment Tracker, My Appointments, Team Appointments, My Assignment (+ Simulator equivalents).
- Shared UI: `ManagerAppointmentForm`, `TeamMemberAppointmentForm`, `AppointmentTermsCard`, `TeamMemberTermsCard`, `AppointmentLedgerView`.

### SQL run order (Supabase)
`v606` → `v607` → `v608` → `v609` → `v610` → `v611` → `v612` → `v613` → `v614` (menus)

### Notes / follow-ups
- Programme/portfolio manager invites use `postInviteTableRow` with `entity_type`; email dispatch is wired for project-scoped invites.
- Word/PDF “Appointment Letter” export on My Appointments uses existing `ExportListMenu` (Excel/CSV/Print); dedicated letter template can be a later enhancement.
- Optional: extend `InvitationAccept.test.jsx` for manager/team branches when DB fixtures exist.
