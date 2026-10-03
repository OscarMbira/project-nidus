-- ============================================================================
-- v1125: Dependency parties catalogue (internal and external)
-- ============================================================================
-- Searchable names for parties that are not a project in Nidus. Each name is
-- flagged internal or external. PMO, Project Manager, Team Manager, and Team
-- Member may pre-create names or add a missing one while capturing a
-- dependency. Names are unique per organisation (case-insensitive).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.external_dependency_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  party_kind TEXT NOT NULL DEFAULT 'external',
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES public.users(id),
  updated_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT external_dependency_items_name_len CHECK (char_length(btrim(item_name)) BETWEEN 1 AND 200),
  CONSTRAINT external_dependency_items_party_kind_check CHECK (party_kind IN ('internal', 'external'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_external_dependency_items_name
  ON public.external_dependency_items (account_id, lower(btrim(item_name)))
  WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_external_dependency_items_account
  ON public.external_dependency_items (account_id)
  WHERE is_deleted = FALSE;

ALTER TABLE public.external_dependency_items ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.external_dependency_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.external_dependency_items TO service_role;

CREATE OR REPLACE FUNCTION public.external_dependency_caller_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id
  FROM public.users u
  WHERE u.auth_user_id = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.user_can_edit_external_dependency_catalogue(p_user_id UUID, p_account_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL OR p_account_id IS NULL THEN
    RETURN FALSE;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.accounts a
    WHERE a.id = p_account_id
      AND a.owner_user_id = p_user_id
      AND COALESCE(a.is_deleted, FALSE) = FALSE
  ) THEN
    RETURN TRUE;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = p_user_id
      AND ur.is_active = TRUE
      AND COALESCE(ur.is_deleted, FALSE) = FALSE
      AND ur.project_id IS NULL
      AND lower(replace(r.role_name, ' ', '_')) IN (
        'pmo_admin', 'org_admin', 'system_admin', 'super_admin', 'account_owner'
      )
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.project_memberships pm
    JOIN public.projects pr ON pr.id = pm.project_id
    JOIN public.project_roles prl ON prl.id = pm.project_role_id
    WHERE pm.user_id = p_user_id
      AND pm.is_active = TRUE
      AND pr.account_id = p_account_id
      AND COALESCE(pr.is_deleted, FALSE) = FALSE
      AND lower(replace(prl.role_name, ' ', '_')) IN (
        'project_manager', 'pm_project_manager',
        'team_manager', 'team_lead', 'pm_team_manager',
        'team_member', 'pm_team_member'
      )
  ) OR EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    JOIN public.projects pr ON pr.id = ur.project_id
    WHERE ur.user_id = p_user_id
      AND ur.is_active = TRUE
      AND COALESCE(ur.is_deleted, FALSE) = FALSE
      AND pr.account_id = p_account_id
      AND COALESCE(pr.is_deleted, FALSE) = FALSE
      AND lower(replace(r.role_name, ' ', '_')) IN (
        'project_manager', 'pm_project_manager',
        'team_manager', 'team_lead', 'pm_team_manager',
        'team_member', 'pm_team_member'
      )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.user_can_read_external_dependency_catalogue(p_user_id UUID, p_account_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.user_can_edit_external_dependency_catalogue(p_user_id, p_account_id)
  OR EXISTS (
    SELECT 1
    FROM public.project_memberships pm
    JOIN public.projects pr ON pr.id = pm.project_id
    WHERE pm.user_id = p_user_id
      AND pm.is_active = TRUE
      AND pr.account_id = p_account_id
      AND COALESCE(pr.is_deleted, FALSE) = FALSE
  );
$$;

DROP POLICY IF EXISTS external_dependency_items_select ON public.external_dependency_items;
DROP POLICY IF EXISTS external_dependency_items_insert ON public.external_dependency_items;
DROP POLICY IF EXISTS external_dependency_items_update ON public.external_dependency_items;
DROP POLICY IF EXISTS external_dependency_items_delete ON public.external_dependency_items;

CREATE POLICY external_dependency_items_select ON public.external_dependency_items
  FOR SELECT TO authenticated
  USING (
    is_deleted = FALSE
    AND public.user_can_read_external_dependency_catalogue(public.external_dependency_caller_id(), account_id)
  );

CREATE POLICY external_dependency_items_insert ON public.external_dependency_items
  FOR INSERT TO authenticated
  WITH CHECK (
    public.user_can_edit_external_dependency_catalogue(public.external_dependency_caller_id(), account_id)
  );

CREATE POLICY external_dependency_items_update ON public.external_dependency_items
  FOR UPDATE TO authenticated
  USING (
    public.user_can_edit_external_dependency_catalogue(public.external_dependency_caller_id(), account_id)
  )
  WITH CHECK (
    public.user_can_edit_external_dependency_catalogue(public.external_dependency_caller_id(), account_id)
  );

CREATE POLICY external_dependency_items_delete ON public.external_dependency_items
  FOR DELETE TO authenticated
  USING (
    public.user_can_edit_external_dependency_catalogue(public.external_dependency_caller_id(), account_id)
  );

CREATE OR REPLACE FUNCTION public.add_external_dependency_item(
  p_account_id UUID,
  p_name TEXT,
  p_party_kind TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := public.external_dependency_caller_id();
  v_name TEXT := btrim(COALESCE(p_name, ''));
  v_kind TEXT := lower(btrim(COALESCE(p_party_kind, '')));
  v_row public.external_dependency_items%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'You need to be signed in to add a dependency party';
  END IF;
  IF NOT public.user_can_edit_external_dependency_catalogue(v_user, p_account_id) THEN
    RAISE EXCEPTION 'You cannot add dependency parties for this organisation';
  END IF;
  IF v_name = '' OR char_length(v_name) > 200 THEN
    RAISE EXCEPTION 'Enter a name of 1 to 200 characters';
  END IF;
  IF v_kind NOT IN ('internal', 'external') THEN
    RAISE EXCEPTION 'Choose whether this party is internal or external';
  END IF;

  SELECT * INTO v_row
  FROM public.external_dependency_items
  WHERE account_id = p_account_id
    AND lower(btrim(item_name)) = lower(v_name)
  ORDER BY is_deleted ASC, created_at ASC
  LIMIT 1;

  IF FOUND THEN
    UPDATE public.external_dependency_items
    SET item_name = v_name,
        party_kind = v_kind,
        is_deleted = FALSE,
        updated_by = v_user,
        updated_at = NOW()
    WHERE id = v_row.id
    RETURNING * INTO v_row;
  ELSE
    INSERT INTO public.external_dependency_items (account_id, item_name, party_kind, created_by, updated_by)
    VALUES (p_account_id, v_name, v_kind, v_user, v_user)
    RETURNING * INTO v_row;
  END IF;

  RETURN jsonb_build_object('id', v_row.id, 'item_name', v_row.item_name, 'party_kind', v_row.party_kind);
END;
$$;

GRANT EXECUTE ON FUNCTION public.external_dependency_caller_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_can_edit_external_dependency_catalogue(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_can_read_external_dependency_catalogue(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.add_external_dependency_item(UUID, TEXT, TEXT) TO authenticated, service_role;

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id,
  menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT gen_random_uuid(), 'plat_pm_external_dependencies', 'Dependency Parties',
  'Organisation list of internal and external parties that are not a project in Nidus',
  '/platform/dependency-parties',
  (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_ctrl_core' AND COALESCE(is_deleted, FALSE) = FALSE),
  4, 61, 'universal', 'list', TRUE, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items
  WHERE menu_code = 'plat_pm_external_dependencies' AND COALESCE(is_deleted, FALSE) = FALSE
);

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), src.role_id, dst.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.role_menu_items src
JOIN public.menu_items ref ON ref.id = src.menu_item_id AND ref.menu_code = 'plat_pm_dependencies_reg'
JOIN public.menu_items dst ON dst.menu_code = 'plat_pm_external_dependencies' AND COALESCE(dst.is_deleted, FALSE) = FALSE
WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE
SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES (
  'external_dependency_items',
  'Organisation catalogue of internal and external dependency parties used by the Dependency Register',
  FALSE,
  TRUE
)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();
