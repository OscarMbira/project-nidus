-- ============================================================================
-- v914: Menu Bundles — Schema (Phase 1 of 4, Platform/public schema)
-- ============================================================================
-- See projectprd/v914_org_menu_bundles_PRD.md and
-- projectplan/v914_org_menu_bundles_plan.md for full context.
--
-- A Menu Bundle is a named, organisation-scoped, reusable set of EXISTING menu_items
-- references — never new menu items (rule 25.1/26). Attaching a bundle to a role (Create or
-- Edit) copies its items into that role's grants at save time (a one-time copy, not a live
-- link) — editing or deleting a bundle afterward never retroactively changes any role already
-- built from it. Mirrors the account_id-scoping pattern already established for org custom
-- roles (v902_organisation_custom_roles_schema.sql).
-- Prerequisites: v84_accounts_and_extensions.sql (accounts), v05_configuration_menu_tables.sql
-- (menu_items), v03_user_access_tables.sql (users)
-- ============================================================================

-- ── 1. org_menu_bundles ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.org_menu_bundles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id    UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  bundle_name   VARCHAR(150) NOT NULL,
  description   TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  is_deleted    BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at    TIMESTAMP,
  deleted_by    UUID REFERENCES public.users(id),
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by    UUID REFERENCES public.users(id),
  updated_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_by    UUID REFERENCES public.users(id)
);

COMMENT ON TABLE public.org_menu_bundles IS
  'v914: a named, organisation-scoped, reusable set of existing menu_items references. '
  'Attaching a bundle to a role copies its items at save time (one-time copy, no live link) — '
  'editing or deleting a bundle never retroactively changes a role already built from it.';

-- Per-organisation name uniqueness (PRD decision 8), case-insensitive, active rows only —
-- mirrors the COALESCE-sentinel pattern from v902 for consistency, though account_id is
-- NOT NULL here (unlike roles.account_id) so a plain composite index suffices.
CREATE UNIQUE INDEX IF NOT EXISTS uq_org_menu_bundles_name_per_account
  ON public.org_menu_bundles (account_id, lower(bundle_name))
  WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_org_menu_bundles_account_id
  ON public.org_menu_bundles(account_id) WHERE is_deleted = FALSE;

CREATE TRIGGER trg_org_menu_bundles_before_insert
  BEFORE INSERT ON public.org_menu_bundles
  FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

CREATE TRIGGER trg_org_menu_bundles_before_update
  BEFORE UPDATE ON public.org_menu_bundles
  FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- ── 2. org_menu_bundle_items ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.org_menu_bundle_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id     UUID NOT NULL REFERENCES public.org_menu_bundles(id) ON DELETE CASCADE,
  menu_item_id  UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.org_menu_bundle_items IS
  'v914: the menu_items a Menu Bundle contains. Full-replace semantics on update — no '
  'per-item history.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_org_menu_bundle_items_bundle_menu_item
  ON public.org_menu_bundle_items(bundle_id, menu_item_id);

CREATE INDEX IF NOT EXISTS idx_org_menu_bundle_items_bundle_id
  ON public.org_menu_bundle_items(bundle_id);

-- ── 3. RLS ────────────────────────────────────────────────────────────────────
-- Broad authenticated SELECT, no direct-client write policies — mirrors project_roles'
-- existing read policy shape (v99/v100_complete_rls_recursion_fix.sql) and the write
-- discipline already established for this feature family (v903: "roles/project_roles/
-- role_menu_items stay RLS-restricted for direct client writes... RPCs are the only write
-- path"). The JS service layer filters by account_id explicitly (mirrors
-- getOrgCustomRoles(accountId)); all writes go through the Phase 2 RPCs only (rule 42).

ALTER TABLE public.org_menu_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_menu_bundle_items ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.org_menu_bundles TO authenticated;
GRANT SELECT ON public.org_menu_bundle_items TO authenticated;

DROP POLICY IF EXISTS policy_org_menu_bundles_authenticated_read ON public.org_menu_bundles;
CREATE POLICY policy_org_menu_bundles_authenticated_read
  ON public.org_menu_bundles FOR SELECT TO authenticated
  USING (is_deleted = FALSE);

DROP POLICY IF EXISTS policy_org_menu_bundle_items_authenticated_read ON public.org_menu_bundle_items;
CREATE POLICY policy_org_menu_bundle_items_authenticated_read
  ON public.org_menu_bundle_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.org_menu_bundles b
      WHERE b.id = org_menu_bundle_items.bundle_id AND b.is_deleted = FALSE
    )
  );

-- ── 4. Database table registration (mandatory) ──────────────────────────────

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('org_menu_bundles', 'Named, organisation-scoped reusable sets of existing sidebar menu items (Menu Bundles, v914)', false, true),
  ('org_menu_bundle_items', 'The menu_items belonging to each Menu Bundle (v914)', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE 'v914: org_menu_bundles + org_menu_bundle_items created (Platform/public schema)';
END $$;
