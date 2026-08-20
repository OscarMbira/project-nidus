# v867 — Process Template Document Attachments — Implementation Plan

**PRD:** `projectprd/v867_process_template_document_attachments_prd.md`
**Status:** ✅ Implemented (code + tests + docs complete). Two manual deployment steps remain — see Review section.
**Repos touched:** `E:\project-nidus` (monorepo — Platform + Simulator) and `E:\project-nidus-admin` (Admin ID Generation seed only).

---

## Design recap (see PRD §d)

- Document-level attachments (no field concept exists in process_templates) linked to `pm_template_nodes.id`.
- New table `process_template_attachments` (public + sim) — same versioning shape as `form_field_attachments` minus `field_key`.
- New bucket `process-template-attachments`. Display ID `DAT`/`SDAT` (PTA was already taken).
- New `DocumentAttachmentsPanel.jsx` component + `processTemplateAttachmentService.js`, wired into `OrganisationalTemplateDetailPage.jsx` (pmo-module + sim-pmo-module).
- Export via existing `ExportRecordMenu`/`attachmentAssets` mechanism (no `exportUtils.js` changes needed — already generic).

## SQL (monorepo — `SQL/`)

- [x] `SQL/v866_process_template_attachments_table.sql` — `public.process_template_attachments` + `sim.process_template_attachments`. **Corrected post-launch (see "Live-testing correction" below):** write RLS now OR-combines project-membership (`public.user_projects` / `sim.practice_projects.user_id`, matching the 24 content tables' own RLS) with `can_manage_pm_template_node()` as a fallback for non-project-scoped nodes. SELECT uses the broader `user_has_access_to_account()` (matches `pm_template_field_links_select`). `database_tables` registration included.
- [x] `SQL/v866b_process_template_attachments_storage_rls.sql` — Storage RLS for bucket `process-template-attachments`, split into a broader SELECT policy (account access) and narrower INSERT/DELETE policies. **Corrected post-launch** with the same OR-combined project-membership fallback as v866, applied to all 4 write policies (Platform INSERT/DELETE, Simulator INSERT/DELETE).
- [x] `SQL/v866c_process_template_attachments_display_id_trigger.sql` — same pattern as v864 (no special-casing needed).

## Admin repo SQL (`E:\project-nidus-admin\SQL\`)

- [x] `E:\project-nidus-admin\SQL\v203_process_template_attachments_id_generation_seed.sql` — `DAT`/`SDAT` sequential rules (with abbrev fallbacks if taken), mirroring `v202`.

## Platform + Simulator

- [x] **Corrected from the plan's sketch**: the service lives in `packages/shared/src/services/processTemplateAttachmentService.js` — a **single shared file**, not per-app copies. Discovered via investigation (checking `pmo-module`'s and `sim-pmo-module`'s own `vite.config.js`) that `@nidus/shared/services/*` is the one import family **not** aliased away to a local per-app folder in any of Platform/Simulator/pmo-module/sim-pmo-module's Vite configs — unlike `@nidus/ui` and `@nidus/shared/utils|hooks|context|constants`, which all are. Confirmed by observing `pmTemplateNodeService.js`/`pmTemplateContentService.js` already live there and already work correctly, following the same explicit-`db`-argument calling convention (not a `mode` string) used throughout that service family — matched for consistency.
- [x] `apps/platform/src/components/ui/DocumentAttachmentsPanel.jsx` + `apps/simulator/src/components/ui/DocumentAttachmentsPanel.jsx` — **do** need per-app copies (`@nidus/ui` is aliased per-app). Same capture UX as `AttachmentField.jsx` (picker/drag-drop/paste/camera/gallery/captions/version history/preview modal), keyed by `templateNodeId` only, taking `db`+`mode` as props instead of internally resolving `platformDb`/`simDb`.
- [x] `packages/modules/pmo-module/src/pages/OrganisationalTemplateDetailPage.jsx` and the `sim-pmo-module` mirror — both wired: `<DocumentAttachmentsPanel>` rendered after the Document Data section (gated on `contentInfo.kind === 'process_template' && contentInfo.content && node?.id`, so it appears uniformly across all 24 document types and both "Templates" and "Project Documents" surfaces); a synthetic "Attachments" section injected into `exportSections`; `exportRecord.attachments` and `attachmentAssets` wired into the existing `<ExportRecordMenu>`. The two page copies had already diverged slightly (sim-pmo-module has an extra `AuditField`/`AuditCard` audit-tab feature the platform copy doesn't — unrelated, from other work), so edits were applied individually to each rather than copied wholesale.

## Tests

- [x] `packages/shared/src/services/__tests__/processTemplateAttachmentService.test.js` (single shared file, no per-app duplication — matches the service itself) — **10 tests, all passing**: file validation (type/size/count), upload (storage-before-insert ordering, version-1 shape), replace (retires old version, copies `display_id` forward), delete (soft-deletes by group). Required adding the new test file to `packages/shared/vitest.config.js`'s explicit `include` list — that package's Vitest config allowlists test files rather than globbing, unlike Platform/Simulator.
- [x] `DocumentAttachmentsPanel.test.jsx` (Platform + Simulator, identical, **6 tests each, all passing**): renders nothing with no `templateNodeId`, loads/renders existing attachments, uploads via picker, rejects oversized files client-side, deletes via the service, hides all controls when `disabled`.

## Documentation

- [x] `Documentation/Process_Template_Document_Attachments_v867_Guide.md` — leads with a comparison table against v863 (the exact confusion that triggered this feature), explains the document-level vs field-level distinction, and documents the `@nidus/shared/services/*`-isn't-aliased discovery for future reference. Cross-linked from `Form_Field_Attachments_v863_Guide.md` in both directions.

---

## Review section

### Summary

Implemented in full: schema (`process_template_attachments`, both schemas, versioned), storage + RLS (correctly split read/write), Admin ID Generation, a new `DocumentAttachmentsPanel.jsx` wired into both PMO-module document pages (all 24 document types, both "Templates" and "Project Documents" surfaces), and export support reusing the v863 embedding mechanism with zero changes to `exportUtils.js`. All 22 new tests pass (10 service + 6×2 component), plus a full regression sweep of the v863 test suites confirmed no interference between the two features.

### Corrections made during implementation (all resolved, not left as gaps)

1. **RLS permission function** — used the existing, proven `can_manage_pm_template_node()` (already gating every other write on this exact node/tier concept) instead of inventing a project-access check, after reading `SQL/v764b_pm_template_hierarchy_rls.sql` directly rather than assuming.
2. **Storage RLS read/write split** — caught and fixed a draft that would have used the same narrow write-only check for SELECT too, which would have blocked legitimate viewers from previewing attachments on documents they can see but not edit.
3. **Service file location** — moved from a planned per-app duplication to a single shared file after discovering `@nidus/shared/services/*` is the one import family genuinely unaliased across every consuming app/module's Vite config (verified directly, not assumed) — less code, one source of truth, matches existing precedent (`pmTemplateNodeService.js`).
4. **Two `OrganisationalTemplateDetailPage.jsx` copies had already diverged** (an unrelated audit-tab feature) before this work started — edits applied individually rather than assuming they were still identical shadow copies, avoiding accidentally reverting the other feature.

### Live-testing correction (post-launch RLS fix)

After deployment, the user hit a `403 — "new row violates row-level security policy"` on the very first live upload attempt (confirmed via the Storage POST response body in DevTools, not just the network status code). A targeted test — "does Save changes on the document's own content still work for this user?" — succeeded, proving the gap was specific to the new attachments RLS, not a pre-existing permission issue.

Root cause: `can_manage_pm_template_node()` gates `pm_template_nodes` and `pm_template_field_links` (template *authoring* — PMO Admin or the single named tier manager only). It does **not** match the actual write permission model of the 24 content tables the document's own data lives in (`project_charters`, `project_management_plans`, etc. — see `SQL/v629_process_templates_new_tables.sql`), which allow **any member of the node's project** (`public.user_projects` / `sim.practice_projects.user_id` ownership) to edit. Using the narrower function for attachments meant a user who could edit the document itself could not attach a file to it.

**Fix applied to both `v866.sql` (table RLS) and `v866b.sql` (storage RLS, all 4 write policies)**: OR-combine project-membership (for `scope_entity_type = 'project'` nodes) with the existing `can_manage_pm_template_node()` check (kept as the fallback for non-project-scoped nodes — portfolio/programme/PMO-level masters, where no project-membership concept applies). Both files are idempotent (`DROP POLICY IF EXISTS`) and safe to re-run.

### Manual steps still required before this is live

1. **Create the `process-template-attachments` Storage bucket** (Dashboard or JS API — private, 10MB limit, same MIME allowlist as v863).
2. **Run the SQL in order**: v866 → (create bucket) → v866b → Admin v203 → v866c.
3. **Re-run the corrected `v866.sql` and `v866b.sql`** if they were already applied before the live-testing correction above (both are idempotent).

### Relationship to v863 and to the prior v849 decision

This feature was built specifically because a user request to add v863-style attachments to a "Project Charter" surfaced that two structurally separate template systems exist in this codebase with overlapping document names. Consolidating them onto one system was considered, researched in depth (feature-parity inventory, real-data-volume check, routing inventory, and the discovery of a prior explicit decision in `v849` — *"do not unify these into one architecture... for no functional gain"*), and deliberately **not done** — that reasoning was reaffirmed with the user rather than silently revisited. This PRD/plan implements the scoped, low-risk alternative instead: attachments as a standalone addition to process_templates, leaving both systems' independence intact.
