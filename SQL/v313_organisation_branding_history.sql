-- ============================================================
-- v313: Organisation Branding History / Audit Trail
-- Captures a full JSONB snapshot on every UPDATE to
-- organisation_branding so admins can revert to prior state.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.organisation_branding_history (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id        UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  changed_by        UUID REFERENCES auth.users(id),
  changed_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  previous_values   JSONB NOT NULL,   -- Full row snapshot BEFORE the update
  new_values        JSONB NOT NULL,   -- Full row snapshot AFTER the update
  change_description TEXT            -- Human-readable summary (optional, set by trigger)
);

-- Index for fast account-based lookup
CREATE INDEX IF NOT EXISTS idx_org_branding_history_account
  ON public.organisation_branding_history (account_id, changed_at DESC);

-- ──────────────────────────────────────────
-- Trigger: auto-snapshot on every UPDATE
-- ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.record_organisation_branding_history()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.organisation_branding_history (
    account_id,
    changed_by,
    changed_at,
    previous_values,
    new_values,
    change_description
  ) VALUES (
    OLD.account_id,
    auth.uid(),
    NOW(),
    to_jsonb(OLD),
    to_jsonb(NEW),
    'Branding updated'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_organisation_branding_history ON public.organisation_branding;
CREATE TRIGGER trg_organisation_branding_history
  AFTER UPDATE ON public.organisation_branding
  FOR EACH ROW
  WHEN (OLD IS DISTINCT FROM NEW)
  EXECUTE FUNCTION public.record_organisation_branding_history();

-- ──────────────────────────────────────────
-- Row Level Security
-- ──────────────────────────────────────────
ALTER TABLE public.organisation_branding_history ENABLE ROW LEVEL SECURITY;

-- SELECT: pmo_admin and super_admin of the same account can read history
CREATE POLICY "org_branding_history_select_admin"
  ON public.organisation_branding_history FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND r.role_name IN ('pmo_admin', 'super_admin', 'org_admin')
        AND (ur.is_deleted = false OR ur.is_deleted IS NULL)
    )
  );

-- No manual INSERT/UPDATE/DELETE – only the trigger writes to this table
-- DELETE: super_admin only (for GDPR / data hygiene)
CREATE POLICY "org_branding_history_delete_superadmin"
  ON public.organisation_branding_history FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND r.role_name = 'super_admin'
        AND (ur.is_deleted = false OR ur.is_deleted IS NULL)
    )
  );

-- ──────────────────────────────────────────
-- Register in database_tables registry
-- ──────────────────────────────────────────
INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES (
  'organisation_branding_history',
  'Audit trail of all changes to organisation_branding; stores JSONB snapshots for revert capability',
  true,
  true
)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  updated_at = NOW();
