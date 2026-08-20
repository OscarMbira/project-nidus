# v827 — Standards-Based Global Template Parity (form_template domain)

## Goal
The Global Template Library shows "0 of 410 templates" when filtered to Standards-Based
methodology, because Standards-Based never got a real template catalog — only `structured`
and `agile` did (`SQL/v786_structured_agile_form_template_seeds.sql`, generated from Admin's
`v189*`/`v191*` GTL seeds). User asked to create Global Templates for Standards-Based.

## Investigation summary
- Traced whether Standards-Based's original content (`F001`-`F068`, PMBOK-style process-group
  categories, backfilled to `methodology='pmbok'`→`'standards_based'` by Admin's `v185c`/`v196`)
  could be found and re-synced from SQL. **Dead end**: no Admin SQL file contains a bulk seed of
  `form_template` domain rows outside the `v189*`/`v191*` (Structured/Agile) family — the largest
  non-Structured/Agile file has 13 matches, nowhere near a 68+ template catalog. That content
  most likely only ever existed as live rows, authored through the Admin app UI directly, never
  captured in a versioned migration. No DB access in this session to query it directly either.
- User chose the fallback: **clone Structured's existing `form_template` masters as Standards-Based
  variants** (same generic content, re-tagged), rather than block on recovering the original
  PMBOK-specific content.
- Confirmed via schema: `pm_template_nodes.account_id` is `NOT NULL` — Global masters are
  duplicated **per account**, not a shared singleton. `SQL/v785_project_template_domain_and_methodology.sql`
  is the source of truth for the `methodology` column + its `CHECK` constraint (now
  `'pmbok'|'structured'|'agile'`, later `'standards_based'` per `v798`).

## Design
`SQL/v828_standards_based_form_template_clone.sql` (public + sim schemas), idempotent PL/pgSQL:
- For every `pm_template_nodes` row where `is_system_synced=true, is_current=true,
  methodology='structured', domain='form_template'` (across every account that has one):
  1. Clone its `form_templates` row — new `F0xx` code (next available, recomputed per iteration),
     name `REPLACE('... (Structured)', '(Standards-Based)')`.
  2. Clone its current `form_template_versions` row (same schema JSON) as version 1 of the new
     form_templates row.
  3. Insert a new `pm_template_nodes` row: same `account_id`/`tier`/`scope_entity_type`/
     `scope_entity_id`/`category`/`status`/`created_by` as the source, `domain_ref_id` = the new
     cloned form row, `methodology='standards_based'`, `is_system_synced=true`, `is_current=true`,
     **`parent_node_id=NULL`** (a genuine sibling Global master, not a fork of Structured —
     matches how Structured/Agile are independent of each other, not derived from one another;
     the table's own `CHECK` constraint already permits `parent_node_id IS NULL` whenever
     `is_system_synced=true`).
  4. Link the new form_templates row's `pm_template_node_id` back to the new node.
- **Idempotency**: before cloning, skip if a `standards_based` node with the same computed name +
  tier + account already exists — safe to re-run.

## Explicitly out of scope (this pass)
- `process_template` domain (the "Closing Process Master 01-08" family) — spread across ~24
  different tables via a polymorphic `process_template_node_links` lookup
  (`packages/shared/src/services/pmTemplateCopyService.js`'s `PROCESS_TEMPLATE_TABLES` list); the
  risk of an unverified migration touching that many table shapes without live DB access to test
  against was judged too high for this pass. Flagged as a follow-up.
- `opa`, `fields`, `portfolio_template`, `programme_template`, `project_template` domains — same
  reasoning; `form_template` is the domain the user's screenshot showed and the one with the
  clearest, single-table cloning path.
- Recovering the *original* PMBOK-specific `F001`-`F068` content — establishing that path would
  require live database access this session doesn't have, or Admin-repo work to properly export
  it first.

## Todo
- [x] `SQL/v828_standards_based_form_template_clone.sql` — public + sim, idempotent
- [ ] Review the generated SQL carefully (this session cannot execute it against the live DB)
- [ ] User runs it against Supabase and confirms row counts / verifies in the Global Template
      Library UI

## Review

**Status: SQL written, NOT executed — this session has no live database access, so it could
not be run or verified against real data. Manual review before running is strongly advised.**

**What it does:** for every existing `pm_template_nodes` row where `is_system_synced=true,
is_current=true, methodology='structured', domain='form_template'` (across every account that
has one — Global masters are per-account rows, confirmed via `account_id NOT NULL`), clones:
1. Its `form_templates` row → new sequential `F0xx` code, name with "(Structured)" swapped for
   "(Standards-Based)".
2. Its current `form_template_versions` schema (verbatim — same fields, same content, just
   relabelled).
3. A new `pm_template_nodes` row: same account/tier/scope/category/status, `methodology=
   'standards_based'`, `parent_node_id=NULL` (an independent sibling master, not a fork of
   Structured — matches how Structured and Agile are independent of each other).

Skips (idempotent) anything that already has a matching Standards-Based clone by
account+tier+name, and skips any source template that has no current version content rather
than clone an empty form.

**Deliberately scoped to `form_template` domain only.** `process_template` (the "Closing
Process Master" family) needs a polymorphic lookup across ~24 different tables
(`pmTemplateCopyService.js`'s `PROCESS_TEMPLATE_TABLES`) whose exact shapes this session
couldn't verify without live DB access — attempting it blind risked a broken migration. Noted
as a follow-up, not silently dropped.

**Risk note for the user:** this was written from schema evidence gathered by reading SQL
migration files, not from a live connection — there was no way to execute or dry-run it in this
session. Please review the file itself before running, and consider running it against a
staging/backup copy first given it inserts new rows across every account with a Structured
template. If it errors on a column name or constraint this session didn't have visibility into,
that's the most likely failure point — the loop structure and idempotency check are otherwise
straightforward.

**Left for the user:** run `SQL/v828_standards_based_form_template_clone.sql`, then reload the
Global Template Library page filtered to Standards-Based and confirm templates now appear.

## Correction — v828 superseded
Tracing `admin.publish_global_template` (in response to the user asking whether these templates
would also be visible to Admin) revealed `v828`'s approach was built on an incomplete model of
the sync mechanism: `form_templates` content for `form_template` domain is upserted **by
`payload->>'template_code'`** via `_sync_global_form_template_catalog`, and Admin only
recognises a `pm_template_nodes` row as its own via `source_global_template_id` (added `v765`) —
neither of which `v828`'s hand-rolled inserts produced. `v828` is now marked
**superseded/do-not-run** in place (not deleted, so the investigation trail stays intact).

**Corrected fix lives in the Admin repo**, since it has to start at
`admin.global_template_library` and drive the real `admin.publish_global_template()` RPC:
`E:\project-nidus-admin\SQL\v198_standards_based_global_template_clone.sql` /
`E:\project-nidus-admin\projectplans\v197_standards_based_global_template_clone_plan.md`. See
that plan for the corrected design and review notes.

**Status: user-confirmed both `v196_rename_pmbok_methodology_to_standards_based.sql` and
`v198_standards_based_global_template_clone.sql` ran successfully against Supabase.**
Standards-Based `form_template` Global Templates now exist via the real publish pipeline
(`source_global_template_id` set, visible/manageable in Admin). `process_template` domain
remains explicitly out of scope (see above). Next: verify in the Global Template Library UI
(Platform/Simulator) that Standards-Based templates now appear in the Template Library /
Organisational Templates pages when filtered to that methodology.
