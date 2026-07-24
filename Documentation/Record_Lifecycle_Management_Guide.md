# Record Lifecycle Management — Implementation Guide

**Version:** v639  
**Date:** 2026-05-27

## Overview

Universal record flow: **Unauthorised → Live → History → Archive** for Category A (high volume) and Category B (status column) tables.

## SQL sequence

Run in order in Supabase:

1. `SQL/v651_record_lifecycle_infrastructure.sql`
2. `SQL/v652_category_a_separate_tables.sql`
3. `SQL/v653_category_b_status_columns.sql`
4. `SQL/v654_lifecycle_functions.sql`
5. `SQL/v655_lifecycle_rls_policies.sql`
6. `SQL/v656_sim_lifecycle_mirror.sql`
7. `SQL/v657_lifecycle_seed_migration.sql`
8. `SQL/v658_auto_archive_cron.sql`
9. `SQL/v659_archive_config_audit_trigger.sql`
10. `SQL/v662_record_lifecycle_menu_registry.sql`
11. `SQL/v750_record_pending_changes_infrastructure.sql`
12. `SQL/v751_record_lifecycle_defer_apply_functions.sql`
13. `SQL/v752_sim_record_lifecycle_defer_apply_functions.sql`

## Routes

| Role | Platform | Simulator |
|---|---|---|
| PMO | `/pmo/authorisation/*` | `/simulator/pmo/authorisation/*` |
| PM | `/pm/authorisation/*` | `/simulator/pm/authorisation/*` |
| TM | — | `/simulator/tm/authorisation/submitted` |

## List page integration

Add to any Category A/B list page:

```jsx
import RecordLifecycleListHeader from '../components/ui/RecordLifecycleListHeader'
import useRecordLifecycleFilter from '../hooks/useRecordLifecycleFilter'
import { applyRecordStatusFilter } from '../utils/lifecycleListUtils'

const { statusFilter, setStatusFilter, counts } = useRecordLifecycleFilter('risks', { projectId })
// In query: applyRecordStatusFilter(query, statusFilter)
```

## Registry

Table mappings: `src/config/recordLifecycleRegistry.js`

## Approval justification and field lock (v751)

When an authoriser reviews a pending request in **Record Lifecycle → Pending Approvals**, the decision modal requires a **mandatory justification** before Approve or Reject is enabled. The reason is passed to `process_authoriser_decision` for audit.

While a governed record has `record_status = 'unauthorised'`, its detail/edit forms are **read-only**:

- Risk, Issue, and Project detail pages show a lock banner and disable Edit (and other mutating actions where applicable).
- Risk/Issue edit modals and the Project edit page wrap fields in a disabled `<fieldset>` so no further data changes can be saved until the authorisation queue item is decided.

### Defer-apply staging (v752)

When lifecycle approval is active for a table, field edits on pilot governed records (`risks`, `issues`, `projects`; simulator `practice_risks`) are **not written to the live row immediately**. Instead:

1. Changed columns are stored in `record_pending_changes.proposed_changes` (new values).
2. The live row keeps last-approved values; only `record_status` moves to `unauthorised`.
3. Authorisers see a **Current vs Proposed** diff in the Pending Approvals review modal.
4. **Approve** merges proposed values onto the live row (`transition_record_status` → `validate`).
5. **Reject** discards pending changes and restores the previous status without altering approved field values.

Helper: `@nidus/shared/utils/lifecycleGovernedUpdate` (`tryGovernedLifecycleUpdate`).

### Manual test checklist

1. Open a pending item in the authorisation queue → Approve/Reject stay disabled until justification is entered.
2. Confirm **Current vs Proposed** diff appears for a deferred edit.
3. Open a Risk/Issue/Project in `unauthorised` status → lock banner visible, Edit disabled, form fields not editable; displayed values match last-approved data.
4. After approve → proposed values visible on record (`live`). After reject → prior values unchanged (`live`).
