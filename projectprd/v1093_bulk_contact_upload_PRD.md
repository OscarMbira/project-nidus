# v1093 — Bulk Contact Upload

**Status:** Approved for implementation (interview locked 2026-09-20).
**Related:** Contact Directory (`project_contacts`), Project Roles & Skills (`project_functional_roles`).

---

## a) Problem statement

Contact Directory only supports single-contact create. PMs often bring contacts from
Excel/CSV/JSON exports and need a safe bulk path that validates emails/phones, preserves
multi-value email/phone + primary flags, and surfaces duplicates/anomalies without
silently overwriting existing rows.

## b) Solution

Dedicated bulk-upload page under Contact Directory accepting Excel, CSV, and JSON.
One row per contact; multi email/phone via `;` or newline; optional primary columns.
Valid rows insert as new contacts; invalid rows skip with errors. Preview/import summary
flags likely duplicates and other anomalies. Missing roles are auto-added to the project
functional-roles catalog.

## c) User stories

1. As a user, I open Bulk upload from Contact Directory and download a CSV/Excel/JSON template.
2. As a user, I upload a file and see a preview: ready rows, skipped rows with reasons, and anomaly warnings.
3. As a user, I confirm import; only ready rows are inserted; I see an imported/skipped summary.
4. As a user, invalid emails/phones never become contacts.
5. As a user, when a role in the file is new, it is added to Project Roles & Skills for reuse.
6. As a user, existing same name+organisation contacts are called out as anomalies but still inserted as new rows (no merge).

## d) Implementation decisions

1. Formats: `.xlsx`, `.csv`, `.json` only (no XML).
2. Always insert; never update/merge.
3. Partial import (valid proceed, invalid skip).
4. Routed page `/platform/project-contacts/bulk-upload` (not a modal).
5. No new sidebar menu leaf.
6. Platform only (Contact Directory has no Simulator mirror today).
7. Roles: `ensureProjectFunctionalRole` for each distinct non-blank role.

## e) Testing decisions

- Normalize aliases (`name` → `contact_name`, multi-split, primary fallback).
- Invalid email/phone → skipped with message.
- Duplicate name+org vs existing → anomaly, still ready.
- Unknown contact_type → anomaly / skipped if invalid enum.

## f) Out of scope

- Merge/update existing contacts
- New `menu_items` row
- XML
- Cleaning historically saved junk emails

## g) Further notes

Columns: `contact_name`/`name`, `role_title`/`role`, `organisation`, `contact_type`/`type`,
`email`, `primary_email`, `phone`, `primary_phone`, `notes`.
