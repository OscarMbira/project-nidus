-- =============================================================================
-- v1155: Let PMO, project managers, and team roles maintain the communication
--        format and level-of-detail lookup, and put that catalog on the menu.
-- Prerequisite: SQL/v1154_communication_information_options.sql
-- =============================================================================

CREATE OR REPLACE FUNCTION public.user_can_maintain_communication_options()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT u.id INTO v_user_id
  FROM public.users u
  WHERE u.auth_user_id = auth.uid()
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.accounts a
    WHERE a.owner_user_id = v_user_id
      AND COALESCE(a.is_deleted, FALSE) = FALSE
  ) THEN
    RETURN TRUE;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = v_user_id
      AND ur.is_active = TRUE
      AND COALESCE(ur.is_deleted, FALSE) = FALSE
      AND COALESCE(r.is_deleted, FALSE) = FALSE
      AND lower(replace(r.role_name, ' ', '_')) IN (
        'pmo', 'pmo_admin', 'org_admin', 'system_admin', 'super_admin', 'account_owner',
        'project_manager', 'pm_project_manager',
        'team_manager', 'team_lead', 'pm_team_manager',
        'team_member', 'pm_team_member',
        'simulator_admin', 'sim_pmo_admin', 'sim_project_manager',
        'sim_team_manager', 'sim_team_lead', 'sim_team_member'
      )
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.project_memberships pm
    JOIN public.project_roles prl ON prl.id = pm.project_role_id
    WHERE pm.user_id = v_user_id
      AND pm.is_active = TRUE
      AND lower(replace(prl.role_name, ' ', '_')) IN (
        'project_manager', 'pm_project_manager',
        'team_manager', 'team_lead', 'pm_team_manager',
        'team_member', 'pm_team_member'
      )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.user_can_maintain_communication_options() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_can_maintain_communication_options() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION sim.user_can_maintain_communication_options()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.user_can_maintain_communication_options();
$$;

REVOKE ALL ON FUNCTION sim.user_can_maintain_communication_options() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sim.user_can_maintain_communication_options() TO authenticated, service_role;

DROP POLICY IF EXISTS communication_information_options_insert ON public.communication_information_options;
CREATE POLICY communication_information_options_insert
  ON public.communication_information_options
  FOR INSERT TO authenticated
  WITH CHECK (public.user_can_maintain_communication_options());

DROP POLICY IF EXISTS communication_information_options_update ON public.communication_information_options;
CREATE POLICY communication_information_options_update
  ON public.communication_information_options
  FOR UPDATE TO authenticated
  USING (public.user_can_maintain_communication_options())
  WITH CHECK (public.user_can_maintain_communication_options());

GRANT SELECT, INSERT, UPDATE ON public.communication_information_options TO authenticated;

DROP POLICY IF EXISTS communication_information_options_insert ON sim.communication_information_options;
CREATE POLICY communication_information_options_insert
  ON sim.communication_information_options
  FOR INSERT TO authenticated
  WITH CHECK (public.user_can_maintain_communication_options());

DROP POLICY IF EXISTS communication_information_options_update ON sim.communication_information_options;
CREATE POLICY communication_information_options_update
  ON sim.communication_information_options
  FOR UPDATE TO authenticated
  USING (public.user_can_maintain_communication_options())
  WITH CHECK (public.user_can_maintain_communication_options());

GRANT SELECT, INSERT, UPDATE ON sim.communication_information_options TO authenticated;

-- One catalog page, reached from Stakeholders and from PMO Configuration.

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order,
  methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT gen_random_uuid(), 'plat_pm_stkh_comm_options', 'Communication formats',
       'Formats and levels of detail used on communication plans',
       '/platform/stakeholders/communication-options',
       (SELECT id FROM public.menu_items WHERE menu_code = 'plat_grp_pm_stakeholders' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
       3, 45, 'universal', 'list', TRUE, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_pm_stkh_comm_options' AND COALESCE(is_deleted, FALSE) = FALSE
)
AND EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_grp_pm_stakeholders' AND COALESCE(is_deleted, FALSE) = FALSE
);

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order,
  methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT gen_random_uuid(), 'pmo_communication_information_options', 'Communication formats',
       'Formats and levels of detail used on communication plans',
       '/platform/stakeholders/communication-options',
       NULL, 1, 69, 'universal', 'list', TRUE, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'pmo_communication_information_options' AND COALESCE(is_deleted, FALSE) = FALSE
);

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order,
  methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT gen_random_uuid(), 'sim_pm_stkh_comm_options', 'Communication formats',
       'Formats and levels of detail used on communication plans',
       '/simulator/stakeholders/communication-options',
       (SELECT id FROM public.menu_items WHERE menu_code = 'sim_sec_universal' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
       2, 61, 'universal', 'list', TRUE, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'sim_pm_stkh_comm_options' AND COALESCE(is_deleted, FALSE) = FALSE
)
AND EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'sim_sec_universal' AND COALESCE(is_deleted, FALSE) = FALSE
);

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), r.id, mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
CROSS JOIN public.roles r
WHERE mi.menu_code IN (
    'plat_pm_stkh_comm_options',
    'pmo_communication_information_options',
    'sim_pm_stkh_comm_options'
  )
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
  AND COALESCE(r.is_deleted, FALSE) = FALSE
  AND lower(replace(r.role_name, ' ', '_')) IN (
    'pmo', 'pmo_admin', 'org_admin', 'system_admin', 'super_admin', 'account_owner',
    'project_manager', 'pm_project_manager',
    'team_manager', 'team_lead', 'pm_team_manager',
    'team_member', 'pm_team_member',
    'simulator_admin', 'sim_pmo_admin', 'sim_project_manager',
    'sim_team_manager', 'sim_team_lead', 'sim_team_member'
  )
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE, can_use = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

-- Anyone who can already open Communication Plans or Risk Categories can open this catalog.
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), existing.role_id, target.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.role_menu_items existing
JOIN public.menu_items src ON src.id = existing.menu_item_id
JOIN public.menu_items target
  ON target.menu_code = CASE src.menu_code
    WHEN 'plat_pm_stkh_comms' THEN 'plat_pm_stkh_comm_options'
    WHEN 'pmo_risk_categories' THEN 'pmo_communication_information_options'
    WHEN 'sim_pm_risk_categories' THEN 'sim_pm_stkh_comm_options'
  END
  AND COALESCE(target.is_deleted, FALSE) = FALSE
WHERE src.menu_code IN ('plat_pm_stkh_comms', 'pmo_risk_categories', 'sim_pm_risk_categories')
  AND COALESCE(src.is_deleted, FALSE) = FALSE
  AND COALESCE(existing.is_active, TRUE) = TRUE
  AND COALESCE(existing.can_view, FALSE) = TRUE
  AND COALESCE(existing.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE, can_use = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();
