# Contact Directory Bulk Upload (v1093)

## Purpose

Import many project contacts from **Excel (`.xlsx`)**, **CSV**, or **JSON** into Contact Directory without merging existing rows.

## How to use

1. Open **Project Setup → Project Team → Contact Directory**.
2. Click **Bulk upload**.
3. Download a template (CSV / Excel / JSON).
   - **Excel:** sheets `Contacts` (data), `Legend` (data dictionary), `Instructions`.
   - **CSV:** one file — scroll to the top for the `# DATA DICTIONARY` block; contact rows start after the header line (dictionary lines are ignored on upload).
   - **JSON:** open the file and read `INSTRUCTIONS` + `DATA_DICTIONARY`; put your rows in `CONTACTS`.
4. Fill one contact per row. Multiple emails, phones, or addresses in one cell: separate with `;` or a new line.
5. Optional: `primary_email` / `primary_phone` / `primary_address` (must match a listed value; otherwise the first value is used and flagged).
6. Upload the file, review the **Upload summary**, then **Import**.

## Columns

| Column | Required | Notes |
|--------|----------|--------|
| `contact_name` (`name`) | Yes | |
| `role_title` (`role`) | No | New roles are added to Project Roles & Skills |
| `organisation` | No | Used for duplicate warnings |
| `contact_type` (`type`) | No | `internal`, `client`, `vendor`, `other` |
| `email` | No | Multi-value |
| `primary_email` | No | |
| `phone` | No | Multi-value |
| `primary_phone` | No | |
| `address` | No | Multi-value. One address per line, or separate with `;` |
| `primary_address` | No | |
| `notes` | No | |

## Import rules

- Valid rows are **always inserted as new contacts** (no update/merge).
- Invalid emails/phones or missing name → **skipped** with reasons.
- Same name + organisation already on the project → **anomaly warning**, still imported.
- Missing role labels → created in the project role catalog and noted in the summary.

## Route

`/platform/project-contacts/bulk-upload`
