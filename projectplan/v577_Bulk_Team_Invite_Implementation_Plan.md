# v577 — Bulk Team Invite Implementation Plan
**Feature:** Bulk project member invitation via CSV / Excel file upload (mixed-role support)  
**Target page:** `ProjectUsers.jsx` → route `/pm/team-members?action=invite`  
**Date:** 2026-05-18  
**Amendment 1:** 2026-05-18 — per-row mixed roles added (see §2, §5, §6, §7, §11)  
**Amendment 2:** 2026-05-18 — auto-create unknown roles into `project_roles` template pool (see §2, §3, §5, §6, §7, §10, §11)  
**Amendment 3:** 2026-05-18 — highlight all unrecognised roles prominently so PM can correct before committing (see §5, §11)  
**Amendment 4:** 2026-05-18 — dedicated Validation step (Step 2) with error report download and re-upload loop before PM can commit (see §2, §4, §5, §7, §10, §11)  
**Amendment 5:** 2026-05-18 — capture first name and surname as separate fields throughout (see §4, §5, §6, §7, §11)

---

## 1. Problem Statement

The PM can currently only invite team members one at a time.  
When onboarding a large team that all share the same project role this is slow and repetitive.

The PM needs to:
- Upload a CSV or Excel file containing email addresses, optional names, **and an optional role per row**
- When migrating a team from a previous project, members often carry different roles — the PM should not have to split them into separate files
- Set a **default fallback role** in the UI for any rows where the file omits the role column
- Review the parsed list, **edit individual roles inline**, and deselect any unwanted entries before sending
- When a role value in the file does not match any existing role, the system should **automatically create that role** in the `project_roles` template pool so it appears in all future dropdowns — the PM confirms new roles before they are persisted
- Optionally override the invitation message (a single generic message, or per-role auto-template)
- Have all uploaded rows **validated for errors before any data is committed** — the system checks email format, duplicates, membership conflicts, role gaps, and seat availability, and presents a full Validation Report the PM must clear before proceeding
- Correct error rows either **inline** in the Validation Report or by **downloading an annotated error file**, fixing it externally, and re-uploading — re-upload re-runs validation automatically
- Save the upload as a draft (hold queue) and resume later
- View per-row results after sending

---

## 2. Scope

### In-scope
- CSV and `.xlsx/.xls` upload parsing (`papaparse` + `xlsx` already installed)
- Multi-step wizard: **Upload → Validation Report → Review & Edit → Sending Progress → Results**
- **Per-row role assignment** — the file's `role` column sets each member's role; rows with no role fall back to the default role chosen in Step 1
- **Default fallback role selector** in Step 1 (required — covers rows missing a role value)
- **Inline role dropdown per row** in the review table — PM can correct/change any individual role before sending
- **Auto-create unknown roles** — any non-empty role value in the file that does not match an existing `project_roles` entry is flagged as **"New role"** (not an error). The PM reviews a "Roles to be created" panel in Step 2, can rename the display name, then confirms. Confirmed new roles are inserted into `project_roles` as global templates (`project_id = NULL, is_template = TRUE`) before invitations are sent, making them available in all future role dropdowns
- Per-row deselection checkboxes on the review table
- Custom message handling — two modes:
  - **Single message** — one message for all rows (overrides templates)
  - **Per-role auto-template** — message auto-resolves from `useInvitationTemplates` based on each row's final role (default when no custom message entered)
- **Dedicated Validation step (Step 2)** — runs all checks immediately after upload; PM cannot advance to Review until all blocking errors are resolved:
  - **Blocking errors:** invalid email format, duplicate email within file, no role resolved
  - **Warnings (non-blocking):** already a project member, already has a pending invite, batch size exceeds available seats
- Inline error correction within the Validation Report (edit email, assign role, exclude row)
- **Download annotated error file** — original file with an extra `error` column; PM fixes externally and re-uploads; re-upload reruns validation automatically
- **"Exclude all error rows"** quick action to dismiss all blocking rows in one click
- Seat-count validation before sending — blocks if batch would exceed seat limit
- Draft / hold queue — save progress (including per-row role edits) and resume later
- CSV template download (includes the `role` column with example values)
- Export results (CSV, Excel, JSON) after sending — reuses `ExportListMenu`
- Unit tests for the parse/send service
- **Platform–Simulator parity check** after implementation

### Out-of-scope
- Automatic seat purchase during bulk send
- Creating roles in the `roles` (system auth) table — only `project_roles` templates are created

---

## 3. Architecture

### New files

| File | Purpose |
|------|---------|
| `src/components/app/BulkInviteForm.jsx` | Multi-step wizard UI component |
| `src/services/bulkInviteService.js` | CSV/Excel parsing + batch send orchestration |
| `src/services/bulkRoleService.js` | Auto-create unknown roles into `project_roles` template pool |
| `src/services/bulkInviteDraftService.js` | Draft hold-queue CRUD (save / load / delete) |
| `src/services/__tests__/bulkInviteService.test.js` | Unit tests |
| `src/services/__tests__/bulkRoleService.test.js` | Unit tests for role auto-creation |
| `SQL/v590_bulk_invite_drafts.sql` | Draft table + RLS + registry entry |
| `Documentation/Bulk_Team_Invite_Guide.md` | User guide |

### Modified files

| File | Change |
|------|--------|
| `src/pages/app/ProjectUsers.jsx` | Add "Bulk invite" button; render `BulkInviteForm` panel when active |

---

## 4. Database — `bulk_invite_drafts`

```sql
CREATE TABLE IF NOT EXISTS bulk_invite_drafts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_by          UUID NOT NULL REFERENCES users(id),
  default_role_id     UUID REFERENCES project_roles(id),
  -- fallback role for rows where no role is specified in the file
  custom_message      TEXT,
  -- NULL = use per-role auto-template; non-NULL = single message for all rows
  members             JSONB NOT NULL DEFAULT '[]',
  -- each element:
  -- {
  --   email:            string,
  --   first_name:       string | null,  ← parsed from first_name column or split from name
  --   last_name:        string | null,  ← parsed from last_name column or split from name
  --   role_id:          UUID | null,    ← resolved UUID; null until new role is created
  --   role_name:        string | null,  ← slug
  --   role_display_name:string | null,  ← display label
  --   isNewRole:        boolean,        ← true = role pending creation
  --   rawRoleValue:     string | null,  ← original value from file
  --   selected:         boolean,
  --   status:           'pending'|'sent'|'failed'|'skipped'
  -- }
  pending_new_roles   JSONB NOT NULL DEFAULT '[]',
  -- [{rawValue, suggestedSlug, confirmedDisplayName, excluded}]
  -- persists the new-role review panel state across draft saves
  validation_errors   JSONB NOT NULL DEFAULT '[]',
  -- persists the last validation run so PM can resume without re-validating
  -- each element:
  -- {
  --   row_index:    number,
  --   email:        string,
  --   error_type:   'invalid_email'|'duplicate_email'|'no_role'
  --                 |'already_member'|'pending_invite'|'seat_limit',
  --   severity:     'error'|'warning',
  --   message:      string,   ← human-readable description
  --   resolved:     boolean   ← true once PM fixes inline or excludes the row
  -- }
  draft_status        VARCHAR(20) NOT NULL DEFAULT 'draft',
  -- 'draft' | 'sending' | 'completed' | 'cancelled'
  results             JSONB,
  -- [{email, role_id, success, error}]
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**RLS:** creator-only access (`created_by` matched via `users.auth_user_id = auth.uid()`).

---

## 5. Multi-step Wizard Flow

```
STEP 1 — UPLOAD & CONFIGURE
  ├── Default role selector (required — fallback for rows with no role in file)
  ├── File drop zone (accept .csv, .xlsx, .xls)
  ├── "Download CSV template" link  (template includes role column)
  ├── Message mode toggle:
  │     ○ Per-role auto-template (default — resolves message per row's role)
  │     ○ Single custom message   (one message overrides all rows)
  ├── Message textarea (shown only when "Single custom message" is chosen)
  ├── "Save as Draft" link
  └── [Next → validate automatically on file upload completion]

STEP 2 — VALIDATION REPORT  ◄ NEW — PM cannot advance until all errors = 0
  │
  ├── ── SUMMARY BANNER ──────────────────────────────────────────────────────
  │   ├── ✗ X blocking error(s) found  (red)   — must fix before proceeding
  │   ├── ⚠ Y warning(s)               (amber) — can proceed after reviewing
  │   └── ✓ Z row(s) are valid         (green)
  │
  ├── ── ERROR / WARNING TABLE ───────────────────────────────────────────────
  │   ├── Sortable columns: Row # ↑↓ | Email ↑↓ | Issue ↑↓ | Severity ↑↓
  │   ├── Per-row:
  │   │     Severity badge  |  Row #  |  Email (editable inline for invalid/dup)
  │   │     First Name (editable inline)  |  Last Name (editable inline)
  │   │     Role cell (inline dropdown — assignable for "no role" errors)
  │   │     Issue description  |  [✕ Exclude row] button
  │   │
  │   ├── BLOCKING ERRORS (red rows — block the send button):
  │   │     • Invalid email format    → editable inline; fix and re-validate cell
  │   │     • Duplicate email in file → one copy kept, rest highlighted; PM excludes dups
  │   │     • No role resolved        → inline role dropdown; assign or exclude row
  │   │
  │   └── WARNINGS (amber rows — informational, PM can acknowledge and proceed):
  │         • Already a project member  → pre-excluded; PM can force-include if needed
  │         • Already has pending invite → pre-excluded; PM can force-include
  │         • Batch exceeds seat limit   → shown as a count banner, not per-row
  │
  ├── ── ACTIONS ─────────────────────────────────────────────────────────────
  │   ├── [↓ Download error report]
  │   │     Exports original file + extra `error` and `severity` columns
  │   │     PM fixes the file externally, then re-uploads ↓
  │   ├── [↑ Re-upload corrected file]
  │   │     Replaces current rows and reruns all validation automatically
  │   │     Draft is updated; PM does not lose role/message config from Step 1
  │   ├── [✕ Exclude all error rows]  ← quick-action: removes all blocking rows
  │   └── "Save as Draft" button
  │
  ├── Seat usage banner: "X of Y seats available — selected valid rows use Z"
  └── [← Back]  [Proceed to Review →]  ← enabled only when blocking errors = 0

STEP 3 — REVIEW & EDIT
  ├── ── NEW ROLES PANEL (shown only when unrecognised role values remain) ──
  │   ├── Heading: "Unrecognised roles detected — correct or confirm before sending"
  │   ├── Banner style: amber/yellow warning strip — visually distinct and hard to miss
  │   ├── Per-new-role row (one row per distinct unknown value):
  │   │     ⚠ Raw file value (highlighted in amber)
  │   │       → auto-slugified role_name (read-only, shown in monospace)
  │   │       → Display name field (pre-filled, fully editable — PM corrects typos here)
  │   │     e.g. "tem_member" → slug: "tem_member" → [tem_member      ] ← PM fixes to "Team Member"
  │   ├── Inline validation: if the edited display name resolves to a slug that
  │   │   already exists in project_roles, show a green "Matches existing role:
  │   │   <role_display_name>" hint and treat as resolved (no new role created)
  │   ├── Checkbox to exclude a new role from creation (affected rows revert to
  │   │   the default fallback role or show "No role" if no default set)
  │   └── Info note: "Confirmed roles will be added to the global role library
  │                   and appear in all future role dropdowns."
  │
  ├── Card ⊞ / Table ≡ view toggle (localStorage per page)
  ├── Sortable columns: Email ↑↓, First Name ↑↓, Last Name ↑↓, Role ↑↓, Status ↑↓
  ├── Per-row columns:
  │     ☑  Checkbox — deselect to exclude
  │     📧  Email (display only — errors already cleared in Step 2)
  │     👤  First Name (editable inline — PM can correct/add before sending)
  │     👤  Last Name  (editable inline — PM can correct/add before sending)
  │     🎭  Role — inline dropdown (existing roles) or "New role" pill for
  │           rows whose role will be auto-created; PM can reassign at any time
  │     ⚠   Status badge: OK | Already a member (warning) | New role (teal)
  ├── "New role" rows → teal badge on role cell + amber left-border row highlight
  │     (visually groups all affected rows so PM can scan which members are
  │      tied to an unrecognised role that will be created)
  ├── Role summary chip strip: e.g. "Team Member ×8  Team Manager ×2  ⚠ Senior Developer* ×3"
  │     (* asterisk + ⚠ icon on chips for roles pending creation)
  ├── "Save as Draft" button  (persists per-row role edits and new-role display names)
  └── [← Back]  [Send X Invitations →]

STEP 4 — SENDING PROGRESS (auto, cannot navigate away)
  ├── Sub-step A — Role creation (only if new roles confirmed):
  │     "Creating N new role(s)…"
  │     Per-role status: Creating… → ✓ Created / ✗ Failed
  │     If any role creation fails → abort and return to Step 3 with error
  ├── Sub-step B — Invitations:
  ├── Progress bar (sent / total)
  └── Live per-row status: Queued → Sending… → ✓ Sent / ✗ Failed
        (each row shows the final resolved role)

STEP 5 — RESULTS SUMMARY
  ├── Counts: Sent / Failed / Skipped
  ├── Per-row result table (sortable; includes Role column)
  ├── Export dropdown: CSV, Excel, JSON
  └── [Invite more]  [Back to team]
```

---

## 6. CSV Template Format

```
email,first_name,last_name,role
john.smith@example.com,John,Smith,team_member
jane.doe@example.com,Jane,Doe,team_manager
bob.jones@example.com,Bob,Jones,
```

- `email` — required
- `first_name` — optional; stored and passed to the invitation email as the invitee's first name
- `last_name` — optional; combined with `first_name` as the invitee's full name in the invitation
- **Legacy `name` column** — if the file contains a single `name` column instead of `first_name`/`last_name`, the parser splits on the first space: `"John Smith"` → `first_name: "John"`, `last_name: "Smith"`. Names with no space are stored as `first_name` only.
- `role` — optional per row. Two behaviours:
  - **Matches an existing slug** (e.g. `team_member`, `team_manager`) → resolved immediately to its UUID
  - **Non-empty but unrecognised** (e.g. `Senior Developer`, `Risk Analyst`) → flagged as **"New role"**; the PM reviews and confirms creation in Step 2 before invitations are sent
  - **Blank / missing** → falls back to the default fallback role chosen in Step 1
  - The downloaded template includes a comment row listing all current valid role slugs for convenience
- Header row required (column names are case-insensitive)
- Extra columns silently ignored; duplicate emails deduplicated (case-insensitive)
- Slug derivation for new roles: trimmed input is lowercased and spaces/special chars replaced with underscores (e.g. `Senior Developer` → `senior_developer`); duplicate slugs are suffixed `_2`, `_3`, etc.

---

## 7. `bulkInviteService.js` — Key Functions

```js
// Parse a File object, resolving role values against availableRoles.
// Non-empty unrecognised values are returned as newRoles (not errors).
// defaultRoleId is applied to blank/null role cells.
// → {
//     rows: [{
//       email,
//       first_name,     // parsed from first_name col, or split from legacy name col
//       last_name,      // parsed from last_name col, or split from legacy name col
//       role_id,        // UUID if resolved; null if pending new-role creation
//       role_name,      // slug
//       role_display_name,
//       isNewRole,      // true = needs creation in project_roles before sending
//       rawRoleValue,   // original string from file (for display in Step 2)
//       selected, validEmail
//     }],
//     newRoles: [{rawValue, suggestedSlug, suggestedDisplayName}],
//     errors: string[]
//   }
parseBulkInviteFile(file, { availableRoles, defaultRoleId })

// Build the downloadable CSV template string with a valid-roles comment row.
generateCsvTemplate(availableRoles)

// Validate all parsed rows against live project data.
// Checks: email format, intra-file duplicates, existing membership,
//         pending invitations, role resolution, seat headroom.
// Does NOT write anything — read-only checks only.
// → {
//     errors: [{rowIndex, email, errorType, severity, message}],
//     // severity: 'error' (blocking) | 'warning' (non-blocking)
//     hasBlockingErrors: boolean,
//     validCount: number,
//     errorCount: number,
//     warningCount: number
//   }
validateBulkInviteRows(rows, projectId, { seatInfo, existingMembers, pendingInvites })

// Build the annotated error-report file (CSV) for download.
// Adds `error` and `severity` columns to the original rows.
// → Blob (text/csv)
generateErrorReportCsv(rows, validationErrors)

// Send invites sequentially after new roles have already been created.
// Each row carries its own resolved role_id.
// message: null → per-role auto-template; string → single message for all rows.
// Calls onProgress({index, email, role_id, status}) per row.
sendBulkInvitations(
  projectId,
  rows,
  { message, expiryDays, inviterContext, templates },
  onProgress
)
// → {sent, failed, skipped, results: [{email, role_id, role_name, success, error}]}
```

Stops and marks remaining rows `skipped` if the seat limit is hit mid-batch.

---

## 7a. `bulkRoleService.js` — Key Functions

```js
// Derive a safe role_name slug from a raw string.
// e.g. "Senior Developer" → "senior_developer"
// Appends _2, _3 if slug already exists in existingSlugs.
deriveRoleSlug(rawValue, existingSlugs)

// Insert confirmed new roles into project_roles as global templates.
// project_id = NULL, is_template = TRUE, is_system_default = FALSE
// Each item: {role_name, role_display_name, role_description?}
// Returns [{role_name, role_display_name, id}] — caller patches row role_ids.
// Skips (ON CONFLICT DO NOTHING) if a matching role_name already exists.
createProjectRoleTemplates(newRoles)
// → {created: [{id, role_name, role_display_name}], skipped: string[], errors: string[]}

// Fetch the full current list of project_roles templates for a project picker.
// Used to refresh the inline role dropdown after new roles are created.
fetchAvailableRoles()
// → [{id, role_name, role_display_name, is_system_default}]
```

---

## 8. Draft Service — `bulkInviteDraftService.js`

```js
// Persists all wizard state including validation results and new-role panel edits
saveDraft(projectId, {defaultRoleId, message, members, pendingNewRoles, validationErrors})
// upsert, returns draftId

loadDraft(projectId)    // latest 'draft' row for project
deleteDraft(draftId)
updateDraftResults(draftId, results, status)
```

When a draft is resumed:
- **Step 2 (Validation)** is restored with the last `validationErrors` snapshot — PM resumes where they left off without re-uploading
- **Step 3 (Review)** restores per-row role edits and the new-role display-name panel
- If the PM re-uploads a corrected file, validation reruns and overwrites `validationErrors` in the draft

A "Resume draft" banner appears on the `ProjectUsers.jsx` page when a `draft` row exists for the current project.

---

## 9. Integration into `ProjectUsers.jsx`

- Existing "Add member" button — unchanged
- New "Bulk invite" button (secondary/outline style) added alongside it
- Clicking either toggles the respective form panel (mutually exclusive)
- `BulkInviteForm.onSuccess` triggers the existing pending-invitations list reload

---

## 10. Todo List

### Phase A — Database
- [x] **A1.** Create `SQL/v590_bulk_invite_drafts.sql`  
  (table, indexes, RLS, `database_tables` registry INSERT)

### Phase B — Services
- [x] **B1.** Create `src/services/bulkInviteService.js`  
  — `parseBulkInviteFile`, `validateBulkInviteRows`, `generateErrorReportCsv`, `generateCsvTemplate`, `sendBulkInvitations`
- [x] **B2.** Create `src/services/bulkRoleService.js`  
  — `deriveRoleSlug`, `createProjectRoleTemplates`, `fetchAvailableRoles`
- [x] **B3.** Create `src/services/bulkInviteDraftService.js`  
  — draft CRUD including `validationErrors` and `pendingNewRoles` fields
- [x] **B4.** Create `src/services/__tests__/bulkInviteService.test.js`  
  — covers parse, validate (all error types + severities), error-report CSV generation
- [x] **B5.** Create `src/services/__tests__/bulkRoleService.test.js`

### Phase C — UI Component
- [x] **C1.** Create `src/components/app/BulkInviteForm.jsx` — Step 1 (Upload & Configure)
- [x] **C2.** Add Step 2 (Validation Report):
  - Summary banner (blocking errors / warnings / valid counts)
  - Error/warning table with sortable columns
  - Inline email edit + inline role dropdown for error rows
  - Per-row exclude button
  - "Exclude all error rows" quick action
  - "Download error report" (annotated CSV via `generateErrorReportCsv`)
  - "Re-upload corrected file" — replaces rows and reruns validation
  - "Proceed to Review" gated on `hasBlockingErrors === false`
- [x] **C3.** Add Step 3 (Review & Edit) — "New roles" confirmation panel + checkboxes, seat banner, sort, card/table toggle, teal "New role" badge per row
- [x] **C4.** Add Step 4 (Sending Progress) — sub-step A: role creation; sub-step B: invitation progress bar + live row status
- [x] **C5.** Add Step 5 (Results Summary) — counts, sortable table, export dropdown
- [x] **C6.** CSV template download (Step 1)
- [x] **C7.** Wire draft save/load — "Save Draft" persists validation state; resume banner on parent page

### Phase D — Page Integration
- [x] **D1.** Update `src/pages/app/ProjectUsers.jsx`  
  — "Bulk invite" button + `BulkInviteForm` panel + resume-draft banner

### Phase E — Parity, Docs, QA
- [x] **E1.** Create `Documentation/Bulk_Team_Invite_Guide.md`
- [x] **E2.** Check Simulator team pages — apply equivalent bulk invite if applicable
- [x] **E3.** Verify no duplicate imports introduced
- [x] **E4.** Run existing `InviteUserForm` tests — confirm no regression
- [x] **E5.** Mobile / PWA responsive check

---

## 11. Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Dedicated Validation step before Review | Errors are far cheaper to fix before data is committed; a single pass that surfaces all issues at once is more efficient than the PM discovering problems one row at a time mid-send |
| Two-severity model: blocking errors vs warnings | Invalid emails and missing roles genuinely cannot be sent; already-a-member is informational — a blanket block on warnings would frustrate PMs re-inviting accidental omissions |
| Inline fix + download-and-re-upload as parallel correction paths | Small lists are faster to fix inline; large exports with 50+ errors are faster to fix in Excel and re-upload — both paths should be available |
| Re-upload reruns validation automatically | PM should not have to manually click "Validate" after re-uploading; the action implies intent to re-check |
| Validation is read-only (no writes) | Keeps the validation step fully reversible — PM can go back, change the default role or message, and re-upload without side effects |
| `validationErrors` persisted in draft | PM may close the browser mid-review; on resume they should land back on Step 2 with their progress intact, not have to re-upload and re-validate |
| Per-row role in file + default fallback | Supports migrating teams from previous projects where members carry varied roles; a fallback role covers rows that don't specify one, keeping Step 1 simple |
| Inline role dropdown in review table | PM can correct file mistakes or override individual roles without re-uploading |
| Per-role auto-template as the default message mode | Each invitee gets a contextually correct invitation; PM can switch to a single custom message when they prefer a uniform tone |
| Unknown non-empty roles → "New role" (not an error) | A blank role is an omission; a named role that doesn't exist yet is intent — treating it as an error would force the PM to leave the wizard, create the role manually, re-upload the file, and start over |
| New roles inserted as `project_roles` global templates (`project_id = NULL`) | This is the pool that feeds all future role dropdowns across all projects; a project-scoped insert would be invisible elsewhere |
| All unrecognised roles highlighted prominently (amber panel + amber row borders + ⚠ chip) | A typo like `tem_member` looks plausible in a table cell; the amber highlight forces the PM's eye to it before they can proceed — prevents silently creating garbage roles in the global library |
| Inline slug-match check while PM edits display name | If the PM corrects `tem_member` → `Team Member`, the slug resolves to the existing `team_member` — no new role is created, and the row turns green immediately, giving instant feedback |
| PM must confirm new roles in Step 2 before they are created | Prevents accidental insertion of typos into the global role library even after the highlight is noticed |
| Slug auto-derived; display name editable | Slug must be a safe identifier; display name should be human-readable — PM may want to capitalise or reword |
| Role creation runs as sub-step A before invitations (sub-step B) | Rows referencing the new role need its UUID before `inviteUserToProject` is called |
| `ON CONFLICT DO NOTHING` on role insert | If two drafts race or the PM re-sends, no duplicate roles are created |
| Role resolved at parse time (slug → UUID) | Known slugs fail fast with a "No role" badge; unknown non-empty values take the new-role path instead |
| Sequential sends (not parallel) | Avoids seat-count race conditions and RPC rate-limits |
| First name and last name as separate columns | A combined `name` field forces the system to guess where the split is; separate columns are unambiguous and allow the invitation email to address the invitee by first name only |
| Legacy single `name` column auto-split on first space | Backwards-compatible with files exported from older tools; PM is not forced to reformat a large spreadsheet just to accommodate two columns |
| First Name / Last Name editable inline in both Step 2 and Step 3 | PM may receive a file with blank or placeholder names and want to fill them in without re-exporting |
| `papaparse` for CSV, `xlsx` for Excel | Both already installed — no new dependencies |
| Draft stores per-row role edits | PM can pause mid-review, come back, and not lose individual role corrections |
| Export via existing `ExportListMenu` | No duplicated export code |

---

## 12. Review

**Completed:** 2026-05-19

### Summary

- **SQL `v590_bulk_invite_drafts.sql`:** Draft table with JSONB members, pending new roles, validation snapshot, RLS (creator-only), registry entry.
- **Services:** `bulkInviteService.js` (parse CSV/XLSX, validate, error report, sequential send), `bulkRoleService.js` (slug + template insert), `bulkInviteDraftService.js` (save/load/delete).
- **UI:** `BulkInviteForm.jsx` five-step wizard (upload → validation → review → sending → results), theme-aware, PWA-friendly touch targets.
- **Page:** `ProjectUsers.jsx` — Bulk invite / Add member toggle, resume-draft banner, `?action=bulk-invite` deep link.
- **Docs:** `Documentation/Bulk_Team_Invite_Guide.md`.
- **Tests:** `bulkInviteService.test.js`, `bulkRoleService.test.js` (Vitest).

### Deployment

1. Run `SQL/v590_bulk_invite_drafts.sql` in Supabase (after invitation SQL v586–v587 if not already applied).
2. Ensure PM invite RPC/RLS migrations (v579, v580, v556) are applied for sends to succeed.

### Simulator parity (E2)

Not applicable: Simulator practice teams do not use `project_invitations` email flow. Bulk invite is Platform-only per plan scope.

### Notes

- Card grid view on review step uses `ViewToggle`; primary review layout is table for inline edits.
- Sortable column headers on validation table can be extended in a follow-up; review table uses `useSortableTable` for row ordering.
