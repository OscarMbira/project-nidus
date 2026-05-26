# Bulk Team Invite — User Guide

## Overview

Project Managers and PMO users can invite many team members at once by uploading a **CSV** or **Excel** file from **Project members** (`/pm/team-members`).

## Getting started

1. Open **Project members** and select your project.
2. Click **Bulk invite** (next to **Add member**).
3. Choose a **default role** for any row that leaves the `role` column blank.
4. Upload your file or download the **CSV template** first.

## File format

| Column       | Required | Notes |
|-------------|----------|--------|
| `email`     | Yes      | One invite per email |
| `first_name`| No       | Used in the invitation greeting |
| `last_name` | No       | Combined with first name in the message |
| `role`      | No       | Role slug (e.g. `team_member`) or display name; blank uses default role |

**Legacy `name` column:** A single `name` field is split on the first space into first and last name.

## Wizard steps

1. **Upload & configure** — Default role, message mode (per-role template vs one custom message), file upload.
2. **Validation** — Fix blocking errors (invalid email, duplicates, missing role) or download an error report, fix in Excel, and re-upload.
3. **Review & edit** — Confirm new roles, deselect rows, edit names/roles inline.
4. **Sending** — New roles are created first (if any), then invitations are sent one at a time.
5. **Results** — Summary and export (CSV, Excel, JSON, etc.).

## Drafts

Use **Save draft** on the validation or review step. A **Resume draft** banner appears on the project members page when a draft exists.

## Database setup

Run `SQL/v590_bulk_invite_drafts.sql` in Supabase before using drafts.

## Simulator

The Simulator uses practice teams, not project email invitations. Bulk invite applies to the **Platform** project members flow only.
