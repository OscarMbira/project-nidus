# Mandate Approval Audit Trail

## Overview

The Approval History section on the PMO Mandate view (and Platform mandate view) now includes full audit trail details for each approval or rejection.

## Audit Fields

For each approval history entry the system records and displays:

| Field | Description |
|-------|-------------|
| **Approver name** | Full name of the user who approved or rejected (from `users.full_name`). |
| **Date** | Date of the decision (from `approval_date` or `approval_at`). |
| **Time** | Time of the decision (when `approval_at` is stored). |
| **IP Address** | Client IP at the time of approve/reject (when provided by the client). |
| **Requested** | When the mandate was submitted for approval. |
| **Comments** | Approval or rejection comments. |

## Database Changes

- **SQL migration**: `SQL/v263_mandate_approvals_audit_trail.sql`
  - Adds `approval_at` (TIMESTAMPTZ) for exact date and time.
  - Adds `approval_ip_address` (VARCHAR(45)) for client IP.

Run this migration on your Supabase database to enable the new columns. Existing rows keep existing `approval_date`; new approve/reject actions will set both `approval_date` and `approval_at`.

## Behaviour

1. **On approve/reject**  
   The workflow service sets:
   - `approver_name` from the current user’s `full_name`
   - `approval_at` to the current server timestamp
   - `approval_ip_address` when the client sends it (optional)

2. **Client IP**  
   The Mandate Approval Dashboard and MandateApprovals component optionally fetch the client’s public IP (e.g. via ipify) and pass it into `approveMandate` / `rejectMandate`. If the fetch fails or is unsupported, the action still succeeds and IP is left null.

3. **UI**  
   The Approval History card on the mandate view shows the audit fields in a structured layout (approver, date, time, IP, requested, comments).

## Service API

- `approveMandate(approvalId, approverId, comments, ipAddress)` — fourth argument optional.
- `rejectMandate(approvalId, approverId, comments, ipAddress)` — fourth argument optional.
