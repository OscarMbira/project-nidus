-- ============================================================================
-- v1453: Consolidated role menus — per-project Industry Modules switch-off (Slice 5)
-- PRD/plan: projectprd/v1341 (D16, D19, R3, stories 8–10, 38–39) / projectplan/v1341
--
-- A project (or practice project) can hide industry menu items it does not need. Switching off
-- only hides the menu entry — it never changes or deletes records — and switching back on
-- restores it. Every change is logged (who, when) in project_menu_item_switch_log (v1449).
--
--   public.list_project_industry_menu_items(project_id)         rows for the Industry Modules page
--   public.set_project_menu_item_disabled(project_id, item, off)  Project Manager or PMO Admin (D19)
--   sim.list_practice_project_industry_menu_items(id)            practice project owner / members
--   sim.set_practice_project_menu_item_disabled(id, item, off)   practice project owner only
--
-- Catalogue (rule 75): consolidated-only rows "Industry Modules" for Platform (under Project
-- Settings) and the Simulator, with PM placements. is_visible = FALSE keeps them out of today's
-- sidebar.
-- Idempotent. Run after v1452.
-- ============================================================================

-- ── 1. Who may switch items off (D19) ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.can_switch_project_menu_items(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.is_pmo_admin_or_owner_for_account((SELECT pr.account_id FROM public.projects pr WHERE pr.id = p_project_id))
    OR EXISTS (
      SELECT 1 FROM public.projects pr
      WHERE pr.id = p_project_id
        AND (pr.project_manager_user_id = public.current_internal_user_id() OR pr.owner_user_id = public.current_internal_user_id())
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = public.current_internal_user_id() AND ur.is_active = TRUE AND COALESCE(ur.is_deleted, FALSE) = FALSE
        AND lower(r.role_name) IN ('project_manager', 'pm_project_manager')
        AND (ur.project_id = p_project_id
             OR (ur.project_id IS NULL AND public.auth_user_can_access_project(p_project_id)))
    )
  );
$$;
GRANT EXECUTE ON FUNCTION public.can_switch_project_menu_items(UUID) TO authenticated;

-- ── 2. Which menu items count as industry items for a project ───────────────
-- Registers linked to the project's industry packs, with their group label.
CREATE OR REPLACE FUNCTION public.list_project_industry_menu_items(p_project_id UUID)
RETURNS TABLE (
  menu_item_id UUID, menu_code TEXT, menu_label TEXT, group_label TEXT, industry_name TEXT,
  is_disabled BOOLEAN, disabled_at TIMESTAMPTZ, disabled_by_name TEXT, organisation_disabled BOOLEAN,
  can_edit BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_account UUID;
  v_can_edit BOOLEAN := public.can_switch_project_menu_items(p_project_id);
BEGIN
  IF auth.uid() IS NULL OR NOT public.auth_user_can_access_project(p_project_id) THEN
    RAISE EXCEPTION 'Not allowed' USING ERRCODE = '42501';
  END IF;
  v_account := (SELECT pr.account_id FROM public.projects pr WHERE pr.id = p_project_id);

  RETURN QUERY
  WITH inds AS (
    SELECT pi.industry_category_id FROM public.project_industries pi WHERE pi.project_id = p_project_id
    UNION
    SELECT pr.industry_category_id FROM public.projects pr
     WHERE pr.id = p_project_id AND pr.industry_category_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM public.project_industries x WHERE x.project_id = p_project_id)
  )
  SELECT DISTINCT ON (mi.id)
    mi.id, mi.menu_code::text, mi.menu_label::text, grp.menu_label::text, ic.name::text,
    (d.id IS NOT NULL), d.disabled_at, u.full_name::text,
    EXISTS (
      SELECT 1 FROM public.organisation_disabled_capabilities odc
      WHERE odc.account_id = v_account AND odc.industry_pack_menu_item_id = ipmi.id
    ),
    v_can_edit
  FROM inds
  JOIN public.industry_packs ip ON ip.industry_category_id = inds.industry_category_id AND ip.is_active = TRUE
  JOIN public.industry_categories ic ON ic.id = ip.industry_category_id
  JOIN public.industry_pack_menu_items ipmi ON ipmi.industry_pack_id = ip.id
  JOIN public.menu_items mi ON mi.id = ipmi.menu_item_id AND mi.is_active = TRUE AND COALESCE(mi.is_deleted, FALSE) = FALSE
  LEFT JOIN public.menu_items grp ON grp.id = mi.parent_menu_id
  LEFT JOIN public.project_disabled_menu_items d ON d.project_id = p_project_id AND d.menu_item_id = mi.id
  LEFT JOIN public.users u ON u.id = d.disabled_by
  ORDER BY mi.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_project_menu_item_disabled(p_project_id UUID, p_menu_item_id UUID, p_disabled BOOLEAN)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_user UUID := public.current_internal_user_id();
  v_account UUID;
  v_allowed BOOLEAN := FALSE;
BEGIN
  IF auth.uid() IS NULL OR v_user IS NULL THEN
    RAISE EXCEPTION 'Sign in required' USING ERRCODE = '42501';
  END IF;
  v_account := (SELECT pr.account_id FROM public.projects pr WHERE pr.id = p_project_id);
  IF v_account IS NULL THEN
    RAISE EXCEPTION 'Project not found' USING ERRCODE = 'P0002';
  END IF;

  -- D19: the project's Project Manager, or a PMO Admin / owner of its organisation.
  v_allowed := public.can_switch_project_menu_items(p_project_id);
  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Only the Project Manager or a PMO Admin can switch industry items off' USING ERRCODE = '42501';
  END IF;

  -- Only items that are industry items of this project (records are never touched).
  IF NOT EXISTS (
    SELECT 1 FROM public.list_project_industry_menu_items(p_project_id) x WHERE x.menu_item_id = p_menu_item_id
  ) THEN
    RAISE EXCEPTION 'This menu item is not an industry item of the project' USING ERRCODE = '22023';
  END IF;

  IF p_disabled THEN
    INSERT INTO public.project_disabled_menu_items (project_id, menu_item_id, disabled_by, disabled_at)
    VALUES (p_project_id, p_menu_item_id, v_user, NOW())
    ON CONFLICT (project_id, menu_item_id) DO NOTHING;
  ELSE
    DELETE FROM public.project_disabled_menu_items WHERE project_id = p_project_id AND menu_item_id = p_menu_item_id;
  END IF;

  INSERT INTO public.project_menu_item_switch_log (app, project_id, menu_item_id, action, changed_by_auth_id)
  VALUES ('platform', p_project_id, p_menu_item_id, CASE WHEN p_disabled THEN 'switched_off' ELSE 'switched_on' END, auth.uid());

  RETURN jsonb_build_object('project_id', p_project_id, 'menu_item_id', p_menu_item_id, 'disabled', p_disabled);
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_project_industry_menu_items(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_project_menu_item_disabled(UUID, UUID, BOOLEAN) TO authenticated;

-- ── 3. Simulator: practice projects ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION sim.list_practice_project_industry_menu_items(p_practice_project_id UUID)
RETURNS TABLE (
  menu_item_id UUID, menu_code TEXT, menu_label TEXT, group_label TEXT, industry_name TEXT,
  is_disabled BOOLEAN, disabled_at TIMESTAMPTZ, disabled_by_name TEXT, organisation_disabled BOOLEAN,
  can_edit BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = sim, public
SET row_security = off
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM sim.practice_projects pp
    WHERE pp.id = p_practice_project_id
      AND (pp.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM sim.practice_project_memberships m
        WHERE m.practice_project_id = pp.id AND m.user_id = auth.uid() AND m.is_active = TRUE))
  ) THEN
    RAISE EXCEPTION 'Not allowed' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT DISTINCT ON (mi.id)
    mi.id, mi.menu_code::text, mi.menu_label::text, grp.menu_label::text, ic.name::text,
    (d.id IS NOT NULL), d.disabled_at, u.full_name::text, FALSE,
    EXISTS (SELECT 1 FROM sim.practice_projects o WHERE o.id = p_practice_project_id AND o.user_id = auth.uid())
  FROM sim.practice_project_industries ppi
  JOIN public.industry_packs ip ON ip.industry_category_id = ppi.industry_category_id AND ip.is_active = TRUE
  JOIN public.industry_categories ic ON ic.id = ip.industry_category_id
  JOIN public.industry_pack_menu_items ipmi ON ipmi.industry_pack_id = ip.id
  JOIN public.menu_items mi ON mi.id = ipmi.menu_item_id AND mi.is_active = TRUE AND COALESCE(mi.is_deleted, FALSE) = FALSE
  LEFT JOIN public.menu_items grp ON grp.id = mi.parent_menu_id
  LEFT JOIN sim.practice_project_disabled_menu_items d
    ON d.practice_project_id = p_practice_project_id AND d.menu_item_id = mi.id
  LEFT JOIN public.users u ON u.auth_user_id = d.disabled_by
  WHERE ppi.practice_project_id = p_practice_project_id
  ORDER BY mi.id;
END;
$$;

CREATE OR REPLACE FUNCTION sim.set_practice_project_menu_item_disabled(p_practice_project_id UUID, p_menu_item_id UUID, p_disabled BOOLEAN)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sim, public
SET row_security = off
AS $$
BEGIN
  -- Practice projects belong to one learner: only the owner can switch items off.
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM sim.practice_projects pp WHERE pp.id = p_practice_project_id AND pp.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Only the practice project owner can switch industry items off' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM sim.list_practice_project_industry_menu_items(p_practice_project_id) x WHERE x.menu_item_id = p_menu_item_id
  ) THEN
    RAISE EXCEPTION 'This menu item is not an industry item of the practice project' USING ERRCODE = '22023';
  END IF;

  IF p_disabled THEN
    INSERT INTO sim.practice_project_disabled_menu_items (practice_project_id, menu_item_id, disabled_by, disabled_at)
    VALUES (p_practice_project_id, p_menu_item_id, auth.uid(), NOW())
    ON CONFLICT (practice_project_id, menu_item_id) DO NOTHING;
  ELSE
    DELETE FROM sim.practice_project_disabled_menu_items
     WHERE practice_project_id = p_practice_project_id AND menu_item_id = p_menu_item_id;
  END IF;

  INSERT INTO public.project_menu_item_switch_log (app, project_id, menu_item_id, action, changed_by_auth_id)
  VALUES ('simulator', p_practice_project_id, p_menu_item_id, CASE WHEN p_disabled THEN 'switched_off' ELSE 'switched_on' END, auth.uid());

  RETURN jsonb_build_object('practice_project_id', p_practice_project_id, 'menu_item_id', p_menu_item_id, 'disabled', p_disabled);
END;
$$;

GRANT EXECUTE ON FUNCTION sim.list_practice_project_industry_menu_items(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION sim.set_practice_project_menu_item_disabled(UUID, UUID, BOOLEAN) TO authenticated;

-- ── 4. Catalogue: Industry Modules pages (consolidated-only) ────────────────
INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT gen_random_uuid(), v.menu_code, 'Industry Modules', v.description, v.route_path,
       (SELECT id FROM public.menu_items WHERE menu_code = v.parent_code AND COALESCE(is_deleted, FALSE) = FALSE),
       v.menu_level, 95, 'universal', 'toggle-right', TRUE, FALSE, NOW(), NOW()
FROM (VALUES
  ('plat_pm_industry_modules', 'Switch off industry menu items this project does not need (v1341 D16). Records are kept.',
   '/platform/project-setup/industry-modules', 'plat_pm_project_settings', 4),
  ('sim_pm_industry_modules', 'Switch off industry menu items this practice project does not need (v1341 D16).',
   '/simulator/practice-projects/industry-modules', NULL, 2)
) AS v(menu_code, description, route_path, parent_code, menu_level)
WHERE NOT EXISTS (SELECT 1 FROM public.menu_items m WHERE m.menu_code = v.menu_code);

INSERT INTO public.menu_item_placements (menu_item_id, placement_key, section_code, parent_menu_item_id, slot_key, sort_order)
SELECT mi.id, 'pm', 'project_setup', par.id, NULL, v.sort_order
FROM (VALUES
  ('plat_pm_industry_modules', 'plat_pm_project_settings', 95),
  ('sim_pm_industry_modules',  NULL::text,                 95)
) AS v(menu_code, parent_code, sort_order)
JOIN public.menu_items mi ON mi.menu_code = v.menu_code AND COALESCE(mi.is_deleted, FALSE) = FALSE
LEFT JOIN public.menu_items par ON par.menu_code = v.parent_code AND COALESCE(par.is_deleted, FALSE) = FALSE
ON CONFLICT (menu_item_id, placement_key) DO UPDATE SET
  section_code = EXCLUDED.section_code,
  parent_menu_item_id = EXCLUDED.parent_menu_item_id,
  sort_order = EXCLUDED.sort_order,
  is_active = TRUE,
  updated_at = NOW();

-- ── Check ───────────────────────────────────────────────────────────────────
SELECT
  (SELECT count(*) FROM public.menu_items WHERE menu_code IN ('plat_pm_industry_modules', 'sim_pm_industry_modules') AND is_visible = FALSE) AS industry_modules_rows_expected_2,
  (SELECT count(*) FROM pg_proc WHERE proname IN ('can_switch_project_menu_items', 'list_project_industry_menu_items', 'set_project_menu_item_disabled',
     'list_practice_project_industry_menu_items', 'set_practice_project_menu_item_disabled')) AS functions_expected_5;
