# v863 — Form Field Image & File Attachments — Implementation Plan

**PRD:** `projectprd/v863_form_field_attachments_prd.md`
**Status:** ✅ Implemented (code + tests + docs complete). Two manual deployment steps remain before it's live — see "Manual steps still required" in the Review section.
**Repos touched:** `E:\project-nidus` (monorepo — Platform + Simulator) and `E:\project-nidus-admin` (Admin ID Generation seed only).

---

## Design recap (see PRD §d for full rationale)

- New **Attachment** field type (images + documents) added to the existing `FIELD_TYPES` registry shared by the general Form Engine and PM Local Forms.
- New field-scoped table `form_field_attachments` (public + sim), FK'd to `form_instance_id` + `field_key`, storing mime type, size, caption, uploader, soft-delete, and a `display_id` (e.g. `IMG-0001`).
- **Versioning (added by user decision, PRD §d #15/#16):** each logical attachment can have multiple versions. A row's identity as "the same attachment over time" is `attachment_group_id`; `version_number` + `is_current` track history. Replace = new version row, old version kept (not deleted). Delete = soft-delete the whole group (all versions). Restore = new current version carrying an old version's content forward. `display_id` is assigned once at `version_number = 1` and copied forward on later versions, not re-generated.
- New Storage bucket `form-field-attachments`. 10MB/file max, default 10 files/field (builder-configurable ceiling). Storage objects for old versions are retained, not deleted, to support version history/restore.
- Capture methods: file picker, drag-and-drop, clipboard paste, mobile camera.
- Preview: thumbnail/icon gallery inline → click opens a locally-built preview modal (see Review — deviated from reusing `DocumentPreview.jsx`); a small version indicator/dropdown ("v3 (current)") lets the user view or restore a prior version.
- Exports: images embedded in Word/PPT/Print/PDF; filename+link in Excel/CSV/XML/JSON; non-image files always filename+link. Exports always use the **current** version of each attachment.
- Delete/replace: anyone with existing field-edit access.
- Built for Platform and Simulator simultaneously (parity rule 34).
- **Confirmed out of scope:** image editing/annotation, virus/malware scanning, OCR/text extraction, a generic cross-entity attachment field, and migrating legacy `form_attachments` data (see PRD §f).

---

## SQL file sequence (monorepo — `SQL/`)

- [x] `SQL/v861_form_field_attachments_table.sql` — `public.form_field_attachments` DDL + RLS (id, form_instance_id FK, field_key, `attachment_group_id`, `version_number`, `is_current`, storage_bucket, storage_path, file_name, mime_type, file_size, caption, display_id, uploaded_by, uploaded_at, is_deleted, deleted_at, deleted_by) + partial unique index (one current version per group) + `database_tables` registration.
- [x] `SQL/v862_form_field_attachments_sim.sql` — `sim.form_field_attachments` mirror, same columns/indexes/RLS pattern (via `sim.auth_user_can_access_practice_project`), own `database_tables` row.
- [x] `SQL/v863b_form_field_attachments_storage_rls.sql` — Storage RLS on `storage.objects` for bucket `form-field-attachments`, path-scoped by `{platform|sim}/{form_instance_id}/...` folder, project-membership-checked via `form_instances`/`sim.form_instances` join, plus PMO Admin full-access policy (v150 pattern). **Bucket itself is a manual step** (see below).
- [x] `SQL/v864_form_field_attachments_display_id_trigger.sql` — Wired `trg_apply_admin_display_id` on both schemas. **Simplified from the original plan**: no special `version_number = 1` WHEN-clause needed — `trg_apply_admin_display_id` (v756) already only fires when the target column is blank at insert time, so the app layer (`formFieldAttachmentService.js`) simply populates `display_id` explicitly on replace/restore inserts (copied from the current version) and leaves it blank only on a true first version — the existing trigger behaviour does the rest with zero SQL-side special-casing.
- [x] ~~`v865_form_template_field_accept_and_max_files.sql`~~ — not needed. `accept`/`maxFiles` live entirely inside the existing `form_template_versions.schema` JSONB (same as every other field property like `options`/`minLength`), confirmed no DDL required.

## Admin repo SQL (separate repo — `E:\project-nidus-admin\SQL\`)

- [x] `E:\project-nidus-admin\SQL\v202_form_field_attachments_id_generation_seed.sql` — `IMG` (Platform) / `SIMG` (Simulator) sequential rules for `public.form_field_attachments` / `sim.form_field_attachments`, mirroring `v201`'s pattern exactly (org-wide scope, same as `v201`'s `FRM`/`SFRM`). No-ops safely if no active `super_admin` exists yet (matches v201's own guard).

## Frontend — Platform

- [x] `apps/platform/src/pages/forms/FormTemplateBuilder.jsx` — `{ value: 'attachment', label: 'Attachment (image/file)' }` added to `FIELD_TYPES`; accept/maxFiles builder UI added in **three** places for full coverage: the card view (`SortableFieldCard`), the compact table view (`SortableFieldTableRow`), and the org-level "add local field" form — all three already had type-specific extra UI for text/select, so attachment now follows the same pattern. `schemaFromForm`/`formFromTemplate`/`emptyField` updated to carry `accept`/`maxFiles` through save/load.
- [x] `apps/platform/src/components/forms/FormFieldRenderer.jsx` — `attachment` branch renders `AttachmentField`, forwarding the new `formInstanceId`/`disabled`/`mode` props (threaded from `DynamicFormRenderer` → `FormEdit`/`FormView`/`FormNew`).
- [x] `apps/platform/src/components/forms/AttachmentField.jsx` — full implementation: file picker, drag-and-drop zone, `onPaste` clipboard handler, `<input capture="environment">` camera button, thumbnail/file-icon gallery, inline caption editing (blur-to-save), version-history dropdown with Preview/Restore, Replace and Delete controls (hidden when `disabled`), client-side validation (type/size/count) before any upload call, and a locally-built preview modal (image zoom/pan/rotate, PDF iframe, download fallback — see deviation note below).
- [x] `apps/platform/src/services/formFieldAttachmentService.js` — `uploadFieldAttachment`, `replaceFieldAttachment`, `restoreAttachmentVersion`, `deleteFieldAttachment`, `updateFieldAttachmentCaption`, `listFieldAttachments`, `listAttachmentVersionHistory`, `getAttachmentSignedUrl`, `validateAttachmentFile`, plus `resolveAttachmentFieldsForExport` (export support, added during implementation — see Export handling below).
- [x] `apps/platform/src/pages/forms/FormEdit.jsx` / `FormView.jsx` / `FormNew.jsx` — thread `formInstanceId`/`disabled`/`mode` into `DynamicFormRenderer`. `FormNew.jsx` (no instance yet) relies on `AttachmentField`'s existing "save first" fallback message rather than new code — documented as a deliberate, not-a-bug scope note (see Review).
- [x] Preview wiring — **deviated from the plan's "reuse `DocumentPreview.jsx`"**: built a small local `AttachmentPreviewModal` inside `AttachmentField.jsx` instead. Reason found during implementation: `DocumentPreview.jsx` is tightly coupled to `documentStorageService.js`'s `downloadProjectDocument(file_path)` flow (a different storage/versioning system), not to signed URLs from `formFieldAttachmentService`. The local modal mirrors its UI/UX (zoom/pan/rotate, PDF iframe, download button) exactly, just wired to the correct service.

## Simulator mirror (parity rule 34)

- [x] All of the above copied into `apps/simulator/...` at matching paths. **Simpler than planned**: the Explore research and a `diff` confirmed Platform/Simulator's form-engine files (`FormTemplateBuilder.jsx`, `FormFieldRenderer.jsx`, `DynamicFormRenderer.jsx`, `FormEdit.jsx`, `FormView.jsx`, `FormNew.jsx`, `AttachmentUploader.jsx`, `fileUploadService.js`) were already byte-identical shadow copies before this feature, and every new/edited file uses only relative imports or `mode`-parameterized shared-package imports — so each finished Platform file was copied directly to its Simulator path (verified byte-identical afterward) rather than hand-written twice.

## Export handling

- [x] **Scope correction from the plan**: `exportUtils.js`/`ExportRecordMenu.jsx` are **not** actually duplicated per-app for the Forms feature. `FormEdit.jsx`/`FormView.jsx` import `ExportRecordMenu` from `@nidus/ui` and `exportUtils` transitively from `@nidus/shared` — both resolve to the single canonical `packages/ui/src/ExportRecordMenu.jsx` / `packages/shared/src/utils/exportUtils.js`. The `apps/platform/src/utils/exportUtils.js` / `apps/simulator/.../exportUtils.js` shadow copies (and the app-local `ExportRecordMenu.jsx` copies) serve a **different** set of ~140 unrelated record-detail pages (Risk, Issue, PID, etc.) that have no attachment fields and don't need this change — editing them would have been unnecessary, unrelated-module churn (rule 32). Confirmed via `diff`/grep before deciding not to touch them.
- [x] Word (`exportRecordToWord`): image attachments embedded via `docx`'s `ImageRun` (fetched + decoded client-side, scaled to fit); non-image files shown as filename + caption text.
- [x] PowerPoint (`exportRecordToPPT`): images embedded via `pptxgenjs`'s `addImage` (base64 data URL); non-image files as caption text. Function converted `sync` → `async` to support the fetch.
- [x] Print (`exportRecordToPrint`): simplest case — plain `<img src="signedUrl">` tags, no pre-fetch needed since the browser loads them when the print window renders.
- [x] PDF (`exportRecordToPDF` / `_buildRecordPdfDocument` / `generateRecordPdfBlob`): images embedded via `jsPDF`'s `addImage`.
- [x] Excel/CSV/XML/JSON: **no exportUtils.js changes needed at all** — `resolveAttachmentFieldsForExport` pre-flattens each attachment field into a plain multi-line string ("filename — caption (size) - url", one per file), which flows through the *already-existing* generic multi-value handling (`parseFieldValue`/`guidedCellValue`) that every export format uses for array-like fields — this is the same "one item per line" mechanism rule 38.5 already mandates, so attachment fields needed zero new code in the data-format exporters.
- [x] `ExportRecordMenu.jsx` field-picker: no change needed — it already lists every schema field generically by key/label; attachment fields appear automatically.
- [x] New `attachmentAssets` prop on `ExportRecordMenu` (default `{}`, fully backward-compatible with every other caller) carries resolved image data through to Word/PPT/Print/PDF.

## Hold/draft queue (rule 37)

- [x] Verified by construction, no code change needed: `AttachmentField` loads its gallery directly from `form_field_attachments` by `formInstanceId` + `fieldKey` (not from the `values` map), so resuming a draft via `FormEdit.jsx` shows existing attachments correctly regardless of the draft/hold-and-resume path taken.

## PWA / mobile (rule 29, 39)

- [x] Camera capture wired via `<input type="file" accept="image/*" capture="environment">` (standard PWA-compatible pattern already used for the mobile camera button). Drag-and-drop UI is hidden entirely when `disabled` and degrades to picker/camera-only naturally on touch (no native drag source). **Not verified**: real-device/emulator testing of the camera capture flow — outside what this environment can exercise; flagged for manual QA before shipping.

## Theme-aware UI (rule 8, 28.1)

- [x] Verified via grep — every surface in `AttachmentField.jsx` pairs `dark:` classes correctly; no forbidden lone `bg-gray-900`/`bg-gray-950`/`text-gray-100`/`border-gray-700`. Icon-only mid-tone colors (`text-gray-400`/`text-gray-500`) and the solid blue download CTA match existing accepted patterns (e.g. `DocumentPreview.jsx`).

## Unit & integration tests (rule 23)

- [x] `formFieldAttachmentService.test.js` (Platform + Simulator, identical, **11 tests each, all passing**): `validateAttachmentFile` (type/size/count rules), `uploadFieldAttachment` (version-1 insert shape, upload-before-insert ordering, error handling), `replaceFieldAttachment` (retires old version, inserts v2 with `display_id` copied forward), `deleteFieldAttachment` (soft-deletes by `attachment_group_id`).
- [x] `AttachmentField.test.jsx` (Platform + Simulator, identical, **6 tests each, all passing**): save-first fallback with no `formInstanceId`, loads/renders existing attachments, file-picker upload calls the service and reports the new group id via `onChange`, oversized file rejected client-side without calling the service, delete flow calls the service and reports removal via `onChange`, disabled mode hides all mutating controls.
- [ ] **Not written**: dedicated drag-and-drop/paste event simulation tests, a dedicated restore-version UI test, and dedicated export-format assertions (embedded-image-vs-link per format) — the underlying logic they'd cover is exercised by the service tests (replace/restore) and manually verified by reading the generated export code paths, but there's no automated regression test for the export embedding specifically. Flagged as a reasonable follow-up, not done to keep this session's scope bounded.

## Documentation (rule 19, 21, 22)

- [x] `Documentation/Form_Field_Attachments_v863_Guide.md` — what it is, versioning model, storage/permissions, where each piece lives per app, export behavior, apply order, cross-reference to `PM_Local_Forms_v852_Guide.md`.

## Cross-repo checklist (per CLAUDE.md Database Table Registration Rule §5)

- [x] (a) `form_field_attachments` DDL + RLS — v861/v862.
- [x] (b) `database_tables` registry row — included in v861/v862.
- [x] (c) Admin `id_generation_rules` seed — `E:\project-nidus-admin\SQL\v202_...sql`.
- [x] (d) `trg_apply_admin_display_id` trigger wiring — v864.
- [x] (e) No seed/demo data for this feature (rule 12) — N/A, confirmed nothing added.
- [x] (f) URLs/toasts use `display_id` — upload success toast shows `result.data.display_id || result.data.file_name`.

---

## Review section

### Summary

Implemented in full: schema (versioned attachments, both schemas), storage + RLS, Admin ID Generation, the Attachment field type wired through the builder and both fill/view pages in Platform and Simulator, all four capture methods, version history with restore, and export support across all seven mandated formats (embedded images in Word/PPT/Print/PDF, filename+link in Excel/CSV/XML/JSON). All 34 automated tests (17 per app) pass.

### Deviations from the original plan (all found and resolved during implementation, not left as gaps)

1. **`v865` DDL file dropped** — `accept`/`maxFiles` fit inside the existing schema JSONB, no migration needed.
2. **`v864` trigger simplified** — no `WHEN (version_number = 1)` clause needed; the existing generic "skip if non-blank" trigger behavior already does the right thing once the app layer populates `display_id` on replace/restore inserts.
3. **Preview reuses a locally-built modal, not `DocumentPreview.jsx`** — that component is coupled to a different storage/download system; the local modal matches its UX exactly but speaks the correct service.
4. **Simulator mirroring was a direct file copy, not a parallel hand-written implementation** — confirmed safe via `diff` before and after; all new files use only relative/package imports with no Platform-specific hardcoding.
5. **Corrected mid-session: `@nidus/ui` and `@nidus/shared/utils|hooks|context|constants` are aliased per-app** (`apps/platform/vite.config.js` / `apps/simulator/vite.config.js` `resolve.alias`) **to each app's own local `src/components/ui` / `src/utils` folders — not to `packages/ui`/`packages/shared`.** This is undocumented, contradicts CLAUDE.md rule 34.3/49 ("packages/\* is the single source of truth"), and appears to be leftover debt from the pre-v730 "Option B" migration phase that was never cleaned up. Consequence: my first pass at export support (`ImageRun`/`addImage`/`attachmentAssets` in `ExportRecordMenu.jsx` and `exportUtils.js`) landed only in `packages/ui`/`packages/shared`, which turned out to be **dead code for Platform and Simulator** — the real, live files are `apps/platform/src/components/ui/ExportRecordMenu.jsx`, `apps/simulator/src/components/ui/ExportRecordMenu.jsx`, `apps/platform/src/utils/exportUtils.js`, `apps/simulator/src/utils/exportUtils.js`. **Found and fixed after the user hit a related bug** (see #6) — the finished export code is now applied to the real files (confirmed via `diff` against their pre-edit state before copying, then re-tested). The `packages/*` copies are kept in sync for whenever this alias debt is eventually cleaned up, but are not currently load-bearing.
6. **Found while investigating the user's bug report: three more duplicated field-type registries needed the `attachment` type added, beyond `FormTemplateBuilder.jsx`:**
   - `TierFormPolicyPanel.jsx` (Portfolio/Programme/Project-tier field customisation — the page the user was actually on) — 3 copies (`packages/ui`, `apps/platform/src/components/ui`, `apps/simulator/src/components/ui`), the latter two being the real, live ones per the alias above. Added the type option plus matching accept/maxFiles UI in the "Add a field for this tier" panel.
   - `FormExcelSchemaImportModal.jsx` (bulk Excel/CSV → form schema import) — 2 copies, both live (Platform, Simulator). Added the type option to its column-type dropdown.
   - `formExcelImportUtils.js`'s `FIELD_TYPE_SET` whitelist — the actual validation gate for the above; without this fix, an `attachment` column selection would have been silently coerced back to `text` on import. 3 copies fixed (`packages/shared`, `apps/platform/src/utils`, `apps/simulator/src/utils`).
   - Confirmed **not** needed: `apps/platform|simulator/src/features/local-data-extensions/utils/fieldTypeRegistry.js` — a genuinely separate, unrelated generic custom-field system (string/number/date/boolean/dropdown/json only, no file/storage concept) for a different feature entirely; adding attachments there would mean building a second, parallel storage pipeline — exactly the "generic cross-entity attachment field" already ruled out of scope in the PRD.
   - Also confirmed **not affected**: the required-field validator (`validateSchemaFields`/`isRequiredFieldEmpty` in `formValidation.js`) already handled array values generically (`Array.isArray(value) ? value.length === 0`) — no fix needed there.

### Manual steps still required before this is live

1. **Create the `form-field-attachments` Storage bucket** via Supabase Dashboard or JS API (private, 10MB limit, MIME allowlist per `SQL/v863b`'s header comment) — SQL only sets RLS policies, it cannot create the bucket itself (same constraint as every other bucket in this codebase).
2. **Run the SQL in order**: v861 → v862 → (create bucket) → v863b → Admin v202 → v864.
3. **Real-device QA** of the mobile camera-capture button — not exercisable in this environment.

### Recommended follow-ups (not blocking, not done in this pass)

- Extend `RecordPreviewModal` (the in-app "View" preview) to embed images too, matching the direct export formats — currently shows the text-line fallback there.
- Add dedicated tests for drag-and-drop/paste event handling and the restore-version UI flow.
- Add automated assertions that Word/PPT/PDF output actually contains an embedded image node (currently verified by code review, not a snapshot test).

### Post-implementation addition: "Update to latest template version" action

Discovered while the user tested the feature: adding "Image" to an existing template's field catalog bumps the template to a new `form_template_versions` row, but **existing** `form_instances` stay pinned to whichever version they were created against (`getFormInstance` loads by `instance.template_version_id`, frozen at creation) — so a pre-existing record doesn't show the new field until either a new record is created, or the record is explicitly re-pointed at the current version. This is pre-existing Form Engine behavior (applies to any field type, not specific to attachments), not a bug in this feature.

Added, by user request, a minimal fix (Platform + Simulator, both `formEngineService.js` copies + `FormEdit.jsx`):
- `syncFormInstanceToLatestVersion(formInstanceId, mode)` — re-points `form_instances.template_version_id` to the template's current version and logs a `form_audit_log` entry (`template_version.synced`). Purely additive: does not attempt to migrate/reshape values for fields renamed, retyped, or removed on the newer version — those values stay in `form_instance_values` untouched, they simply stop rendering (schema-driven, not deleted).
- `FormEdit.jsx` (edit page only — not the read-only `FormView.jsx`) shows an amber "Update to latest template (vN)" button when the loaded record's version is behind the template's current version, with a `window.confirm` explaining the removed/retyped-field caveat before proceeding.
- Tests: `formEngineService.syncVersion.test.js` (3 tests, Platform + Simulator, all passing) covering the update path, the already-current no-op path, and the missing-id error path.
- Scope boundary: no auto-migration of renamed/retyped field data, and no equivalent button on `FormView.jsx` (read-only by design) — flagged, not built, matches the same proportionality reasoning as the rest of this plan.

### Post-implementation fix: silent save failures on `FormEdit.jsx`

User reported "Save doesn't work" after adding an image. Root cause was a **pre-existing bug, not new**: `save()` and `submitForApproval()` called `updateFormValues()`/`submitFormForApproval()` without ever checking the returned `{ success, message }` — any real failure (RLS, network, validation) was silently swallowed and the UI still claimed "Saved" via the timestamp indicator. Fixed in both apps' `FormEdit.jsx`:
- `save()` now checks the result, shows `toast.error(message)` on failure (and surfaces it in the existing error banner), and on success calls `useSuccessModal()`'s `showSuccess()` (rule 16, `onOk` omitted — this is an iterative multi-save page, same carve-out as the Form Template Builder's own Save button which already does this).
- `submitForApproval()` now checks both the pre-submit save and the submit-for-approval call individually, each with its own error message.
- The attachment file/metadata itself was never actually at risk — `AttachmentField.jsx` persists uploads, captions, and deletes directly to `form_field_attachments` independent of this Save button by design — but `values[field.key]` (the array of attachment IDs used by required-field validation and exports) does depend on this Save path, so the fix matters for those.
