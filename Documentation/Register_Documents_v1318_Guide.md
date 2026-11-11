# Register Documents — Sign-Off, Annexures and Complete Document Export (v1318)

**PRD:** `projectprd/v1318_register_document_export_and_signoff_PRD.md`
**Plan:** `projectplan/v1318_register_document_export_and_signoff_plan.md`
**Related:** v868 document signatories, v867 document attachments, v1316/v1317 Migration Strategy and Data Scope.

## What it is

Some Local Registers hold formal documents rather than lists of items — a bank's Data Migration Strategy,
a Construction HSE Plan, an IT Solution Architecture. A register switched on as a **document register**
(`local_registers.is_document`) gives each record:

| Tab / feature | What it does |
|---|---|
| **Sign-off** | The preparer picks a person for each signing role and starts sign-off. People sign in order with their signature image; the date is recorded. The record is read-only from the start. |
| **Attachments** | Up to 10 files (10 MB each), each with an annexure title. Replace keeps the old version. Read-only while locked. |
| **Export → Complete document (Word / PDF)** | A full document: cover page, Document Control, Table of Contents, numbered sections, Appendices, Annexures. |

## Sign-off

- **Who signs** is configured on the existing **Document Signatory** page (PMO Admin) and the project/team
  page (Project Manager / Team Lead). Document registers appear there as "<Register name> (register)",
  stored as document type `local_register:<register_key>`. The usual organisation → portfolio → programme
  → project → team inheritance applies.
- **Statuses:** starting sign-off sets **In Review**; when every mandatory signatory has signed the record
  becomes **Approved**. **Restart sign-off** (reason required) closes the round — signatures stay in the
  signing history — unlocks the record and sets **Draft**. In Review and Approved cannot be chosen by hand on
  a document register (the form hides them and the database refuses them).
- **Decline** needs a reason; nobody can sign until the preparer restarts.
- **Optional signatories** do not block approval; a mandatory signatory who has signed can close the
  remaining optional slots.
- **Notifications** go to the next signatory, everyone on a decline, and the preparer on approval.
- Internal sign-off tracking — not a legally binding electronic signature.

## Complete document layout

1. **Cover page** — organisation, title, document type, reference, version, owner, status, project, date.
2. **Document Control** — document information (Details tab fields), summary, version history table
   (`Version – Date – Author – Change` lines), related documents, **sign-off table: Name | Project Role |
   Signature | Date** (Pending / Declined shown where not signed).
3. **Table of Contents** — Word: a real TOC field, pre-filled; Word fills in page numbers when the file is
   opened (answer *Yes* to "update fields"). PDF: page numbers included and entries are clickable.
4. **Numbered sections** — one per form tab (1, 2, 3 …) with numbered fields (1.1, 1.2 …). Lists become
   bullets, Notes keep paragraphs, amounts and dates use Regional & Format settings. Empty fields and
   empty sections are left out. **Glossary of Terms** is section 2, as a Term | Definition table.
5. **Appendices** — from the Appendices list (`Title – Reference`), lettered A, B, C …
6. **Annexures** — the attached files, lettered A, B, C …; images are embedded, other files listed by name.

Field keys with a fixed place: `glossary`, `appendices`, `version_history`, `related_documents`,
`document_reference`, `document_version`, `document_owner`.

## Document registers (30)

- **Banking:** Migration Strategy, Cutover Strategy, Cutover Plan, Dress Rehearsal Strategy, Testing
  Strategy, Hypercare Plan, Rollback Plan.
- **Construction:** Commissioning Plan, HSE Plan, Inspection Plan, Recovery Plans, Site Logistics, Method
  Statements, ITPs.
- **Information Technology:** Enterprise, Solution, Application, Data, Integration and Security
  Architecture; Functional, Technical, Integration, Data and UX/UI Design; Disaster Recovery; Support Model;
  Technology Roadmap; Runbooks; Architecture Decisions.

Each has a complete form (standard frame + register-specific tabs) — field lists in PRD section d.3.
To switch on another register later: `UPDATE public.local_registers SET is_document = TRUE,
status_workflow = '[…draft, in_review, approved, superseded…]' WHERE register_key = '…';`

## Where it lives

| Piece | Location |
|---|---|
| Sign-off service | `packages/shared/src/services/localRegisterSignoffService.js` |
| Attachment service (+ panel adapter) | `packages/shared/src/services/localRegisterAttachmentService.js` |
| Document model / Word / PDF | `packages/shared/src/utils/registerDocumentModel.js`, `registerDocumentWord.js`, `registerDocumentPdf.js` |
| Export orchestration | `packages/shared/src/services/registerDocumentExportService.js` |
| Sign-off tab | `packages/ui/src/RegisterSignoffPanel.jsx` |
| Attachments tab | `packages/ui/src/DocumentAttachmentsPanel.jsx` (now takes a `service` prop) |
| Signatory candidates | `apps/{platform,simulator}/src/lib/useRegisterSignatoryCandidates.js` |
| Record pages | `apps/{platform,simulator}/src/pages/localRegisters/LocalRegisterDetailPage.jsx` / `LocalRegisterForm.jsx` |

## SQL (run in order)

| File | Purpose |
|---|---|
| `SQL/v1318_register_document_engine_schema.sql` | is_document, signoff_state, signatories + attachments tables (public + sim), buckets, RLS, edit lock, document-type CHECK widening |
| `E:\project-nidus-admin\SQL\v243_local_register_document_id_generation_seed.sql` | Display ID rules for the two new tables (Admin repo) |
| `SQL/v1319_register_document_signoff_functions.sql` | start / assign / sign / decline / lock-optional / restart functions |
| `SQL/v1320_register_document_signoff_tests.sql` | SQL tests (results table; everything rolled back) |
| `SQL/v1321_register_documents_switch_on.sql` | 30 registers switched on, statuses standardised, Migration Strategy Approvals removed |
| `SQL/v1322_fin_document_register_forms.sql` | Banking forms (6) |
| `SQL/v1323_con_document_register_forms.sql` | Construction forms (7) |
| `SQL/v1324_ict_document_register_forms.sql` | IT forms (16) |
| `SQL/v1251_planner_table_wall.sql` | Re-run after v1318 (two new public tables) |

## Table fields (v1326)

New Local Register field type **Table**: rows with named columns (columns in `dropdown_options` as
`[{ value, label, type: 'text'|'date' }]`; value = one row per line, tab between cells — older "A – B"
lines are read as rows). On every document register, **Glossary of Terms** (Term | Definition),
**Appendices** (Title | Reference / Link) and **Version History** (Version | Date | Author | Change) are
tables; the form and view use `@nidus/ui` `TableListInput` (Card/Table toggle, row numbers, inline edit),
and the complete document prints them as tables. SQL: `SQL/v1326_local_register_table_field_type.sql`
(run after v1321–v1324).

## Templates (v1336)

Document registers can be started from a **template** (pre-filled record + child records + annexures),
and organisations can save their own. One Data Migration Strategy per project, with version history.
See [Register Document Templates (v1336)](Register_Document_Templates_v1336_Guide.md).

## Testing Strategy — full document structure (v1364)

The Testing Strategy document register (Banking & Financial Services → Testing & Assurance) follows the
sections of a complete bank testing strategy: project summary, objectives and scope (testing services,
functional areas), test approach and design, test execution phases (parameterisation, sanity, system,
system integration), non-functional testing (performance with targets, failover, security), UAT
support and dress rehearsals, environments and test data, entry / exit / acceptance criteria and
critical success factors, defect management with resolution targets, test management (documents,
meetings, reporting, deliverables, review / sign-off board), tools, timeline and RACI, risks and
contingencies, testing team, acronyms, glossary, appendices and version history. Sign-off uses the
Sign-off tab. SQL: `SQL/v1364_fin_testing_strategy_full_document.sql`, then the sample strategy for SEED334-PRJ-08 `SQL/v1365_fin_testing_strategy_seed.sql`.
Severity Definitions (Severity | Impact | Workaround, `v1367`), Acceptable Open Defects at Exit (Severity | Maximum Open at Exit | Condition) and Automation Approach
(Scope | Approach | When) are table fields (`SQL/v1366_fin_testing_strategy_table_fields.sql`); earlier
text values were converted to rows.

## Professional page layout (v1367)

The complete document (PDF and Word) follows the page-layout rules a publisher would apply:

- **Keep with next** — a section banner, a sub-heading or a table's header row is never left at the foot
  of a page: it moves to the next page with the start of its content (Word: "Keep with next").
- **Repeat header rows** — a table that continues on the next page repeats its header row.
- **Rows never split** — a table row stays on one page.
- **Widow / orphan control** — a paragraph never leaves a single line alone at the foot of a page.
- **Main sections start cleanly** — when less than a quarter of the page is left, the next numbered
  section starts on a new page (like a "Next Page" break, without blank pages for short sections).
- **Workflows and symbols** — "A → B → C" chains print as numbered steps; symbols the PDF fonts cannot
  draw are replaced with readable text.
