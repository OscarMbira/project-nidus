# Form Instance Bulk Approve & Workflow (v860)

## What it does

1. **Project Forms register** — select draft rows (or all drafts in the current filtered list) and **Approve selected** with one shared justification.
2. **Form View** — Submit / Approve / Reject / Archive with status gates; Approve & Reject require justification; Version History and Audit Timeline load from the database.
3. **Organisation setting** — `accounts.form_bulk_approve_max` (default **1000**, max 10000) editable under PMO Organisation Methodology / Organisation Settings.

## Apply SQL

Run in Supabase SQL editor:

- `SQL/v860_accounts_form_bulk_approve_max.sql`

(Requires form instance RLS from v858/v859 so status updates succeed.)

## Status gates

| Action | Allowed from |
|--------|----------------|
| Submit | `draft`, `rejected` → `in_review` |
| Approve | `draft`, `in_review` → `approved` |
| Reject | `in_review` → `rejected` |
| Archive | `draft`, `in_review`, `rejected` |
| Bulk Approve | selected **drafts** only → `approved` |

## Soft cap

If selection size &gt; org `form_bulk_approve_max`, Bulk Approve is blocked with a clear error. Raise the limit in organisation settings (PMO Admin).

## Single records list (no Draft Queue duplicate)

Project Forms keeps **one** register (Records / All Records). Drafts appear there with Edit / Delete — there is no separate Draft Queue on this page (that duplicated the same rows).

Bulk remove: select rows in Records → **Delete selected** (archives). They remain available under the Archived status filter.

## Platform + Simulator

Same UX on both apps. Cap is always read from `public.accounts` via the project’s `account_id` (Simulator falls back to the current user’s account).

## User-friendly record labels

All form instance surfaces (records table, View/Edit headers) show a **display title** derived from instance field values — typically `Task Id — Task Description` — instead of repeating the template name. Template name and `FI-…` remain as secondary subtitle text.

## Display IDs in URLs (rule 16.1)

Form record edit/view URLs use human-readable keys:

- **Project segment:** `project_code` when available (e.g. `SEED334-PRJ-07`)
- **Form instance segment:** `instance_reference` (e.g. `FI-QE55Z65KW`)

Example: `/platform/projects/SEED334-PRJ-07/forms/FI-QE55Z65KW/edit`

Loaders still accept legacy UUID bookmarks and replace the URL with the display IDs after load.
