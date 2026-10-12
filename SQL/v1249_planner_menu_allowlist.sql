-- ============================================================================
-- v1249: Planner menu allow-list — v1239 Slice 6.3 (D11, D19)
--
-- planner_menu_allowlist lists the menu items a Planner-edition account may see. Only `pln_`
-- rows are ever listed (v1250 seed; Admin "Available in Planner" toggle, v1239 8.4).
-- get_account_available_menu_item_ids() gains a FAIL-CLOSED branch: for a planner account it
-- returns only allow-listed, active items (nothing at all if the list is empty). Platform
-- accounts keep exactly the v1019 behaviour.
-- Same signature and return type as v1019 (CREATE OR REPLACE keeps the grant).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.planner_menu_allowlist (
  menu_item_id UUID PRIMARY KEY REFERENCES public.menu_items(id) ON DELETE CASCADE,
  menu_code    TEXT NOT NULL,
  added_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  added_by     UUID,
  CONSTRAINT planner_menu_allowlist_pln_only CHECK (menu_code LIKE 'pln\_%')
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_planner_menu_allowlist_code ON public.planner_menu_allowlist(menu_code);

ALTER TABLE public.planner_menu_allowlist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS planner_menu_allowlist_read ON public.planner_menu_allowlist;
CREATE POLICY planner_menu_allowlist_read ON public.planner_menu_allowlist FOR SELECT TO authenticated USING (TRUE);
GRANT SELECT ON public.planner_menu_allowlist TO authenticated;
GRANT ALL ON public.planner_menu_allowlist TO service_role;
-- No client write policies: written by seeds and the Admin RPC only.

CREATE OR REPLACE FUNCTION public.get_account_available_menu_item_ids(p_account_id UUID)
RETURNS UUID[]
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH edition AS (
    SELECT COALESCE((SELECT product_edition FROM public.accounts WHERE id = p_account_id), 'platform') AS value
  ),
  org_industries AS (
    SELECT industry_category_id FROM public.account_industries WHERE account_id = p_account_id
    UNION
    SELECT id FROM public.industry_categories WHERE name = 'Cross-Industry' AND is_active = TRUE
  ),
  org_pack_item_ids AS (
    SELECT DISTINCT ipmi.menu_item_id
    FROM public.industry_pack_menu_items ipmi
    JOIN public.industry_packs ip ON ip.id = ipmi.industry_pack_id AND ip.is_active = TRUE
    WHERE ip.industry_category_id IN (SELECT industry_category_id FROM org_industries)
  ),
  org_disabled_item_ids AS (
    SELECT DISTINCT ipmi.menu_item_id
    FROM public.organisation_disabled_capabilities odc
    JOIN public.industry_pack_menu_items ipmi ON ipmi.id = odc.industry_pack_menu_item_id
    WHERE odc.account_id = p_account_id
  ),
  classified_item_ids AS (
    SELECT DISTINCT menu_item_id FROM public.industry_pack_menu_items
  ),
  platform_ids AS (
    SELECT mi.id
    FROM public.menu_items mi
    LEFT JOIN classified_item_ids ci ON ci.menu_item_id = mi.id
    LEFT JOIN org_pack_item_ids opi ON opi.menu_item_id = mi.id
    LEFT JOIN org_disabled_item_ids odi ON odi.menu_item_id = mi.id
    WHERE mi.is_active = TRUE
      AND mi.menu_code NOT LIKE 'pln_%'   -- planner rows never reach Platform/Simulator sidebars (D19)
      AND (ci.menu_item_id IS NULL OR (opi.menu_item_id IS NOT NULL AND odi.menu_item_id IS NULL))
  ),
  planner_ids AS (
    SELECT mi.id
    FROM public.planner_menu_allowlist al
    JOIN public.menu_items mi ON mi.id = al.menu_item_id AND mi.is_active = TRUE
  )
  SELECT CASE WHEN (SELECT value FROM edition) = 'planner'
              THEN COALESCE((SELECT ARRAY_AGG(id) FROM planner_ids), ARRAY[]::UUID[])
              ELSE (SELECT ARRAY_AGG(id) FROM platform_ids)
         END;
$$;

COMMENT ON FUNCTION public.get_account_available_menu_item_ids(UUID) IS
  'v918/v924/v1011/v1019/v1249: org-level menu availability. Platform edition: Core + Generic PM + '
  'selected Industry Packs − organisation_disabled_capabilities, fail-open for unclassified items. '
  'Planner edition (v1249): fail-closed — only active items in planner_menu_allowlist. Returns UUID[] '
  '(no PostgREST 1000-row cap). Narrows role grants; never expands them.';

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES ('planner_menu_allowlist', 'Menu items (pln_ only) available to Project Planner edition accounts', true, true)
ON CONFLICT (table_name) DO UPDATE SET table_description = EXCLUDED.table_description, is_system_table = EXCLUDED.is_system_table, updated_at = NOW();

NOTIFY pgrst, 'reload schema';
DO $$ BEGIN RAISE NOTICE 'v1249 applied: planner_menu_allowlist + fail-closed planner branch'; END $$;
