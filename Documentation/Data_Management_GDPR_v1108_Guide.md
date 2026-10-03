# Data Management (GDPR Compliance Suite) — v1108

**Applies to:** Platform (`apps/platform`), Simulator (`apps/simulator`)
**Related:** `projectprd/v1108_data_management_gdpr_PRD.md`,
`projectplan/v1108_data_management_gdpr_plan.md`

## What this adds

PMO Admin's Data Management tab (previously a placeholder) now wires up a real GDPR compliance
suite, built on a substantial module that had existed in the codebase since early on but was never
routed anywhere:

1. **Admin dashboard** (Platform: `/platform/pmo-admin/data-management`; Simulator:
   `/simulator/admin/data-management`) — PMO Admin / Account Owner view consent logs, process
   pending data export and deletion requests, and log/track data breach incidents. Stat cards at
   the top are clickable straight into the matching filtered tab (rule 64).
2. **Self-service Privacy Center** (Platform: new "Privacy" tab on Settings, routed to
   `/platform/settings/privacy`; Simulator: `/simulator/settings/privacy`, reached from the header
   avatar menu's Settings link) — any user can manage their own consent, request an export of
   their own data, or request deletion (anonymization) of their own account.

## Two bugs fixed along the way

1. **RLS checked a role that no longer exists.** The original `v54` policies checked
   `role_name = 'System Admin'`; today's equivalent is `'PMO Admin'`. Fixed in `SQL/v1119` with a
   new `is_pmo_admin_or_owner_for_account()` helper (SECURITY DEFINER + `row_security = off`, the
   established safe pattern for this codebase's long history of RLS-recursion bugs).
2. **The service layer wrote the raw Supabase auth UUID into columns FK'd to `public.users.id`.**
   `created_by`/`updated_by`/`processed_by`/`deleted_by` previously came straight from
   `supabase.auth.getUser().id`. Fixed by resolving through `getCurrentUserInternalUserId()`
   first (`apps/platform/src/utils/accountResolution.js` — an existing, already-de-duped helper).
   The self-service `PrivacyCenter.jsx` page had the identical bug in its own calls and got the
   same fix.

## Data model

- `public.consent_logs` / `data_processing_records` / `data_export_requests` /
  `data_deletion_requests` / `privacy_preferences` / `data_breach_records` — the original `v54`
  tables, each gained an `account_id` column (`SQL/v1119`) so RLS can check "same account" directly
  instead of reverse-resolving a target user's account on every row read.
- `public.gdpr_export_registry` (`SQL/v1120`) — data-driven list of Tier-1 modules
  (module_name, table_name, owner_columns\[\]) that `generateDataExportFile()` /
  `anonymizeUserData()` walk. **Add a row to extend coverage — no `gdprService.js` code change
  needed.** Seeded with Risks, Issues, Changes, Assumptions, Constraints, Daily Log entries,
  Lessons.
- `sim.*` mirrors of all six tables plus `sim.practice_gdpr_export_registry` (`SQL/v1121`) — a
  genuinely new capability for Simulator (it never had any of this before).
- Sim schema identity quirk: `sim.consent_logs`/`data_export_requests`/`data_deletion_requests`/
  `privacy_preferences.user_id` reference `auth.users(id)` **directly** (matching
  `sim.practice_projects`' own convention), not `public.users.id` like Platform's equivalents.
  `sim.practice_gdpr_export_registry` additionally carries an `owner_identity_space` column
  (`'auth_user'` | `'internal_user'`) per row, because even Simulator's own Tier-1 module tables
  aren't consistent with each other — `practice_risks`/`practice_issues`/`practice_change_requests`/
  `practice_daily_log_entries`/`practice_lesson_entries` key off `auth.users(id)` directly, while
  `sim.assumptions`/`practice_constraints` key off `public.users(id)`. `simGdprService.js` resolves
  the right identity value per row using this flag — see its header comment before touching it.
- `Cancel request` — new capability not in the original module: a user can cancel their own
  pending deletion request within the 30-day grace period (`cancelDataDeletionRequest`).

## Running the SQL

Run in order against Supabase (SQL editor, pgAdmin, or DBeaver):

1. `SQL/v1119_gdpr_rls_and_access_fix.sql` — fixes RLS + adds `account_id` on all 6 `public`
   GDPR tables (backfilled from existing rows).
2. `SQL/v1120_gdpr_export_deletion_registry.sql` — `public.gdpr_export_registry` + Tier-1 seed.
3. `SQL/v1121_sim_gdpr_compliance_schema.sql` — the 6 `sim.*` tables + `sim.
   practice_gdpr_export_registry` + Tier-1 seed, new capability.
4. `SQL/v1122_sim_data_management_menu.sql` — Simulator sidebar entry (`sim_sys_data_mgmt`) under
   the existing `sim_sec_knowledge` section, granted to `sim_pmo_admin` (and `simulator_admin` via
   its existing wildcard grant).

### Verify

```sql
-- Every export/deletion request row should now have an account_id
select id from public.data_export_requests where account_id is null;
select id from public.data_deletion_requests where account_id is null;
-- Should return 0 rows for accounts that existed before v1119 ran
```

## Tests

- `apps/platform/src/services/__tests__/gdprService.test.js` (5 tests)
- `apps/simulator/src/services/sim/__tests__/simGdprService.test.js` (4 tests)

Both cover: `created_by` resolving to the internal user id (not the raw auth uid), the
registry-driven export including Tier-1 module rows scoped to the right person, and
anonymization nulling out Tier-1 owner columns for the target user while leaving other users'
rows untouched. The Simulator suite additionally covers the mixed `owner_identity_space`
resolution (one `auth_user`-keyed module, one `internal_user`-keyed module, in the same test).

## Known gaps (out of scope, documented in the PRD)

- Full exhaustive (30-50+ table) export/deletion coverage — only the confirmed Tier-1 list ships;
  the registry design allows extending it later.
- Automated breach notification workflows (this ships logging/tracking only).
- Automatic scheduled processing of the 30-day deletion grace period — a PMO Admin must manually
  process it once elapsed.
