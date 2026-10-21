-- ============================================================================
-- v1311: Organisation custom fields on Local Registers — schema
-- ============================================================================
-- PRD:  projectprd/v1311_local_register_custom_fields_PRD.md   (decisions D1–D15)
-- Plan: projectplan/v1311_local_register_custom_fields_plan.md
--
-- Field DEFINITIONS reuse Local Data Extensions (LDE, v515/v519): account-scoped
-- custom_field_definitions + custom_field_options, attached to a register through
-- custom_field_screen_map against one system_screens row per register
-- (screen_code 'local_register:<register id>', module 'local_registers').
-- Field VALUES live on the register record (local_register_records.field_values under
-- 'cf__<definition id>'), not in LDE's project-scoped custom_field_values (D13).
--
-- This file:
--   1. Adds the 'multi_line' (multi-value list) type to LDE definitions (public + sim).
--   2. Adds the 'local_registers' system module (public + sim) that register screens hang off.
--   3. Creates the custom-field limit settings (global default 30 + per-organisation overrides),
--      read by everyone, written ONLY by System Admin through audited RPCs
--      (E:\project-nidus-admin\SQL\v242_local_register_custom_field_limit_admin_rpc.sql).
--   4. public.local_register_custom_field_limit(account) — the effective limit.
-- Run order: v1311 → v1312 (RPCs) → v1313 (tests); then Admin v242.
-- After running: re-run SQL/v1251_planner_table_wall.sql (two new public tables, CLAUDE.md DB rule 6).
-- Idempotent.
-- ============================================================================

-- ── 1. 'multi_line' field type for LDE definitions ──────────────────────────────────
ALTER TABLE public.custom_field_definitions DROP CONSTRAINT IF EXISTS chk_cfd_type;
ALTER TABLE public.custom_field_definitions
  ADD CONSTRAINT chk_cfd_type CHECK (field_type IN (
    'text','long_text','number','integer','date','datetime','boolean','url','email',
    'dropdown','multi_select','json','multi_line'
  ));

ALTER TABLE sim.custom_field_definitions DROP CONSTRAINT IF EXISTS chk_sim_cfd_type;
ALTER TABLE sim.custom_field_definitions
  ADD CONSTRAINT chk_sim_cfd_type CHECK (field_type IN (
    'text','long_text','number','integer','date','datetime','boolean','url','email',
    'dropdown','multi_select','json','multi_line'
  ));

-- ── 2. System module for register screens ───────────────────────────────────────────
INSERT INTO public.system_modules (module_code, module_name, description, sort_order, is_active)
VALUES ('local_registers', 'Local Registers', 'Industry-pack and organisation registers (screens created on first custom field)', 900, TRUE)
ON CONFLICT (module_code) DO UPDATE SET module_name = EXCLUDED.module_name, description = EXCLUDED.description, is_active = TRUE;

INSERT INTO sim.system_modules (module_code, module_name, description, sort_order, is_active)
VALUES ('local_registers', 'Local Registers', 'Simulator registers (screens created on first custom field)', 900, TRUE)
ON CONFLICT (module_code) DO UPDATE SET module_name = EXCLUDED.module_name, description = EXCLUDED.description, is_active = TRUE;

-- ── 3. Limit settings ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.local_register_custom_field_settings (
  id                BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
  default_limit     INTEGER NOT NULL DEFAULT 30 CHECK (default_limit BETWEEN 1 AND 200),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by_admin  UUID
);

COMMENT ON TABLE public.local_register_custom_field_settings IS
  'v1311: single row — default maximum custom fields per register per organisation. Written only by System Admin RPCs (Admin v242).';

INSERT INTO public.local_register_custom_field_settings (id, default_limit)
VALUES (TRUE, 30)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.local_register_custom_field_limit_overrides (
  account_id        UUID PRIMARY KEY REFERENCES public.accounts(id) ON DELETE CASCADE,
  field_limit       INTEGER NOT NULL CHECK (field_limit BETWEEN 1 AND 200),
  reason            TEXT,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by_admin  UUID
);

COMMENT ON TABLE public.local_register_custom_field_limit_overrides IS
  'v1311: per-organisation override of the register custom-field limit. Written only by System Admin RPCs (Admin v242).';

ALTER TABLE public.local_register_custom_field_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.local_register_custom_field_limit_overrides ENABLE ROW LEVEL SECURITY;

-- Read-only for signed-in users; there are deliberately no client write policies.
DROP POLICY IF EXISTS policy_lr_cf_settings_select ON public.local_register_custom_field_settings;
CREATE POLICY policy_lr_cf_settings_select ON public.local_register_custom_field_settings
  FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS policy_lr_cf_overrides_select ON public.local_register_custom_field_limit_overrides;
CREATE POLICY policy_lr_cf_overrides_select ON public.local_register_custom_field_limit_overrides
  FOR SELECT TO authenticated USING (public.user_has_access_to_account(account_id));

-- ── 4. Effective limit ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.local_register_custom_field_limit(p_account_id UUID)
RETURNS INTEGER
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT o.field_limit FROM public.local_register_custom_field_limit_overrides o WHERE o.account_id = p_account_id),
    (SELECT s.default_limit FROM public.local_register_custom_field_settings s WHERE s.id),
    30
  );
$$;

GRANT EXECUTE ON FUNCTION public.local_register_custom_field_limit(UUID) TO authenticated;

-- ── 5. Register new tables (database_tables registry) ───────────────────────────────
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('local_register_custom_field_settings', 'Default maximum number of organisation custom fields per local register (set in System Admin)', true, true),
  ('local_register_custom_field_limit_overrides', 'Per-organisation override of the local register custom-field limit (set in System Admin)', true, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE 'v1311: register custom-field schema applied (default limit %)',
    (SELECT default_limit FROM public.local_register_custom_field_settings WHERE id);
END $$;
