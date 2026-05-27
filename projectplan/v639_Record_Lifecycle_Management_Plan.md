# v639 — Record Lifecycle Management Plan
## Universal Record Flow: Unauthorised → Live → History → Archive

**Created:** 2026-05-28  
**Status:** Pending Approval  
**Applies to:** Platform + Simulator (parity required per CLAUDE.md rule 34.1)

---

## My Advice: Is This a Good Idea?

**Short answer: Yes — this is an excellent governance pattern. However, the implementation must be scoped and architected carefully to avoid creating an unmaintainable system.**

### Why It Is a Good Idea ✅

1. **Mirrors proven financial/accounting patterns** — The Unauthorised → Live → History → Archive flow is identical to how journal entries work in accounting systems (SAP, Oracle Financials). It is battle-tested at enterprise scale.
2. **Aligns with PRINCE2 Configuration Management** — The codebase already has Configuration Management Strategy. This lifecycle makes every record a "Configuration Item" with tracked state.
3. **"Zero Authoriser = Direct to Live" bypass is pragmatic** — Small teams or low-risk modules do not get blocked. Big teams with governance requirements get controlled authorisation.
4. **Prevents data loss** — History records preserve every version; Archive preserves for compliance. No record is ever truly deleted.
5. **Audit trail is crystal clear** — Every state transition is logged with who, when, and why. This is critical for regulatory compliance (GDPR, ISO 21502).
6. **Differentiates Nidus from consumer PMIS tools** — Trello/Asana have no authorisation lifecycle. This is an enterprise differentiator.

### Risks and Recommendations ⚠️

| Risk | Recommendation |
|---|---|
| **Separate DB tables per status** (user's original wording "separate records in different files") | **Do NOT use separate tables per status.** Use a `record_status` enum column on each applicable table. Separate tables = foreign key hell, duplicated RLS policies, impossible cross-status queries. Use **filtered views/tabs in the UI** as the "different files" experience. |
| **Applying to ALL records** — too broad | Apply only to high-governance records in Phase 1. Exclude: chat messages, notifications, user preferences, system configs, timesheets. |
| **"Reverse" on Live is ambiguous** | Define "Reverse" as: create a reversal snapshot (old record → History) and create a new Unauthorised amendment. It is NOT a delete — that breaks audit trail. |
| **"History" trigger is unclear** | History is triggered by **Amend on a Live record** — the current live state is snapshotted to History, and a new Unauthorised (or Live if zero authorisers) version is created. This is version control. |
| **Authoriser assignment UX** | Must define clearly: who can be set as authoriser (PMO Admin, PM, custom role), at what level (org-wide, per project, per record type). |
| **Simulator NPC authorisers** | Simulator must support NPC authorisers for training realism. When a user submits for authorisation in a simulation, an NPC approves/rejects based on scenario rules. |

### What "Separate Records in Different Files" Means (Interpreted)

The UI will present status-segregated views (tabs/pages) — **not** separate database tables:
- **Unauthorised Queue** — records awaiting authorisation
- **Live Records** — active, authorised records
- **History** — superseded versions (read-only except Restore)
- **Archive** — permanently archived (read-only)

---

## Record Lifecycle Flow (Formal Specification)

```
                    ┌─────────────────┐
User creates record │                 │
                    ▼                 │
         ┌──────────────────┐         │
         │  Zero Authorisers│─────────┘ → Direct to LIVE
         └──────────────────┘
                    │
         ┌──────────────────┐
         │ ≥1 Authoriser    │
         └──────────────────┘
                    │
                    ▼
         ┌──────────────────┐
         │  UNAUTHORISED     │  Operations: Input, Delete, Amend, See, Validate, Print
         └──────────────────┘
          │         │
    Validate/     Delete
    Authorise      │
          │        ▼ (gone)
          ▼
         ┌──────────────────┐
         │     LIVE          │  Operations: Input (sub-records), Reverse, Amend, See, Validate, Print
         └──────────────────┘
          │         │
       Amend      Reverse (creates new UNAUTHORISED amendment)
          │
          ▼ (old version)
         ┌──────────────────┐
         │    HISTORY        │  Operations: Restore, See, Print
         └──────────────────┘
          │         │
       Archive    Restore → LIVE
          │
          ▼
         ┌──────────────────┐
         │    ARCHIVE        │  Operations: See, Print (final state)
         └──────────────────┘
```

### Status Definitions

| Status | Meaning | Who can operate |
|---|---|---|
| `unauthorised` | Created but not yet validated/approved | Creator (Input, Delete, Amend), Authoriser (Validate), Anyone with See |
| `live` | Active, authorised, operational | Creator/PM (Input sub-records, Amend, Reverse, See, Print), Authoriser (Validate) |
| `history` | Superseded version — archived snapshot of a previous live state | PM (Restore, Print), Anyone with See |
| `archived` | Permanently archived — compliance-only retention | PMO Admin (See, Print only) |

### Operation Definitions

| Operation | Description |
|---|---|
| **Input** | Create new record or add sub-records to an existing one |
| **Delete** | Hard delete — only allowed on `unauthorised` records |
| **Amend** | Edit record fields. On `live`: snapshots current to `history`, creates new `unauthorised` (or `live` if zero authorisers) |
| **See** | View/read the record |
| **Validate** | Authoriser approves `unauthorised` → `live`. Requires authorisation request workflow |
| **Print** | Export/print the record (hooks into existing export system) |
| **Reverse** | On `live` record: snapshots to `history`, creates new `unauthorised` amendment record |
| **Restore** | On `history` record: promotes back to `live` (previous live becomes new `history`) |
| **Archive** | On `history` record: moves to permanent `archived` state |

---

## Applicable Record Types

### Phase 1 — High-Governance Records (implement first)

| Record Type | Table(s) | Priority |
|---|---|---|
| Projects | `projects` | Critical |
| Project Mandates | `project_mandates` | Critical |
| Business Cases | `business_cases` | Critical |
| Risks | `risks` | High |
| Issues | `issues` | High |
| Change Requests | `change_requests` | High |
| Decisions | `decisions` | High |

### Phase 2 — Delivery Records

| Record Type | Table(s) | Priority |
|---|---|---|
| Work Packages | `work_packages` | Medium |
| Stage Plans / Microplans | `stage_plans`, `project_plans` | Medium |
| Configuration Items | `configuration_items` | Medium |
| Benefits Review Plan | `benefits_review_plans` | Medium |

### Phase 3 — Reporting Records

| Record Type | Table(s) |
|---|---|
| Highlight Reports | `highlight_reports` |
| Exception Reports | `exception_reports` |
| End Stage Reports | `end_stage_reports` |
| Lessons Reports | `lessons_reports` |

### Explicitly Excluded (never apply lifecycle to these)

- Chat messages, notifications
- User preferences, system configs
- Timesheets, time logs
- Menu configs, role configs
- Audit logs themselves

---

## Database Architecture

### Core Design Decision: Single-Table Status Column

Each applicable table gets a `record_status` column. No separate tables per status. UI filters by status.

### New Shared Tables (public schema + sim schema mirror)

#### 1. `record_authorisers` — Who is authoriser for what

```sql
CREATE TABLE record_authorisers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE, -- NULL = org-wide
  record_type VARCHAR(100) NOT NULL, -- 'project', 'risk', 'issue', 'change_request', etc.
  authoriser_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 2. `record_authorisation_requests` — Pending approval requests

```sql
CREATE TABLE record_authorisation_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  record_type VARCHAR(100) NOT NULL,
  record_id UUID NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  submitted_by UUID REFERENCES users(id),
  authoriser_id UUID REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn')),
  submission_notes TEXT,
  decision_notes TEXT,
  submitted_at TIMESTAMP DEFAULT NOW(),
  decided_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 3. `record_lifecycle_logs` — Transition history (extends existing audit_log)

```sql
CREATE TABLE record_lifecycle_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  record_type VARCHAR(100) NOT NULL,
  record_id UUID NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  from_status VARCHAR(30),
  to_status VARCHAR(30) NOT NULL,
  operation VARCHAR(30) NOT NULL, -- 'input', 'validate', 'amend', 'reverse', 'restore', 'archive', 'delete'
  performed_by UUID REFERENCES users(id),
  reason TEXT,
  version_number INTEGER,
  snapshot_data JSONB, -- stores the record state at time of transition
  performed_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Columns to Add to Each Applicable Table

```sql
ALTER TABLE {table_name}
  ADD COLUMN IF NOT EXISTS record_status VARCHAR(30) DEFAULT 'unauthorised'
    CHECK (record_status IN ('unauthorised', 'live', 'history', 'archived')),
  ADD COLUMN IF NOT EXISTS record_version INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS parent_record_id UUID, -- links history/archived versions to the current live record
  ADD COLUMN IF NOT EXISTS authorised_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS authorised_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;
```

### Database Function: `get_authoriser_count`

```sql
CREATE OR REPLACE FUNCTION get_authoriser_count(
  p_org_id UUID,
  p_project_id UUID,
  p_record_type VARCHAR
) RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM record_authorisers
  WHERE is_active = TRUE
    AND org_id = p_org_id
    AND (project_id = p_project_id OR project_id IS NULL)
    AND record_type = p_record_type;
$$ LANGUAGE sql STABLE;
```

### Database Function: `transition_record_status`

```sql
-- Validates the transition is legal and logs it
CREATE OR REPLACE FUNCTION transition_record_status(
  p_table_name VARCHAR,
  p_record_id UUID,
  p_operation VARCHAR,
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$ ...
```

### Sim Schema Mirror

All 3 new tables must also exist in the `sim` schema (`sim.record_authorisers`, `sim.record_authorisation_requests`, `sim.record_lifecycle_logs`) for Simulator parity.

---

## Frontend Architecture

### New Shared UI Components (`src/components/ui/`)

| Component | Purpose |
|---|---|
| `RecordStatusBadge.jsx` | Colour-coded pill: Unauthorised (amber), Live (green), History (blue-grey), Archived (grey) |
| `RecordLifecycleToolbar.jsx` | Shows available operation buttons based on current status + user role |
| `RecordVersionHistory.jsx` | Timeline drawer showing all status transitions for a record |
| `AuthorisationRequestModal.jsx` | Modal for submitting for authorisation + approving/rejecting |
| `RecordStatusTabs.jsx` | Tabs (Unauthorised / Live / History / Archive) for list pages |
| `AuthorisationQueue.jsx` | PMO/PM widget showing pending authorisation requests with count badge |

### New Shared Service (`src/services/`)

`recordLifecycleService.js` — Single service handling all lifecycle operations:
- `checkAuthoriserCount(orgId, projectId, recordType)` → determines direct-to-live or unauthorised
- `submitForAuthorisation(tableNam, recordId, notes)` → creates authorisation request + notification
- `approveRecord(requestId, notes)` → transitions to live, logs
- `rejectRecord(requestId, notes)` → keeps unauthorised, logs
- `amendRecord(tableName, recordId, newData)` → snapshots live → history, creates new unauthorised/live
- `reverseRecord(tableName, recordId, reason)` → snapshots live → history, creates new unauthorised
- `restoreRecord(tableName, recordId)` → promotes history → live
- `archiveRecord(tableName, recordId)` → transitions history → archived
- `getLifecycleLogs(tableName, recordId)` → fetch full transition history
- `getAuthorisationQueue(userId)` → fetch pending requests for an authoriser

### Simulator Service (`src/services/sim/`)

`simRecordLifecycleService.js` — Mirrors recordLifecycleService but:
- Uses `simDb` client
- Includes NPC authoriser simulation: `simulateNPCAuthorisation(requestId, scenarioRules)`
- NPC auto-approves after configurable delay (scenario-driven)
- NPC can auto-reject to trigger training scenarios

---

## Sidebar Menu Additions

### Platform — PMO (`src/config/pmoMenuConfig.js`)

Add new section **"Authorisation & Lifecycle"** (order 0.5, before existing sections):
```js
{
  id: 'pmo-authorisation',
  label: 'Authorisation & Lifecycle',
  icon: ShieldCheck,
  children: [
    { label: 'Authorisation Queue', path: '/pmo/authorisation/queue' },
    { label: 'Lifecycle Dashboard', path: '/pmo/authorisation/dashboard' },
    { label: 'Configure Authorisers', path: '/pmo/authorisation/configure' },
    { label: 'Archive Vault', path: '/pmo/authorisation/archive' },
  ]
}
```

### Platform — PM (`src/config/pmDashboardMenuConfig.js`)

Add under existing Controls or new **"Authorisation"** section (order 0.5):
```js
{
  id: 'pm-authorisation',
  label: 'Authorisation',
  icon: ShieldCheck,
  children: [
    { label: 'Pending My Approval', path: '/pm/authorisation/queue' },
    { label: 'My Submitted Records', path: '/pm/authorisation/submitted' },
  ]
}
```

### Simulator — PMO (`src/config/simulatorPMOMenuConfig.js`)

Add **"Practice Authorisation"** section (order 0.5) — same structure as Platform PMO but `/simulator/pmo/*` routes.

### Simulator — PM (`src/config/simulatorPMMenuConfig.js`)

Add **"Practice Authorisation"** section (order 0.5) — same structure as Platform PM but `/simulator/pm/*` routes.

### Simulator — TM (`src/config/simulatorTMMenuConfig.js`)

Add **"Authorisation"** child to existing "My Work" section:
```js
{ label: 'My Submitted Records', path: '/simulator/tm/authorisation/submitted' }
```

---

## UI Pages Required

| Page | Route (Platform) | Route (Simulator) |
|---|---|---|
| Authorisation Queue | `/pmo/authorisation/queue` | `/simulator/pmo/authorisation/queue` |
| Lifecycle Dashboard | `/pmo/authorisation/dashboard` | `/simulator/pmo/authorisation/dashboard` |
| Configure Authorisers | `/pmo/authorisation/configure` | `/simulator/pmo/authorisation/configure` |
| Archive Vault | `/pmo/authorisation/archive` | `/simulator/pmo/authorisation/archive` |
| My Pending Approvals (PM) | `/pm/authorisation/queue` | `/simulator/pm/authorisation/queue` |
| My Submitted Records | `/pm/authorisation/submitted` | `/simulator/pm/authorisation/submitted` |

Each existing record list page (Risks, Issues, Changes, etc.) also gets **status tabs** added: `All | Unauthorised | Live | History | Archive`

---

## Seed Data

### Seed: Default Authoriser Configuration Templates

```sql
-- Sample authoriser role mapping for new orgs
INSERT INTO record_authorisers_templates (record_type, default_authoriser_role) VALUES
  ('project', 'pmo_admin'),
  ('project_mandate', 'pmo_admin'),
  ('business_case', 'pmo_admin'),
  ('risk', 'project_manager'),
  ('issue', 'project_manager'),
  ('change_request', 'project_manager'),
  ('decision', 'project_manager'),
  ('work_package', 'project_manager');
```

### Seed: Status migration for existing records

All existing live records in applicable tables must be migrated to `record_status = 'live'` on first deployment.

```sql
UPDATE projects SET record_status = 'live' WHERE record_status IS NULL;
UPDATE risks SET record_status = 'live' WHERE record_status IS NULL;
-- etc. for each applicable table
```

---

## SQL Files to Create

| File | Contents |
|---|---|
| `SQL/v651_record_lifecycle_tables.sql` | Create 3 new tables (public schema), enum, indexes, RLS |
| `SQL/v652_record_lifecycle_columns.sql` | ALTER TABLE for Phase 1 tables (add status columns) |
| `SQL/v653_record_lifecycle_functions.sql` | get_authoriser_count, transition_record_status, etc. |
| `SQL/v654_sim_record_lifecycle_tables.sql` | Mirror of v651 for sim schema |
| `SQL/v655_record_lifecycle_seed.sql` | Seed authoriser templates, migrate existing records to 'live' |

---

## Implementation Phases

### Phase 1 — Infrastructure (v640)
- [ ] Create SQL v651–v655
- [ ] Create `recordLifecycleService.js` + `simRecordLifecycleService.js`
- [ ] Create `RecordStatusBadge`, `RecordLifecycleToolbar`, `RecordVersionHistory`, `AuthorisationRequestModal`, `RecordStatusTabs` components
- [ ] Create `AuthorisationQueue` page (PMO + PM)
- [ ] Create `ConfigureAuthorisers` page (PMO only)
- [ ] Add sidebar entries to all 6 config files
- [ ] Unit tests for lifecycle service

### Phase 2 — Apply to High-Governance Records (v641)
- [ ] Projects list + detail — add status tabs + lifecycle toolbar
- [ ] Mandates list + detail — add status tabs + lifecycle toolbar
- [ ] Business Cases list + detail — add status tabs + lifecycle toolbar
- [ ] Risks list + detail — add status tabs + lifecycle toolbar
- [ ] Issues list + detail — add status tabs + lifecycle toolbar
- [ ] Change Requests list + detail — add status tabs + lifecycle toolbar
- [ ] Decisions list + detail — add status tabs + lifecycle toolbar

### Phase 3 — Delivery Records (v642)
- [ ] Work Packages, Stage Plans, Configuration Items, Benefits Review Plans

### Phase 4 — Reporting Records (v643)
- [ ] Highlight Reports, Exception Reports, End Stage Reports, Lessons Reports

### Phase 5 — Archive Vault + Lifecycle Dashboard (v644)
- [ ] Archive Vault page with full-text search across all archived record types
- [ ] Lifecycle Dashboard with transition analytics and authorisation KPIs
- [ ] Simulator NPC authoriser engine

---

## Todo List (Phase 1 — Pending Approval)

- [ ] Write `SQL/v651_record_lifecycle_tables.sql` (public schema tables)
- [ ] Write `SQL/v652_record_lifecycle_columns.sql` (ALTER TABLE for Phase 1 tables)
- [ ] Write `SQL/v653_record_lifecycle_functions.sql` (DB functions)
- [ ] Write `SQL/v654_sim_record_lifecycle_tables.sql` (sim schema mirror)
- [ ] Write `SQL/v655_record_lifecycle_seed.sql` (seed + migration)
- [ ] Create `src/services/recordLifecycleService.js`
- [ ] Create `src/services/sim/simRecordLifecycleService.js`
- [ ] Create `src/components/ui/RecordStatusBadge.jsx`
- [ ] Create `src/components/ui/RecordLifecycleToolbar.jsx`
- [ ] Create `src/components/ui/RecordVersionHistory.jsx`
- [ ] Create `src/components/ui/AuthorisationRequestModal.jsx`
- [ ] Create `src/components/ui/RecordStatusTabs.jsx`
- [ ] Create `src/components/ui/AuthorisationQueue.jsx`
- [ ] Create `src/pages/pmo/AuthorisationQueuePage.jsx`
- [ ] Create `src/pages/pmo/LifecycleDashboardPage.jsx`
- [ ] Create `src/pages/pmo/ConfigureAuthorisersPage.jsx`
- [ ] Create `src/pages/pmo/ArchiveVaultPage.jsx`
- [ ] Create `src/pages/pm/PendingApprovalsPage.jsx`
- [ ] Create Simulator mirrors for all PMO/PM pages above
- [ ] Update `src/config/pmoMenuConfig.js` — add Authorisation & Lifecycle section
- [ ] Update `src/config/pmDashboardMenuConfig.js` — add Authorisation section
- [ ] Update `src/config/simulatorPMOMenuConfig.js` — add Practice Authorisation section (also fix SlidersHorizontal import bug)
- [ ] Update `src/config/simulatorPMMenuConfig.js` — add Practice Authorisation section
- [ ] Update `src/config/simulatorTMMenuConfig.js` — add My Submitted Records to My Work
- [ ] Write unit tests for `recordLifecycleService.js`
- [ ] Write unit tests for `simRecordLifecycleService.js`

---

## Review Section

*To be filled after implementation.*
