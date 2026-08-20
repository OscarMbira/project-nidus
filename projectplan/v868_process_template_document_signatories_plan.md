# v868 — Process Template Document Signatories — Implementation Plan

**PRD:** `projectprd/v868_process_template_document_signatories_PRD.md`
**Status:** ✅ Implemented (code + tests + docs complete). Manual deployment steps remain — see Review section.
**Repos touched:** `E:\project-nidus` (monorepo — Platform + Simulator) and `E:\project-nidus-admin` (ID Generation seed only).
**Precedent this follows:** `projectplan/v867_process_template_document_attachments_plan.md` — same document-level linking pattern (`pm_template_nodes.id`), same shared-service-file placement, same corrected RLS helpers this session just fixed (`auth_user_can_access_project` / `sim.auth_user_can_access_practice_project`, **not** a raw `user_projects.user_id = auth.uid()` comparison — see v866d's fix comment for why that's wrong).

---

## Design recap (see PRD §d for the full decision table)

- **Two-table config/instance split**: PMO Admin configures an ordered, role-labelled slot list **per (account, document type)** once; each actual document gets its own **signing instance** rows that snapshot the slot labels and track who's assigned + their status.
- **Signing rounds, not overwrites**: a decline-and-restart increments `signing_round` and inserts fresh rows rather than mutating prior ones — full audit history for free, mirrors `process_template_attachments`'s version-history style.
- **Lock state is computed**, not a stored column — "fully signed" = every current-round slot for a node has `status = 'signed'`. No schema change to any of the 24 content tables.
- **Two separate storage concerns, cleanly separated:**
  1. `user_signature_images` (public schema only, keyed by `auth_user_id`, **owner-only RLS**) — a personal, reusable "my saved signature" convenience asset. Not sim-mirrored (a signature belongs to the person, not the app).
  2. Each **signing event** copies the image (saved or freshly uploaded) into the document's own signature storage (bucket `process-template-signatures`, path scoped to `{mode}/{template_node_id}/{signing_round}/{slot_order}-signature.{ext}`), with its own `storage_path` column on `process_template_document_signatories`. This avoids ever needing to grant other viewers read access to someone's private `user_signature_images` row — matches the self-contained-storage-path pattern already used by `process_template_attachments`.
- **Two different write-permission tiers on the same table** — this is the one genuinely new RLS shape vs. v867:
  - *Assigning* who fills a slot (picking `assigned_user_id`, before it's signed): project-membership check, same OR-pattern as `process_template_attachments` (project membership via the corrected helper, OR `can_manage_pm_template_node()` for non-project-scoped nodes).
  - *Signing or declining* a slot: **only the assigned signatory themselves** — `assigned_user_id`'s `auth_user_id = auth.uid()`. A SECURITY DEFINER helper (`auth_user_is_assigned_signatory(row_id)`, following the exact v866e precedent for avoiding RLS-recursion fragility) will express this.
  - Exact policy split (single `FOR ALL` policy with a compound `WITH CHECK`, vs. separate `UPDATE` policies keyed off which columns changed) is a build-time SQL detail — Postgres RLS can't easily branch per-column, so the more likely shape is: one write policy allowing project members to write when `status = 'pending'` and only touching `assigned_user_id`, and a second, narrower policy allowing only the assigned signatory to transition `status` from `pending` to `signed`/`declined`. Finalise during implementation, verify with the same live-testing discipline that caught the v866/v866b/v866d bugs (don't trust the first draft — test against a real logged-in user before declaring done).

## SQL (monorepo — `SQL/`)

- [x] `SQL/v868_process_template_signatories_tables.sql` — three new tables (public + sim mirrors where noted):
  - `public.process_template_signatory_requirements` / `sim.process_template_signatory_requirements` — `account_id`, `document_table` (CHECK constrained to the 24-value list from `PROCESS_TEMPLATE_TABLES`), `slot_order`, `role_label`, `is_active`, `is_deleted`, audit columns. Unique on `(account_id, document_table, slot_order)` where not deleted. Write RLS: PMO Admin only (reuse `is_pmo_admin_user()`, same helper as `v406`/`v841`). Select RLS: `user_has_access_to_account(account_id)`.
  - `public.process_template_document_signatories` / `sim.*` — `template_node_id` (FK `pm_template_nodes.id`), `signing_round`, `slot_order`, `role_label` (snapshotted), `assigned_user_id`, `status` (`pending`/`signed`/`declined`), `storage_bucket`/`storage_path`/`file_name`/`mime_type`/`file_size` (signature copy), `signed_at`, `declined_at`, `decline_reason`, `display_id`, audit columns. Unique on `(template_node_id, signing_round, slot_order)`. "Current round" = `MAX(signing_round)` per `template_node_id`, computed in queries — no `is_current` flag needed. RLS: single self-contained `UPDATE` policy with an internal OR (see Review below — deliberately **not** two separate permissive policies), plus a `NOT EXISTS` clause enforcing sequential turn order at the DB layer.
  - `public.user_signature_images` — `auth_user_id` (unique), `account_id` (for SELECT-scoping only), `storage_path`, `file_name`, `mime_type`, `file_size`, timestamps. RLS: owner-only for both read and write.
  - `database_tables` registry rows for all three.
- [x] `SQL/v868b_process_template_signatories_storage_rls.sql` — two new buckets, both created directly via `INSERT INTO storage.buckets` (the v866e approach, not a manual Dashboard step):
  - `process-template-signatures` (private, images only, 2MB, path `{mode}/{template_node_id}/{signing_round}/{slot_order}/signature.{ext}`) — write restricted to the assigned signatory only (via `SECURITY DEFINER` helper, including the same sequential-turn `NOT EXISTS` check as the table policy), read via account access.
  - `user-signatures` (private, images only, 2MB, path `{auth_user_id}/...`) — owner-only, simple direct `auth.uid()` path comparison, no helper function needed.
- [x] `SQL/v868c_process_template_signatories_display_id_trigger.sql` — `trg_apply_admin_display_id` wired to `process_template_document_signatories.display_id` only.
- [x] `SQL/v868d_process_template_signatories_menu.sql` — sidebar menu rows (see below; notifications ended up living in the app layer, not a DB trigger — see Review).

## Admin repo SQL (`E:\project-nidus-admin\SQL\`)

- [x] `E:\project-nidus-admin\SQL\v204_process_template_signatories_id_generation_seed.sql` — `SIG`/`SSIG` with fallback candidates, same defensive pattern as `v203`.

## Platform + Simulator

- [x] `packages/shared/src/services/processTemplateSignatoryService.js` — single shared file. Full API implemented as planned, plus `resolveDocumentSignaturesForExport` (mirrors v867's export-resolution function) and `getSignatureSignedUrl`.
- [x] `apps/platform/src/components/ui/SignatoriesPanel.jsx` + `apps/simulator/...` — implemented as planned. Simulator's team-member source is `getSimProjectMembers()` (via `sim.practice_project_memberships`), not `public.user_projects` — see Review.
- [x] `apps/platform/src/components/ui/SignatureCaptureControl.jsx` + `apps/simulator/...` — implemented as planned, identical in both apps.
- [x] PMO Admin settings surface: `SignatoryRequirementsPage.jsx` (`packages/modules/pmo-module/src/pages/` + `sim-pmo-module/src/pages/`), a new standalone page (not a tab on Organisational Templates) at `/app/pmo/signatory-requirements` (Platform) and `/simulator/pmo/organisational-templates/signatory-requirements` (Simulator), wired into the sidebar via `v868d`'s menu SQL under the same `plat_sec_templates`/`sim_sec_templates` section as Organisational Templates, PMO Admin/System Admin/Account Owner roles only.
- [x] `OrganisationalTemplateDetailPage.jsx` (both copies) — third "Signatories" tab added via an extended `DetailAuditTabList` (`extraTab` prop, optional, so every other 2-tab caller is unaffected); `isFullySigned` computed and passed to a `<fieldset disabled>` wrapping Document details plus `<DocumentAttachmentsPanel disabled>`; "Signatures" export section wired into `exportSections`/`exportRecord`/`attachmentAssets` exactly like Attachments.
- [x] Notifications: implemented at the **component** layer (`SignatoriesPanel.jsx`'s own `notify()` helper using `platformDb` directly), not the service layer or a DB trigger — see Review for why.

## Tests

- [x] `packages/shared/src/services/__tests__/processTemplateSignatoryService.test.js` — 13 tests, all passing. Registered in `packages/shared/vitest.config.js`'s explicit `include` list.
- [x] `SignatoriesPanel.test.jsx` (Platform: 7 tests, Simulator: 4 tests) — all passing.
- [x] Regression: `DocumentAttachmentsPanel.test.jsx` re-run for both apps after this landed — still passing, no interference.
- [ ] Requirement-configuration screen tests — **not completed**, see Review (pmo-module has no jsdom test infrastructure).
- [ ] Manual live-testing checklist — **not yet run by the user**; see Review's "Manual steps still required" section for the exact walkthrough.

## Documentation

- [x] `Documentation/Process_Template_Document_Signatories_v868_Guide.md` — cross-linked from the v867 guide in both directions.

---

## Review section

### Summary

Implemented in full: schema (3 new tables across public+sim, append-only signing-round history), storage + RLS (2 new buckets, both with in-file bucket creation rather than manual steps), Admin ID Generation, a new `SignatoriesPanel.jsx`/`SignatureCaptureControl.jsx` pair (Platform + Simulator), a new PMO Admin settings page for configuring requirements, full wiring into both `OrganisationalTemplateDetailPage.jsx` copies (tab, lock state, export), and in-app notifications. 24 new automated tests pass (13 service + 7 Platform panel + 4 Simulator panel), plus a regression check of the existing v867 attachment tests confirmed no interference.

### Corrections made during implementation (all resolved or explicitly flagged, not left as silent gaps)

1. **RLS learned from v867's mistake, applied correctly from the start** — used `auth_user_can_access_project()`/`sim.auth_user_can_access_practice_project()` (not a raw `user_projects.user_id = auth.uid()` comparison) for the assignment-tier permission check, and `SECURITY DEFINER` helper functions throughout (matching v866e's proven pattern) rather than inline correlated subqueries in storage policies.
2. **Sequential turn-taking is enforced at the database layer**, not just the UI — added mid-build after realising the original design only checked "is this the assigned signatory," not "is it actually their turn." A `NOT EXISTS` clause was added to both the table's `UPDATE` policy and the storage bucket's write helper.
3. **Single consolidated `UPDATE` policy instead of two separate permissive policies** — the plan's own text had flagged this as an open question ("Postgres RLS can't easily branch per-column..."); resolved by writing one policy with an internal `OR` between the two cases, specifically to avoid the correctness risk of Postgres independently combining separate permissive policies' `USING`/`WITH CHECK` clauses.
4. **`assigned_user_id` ID-space mismatch caught before it became a bug**: Simulator's `sim.practice_project_memberships.user_id` references `auth.users.id` directly, not `public.users.id` (unlike Platform's `user_projects.user_id`). Discovered by reading the actual table definition rather than assuming parity with Platform. Resolved by using the existing `getSimProjectMembers()` service (already resolves `auth.users.id` → `public.users.id` via a `profile` join) for the Simulator team-member picker, keeping `assigned_user_id` in the same `public.users.id` space in both schemas — required by the RLS policies' `u.auth_user_id = auth.uid()` check.
5. **Notifications live in the component layer, not the shared service** — `public.notifications` has no `sim.notifications` mirror, so a Simulator call using `simDb` would fail if the shared service tried to insert into `notifications` via whatever `db` client was passed in. Resolved by having each app's `SignatoriesPanel.jsx` import `platformDb` directly for the `notify()` call only, keeping the shared service itself schema-agnostic.
6. **PMO Admin settings page has no client-side admin gate** — deliberately relies on RLS (`policy_ptsr_write`'s `is_pmo_admin_user()` check) rejecting a non-admin's save with a clear toast, rather than adding a new cross-module admin-status import with no existing precedent in `pmo-module`. Documented as a simplicity trade-off, not an oversight.
7. **`DetailAuditTabList` extended, not forked** — added an optional `extraTab` prop (default `null`, preserving every other 2-tab caller's behaviour) rather than building a one-off third-tab component, since a third-tab need is now a real recurring pattern.

### Manual steps still required before this is live

1. **Run the SQL in order**: `v868` → `v868b` → `v868c` → Admin `v204` → `v868d` (menu). All idempotent, safe to re-run.
2. **Configure at least one requirement** as a PMO Admin via **Document Signatory Requirements** (sibling of Template Library / Organisational Templates / Field Templates; URL `/app/pmo/signatory-requirements`). If the leaf is missing, run `SQL/v870_document_signatory_requirements_menu_reparent.sql` then hard-refresh.
3. **Run the manual live-testing checklist** from the original plan (configure → assign → sign in order → attempt out-of-order sign, confirm RLS rejects it → decline with a reason → confirm notification → restart → complete → confirm lock → export all 4 formats and confirm the signature block renders) — this has **not** been run yet by the user, and is the highest-value next step given how many rounds of live-testing it took to get v867's RLS right.

### Known, explicitly-flagged gaps (not silently skipped)

- **No DB-level enforcement of the post-signing read-only lock** on the 24 content tables' own write RLS — UI-only (see PRD §f, Out of scope). A future hardening pass could add this if the user decides the risk (a determined user editing "locked" content via direct API calls) warrants the much larger blast radius of touching 24 tables' write policies.
- **No automated tests for the PMO Admin `SignatoryRequirementsPage.jsx`** — `packages/modules/pmo-module` has no jsdom/testing-library infrastructure at all (confirmed by attempting to run one: `ReferenceError: document is not defined`). Setting that up is a module-wide infrastructure change out of proportion to this feature.
