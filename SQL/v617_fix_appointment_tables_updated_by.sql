-- v617: Add missing audit columns to appointment tables
-- The trigger_update_audit_fields() (BEFORE UPDATE) sets:
--   NEW.updated_by := auth.uid()
--   NEW.created_by := OLD.created_by
-- Both tables were created without these columns, causing 400 errors on any UPDATE.

ALTER TABLE public.manager_appointment_records
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS updated_by UUID;

ALTER TABLE public.team_member_appointment_records
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS updated_by UUID;
