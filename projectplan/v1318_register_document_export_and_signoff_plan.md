# v1318 — Register Documents: Export, Sign-Off, Annexures and Full Forms — Implementation Plan

**PRD:** `projectprd/v1318_register_document_export_and_signoff_PRD.md`
**Status:** Approved 2026-10-24 and implemented (code complete; SQL to be run by the owner).
**Approach:** test-first vertical slices (App_Guide); each slice works end-to-end in Platform and Simulator
(rule 34) before the next starts. The owner runs all SQL.

## Modules touched

| Area | Files (new ★ / changed ✎) |
|---|---|
| SQL (monorepo) | ★ v1318 engine schema (is_document, signoff_state, signatories + attachments tables, buckets, RLS, CHECK widening, edit-lock trigger, registry) · ★ v1319 sign-off RPCs · ★ v1320 SQL tests · ★ v1321 statuses + switch-on for 30 registers + drop Migration Strategy Approvals · ★ v1322 Banking forms · ★ v1323 Construction forms · ★ v1324 IT forms · re-run v1251 planner wall |
| SQL (Admin repo) | ★ next `v2xx_local_register_document_id_generation_seed.sql` (ID rules for both new tables, public + sim) |
| Shared services | ★ `packages/shared/src/services/localRegisterSignatoryService.js` · ★ `localRegisterAttachmentService.js` (mirror v867/v868 services; reuse pure helpers from `processTemplateSignatoryService.js`) · ✎ `processTemplateSignatoryService.js` (document-type list includes `local_register:*`) |
| Document export | ★ `packages/shared/src/utils/registerDocumentModel.js` (pure builder) · ★ `packages/shared/src/utils/registerDocumentWord.js` · ★ `registerDocumentPdf.js` · ✎ `registerRecordExport.js` |
| UI (`@nidus/ui`) | ★ `RegisterSignoffPanel.jsx` · ★ `RegisterAttachmentsPanel.jsx` · ✎ `ExportRecordButtons.jsx` (optional extra "Document (Word/PDF)" items) |
| Pages (both apps) | ✎ `LocalRegisterDetailPage.jsx`, `LocalRegisterForm.jsx` (Sign-off + Attachments tabs, read-only when locked) · ✎ PMO `SignatoryRequirementsPage` / PM Document Signatory page (Registers group) |
| Docs | ★ `Documentation/Register_Documents_v1318_Guide.md` · ✎ v1317 guide (link) |

## Todo

### Slice 0 — Prep
- [x] 0.1 Confirm current CHECK constraint definitions on requirement / scope-policy tables (public + sim, incl. v1075/v1076 team scope).
- [x] 0.2 Confirm the notification helper v868 uses and the RLS helpers for register record access (`has_local_register_scope_access`).

### Slice 1 — Document switch + sign-off end-to-end (Migration Strategy)
- [x] 1.1 Test: `registerDocumentModel` signatory rows (signed/pending/declined) — red.
- [x] 1.2 SQL v1318: `is_document`, `signoff_state`, `local_register_record_signatories` (+ bucket, RLS, display-ID trigger, registry), CHECK widening, edit-lock trigger.
- [x] 1.3 SQL v1319: RPCs start / sign / decline / lock-optional / restart with status changes; v1320 SQL tests.
- [x] 1.4 Admin repo: ID Generation rule seed for the new tables.
- [x] 1.5 Service `localRegisterSignatoryService.js` + unit tests.
- [x] 1.6 Document Signatory page: Registers group (`local_register:<key>`) — both apps.
- [x] 1.7 `RegisterSignoffPanel` + Sign-off tab on record view; form read-only when locked; tests.
- [x] 1.8 SQL v1321 (part): switch on Migration Strategy only for testing; owner runs; manual check.

### Slice 2 — Attachments → Annexures
- [x] 2.1 Tests for attachment panel (locked vs unlocked, title required) — red.
- [x] 2.2 v1318 includes `local_register_record_attachments` + bucket + RLS (locked → no writes).
- [x] 2.3 Service + `RegisterAttachmentsPanel` + Attachments tab, both apps.

### Slice 3 — Complete document export (Word + PDF)
- [x] 3.1 Tests for `registerDocumentModel`: order (cover, control, TOC, sections, glossary §2, appendices, annexures), numbering, empty omission, glossary split — red → green.
- [x] 3.2 Word renderer (docx: numbered headings, TOC field, sign-off table with images, embedded annexure images).
- [x] 3.3 PDF renderer (two-pass TOC page numbers).
- [x] 3.4 Export menu: "Document (Word)" / "Document (PDF)" for document registers only; both apps.
- [x] 3.5 Manual check with a filled Migration Strategy.

### Slice 4 — Switch on all 30 + statuses
- [x] 4.1 SQL v1321: standardise statuses (with record value mapping), `is_document = true` for the 30, drop Migration Strategy `approvals`.

### Slices 5–7 — Forms (PRD d.3)
- [x] 5 v1322 Banking (6 registers)
- [x] 6 v1323 Construction (7 registers)
- [x] 7 v1324 IT (16 registers)
  Each: generated SQL, parse-checked, field/tab counts validated; standard frame + register-specific tabs.

### Slice 8 — Close-out
- [x] 8.1 Retest suite (registers, shared, ui), lint, shared drift check.
- [x] 8.2 REVIEW.md checks; guide; review section below.
- [ ] 8.3 Commit/push — waiting for the owner (rule 20: ask first).

## Risks
- The `docx` TOC is a field that Word fills when the file is opened (user may need to accept "update fields");
  the PDF TOC is computed by us.
- Widening the shared signatory CHECK constraints touches a live feature — covered by v1320 tests.
- 29 forms ≈ 700 fields — generated from one script per batch to avoid typos.

## Review

**Result:** all slices implemented, 2026-10-24. Guide: `Documentation/Register_Documents_v1318_Guide.md`.

**SQL (owner runs, in order):** v1318 → Admin v243 → v1319 → v1320 (tests) → v1321 → v1322 → v1323 → v1324
→ re-run v1251 (planner wall, two new public tables). All files parse (libpg-query); function bodies were
reviewed by hand because the local parser does not check PL/pgSQL.

**What changed vs. the plan**
- Sign-off state changes run in SECURITY DEFINER functions (v1319) instead of client writes under RLS
  (v868's model) — they also move the record's status, which RLS alone cannot do safely.
- The edit-lock trigger also refuses In Review / Approved set by hand on document registers, and the form
  hides those two statuses (found while wiring the form: otherwise sign-off could be bypassed).
- Attachments reuse the v867 `DocumentAttachmentsPanel` through a new `service` prop and an adapter
  (`localRegisterAttachmentPanelService`) instead of a second copy of the panel; the caption is the
  annexure title.
- Migration Strategy Version History moved to a "Document Control" tab (last), matching the other 29 forms.
- Forms: 6 Banking (215 fields), 7 Construction (232), 16 IT (488) = 935 fields; one searchable dropdown
  (Testing Strategy → Test Levels, 12 options). `field_key`/`field_label` lengths checked against the columns.

**Tests:** shared — document model 12, renderers 2 (Word XML: TOC field, numbered headings, sign-off table,
appendix/annexure; PDF page count), services 8; ui — RegisterSignoffPanel 5, ExportRecordMenu +1 (UI suite
236/236); Platform local registers + signatory 28; Simulator 18. Shared suite: 1015 pass, 6 fail in
untouched files (checkpointReportExport jsdom, ianaTimezoneOptions sort, queryRouter) — not caused by this
change. Lint: no new errors in changed files (2 existing errors in ExportRecordButtons/ExportRecordMenu
remain). Shared drift check clean.

**Known limits:** Word page numbers in the TOC appear after Word updates fields; internal sign-off
tracking only (not an e-signature); industry registers exist in Platform (Simulator gets the engine and
system-register records); a "link to record" field type is still out of scope.
