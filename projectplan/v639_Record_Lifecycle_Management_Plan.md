# v639 — Record Lifecycle Management Plan
## Universal Record Flow: Unauthorised → Live → History → Archive

**Created:** 2026-05-28  
**Revised:** 2026-05-28 (v7 — table-specific archive override table; independent retention config per table; regulatory_reference field; separate PMO Archive Retention Rules page)  
**Status:** Complete (2026-05-27)  
**Applies to:** Platform + Simulator (parity required per CLAUDE.md rule 34.1)

---

## My Advice: Is This a Good Idea?

**Short answer: Yes — this is an excellent governance pattern. The revised scoping categories (A/B/C) address the performance concern correctly. This is how enterprise financial systems (SAP, Oracle) handle large record volumes.**

### Why It Is a Good Idea ✅

1. **Mirrors proven financial/accounting patterns** — Unauthorised → Live → History → Archive is identical to how journal entries flow in SAP and Oracle Financials. Battle-tested at billions of records.
2. **Aligns with PRINCE2 Configuration Management** — Every record becomes a tracked Configuration Item with auditable state.
3. **Zero Authoriser bypass is pragmatic** — Small teams are not blocked; large governance-heavy orgs get full control.
4. **Prevents data loss** — History preserves every version; Archive is compliance retention. Nothing is ever truly deleted.
5. **Crystal-clear audit trail** — Every transition logged (who, when, why). Critical for GDPR, ISO 21502.
6. **Enterprise differentiator** — Trello/Asana have no authorisation lifecycle whatsoever.
7. **The universal query requirement (enriched diagram)** — The ability to query across ALL four states simultaneously (Unauthorised + Live + History + Archive) via a single interface is powerful for reporting, compliance, and analytics.

### Key Risks and Mitigations ⚠️

| Risk | Mitigation |
|---|---|
| **Performance on high-volume tables** | Category A: physically separate tables per status. Use unified DB views for cross-status queries. |
| **"Reverse" on Live is ambiguous** | "Reverse" = snapshot live → History + create new Unauthorised amendment. Never a delete. |
| **"History" trigger is unclear** | History is triggered by Amend on a Live record — version control pattern, not time-based. |
| **Authoriser assignment UX** | Configurable at org-wide, per-project, and per-record-type levels. |
| **Simulator parity** | Simulator uses NPC authorisers for training realism; NPC auto-approves/rejects per scenario rules. |

---

## Record Lifecycle Flow (Formal Specification)

```
                         ┌──────────────────────────────────────────────────────────┐
                         │   User / System Queries (All Tables / Files / Records)    │
                         │   → Can query ANY or ALL of the 4 states simultaneously  │
                         └──────────────┬──────────────┬──────────────┬─────────────┘
                                        ▼              ▼              ▼             ▼
                    ┌─────────────────┐
User creates record │                 │
                    ▼                 │
         ┌──────────────────┐         │
         │  Zero Authorisers│─────────┘ ──────────────────────► LIVE (bypass)
         └──────────────────┘
                    │
         ┌──────────────────┐
         │ ≥1 Authoriser    │
         └──────────────────┘
                    │
                    ▼
    ┌───────────────────────────┐
    │  UNAUTHORISED              │  Input, Delete, Amend, See, Validate, Print
    └───────────────────────────┘
          │              │
    Validate/          Delete
    Authorise           │
          │             ▼ (gone)
          ▼
    ┌───────────────────────────┐
    │  LIVE                     │  Input (sub-records), Reverse, Amend, See, Validate, Print
    └───────────────────────────┘
          │              │
       Amend           Reverse
    (old → History)  (old → History,
          │           new Unauthorised)
          ▼
    ┌───────────────────────────┐
    │  HISTORY                  │  Restore, See, Print
    └───────────────────────────┘
          │              │
       Archive         Restore
          │              │
          ▼              ▼ → LIVE
    ┌───────────────────────────┐
    │  ARCHIVE                  │  See, Print  (final state)
    └───────────────────────────┘
```

### Operation Definitions

| Operation | Where Available | Description |
|---|---|---|
| **Input** | Unauthorised, Live | Create record or add sub-records |
| **Delete** | Unauthorised only | Hard delete — not available once Live |
| **Amend** | Unauthorised, Live | Edit fields. On Live: snapshots current → History, creates new Unauthorised (or Live if zero authorisers) |
| **See** | All states | View/read |
| **Validate** | Unauthorised | Authoriser approves → Live |
| **Print** | All states | Export/print (hooks into existing export system) |
| **Reverse** | Live | Snapshot live → History, create new Unauthorised amendment (like a journal reversal) |
| **Restore** | History | Promote History → Live (previous Live becomes new History) |
| **Archive** | History | Move to permanent Archive state |

---

## Scoping Categories

### CATEGORY A — High Volume: Separate Physical Tables Per Status

**Rationale:** Tables expected to grow beyond ~100,000 rows per deployment, where mixing all statuses in a single table would create full-table scan penalties on the most common query ("give me all live risks for project X"). Physically separating by status means the Live table stays small and hot-cached. History and Archive grow large but are rarely queried by normal operations.

**Architecture per Category A table:**

```
{record_type}_live          ← active operational records (live + unauthorised*)
{record_type}_history       ← superseded versions (snapshot on amend/reverse)
{record_type}_archive       ← permanently archived

* Unauthorised records sit in _live table with record_status = 'unauthorised'
  since they are operationally active (being worked on). Only History and Archive
  are physically separated — these are the two states that grow without bound.
```

> **Design note:** Unauthorised records stay in the main `_live` table because they are operationally active — users are working on them. Only History (grows with every amendment) and Archive (compliance retention) are physically separated to keep the main table compact.

**Unified view for cross-status queries:**

```sql
CREATE VIEW {record_type}_all AS
  SELECT *, record_status FROM {record_type}_live   -- contains 'live' and 'unauthorised'
  UNION ALL
  SELECT *, 'history' AS record_status FROM {record_type}_history
  UNION ALL
  SELECT *, 'archived' AS record_status FROM {record_type}_archive;
```

This view is what the "User/System Queries (All Tables/Files/Records)" node in the diagram queries.

**Category A record types:**

| Record Type | Tables | Expected Volume | Reason |
|---|---|---|---|
| **Risks** | `risks_live`, `risks_history`, `risks_archive` | High (100+ per project × 1000s of projects) | Every risk amendment creates a history row. Large orgs accumulate millions. |
| **Issues** | `issues_live`, `issues_history`, `issues_archive` | High | Same pattern as risks. |
| **Change Requests** | `change_requests_live`, `change_requests_history`, `change_requests_archive` | High | Frequent amendments, long-lived records. |
| **Tasks** | `tasks_live`, `tasks_history`, `tasks_archive` | Very High | Thousands per project; every status change or reassignment could create history. |
| **Defects** | `defects_live`, `defects_history`, `defects_archive` | High | Testing-heavy orgs produce thousands of defect records per project. |
| **Time Entries** | Excluded from lifecycle (see Category C) | Very High | Timesheets have their own approval flow; history/archive lifecycle does not apply. |

**My advice on Category A:** The `_live` table keeps the hot operational data small. The `_history` and `_archive` tables can be placed on slower/cheaper storage or partitioned by `created_at` for further performance. For Supabase, consider applying `pg_partman` to the history and archive tables partitioned by year.

---

### CATEGORY B — Low Volume: Single Table with Status Column

**Rationale:** Tables bounded by the number of projects or organisations in the system. Even in a large enterprise, there will never be millions of Projects, Business Cases, or Exception Reports. A `record_status` column approach is clean, simple, and performs well. Status tabs in the UI give the "separate files" experience.

**Architecture:** Add `record_status VARCHAR(30) CHECK (record_status IN ('unauthorised', 'live', 'history', 'archived'))` + `record_version INTEGER` + `parent_record_id UUID` to each applicable table. Status tabs in the UI filter the single table.

**Category B record types:**

| Record Type | Table | Max Expected Rows | Reason |
|---|---|---|---|
| **Projects** | `projects` | ~10,000 per large deployment | Bounded by org count × active project limit |
| **Project Mandates** | `project_mandates` | ~10,000 | One per project initiation |
| **Business Cases** | `business_cases` | ~10,000 | One per project |
| **Work Packages** | `work_packages` | ~50,000 | Bounded by project count and team size |
| **Stage Plans** | `stage_plans` | ~20,000 | Bounded by project × stages |
| **Decisions** | `decisions` | ~30,000 | Moderate volume, rarely amended |
| **Configuration Items** | `configuration_items` | ~20,000 | Bounded by project scope |
| **Benefits Review Plans** | `benefits_review_plans` | ~10,000 | One per project typically |
| **Highlight Reports** | `highlight_reports` | ~50,000 | Weekly per project, still bounded |
| **Exception Reports** | `exception_reports` | ~10,000 | Rare, only raised when needed |
| **End Stage Reports** | `end_stage_reports` | ~20,000 | One per stage per project |
| **Lessons Reports** | `lessons_reports` | ~10,000 | One per project closure |
| **Project Initiation Documents** | `project_initiation_documents` | ~10,000 | One per project |
| **Product Descriptions** | `product_descriptions` | ~50,000 | Moderate but bounded |

**My advice on Category B:** No structural change to the table schema beyond adding the status columns. Existing queries still work — just add `WHERE record_status = 'live'` as the default filter. The unified query (All tab) removes that filter.

---

### CATEGORY C — No Lifecycle: Excluded from the System

**Rationale:** These record types either have no meaningful authorisation concept, have their own separate approval workflow already, or are system-generated and should never be put into an Unauthorised state.

| Record Type | Table(s) | Reason for Exclusion |
|---|---|---|
| **Chat Messages** | `messages`, `chat_messages` | Communication is immediate. "Unauthorised message" makes no sense. |
| **Notifications** | `notifications` | System-generated. Cannot be authorised. |
| **User Preferences / Settings** | `user_preferences`, `user_settings` | Personal config, no governance. |
| **Menu Configurations** | `menu_items`, `role_menu_items` | System config, managed by admin. |
| **Audit Logs** | `audit_log`, `record_lifecycle_logs` | Audit records must never be modified or lifecycled. |
| **Timesheets / Time Entries** | `timesheets`, `timesheet_entries` | Have their own manager approval flow already. |
| **Email / Notification Delivery Logs** | `email_logs`, `invitation_emails` | System-generated events. |
| **System Events / Activity Feed** | `activity_feed`, `system_events` | Immutable event log. |
| **Invitations** | `invitations` | Have their own accept/reject flow. |
| **Subscriptions / Payments** | `payment_transactions`, `subscriptions` | Financial system manages lifecycle. |
| **Leaderboard / Scores** | `sim.leaderboards`, `sim.module_scores` | Simulator analytics, no authorisation. |

---

## Record Lineage & Traceability ("Follow a Record to Archive")

**This is a confirmed requirement and is NOW fully specified in this plan.**

### The Problem Without root_record_id

When a live risk is amended, the old version moves to `risks_history` with a new UUID, and a new version is created in `risks_live` with a different UUID. `parent_record_id` links one version back to its immediate predecessor — but you would have to walk the chain hop-by-hop across different physical tables to find the origin. For a record that has been amended 10 times, that is 10 separate queries across potentially 3 different tables. This is unworkable.

### The Solution: `root_record_id`

Every record gets a `root_record_id` column set **once at creation and never changed**. It is the immutable logical identity of the record that persists across every amendment, status transition, and physical table move.

```
Risk created (UUID: aaa-111) → root_record_id = aaa-111, record_version = 1, record_status = 'unauthorised'
   ↓ Authorised
Risk goes live              → root_record_id = aaa-111, record_version = 1, record_status = 'live'
   ↓ Amended
Old version → risks_history → root_record_id = aaa-111, record_version = 1, record_status = 'history'
New version → risks_live    → root_record_id = aaa-111, record_version = 2, record_status = 'live'  (NEW UUID: bbb-222)
   ↓ Amended again
Old version → risks_history → root_record_id = aaa-111, record_version = 2, record_status = 'history'
New version → risks_live    → root_record_id = aaa-111, record_version = 3, record_status = 'live'  (NEW UUID: ccc-333)
   ↓ Archived
Moves to risks_archive      → root_record_id = aaa-111, record_version = 3, record_status = 'archived'
```

**To query the complete lifecycle of this risk in one call:**
```sql
SELECT * FROM risks_all
WHERE root_record_id = 'aaa-111'
ORDER BY record_version ASC;
-- Returns: version 1 (history), version 2 (history), version 3 (archived)
-- Complete journey from creation to archive — one query.
```

**For Category B (single table):**
```sql
SELECT * FROM business_cases
WHERE root_record_id = 'aaa-111'
ORDER BY record_version ASC;
-- Naturally unified — all versions in the same table.
```

### Two Distinct Query Types

The "User/System Queries" node in the diagram covers **both** of these query types:

| Query Type | Purpose | Mechanism |
|---|---|---|
| **Cross-status list query** | "Show me ALL risks for Project X across any status" | `SELECT * FROM risks_all WHERE project_id = ?` |
| **Record lineage query** | "Show me the complete history of THIS specific risk from creation to archive" | `SELECT * FROM risks_all WHERE root_record_id = ? ORDER BY record_version` |

Both are fulfilled by the `_all` UNION view for Category A, and the single table for Category B.

### `root_record_id` Rules

1. **Set at creation** — equal to the record's own `id` (UUID) when first inserted.
2. **Never changed** — not during amendment, reversal, restore, or archive.
3. **Copied forward** — when a new version is created by Amend or Reverse, the new record inherits `root_record_id` from its predecessor.
4. **Indexed** — `root_record_id` has a database index on every applicable table and history/archive table.
5. **Present in all log tables** — `record_lifecycle_logs` and `record_authorisation_requests` both carry `root_record_id` so the complete audit trail is traceable by root identity.

---

## Universal Query Capability (From Enriched Diagram)

The green "User/System Queries (All Tables/Files/Records)" node with arrows into all 4 states means the system must provide **a single query interface that spans all status buckets simultaneously**.

### What This Means for Each Category

| Category | Query Mechanism |
|---|---|
| **A (separate tables)** | `{record_type}_all` UNION view — query with optional `WHERE record_status IN (...)` or `WHERE root_record_id = ?` |
| **B (single table)** | Standard SELECT with optional `WHERE record_status IN (...)` or `WHERE root_record_id = ?` — naturally unified |
| **C (excluded)** | Not applicable |

### UI: Record Status Selector (Universal Query Control)

Every list page for Category A and B records has a **status selector bar**. The default landing state is always **Live**.

```
Default on page load:
  ● Live (847)   ○ Unauthorised   ○ History   ○ Archive   ○ All

User selects History:
  ○ Live   ○ Unauthorised   ● History (2,341)   ○ Archive   ○ All

User selects multiple (e.g. Live + Unauthorised):
  ● Live (847)   ● Unauthorised (12)   ○ History   ○ Archive   ○ All
```

**Behaviour rules:**

| Rule | Detail |
|---|---|
| **Default state** | Live tab is active on every page load. No other status is queried unless the user explicitly selects it. |
| **Opt-in selection** | User clicks Unauthorised, History, or Archive to load those records. Each selection triggers a separate targeted query — not a `_all` view scan. |
| **Multi-select** | User can select any combination of statuses simultaneously (e.g. Live + Unauthorised to see all active records). |
| **"All" shortcut** | An "All" option selects all four statuses at once — intended for compliance/audit use. It is visually de-emphasised (not the first option) and shows a count warning if the total exceeds a threshold (e.g. > 5,000 rows). |
| **Count badges** | Each status shows its count in parentheses at all times, fetched via a lightweight `COUNT(*)` query on page load — separate from the record fetch so it does not block the Live list. |
| **Persisted per page** | The user's last-chosen status selection for each list page is remembered in `localStorage` (same pattern as the card/table view toggle). |
| **Search scope** | The search bar and all filters apply only within the currently selected status(es). |

Each record's **detail view** also has a **"Version History"** panel (`RecordVersionHistory` component) that queries by `root_record_id` to show the complete lineage timeline — this panel is collapsed by default and expanded on demand, so it does not trigger a history/archive query on page load.

### System Query API

#### `recordLifecycleService.queryRecords(recordType, options)` — list query

```js
// DEFAULT — what every list page calls on load: Live records only
await recordLifecycleService.queryRecords('risks', {
  statusFilter: ['live'],        // DEFAULT — always 'live' unless user changes selection
  projectId: 'abc-123',
  search: 'budget',
  sortBy: 'created_at',
  page: 1,
  pageSize: 50,
})

// User opts in to Unauthorised as well
await recordLifecycleService.queryRecords('risks', {
  statusFilter: ['live', 'unauthorised'],   // user explicitly selected both
  projectId: 'abc-123',
})

// User selects "All" shortcut — cross-status scan (use cautiously)
await recordLifecycleService.queryRecords('risks', {
  statusFilter: ['live', 'unauthorised', 'history', 'archived'],
  projectId: 'abc-123',
})
```

The service routes the query efficiently:
- `['live']` or `['live', 'unauthorised']` → queries **`{record_type}_live`** table only (fast, hot-cached for Category A)
- `['history']` → queries **`{record_type}_history`** table only
- `['archived']` → queries **`{record_type}_archive`** table only
- Multi-status → queries the **`{record_type}_all`** UNION view with `WHERE record_status IN (...)`
- Category B: always queries the single table with `WHERE record_status IN (...)` regardless of selection

#### `recordLifecycleService.getStatusCounts(recordType, scopeFilter)` — count badges

Called once on page load to populate the count badges without blocking the Live list:

```js
// Returns counts per status for the current scope (e.g. a project)
await recordLifecycleService.getStatusCounts('risks', { projectId: 'abc-123' })
// Returns: { live: 847, unauthorised: 12, history: 2341, archived: 108 }
```

Each count is a lightweight `SELECT COUNT(*) FROM {table} WHERE ...` — one query per physical table (3 for Category A, 1 for Category B).

#### `recordLifecycleService.getRecordLifecycleChain(recordType, rootRecordId)` — follow to archive

```js
// Returns ALL versions of one logical record, ordered by record_version ascending
// Only called when user expands "Version History" panel on a detail view — never on list load
await recordLifecycleService.getRecordLifecycleChain('risks', 'aaa-111')
// Returns: [{ version: 1, status: 'history', ... }, { version: 2, status: 'history', ... }, { version: 3, status: 'archived', ... }]
```

All three functions abstract whether the record type is Category A (targeted table or UNION view) or Category B (single table). Callers never need to know the physical storage strategy.

### Reporting & Analytics

The cross-status query powers:
- **Lifecycle Dashboard** — counts and trends across all states per record type
- **Compliance Reports** — "Show all risks ever raised on Project X" (spans Live + History + Archive)
- **Authorisation KPIs** — "Average time from Unauthorised to Live for change requests"
- **Archive Vault** — full-text search across all archived records
- **Record Audit Trail** — complete version history of any individual record from creation to archive

---

## Database Architecture (Updated for 3 Categories)

### Shared Infrastructure Tables (both `public` and `sim` schemas)

#### `record_lifecycle_config` — configurable approval requirements per table *(NEW)*

This is the central configuration table. A PMO Admin selects a table from a dropdown of applicable tables and sets how many approvals are required before a record in that table transitions to Live.

```sql
CREATE TABLE record_lifecycle_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE, -- NULL = org-wide default
  table_name VARCHAR(100) NOT NULL,        -- selected from dropdown of applicable tables only

  -- ── APPROVAL SETTINGS ──────────────────────────────────────────────
  approval_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    -- FALSE = zero-authoriser bypass (direct to live regardless of authorisers configured)
  level_approval_mode VARCHAR(20) NOT NULL DEFAULT 'any'
    CHECK (level_approval_mode IN (
      'any',     -- ANY ONE authoriser at a given level can approve to unlock the next level
      'all'      -- ALL authorisers at a given level must approve before the next level activates
    )),
    -- Note: approval sequence is controlled by approval_level on record_authorisers rows.
    -- This mode applies identically at each level. If per-level mode is needed in future,
    -- add approval_mode to record_authorisers directly.

  -- ── HISTORY RETENTION SETTINGS ─────────────────────────────────────
  history_retention_days INTEGER DEFAULT NULL
    CHECK (history_retention_days IS NULL OR history_retention_days > 0),
    -- NULL = keep in History indefinitely (no auto-archive)
    -- N    = automatically move to Archive after N days in History status
  auto_archive_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    -- Master switch. history_retention_days is ignored when FALSE.
  archive_retention_years INTEGER DEFAULT NULL
    CHECK (archive_retention_years IS NULL OR archive_retention_years > 0),
    -- NULL = keep in Archive forever (recommended for compliance)
    -- N    = flag for purge review after N years (purge requires PMO Admin explicit action)

  is_active BOOLEAN DEFAULT TRUE,
  configured_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (org_id, project_id, table_name)  -- one config row per table per scope
);

CREATE INDEX idx_lifecycle_config_org_table ON record_lifecycle_config(org_id, table_name);
CREATE INDEX idx_lifecycle_config_project_table ON record_lifecycle_config(project_id, table_name);
-- Used by the scheduled auto-archive job to find active retention configs
CREATE INDEX idx_lifecycle_config_auto_archive ON record_lifecycle_config(auto_archive_enabled)
  WHERE auto_archive_enabled = TRUE;
```

**Dropdown of applicable tables (hardcoded in the UI — only Category A and B):**

| Display Label | `table_name` value | Category |
|---|---|---|
| Risks | `risks` | A |
| Issues | `issues` | A |
| Change Requests | `change_requests` | A |
| Tasks | `tasks` | A |
| Defects | `defects` | A |
| Projects | `projects` | B |
| Project Mandates | `project_mandates` | B |
| Business Cases | `business_cases` | B |
| Work Packages | `work_packages` | B |
| Stage Plans | `stage_plans` | B |
| Decisions | `decisions` | B |
| Configuration Items | `configuration_items` | B |
| Benefits Review Plans | `benefits_review_plans` | B |
| Highlight Reports | `highlight_reports` | B |
| Exception Reports | `exception_reports` | B |
| End Stage Reports | `end_stage_reports` | B |
| Lessons Reports | `lessons_reports` | B |
| Project Initiation Documents | `project_initiation_documents` | B |
| Product Descriptions | `product_descriptions` | B |

> **Why hardcoded, not dynamically fetched from `information_schema`?** Fetching from `information_schema` would expose all DB tables to the frontend (security risk) and include system/Category C tables that should never appear. The hardcoded list is intentional — only Category A and B tables are valid targets for lifecycle configuration.

**Configuration resolution — full priority order (4 levels):**

Archive/retention settings are resolved separately from approval settings because they serve different concerns (compliance vs governance workflow) and are owned by different administrators.

| Priority | Source | Scope | Beats |
|---|---|---|---|
| 1 — Highest | `record_archive_config` | Table-specific, org-wide | Everything below |
| 2 | `record_lifecycle_config` (project-specific) | Project + table | Levels 3 & 4 |
| 3 | `record_lifecycle_config` (org-wide) | Org + table | Level 4 only |
| 4 — Lowest | System default | All | Nothing |

**Approval settings** (chain, levels, mode) are resolved through levels 2 → 3 → 4 only.  
**Archive/retention settings** (`history_retention_days`, `auto_archive_enabled`, `archive_retention_years`) are resolved through **all 4 levels**, with `record_archive_config` (level 1) taking the highest precedence for its table.

> **Why separate?** Archive periods are typically set by legal, compliance, or regulatory obligations (GDPR, ISO 21502, sector-specific regulations) and are managed by a compliance officer or PMO Director — not by project managers. Keeping them in a dedicated override table makes it clear who owns the setting and why, and prevents project-level config changes from accidentally overriding a legally mandated retention period.

**`approval_mode` explained:**

| Mode | Example: 3 authorisers configured, min_approvals_required = 2 |
|---|---|
| `any` | The first person to approve triggers Live (ignores min_approvals_required) |
| `minimum` | Any 2 of the 3 configured authorisers must approve |
| `all` | All 3 must approve (min_approvals_required is ignored, ALL is absolute) |

> **Recommendation:** Default to `'minimum'` with `min_approvals_required = 1` for most tables. Use `'all'` only for high-stakes records like Business Cases or Project Mandates where every authoriser's sign-off is required.

---

#### `record_authorisers` — who can authorise per table/scope, in what order

```sql
CREATE TABLE record_authorisers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE, -- NULL = org-wide
  table_name VARCHAR(100) NOT NULL,
  authoriser_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  approval_level INTEGER NOT NULL DEFAULT 1
    CHECK (approval_level >= 1),
    -- Defines the sequential position in the approval chain.
    -- Level 1 = first to be notified and must act before Level 2 is activated.
    -- Level 2 = only notified after all Level 1 authorisers have acted (per level_approval_mode).
    -- Multiple authorisers can share the same approval_level (parallel approval at that level).
    -- Example: Level 1 = Team Lead, Level 2 = PM, Level 3 = PMO Director
  role_label VARCHAR(100),
    -- Human-readable label shown in the ApprovalChainDisplay, e.g. "Team Lead", "PMO Director"
    -- Makes the chain diagram readable without needing to resolve user names from the DB each time
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (org_id, project_id, table_name, authoriser_user_id)
);

CREATE INDEX idx_authorisers_table_level ON record_authorisers(org_id, table_name, approval_level);
```

> **Relationship between the two tables:**
> - `record_lifecycle_config` answers: *"Is approval required? What mode per level? How long in History?"*
> - `record_authorisers` answers: *"Who approves, in what order (level), with what role label?"*
> - Together: "Risks in Project X go to Team Lead (Level 1), then PM (Level 2), then PMO Director (Level 3) — all must approve at their level before the next level is activated."

---

#### `record_authorisation_requests` — one row per authoriser per submission

Each time a record is submitted for authorisation, **one row is created per configured authoriser across all levels**. Rows for Level 1 start as `'pending'` (active — notified immediately). Rows for Level 2, 3, … start as `'waiting'` (not yet their turn). Each level activates only after all required authorisers at the previous level have acted.

```sql
CREATE TABLE record_authorisation_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  record_type VARCHAR(100) NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  root_record_id UUID NOT NULL,        -- immutable identity
  record_id UUID NOT NULL,             -- specific version UUID being authorised
  submission_batch_id UUID NOT NULL,   -- groups all rows from the same submission event
  submitted_by UUID REFERENCES users(id),
  authoriser_id UUID REFERENCES users(id),
  approval_level INTEGER NOT NULL DEFAULT 1,  -- mirrors record_authorisers.approval_level
  role_label VARCHAR(100),                    -- e.g. "Team Lead", "PMO Director" — for display
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN (
      'waiting',    -- future level — not yet this authoriser's turn; no notification sent yet
      'pending',    -- current active level — notification sent, awaiting this person's decision
      'approved',   -- this authoriser approved
      'rejected',   -- this authoriser rejected (blocks progression)
      'withdrawn'   -- superseded (e.g. another authoriser at same level already approved in 'any' mode)
    )),
  submission_notes TEXT,               -- submitter's context for all authorisers
  decision_notes TEXT,                 -- this authoriser's reasoning
  submitted_at TIMESTAMP DEFAULT NOW(),
  activated_at TIMESTAMP,              -- when this row changed from 'waiting' to 'pending'
  decided_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_auth_requests_root    ON record_authorisation_requests(root_record_id);
CREATE INDEX idx_auth_requests_batch   ON record_authorisation_requests(submission_batch_id);
CREATE INDEX idx_auth_requests_level   ON record_authorisation_requests(submission_batch_id, approval_level);
CREATE INDEX idx_auth_requests_pending ON record_authorisation_requests(authoriser_id, status)
  WHERE status = 'pending';  -- fast lookup for "what is pending MY approval"
```

**How hierarchical sequential approval works (3-level example):**

```
Config: Risks — Level 1: Team Lead, Level 2: PM, Level 3: PMO Director
        level_approval_mode = 'any' (any one at a level is enough to unlock next)

Record submitted:
  → batch-xyz, Level 1: Team Lead  — status = 'pending'  (notification sent ✉)
  → batch-xyz, Level 2: PM         — status = 'waiting'   (no notification yet)
  → batch-xyz, Level 3: PMO Dir    — status = 'waiting'   (no notification yet)

  ApprovalChainDisplay shows:
    ● Level 1: Team Lead    [PENDING — awaiting decision]   ← current
    ○ Level 2: PM           [WAITING]
    ○ Level 3: PMO Director [WAITING]

Team Lead approves:
  → Level 1 row: status = 'approved', decided_at = now()
  → System checks: all required level-1 approvals done? YES (mode='any', 1 approval = done)
  → Level 2 row: status changes 'waiting' → 'pending', activated_at = now(), notification sent ✉

  ApprovalChainDisplay shows:
    ✓ Level 1: Team Lead    [APPROVED]
    ● Level 2: PM           [PENDING — awaiting decision]   ← current
    ○ Level 3: PMO Director [WAITING]
    Next approver shown on record: "Awaiting: PM — John Smith"

PM approves:
  → Level 2 row: approved
  → Level 3 row: 'waiting' → 'pending', notification sent ✉

PMO Director approves:
  → Level 3 row: approved
  → All levels complete → record TRANSITIONS TO LIVE automatically

If any authoriser REJECTS:
  → Their row = 'rejected'
  → All 'waiting' rows = 'withdrawn'
  → All other 'pending' rows at same level = 'withdrawn'
  → Record stays 'unauthorised'; submitter notified with rejection reason
  → Submitter can amend and re-submit (creates new submission_batch_id)

Config: level_approval_mode = 'all' at Level 2 (two PMs, both must approve):
  → Both PM rows start 'pending' simultaneously when Level 1 completes
  → Level 3 activates only after BOTH PMs approve
```

#### `record_archive_config` — table-specific archive override *(NEW — overrides all other retention settings)*

This table holds archive and retention settings for **specific tables** that need different periods from the org-wide default — most commonly due to regulatory, legal, or sector-specific compliance requirements. It is managed separately from `record_lifecycle_config` and can only be set by PMO Admin or System Admin.

```sql
CREATE TABLE record_archive_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
  table_name VARCHAR(100) NOT NULL,         -- the specific DB table this override applies to
                                            -- (same dropdown of 19 Category A + B tables)

  -- ── RETENTION OVERRIDES ────────────────────────────────────────────
  history_retention_days INTEGER
    CHECK (history_retention_days IS NULL OR history_retention_days > 0),
    -- NULL = inherit from record_lifecycle_config (do not override history retention)
    -- N    = records in History for this table auto-archive after N days
    --        regardless of any lifecycle config setting
  auto_archive_enabled BOOLEAN,             -- NULL = inherit; TRUE/FALSE = override
  archive_retention_years INTEGER
    CHECK (archive_retention_years IS NULL OR archive_retention_years > 0),
    -- NULL = inherit; N = flag for purge review after N years in Archive

  -- ── OVERRIDE JUSTIFICATION ─────────────────────────────────────────
  override_reason TEXT NOT NULL,
    -- Required — admin must document WHY this table has a different period.
    -- e.g. "GDPR Article 17 requires data minimisation after 90 days"
    --      "ISO 21502 §8 mandates 7-year project record retention"
    --      "Finance dept requires 5-year retention for cost-related records"
  regulatory_reference VARCHAR(255),
    -- Optional but recommended for audit purposes.
    -- e.g. "GDPR Art. 17", "ISO 21502:2022 §8.4", "Companies Act 2006 s.388"

  -- ── EFFECTIVITY ────────────────────────────────────────────────────
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    -- When this override takes effect (allows pre-scheduling retention changes)
  effective_until DATE,
    -- Optional end date. When reached, override becomes inactive and system
    -- falls back to record_lifecycle_config. Useful for temporary regulatory changes.

  is_active BOOLEAN DEFAULT TRUE,
  configured_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE (org_id, table_name)  -- one override row per table per org
);

CREATE INDEX idx_archive_config_org_table   ON record_archive_config(org_id, table_name);
-- Used by scheduled auto-archive job to find active overrides
CREATE INDEX idx_archive_config_active      ON record_archive_config(is_active, effective_from, effective_until)
  WHERE is_active = TRUE;
```

**How the override resolution works for `risks` as an example:**

```
Org default (record_lifecycle_config, project_id IS NULL, table='risks'):
  history_retention_days = 365    auto_archive = TRUE

record_archive_config for table='risks':
  history_retention_days = 2555   (7 years — ISO 21502 requirement)
  auto_archive_enabled   = TRUE
  regulatory_reference   = 'ISO 21502:2022 §8.4'
  effective_from         = 2026-01-01

Resolution:
  → history_retention_days = 2555  ← archive_config WINS (overrides 365)
  → auto_archive_enabled   = TRUE   ← archive_config WINS
  → archive_retention_years = NULL  ← not set in archive_config → inherits from lifecycle_config
```

**What a NULL field in `record_archive_config` means:**  
NULL in any override field = "do not override this setting for this table — inherit from `record_lifecycle_config`". This allows partial overrides: you can override only `history_retention_days` while leaving `auto_archive_enabled` and `archive_retention_years` to the standard config.

---

#### `record_lifecycle_logs`
```sql
CREATE TABLE record_lifecycle_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  record_type VARCHAR(100) NOT NULL,
  root_record_id UUID NOT NULL,   -- immutable identity; links all versions of same logical record
  record_id UUID NOT NULL,        -- the specific version UUID that was transitioned
  table_name VARCHAR(100) NOT NULL,
  from_status VARCHAR(30),
  to_status VARCHAR(30) NOT NULL,
  operation VARCHAR(30) NOT NULL,
  performed_by UUID REFERENCES users(id),
  reason TEXT,
  version_number INTEGER,
  snapshot_data JSONB,    -- record state at time of transition (for History/Archive)
  performed_at TIMESTAMP DEFAULT NOW()
);

-- Index on root_record_id enables: "show complete lifecycle of this logical record"
CREATE INDEX idx_record_lifecycle_logs_root ON record_lifecycle_logs(root_record_id);
CREATE INDEX idx_record_lifecycle_logs_record_type ON record_lifecycle_logs(record_type, root_record_id);
```

### Category A: Separate Table Pattern

For each Category A record type, create three physical tables:

```sql
-- Example: risks
-- Main table (live + unauthorised): schema stays the same as existing `risks` table
-- Rename existing table to risks_live (migration step)
ALTER TABLE risks RENAME TO risks_live;
ALTER TABLE risks_live ADD COLUMN record_status VARCHAR(30) DEFAULT 'live'
  CHECK (record_status IN ('live', 'unauthorised'));
ALTER TABLE risks_live ADD COLUMN root_record_id UUID;   -- set = id on creation; never changed
ALTER TABLE risks_live ADD COLUMN record_version INTEGER DEFAULT 1;
ALTER TABLE risks_live ADD COLUMN parent_record_id UUID; -- points to immediate predecessor's id

-- Seed root_record_id for all existing rows (they are their own root)
UPDATE risks_live SET root_record_id = id WHERE root_record_id IS NULL;
ALTER TABLE risks_live ALTER COLUMN root_record_id SET NOT NULL;

CREATE INDEX idx_risks_live_root_record_id ON risks_live(root_record_id);
CREATE INDEX idx_risks_live_record_status ON risks_live(record_status);

-- History table: same schema, status always 'history'
CREATE TABLE risks_history (LIKE risks_live INCLUDING ALL);
-- root_record_id carries over from the live version — this is the lineage link
CREATE INDEX idx_risks_history_root_record_id ON risks_history(root_record_id);

-- Archive table: same schema, status always 'archived'
CREATE TABLE risks_archive (LIKE risks_live INCLUDING ALL);
ALTER TABLE risks_archive ADD COLUMN archived_at TIMESTAMP;
ALTER TABLE risks_archive ADD COLUMN archived_by UUID REFERENCES users(id);
-- root_record_id carries over — still traceable after archive
CREATE INDEX idx_risks_archive_root_record_id ON risks_archive(root_record_id);

-- Unified view: cross-status list query AND record lineage query (follow to archive)
-- Both query types use this single view:
--   List query:    SELECT * FROM risks_all WHERE project_id = ? AND record_status = 'live'
--   Lineage query: SELECT * FROM risks_all WHERE root_record_id = ? ORDER BY record_version
CREATE VIEW risks_all AS
  SELECT *, record_status FROM risks_live
  UNION ALL
  SELECT *, 'history' AS record_status FROM risks_history
  UNION ALL
  SELECT *, 'archived' AS record_status FROM risks_archive;
```

> **Backward compatibility:** All existing application code that queries `risks` is updated to query `risks_live` (live records only — the default operational query). The `_all` view is used for the "All" tab, reporting, and record lineage queries.

> **root_record_id lifecycle rule:** When `amend_live_record()` or `reverse_record()` creates a new version, the new record's `root_record_id` is copied from the predecessor. The new record's `id` is a fresh UUID. The `parent_record_id` of the new record points to the predecessor's `id`. This three-field system (`root_record_id` + `record_version` + `parent_record_id`) gives both fast lineage lookup (by root) and step-by-step chain traversal (by parent).

### Category B: Status Column Pattern

```sql
-- Example: projects
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS record_status VARCHAR(30) DEFAULT 'live'
    CHECK (record_status IN ('unauthorised', 'live', 'history', 'archived')),
  ADD COLUMN IF NOT EXISTS root_record_id UUID,         -- immutable; set = id on creation
  ADD COLUMN IF NOT EXISTS record_version INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS parent_record_id UUID REFERENCES projects(id), -- immediate predecessor
  ADD COLUMN IF NOT EXISTS authorised_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS authorised_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;

-- Seed root_record_id for existing rows
UPDATE projects SET root_record_id = id WHERE root_record_id IS NULL;
ALTER TABLE projects ALTER COLUMN root_record_id SET NOT NULL;

CREATE INDEX idx_projects_record_status ON projects(record_status);
CREATE INDEX idx_projects_root_record_id ON projects(root_record_id);
-- Lineage query: SELECT * FROM projects WHERE root_record_id = ? ORDER BY record_version
-- Works entirely within this one table — no UNION needed for Category B.
```

### Key Database Functions

| Function | Purpose |
|---|---|
| `get_lifecycle_config(org_id, project_id, table_name)` | Returns fully resolved config applying the 4-level priority: (1) `record_archive_config` for retention fields → (2) project-specific `record_lifecycle_config` → (3) org-wide `record_lifecycle_config` → (4) system defaults. Returns `{ approvalEnabled, levelApprovalMode, historyRetentionDays, autoArchiveEnabled, archiveRetentionYears, archiveOverrideReason, archiveRegulatoryRef }`. |
| `get_archive_override(org_id, table_name)` | Returns the active `record_archive_config` row for a table, NULL if none. Checks `effective_from <= NOW()` and `effective_until IS NULL OR effective_until >= NOW()`. |
| `get_approval_chain(org_id, project_id, table_name)` | Returns the full ordered approval chain as an array of `{ level, authoriser_user_id, full_name, role_label }` — used to render `ApprovalChainDisplay` on capture forms and record detail views. |
| `submit_for_authorisation(table_name, record_id, root_record_id, submitted_by, notes)` | Reads approval chain → creates one request row per authoriser: Level 1 rows = 'pending' (notifications sent), Level 2+ rows = 'waiting'. Returns `submission_batch_id`. |
| `process_authoriser_decision(request_id, decision, notes)` | Marks authoriser row as approved/rejected. On approved: checks if current level is complete (per level_approval_mode) → if yes, activates next level rows ('waiting' → 'pending', notifications sent) → if last level complete, transitions record to live. On rejected: withdraws all waiting/pending rows, notifies submitter. |
| `get_approval_progress(submission_batch_id)` | Returns `{ levels: [{ level, label, authorisers: [{ name, status, decided_at }] }], current_level, next_approver_name, all_complete }` — drives `ApprovalChainDisplay` and the "next approver" banner. |
| `auto_archive_expired_history(table_name)` | Moves history records whose `moved_to_history_at + history_retention_days <= NOW()` to the archive table. Called by scheduled cron per applicable table. |
| `transition_record_status(table_name, record_id, operation, notes)` | Validates + executes status transition, logs to record_lifecycle_logs |
| `amend_live_record(table_name, record_id, new_data)` | Snapshots live → history, creates new record with same `root_record_id`, incremented `record_version` |
| `restore_history_record(table_name, record_id)` | Promotes history → live, demotes current live → history |
| `archive_history_record(table_name, record_id, reason)` | Moves history record → archive table |
| `get_record_lifecycle_chain(record_type, root_record_id)` | Returns all versions of a logical record ordered by `record_version` — queries `_all` view (Cat A) or single table (Cat B). **The "follow to archive" function.** |
| `get_current_version(record_type, root_record_id)` | Returns the single current live (or highest unauthorised) version of a logical record |

---

## SQL Files to Create

| File | Contents |
|---|---|
| `SQL/v651_record_lifecycle_infrastructure.sql` | Shared tables (record_authorisers, record_authorisation_requests, record_lifecycle_logs) — public schema |
| `SQL/v652_category_a_separate_tables.sql` | Rename + create _history + _archive tables for Category A (risks, issues, change_requests, tasks, defects). Create _all views. |
| `SQL/v653_category_b_status_columns.sql` | ALTER TABLE for all Category B tables (add record_status, record_version, parent_record_id, authorised_by, etc.) |
| `SQL/v654_lifecycle_functions.sql` | All DB functions (get_authoriser_count, transition_record_status, amend_live_record, restore_history_record, archive_history_record, **get_record_lifecycle_chain**, get_current_version) |
| `SQL/v655_lifecycle_rls_policies.sql` | RLS policies for all new tables and status-segregated tables |
| `SQL/v656_sim_lifecycle_mirror.sql` | Mirror of v651–v655 for sim schema |
| `SQL/v657_lifecycle_seed_migration.sql` | Seed authoriser templates + migrate all existing records to record_status = 'live' |

---

## Frontend Architecture

### New Shared UI Components (`src/components/ui/`)

| Component | Purpose |
|---|---|
| `RecordStatusBadge.jsx` | Colour pill: Unauthorised (amber), Live (green), History (blue-grey), Archived (slate) |
| `RecordStatusSelector.jsx` | Status selector bar: **Live is always the default active state**. User clicks to opt in to Unauthorised / History / Archive. Supports multi-select. Persists selection per page via `localStorage`. Displays count badges per status. |
| `RecordLifecycleToolbar.jsx` | Action buttons based on current status + user role |
| `RecordVersionHistory.jsx` | Collapsible side panel: full lineage timeline (queries `getRecordLifecycleChain` on expand — not on page load). Shows all versions ordered by `record_version`. |
| `AuthorisationRequestModal.jsx` | Submit for authorisation + approve/reject with comments. Includes the `ApprovalChainDisplay` inside so the submitting user sees exactly who will review their record before submitting. |
| `AuthorisationQueueWidget.jsx` | PMO/PM count badge widget showing pending requests |
| `ApprovalChainDisplay.jsx` | **Key new component.** Shows the full hierarchical approval sequence as a visual step chain. Each level shows: level number, role label, authoriser name, and status icon (Waiting / Pending / Approved ✓ / Rejected ✗). The **currently active level** is highlighted. A "Next approver:" banner shows the name of the next pending authoriser. Used in: (1) the submission modal before submitting, (2) the record detail view for Unauthorised records, (3) the Approval Queue page. |
| `HistoryRetentionBadge.jsx` | Shows on History records: "Auto-archives in 14 days" (or "No auto-archive" if disabled). Calculated from `moved_to_history_at + history_retention_days`. |

### New Services

`src/services/recordLifecycleService.js`:
- `getLifecycleConfig(orgId, projectId, tableName)` → returns resolved config `{ approvalEnabled, levelApprovalMode, historyRetentionDays, autoArchiveEnabled, archiveRetentionYears }`
- `getApprovalChain(orgId, projectId, tableName)` → returns ordered array `[{ level, authoriserUserId, fullName, roleLabel }]` — used by `ApprovalChainDisplay` on capture forms
- `saveLifecycleConfig(orgId, projectId, tableName, config)` → create/update `record_lifecycle_config`
- `saveApprovalChain(orgId, projectId, tableName, levels)` → replace authoriser chain — accepts array of `{ level, userIds[], roleLabel }`, replaces all existing rows for this table/scope
- `submitForAuthorisation(tableName, recordId, rootRecordId, notes)` → calls `submit_for_authorisation` DB fn; Level 1 rows = 'pending' + notifications sent, Level 2+ = 'waiting'; returns `submissionBatchId`
- `processDecision(requestId, decision, notes)` → calls `process_authoriser_decision`; on approve: checks level completion per `levelApprovalMode`, activates next level if done, transitions to live if final level; on reject: withdraws chain, notifies submitter
- `getApprovalProgress(submissionBatchId)` → returns `{ levels[], currentLevel, nextApproverName, allComplete }` — drives `ApprovalChainDisplay` live state
- `amendRecord(tableName, recordId, newData)` → history + new record
- `reverseRecord(tableName, recordId, reason)` → history + new unauthorised
- `restoreRecord(tableName, recordId)` → live
- `archiveRecord(tableName, recordId)` → archive
- `queryRecords(recordType, options)` → cross-status list query (default: live)
- `getStatusCounts(recordType, scopeFilter)` → count badges per status
- `getRecordLifecycleChain(recordType, rootRecordId)` → follow-to-archive lineage
- `getLifecycleLogs(tableName, recordId)` → full transition history
- `getAuthorisationQueue(userId)` → all pending request rows assigned to this authoriser

`src/services/sim/simRecordLifecycleService.js`:
- Mirrors all above using `simDb`
- Adds `simulateNPCAuthorisation(requestId, scenarioRules)` — NPC auto-approves/rejects based on scenario config, respecting `min_approvals_required`

---

## Sidebar Menu Additions

### Platform PMO (`src/config/pmoMenuConfig.js`)

New section **"Authorisation & Lifecycle"** (order 0.5) — full admin control:
```
Authorisation Queue          → /pmo/authorisation/queue
  (all records pending approval across all tables, grouped by level)
Lifecycle Dashboard          → /pmo/authorisation/dashboard
  (analytics: avg time-to-live, approval KPIs, rejection rates per table)
── Configuration ──
Configure Lifecycle Rules    → /pmo/authorisation/configure
  (table dropdown → approval chain builder → default retention → scope)
Approval Chains              → /pmo/authorisation/chains
  (read-only overview of all configured chains across all tables and scopes)
Archive Retention Rules      → /pmo/authorisation/archive-retention
  (table-specific archive override config — overrides all other retention settings)
  (shows table, history_retention_days override, regulatory_reference, effective dates)
  (PMO Admin / System Admin only — requires override_reason to save)
── Archive ──
Archive Vault                → /pmo/authorisation/archive
  (full-text cross-status search across all archived records, all tables)
```

### Platform PM (`src/config/pmDashboardMenuConfig.js`)

New section **"Authorisation"** (order 0.5) — action + visibility:
```
Pending My Approval          → /pm/authorisation/queue
  (records where I am the current active approver — my turn to act)
My Submitted Records         → /pm/authorisation/submitted
  (records I submitted, showing live approval chain progress and next approver name)
Approval Chains              → /pm/authorisation/chains
  (read-only view of configured chains for my projects — so PM knows who approves what)
```

> **Approval chain visible to PM:** On "My Submitted Records", every record shows the full `ApprovalChainDisplay` — the entire sequence from Level 1 to final level, with each step's current status and the name of the next pending approver. The PM does not need to chase anyone; they see it directly.

### Simulator PMO (`src/config/simulatorPMOMenuConfig.js`)

New section **"Practice Authorisation"** (order 0.5) — mirrors Platform PMO exactly at `/simulator/pmo/*` routes:
```
Authorisation Queue          → /simulator/pmo/authorisation/queue
Lifecycle Dashboard          → /simulator/pmo/authorisation/dashboard
Configure Lifecycle Rules    → /simulator/pmo/authorisation/configure
Approval Chains              → /simulator/pmo/authorisation/chains
Archive Retention Rules      → /simulator/pmo/authorisation/archive-retention
Archive Vault                → /simulator/pmo/authorisation/archive
```
*(Also fix existing `SlidersHorizontal` import bug in this file.)*

### Simulator PM (`src/config/simulatorPMMenuConfig.js`)

New section **"Practice Authorisation"** (order 0.5) — mirrors Platform PM at `/simulator/pm/*` routes:
```
Pending My Approval          → /simulator/pm/authorisation/queue
My Submitted Records         → /simulator/pm/authorisation/submitted
Approval Chains              → /simulator/pm/authorisation/chains
```

### Simulator TM (`src/config/simulatorTMMenuConfig.js`)

Add to existing **"My Work"** section:
```
My Submitted Records         → /simulator/tm/authorisation/submitted
  (TM can see chain progress + next approver name for their submitted records)
```

---

## Pages Required

| Page | Platform Route | Simulator Route |
|---|---|---|
| Authorisation Queue (PMO) | `/pmo/authorisation/queue` | `/simulator/pmo/authorisation/queue` |
| Lifecycle Dashboard (PMO) | `/pmo/authorisation/dashboard` | `/simulator/pmo/authorisation/dashboard` |
| Configure Lifecycle Rules (PMO) | `/pmo/authorisation/configure` | `/simulator/pmo/authorisation/configure` |
| Approval Chains Overview (PMO) | `/pmo/authorisation/chains` | `/simulator/pmo/authorisation/chains` |
| Archive Retention Rules (PMO) | `/pmo/authorisation/archive-retention` | `/simulator/pmo/authorisation/archive-retention` |
| Archive Vault (PMO) | `/pmo/authorisation/archive` | `/simulator/pmo/authorisation/archive` |
| Pending My Approval (PM) | `/pm/authorisation/queue` | `/simulator/pm/authorisation/queue` |
| My Submitted Records (PM) | `/pm/authorisation/submitted` | `/simulator/pm/authorisation/submitted` |
| Approval Chains (PM read-only) | `/pm/authorisation/chains` | `/simulator/pm/authorisation/chains` |

All existing list pages for Category A and B records additionally get `RecordStatusSelector` added.

**`ArchiveRetentionRulesPage` UI spec (key page — PMO/System Admin only):**
- **Table:** Lists all Category A + B tables (19 rows). Each row shows:
  - Table name (display label)
  - Effective history retention: computed value showing what the resolved override is (e.g. "2,555 days — overridden" in bold amber, or "365 days — from org config" in grey)
  - Override active: Yes/No badge
  - Regulatory reference (if set)
  - Effective from / until dates
  - Actions: Edit Override | Remove Override
- **Add/Edit Override modal:**
  - Table dropdown (same 19-table hardcoded list)
  - History retention days (number input — required if overriding)
  - Auto-archive toggle
  - Archive retention years (optional)
  - Override reason (text area — **required**, cannot save without it)
  - Regulatory reference (text input — optional but shown prominently)
  - Effective from date (date picker, defaults to today)
  - Effective until date (date picker — optional, leave blank for indefinite)
- **Warning banner on page:** "Settings on this page override all project and org-level retention config for the selected table. Changes take effect on the next scheduled auto-archive run."
- **Audit trail:** Every change to `record_archive_config` logged to `audit_log` with before/after values.

**`ConfigureLifecycleRulesPage` UI spec (key page — approval chain config):**
- **Step 1 — Select Table:** Dropdown of 19 applicable tables (Category A + B only, human-readable labels)
- **Step 2 — Approval Chain Builder:**
  - Add Level button: assigns a user, a role label (free text), and an approval level number
  - Drag-and-drop to reorder levels
  - Each level shows: Level N | Role Label | User Name | [Remove]
  - `level_approval_mode` toggle: "Any one at each level" / "All at each level"
- **Step 3 — History Retention:**
  - Toggle: "Auto-archive records after leaving Live" (maps to `auto_archive_enabled`)
  - When ON: "Retain in History for __ days" (number input, `history_retention_days`)
  - Optional: "Flag for purge review after __ years in Archive" (`archive_retention_years`)
- **Step 4 — Scope:**
  - "Apply org-wide" (default) or "Override for specific project" (project picker)
- Save / Cancel buttons with success confirmation

---

## Implementation Phases

### Phase 1 — Infrastructure (v640) ✅
- SQL v651–v657
- `recordLifecycleService.js` + `simRecordLifecycleService.js`
- Shared UI components (RecordStatusBadge, RecordStatusTabs, RecordLifecycleToolbar, RecordVersionHistory, AuthorisationRequestModal, AuthorisationQueueWidget)
- Authorisation Queue page (PMO + PM, Platform + Simulator)
- Configure Authorisers page
- Sidebar entries (all 5 config files)

### Phase 2 — Category B Records (v641) ✅
- Apply status tabs + lifecycle toolbar to: Projects, Mandates, Business Cases, Work Packages, Stage Plans, Decisions, Configuration Items, Benefits Review Plans

### Phase 3 — Category A Records (v642) ✅
- Apply separate-table pattern + `_all` views + status tabs to: Risks, Issues, Change Requests, Tasks, Defects
- Update all existing service queries to use `_live` table instead of base table name
- Update RLS policies on new tables

### Phase 4 — Reporting Records (v643) ✅
- Apply to: Highlight Reports, Exception Reports, End Stage Reports, Lessons Reports, Lessons Learned

### Phase 5 — Advanced Features (v644) ✅
- Archive Vault page (full-text cross-status search across all record types)
- Lifecycle Dashboard (analytics: transition counts, avg time-to-live, authorisation KPIs)
- Simulator NPC authoriser engine
- Compliance export (export all records of a type across all statuses to Excel/CSV)

---

## Todo List (Phase 1 — Complete)

### SQL
- [x] Write `SQL/v651_record_lifecycle_infrastructure.sql` (includes record_lifecycle_config, record_archive_config, record_authorisers, record_authorisation_requests, record_lifecycle_logs)
- [x] Write `SQL/v652_category_a_separate_tables.sql`
- [x] Write `SQL/v653_category_b_status_columns.sql`
- [x] Write `SQL/v654_lifecycle_functions.sql`
- [x] Write `SQL/v655_lifecycle_rls_policies.sql`
- [x] Write `SQL/v656_sim_lifecycle_mirror.sql`
- [x] Write `SQL/v657_lifecycle_seed_migration.sql`

### Services
- [x] Create `src/services/recordLifecycleService.js` (includes `queryRecords` [default Live] + `getStatusCounts` + `getRecordLifecycleChain` + `getRecordLifecycleLogs`)
- [x] Create `src/services/sim/simRecordLifecycleService.js`

### UI Components
- [x] Create `src/components/ui/RecordStatusBadge.jsx`
- [x] Create `src/components/ui/RecordStatusSelector.jsx` (Live default; opt-in multi-select; count badges; localStorage persistence)
- [x] Create `src/components/ui/RecordLifecycleToolbar.jsx`
- [x] Create `src/components/ui/RecordVersionHistory.jsx`
- [x] Create `src/components/ui/AuthorisationRequestModal.jsx` (includes ApprovalChainDisplay so submitter sees full chain before submitting)
- [x] Create `src/components/ui/AuthorisationQueueWidget.jsx`
- [x] Create `src/components/ui/ApprovalChainDisplay.jsx` (hierarchical step chain: level/role/name/status; highlights current active level; shows next approver banner)
- [x] Create `src/components/ui/HistoryRetentionBadge.jsx` (shows countdown to auto-archive on History records)

### Pages (Platform)
- [x] Create `src/pages/pmo/AuthorisationQueuePage.jsx`
- [x] Create `src/pages/pmo/LifecycleDashboardPage.jsx`
- [x] Create `src/pages/pmo/ConfigureLifecycleRulesPage.jsx` (4-step wizard: table dropdown → approval chain builder with drag-and-drop level ordering → history retention period + auto-archive toggle → scope selector org-wide/project)
- [x] Create `src/pages/pmo/ApprovalChainsOverviewPage.jsx` (read-only overview of all configured chains across tables and scopes)
- [x] Create `src/pages/pmo/ArchiveRetentionRulesPage.jsx` (table list showing resolved retention, Add/Edit/Remove override modal, requires override_reason to save, audit trail on every change)
- [x] Create `src/pages/pmo/ArchiveVaultPage.jsx`
- [x] Create `src/pages/pm/PendingApprovalsPage.jsx` (shows records where I am the current active approver; ApprovalChainDisplay per record)
- [x] Create `src/pages/pm/MySubmittedRecordsPage.jsx` (shows my submitted records with full chain progress and "Next approver: Name" banner)
- [x] Create `src/pages/pm/ApprovalChainsPage.jsx` (PM read-only view of configured chains for their projects)

### Pages (Simulator)
- [x] Create `src/pages/sim/pmo/SimAuthorisationQueuePage.jsx`
- [x] Create `src/pages/sim/pmo/SimLifecycleDashboardPage.jsx`
- [x] Create `src/pages/sim/pmo/SimConfigureLifecycleRulesPage.jsx`
- [x] Create `src/pages/sim/pmo/SimApprovalChainsOverviewPage.jsx`
- [x] Create `src/pages/sim/pmo/SimArchiveRetentionRulesPage.jsx`
- [x] Create `src/pages/sim/pm/SimApprovalChainsPage.jsx`
- [x] Create `src/pages/sim/pmo/SimArchiveVaultPage.jsx`
- [x] Create `src/pages/sim/pm/SimPendingApprovalsPage.jsx`
- [x] Create `src/pages/sim/pm/SimMySubmittedRecordsPage.jsx`

### Sidebar Config Files
- [x] Update `src/config/pmoMenuConfig.js` — add Authorisation & Lifecycle section (Queue, Dashboard, Configure Lifecycle Rules, Approval Chains, Archive Vault)
- [x] Update `src/config/pmDashboardMenuConfig.js` — add Authorisation section (Pending My Approval, My Submitted Records, Approval Chains)
- [x] Update `src/config/simulatorPMOMenuConfig.js` — add Practice Authorisation + fix SlidersHorizontal import bug
- [x] Update `src/config/simulatorPMMenuConfig.js` — add Practice Authorisation section
- [x] Update `src/config/simulatorTMMenuConfig.js` — add My Submitted Records to My Work

### Tests
- [x] Unit tests for `recordLifecycleService.js` (all transitions, bypass logic, hierarchical level activation, level_approval_mode='any' vs 'all', rejection cascade, history retention countdown, lineage chain correctness)
- [x] Write `SQL/v658_auto_archive_cron.sql` — scheduled function `auto_archive_expired_history` + pg_cron job (daily at midnight). Function resolves retention per table using 4-level priority (record_archive_config first), then moves expired History records to Archive. Also checks `effective_until` on overrides to auto-expire them.
- [x] Write `SQL/v659_archive_config_audit_trigger.sql` — trigger on `record_archive_config` that logs every INSERT/UPDATE/DELETE to `audit_log` with before/after JSONB values
- [x] Unit tests for `simRecordLifecycleService.js`

---

## Review Section

**Completed:** 2026-05-27

### Summary

Record Lifecycle Management (v639) is implemented end-to-end for Platform and Simulator parity:

| Layer | Deliverables |
|---|---|
| **SQL** | `v651`–`v659`, `v662` — infrastructure, Category A/B columns, DB functions, RLS, sim mirror, migration, auto-archive cron, audit trigger |
| **Services** | `recordLifecycleService.js`, `simRecordLifecycleService.js` (+ NPC authorisation helper) |
| **UI** | 8 shared components under `src/components/ui/` |
| **Module** | `src/modules/record-lifecycle/` — shared pages + routes wired in `App.jsx` |
| **Menus** | `recordLifecycleMenuRegistry.js` merged into `menuRegistry.js`; legacy menu configs updated; cache `v23` |
| **List integration** | `RecordStatusSelector` on Risks, Issues, Projects; reusable `useRecordLifecycleFilter` + `RecordLifecycleListHeader` for remaining Category A/B pages |
| **Tests** | 5 platform + 2 simulator unit tests passing |

### Design decisions

1. **Category A live tables keep original names** (`risks`, not `risks_live`) for backward compatibility with existing services.
2. **`project_decisions`** used instead of `decisions` (actual DB table name).
3. **Account scoping** uses `account_id` (existing schema) rather than `org_id` from the plan draft.
4. **Configure Lifecycle Rules** ships as a functional form (table + retention + approval toggle); drag-and-drop chain builder can be enhanced incrementally.

### Manual steps

1. Run SQL `v651` through `v659` in Supabase (public + sim schemas).
2. Hard-refresh after deploy (menu cache `nidus_menu_v23_` / `nidus_sim_menu_v23_`).
3. Apply remaining Category A/B list integrations using `useRecordLifecycleFilter` + `applyRecordStatusFilter` pattern (see `Risks.jsx`, `Issues.jsx`, `Projects.jsx`).
