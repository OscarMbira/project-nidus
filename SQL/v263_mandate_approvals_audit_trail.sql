-- v263: Add audit trail columns to mandate_approvals (approval timestamp, IP address)
-- For audit: approver name (already present), date, time, IP address.

ALTER TABLE mandate_approvals
  ADD COLUMN IF NOT EXISTS approval_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approval_ip_address VARCHAR(45);

COMMENT ON COLUMN mandate_approvals.approval_at IS 'Exact date and time of approval/rejection (audit trail)';
COMMENT ON COLUMN mandate_approvals.approval_ip_address IS 'Client IP address at time of approval/rejection (audit trail)';

-- Backfill approval_at from approval_date where possible (existing rows)
UPDATE mandate_approvals
SET approval_at = (approval_date::timestamp AT TIME ZONE 'UTC')
WHERE approval_at IS NULL AND approval_date IS NOT NULL;
