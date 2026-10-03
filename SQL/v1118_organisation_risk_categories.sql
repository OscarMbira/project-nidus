-- ============================================================================
-- v1118: Organisation-owned risk categories and sub-categories
-- (renamed from v1113 to resolve a filename collision with the unrelated v1106
-- feature's v1113_sim_practice_project_industries_schema.sql — content unchanged,
-- already applied to the database under the original name)
-- ============================================================================
-- projectplan/v1107_organisation_risk_categories_plan.md
-- Builds on public.risk_categories (v172 / v790) and public.risk_subcategories (v1111).
-- System rows stay organisation_id NULL and are not renamed or deactivated here.
-- Organisation rows are added immediately by delivery roles and maintained by
-- PMO Admin / Account Owner. No hard delete.
-- ============================================================================

ALTER TABLE public.risk_subcategories
  ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE;

ALTER TABLE public.risk_subcategories
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.risk_subcategories
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.risk_subcategories
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.risk_categories
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.risk_categories
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.risk_categories
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.risk_subcategories
  DROP CONSTRAINT IF EXISTS uq_risk_subcategories_code;

CREATE UNIQUE INDEX IF NOT EXISTS uq_risk_subcategories_system_code
  ON public.risk_subcategories (lower(category_code), lower(subcategory_code))
  WHERE organisation_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_risk_subcategories_org_name
  ON public.risk_subcategories (organisation_id, lower(category_code), lower(subcategory_name))
  WHERE organisation_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_risk_categories_org_name
  ON public.risk_categories (organisation_id, lower(category_name))
  WHERE organisation_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_risk_categories_org_code
  ON public.risk_categories (organisation_id, lower(category_code))
  WHERE organisation_id IS NOT NULL;

-- Widen risk_category. Views such as public.raid_log select the column, so
-- Postgres rejects ALTER TYPE until those views are dropped and recreated.
DO $$
DECLARE
  target record;
  walk int;
  dep record;
  v_grant text;
BEGIN
  CREATE TEMP TABLE _risk_cat_view_deps (
    target_key text NOT NULL,
    depth int NOT NULL,
    view_oid oid NOT NULL,
    PRIMARY KEY (target_key, view_oid)
  ) ON COMMIT DROP;

  CREATE TEMP TABLE _risk_cat_view_sql (
    qualname text PRIMARY KEY,
    depth int NOT NULL,
    create_sql text NOT NULL,
    view_comment text,
    grant_sqls text[]
  ) ON COMMIT DROP;

  FOR target IN
    SELECT *
    FROM (VALUES
      ('public.risks', 'public', 'risks', 'risk_category'),
      ('sim.practice_risks', 'sim', 'practice_risks', 'risk_category')
    ) AS t(key, sch, tbl, col)
  LOOP
    IF to_regclass(target.key) IS NULL THEN
      CONTINUE;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = target.sch
        AND table_name = target.tbl
        AND column_name = target.col
        AND character_maximum_length IS NOT NULL
        AND character_maximum_length < 100
    ) THEN
      CONTINUE;
    END IF;

    EXECUTE format($q$
      INSERT INTO _risk_cat_view_deps (target_key, depth, view_oid)
      SELECT %L, 0, c.oid
      FROM pg_depend d
      JOIN pg_rewrite rw ON rw.oid = d.objid
      JOIN pg_class c ON c.oid = rw.ev_class
      JOIN pg_attribute a ON a.attrelid = d.refobjid AND a.attnum = d.refobjsubid
      WHERE d.refobjid = %L::regclass
        AND a.attname = %L
        AND c.relkind = 'v'
      ON CONFLICT DO NOTHING
    $q$, target.key, target.key, target.col);

    FOR walk IN 0..8 LOOP
      INSERT INTO _risk_cat_view_deps (target_key, depth, view_oid)
      SELECT target.key, src.depth + 1, c.oid
      FROM _risk_cat_view_deps src
      JOIN pg_depend d ON d.refobjid = src.view_oid
      JOIN pg_rewrite rw ON rw.oid = d.objid
      JOIN pg_class c ON c.oid = rw.ev_class
      WHERE src.target_key = target.key
        AND src.depth = walk
        AND c.relkind = 'v'
        AND c.oid <> src.view_oid
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;

  INSERT INTO _risk_cat_view_sql (qualname, depth, create_sql, view_comment, grant_sqls)
  SELECT
    format('%I.%I', n.nspname, c.relname),
    grouped.depth,
    format(
      'CREATE VIEW %I.%I%s AS %s',
      n.nspname,
      c.relname,
      CASE
        WHEN c.reloptions IS NULL THEN ''
        ELSE ' WITH (' || array_to_string(c.reloptions, ', ') || ')'
      END,
      pg_get_viewdef(grouped.view_oid, true)
    ),
    obj_description(grouped.view_oid, 'pg_class'),
    grouped.grant_sqls
  FROM (
    SELECT
      d.view_oid,
      max(d.depth) AS depth,
      COALESCE((
        SELECT array_agg(format(
          'GRANT %s ON %I.%I TO %s',
          g.privilege_type,
          gn.nspname,
          gc.relname,
          CASE WHEN g.grantee = 'PUBLIC' THEN 'PUBLIC' ELSE quote_ident(g.grantee) END
        ))
        FROM information_schema.role_table_grants g
        JOIN pg_class gc ON gc.oid = d.view_oid
        JOIN pg_namespace gn ON gn.oid = gc.relnamespace
        WHERE g.table_schema = gn.nspname
          AND g.table_name = gc.relname
      ), ARRAY[]::text[]) AS grant_sqls
    FROM _risk_cat_view_deps d
    GROUP BY d.view_oid
  ) grouped
  JOIN pg_class c ON c.oid = grouped.view_oid
  JOIN pg_namespace n ON n.oid = c.relnamespace;

  FOR dep IN
    SELECT qualname
    FROM _risk_cat_view_sql
    ORDER BY depth DESC, qualname DESC
  LOOP
    EXECUTE 'DROP VIEW ' || dep.qualname;
  END LOOP;

  FOR target IN
    SELECT *
    FROM (VALUES
      ('public.risks', 'public', 'risks', 'risk_category'),
      ('sim.practice_risks', 'sim', 'practice_risks', 'risk_category')
    ) AS t(key, sch, tbl, col)
  LOOP
    IF to_regclass(target.key) IS NULL THEN
      CONTINUE;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = target.sch
        AND table_name = target.tbl
        AND column_name = target.col
        AND character_maximum_length IS NOT NULL
        AND character_maximum_length < 100
    ) THEN
      EXECUTE format(
        'ALTER TABLE %s ALTER COLUMN %I TYPE VARCHAR(100)',
        target.key,
        target.col
      );
    END IF;
  END LOOP;

  FOR dep IN
    SELECT qualname, create_sql, view_comment, grant_sqls
    FROM _risk_cat_view_sql
    ORDER BY depth ASC, qualname ASC
  LOOP
    EXECUTE dep.create_sql;
    IF dep.view_comment IS NOT NULL THEN
      EXECUTE format('COMMENT ON VIEW %s IS %L', dep.qualname, dep.view_comment);
    END IF;
    IF dep.grant_sqls IS NOT NULL THEN
      FOREACH v_grant IN ARRAY dep.grant_sqls LOOP
        EXECUTE v_grant;
      END LOOP;
    END IF;
  END LOOP;
END $$;

-- ── Caller and permission helpers ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.risk_catalogue_caller_id()
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

CREATE OR REPLACE FUNCTION public.user_can_maintain_risk_catalogue(p_user_id UUID, p_account_id UUID)
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

  RETURN EXISTS (
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
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.user_can_add_risk_catalogue(p_user_id UUID, p_account_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.user_can_maintain_risk_catalogue(p_user_id, p_account_id) THEN
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

CREATE OR REPLACE FUNCTION public.add_organisation_risk_category(p_account_id UUID, p_name TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := public.risk_catalogue_caller_id();
  v_name TEXT := btrim(COALESCE(p_name, ''));
  v_code TEXT;
  v_row public.risk_categories%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'You need to be signed in to add a category';
  END IF;
  IF NOT public.user_can_add_risk_catalogue(v_user, p_account_id) THEN
    RAISE EXCEPTION 'You cannot add risk categories for this organisation';
  END IF;
  IF v_name = '' OR char_length(v_name) > 100 THEN
    RAISE EXCEPTION 'Enter a category name of 1 to 100 characters';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.risk_categories rc
    WHERE lower(rc.category_name) = lower(v_name)
      AND (rc.organisation_id IS NULL OR rc.organisation_id = p_account_id)
  ) THEN
    RAISE EXCEPTION 'A category with that name already exists';
  END IF;

  v_code := left(public.slugify_role_name(v_name), 50);
  IF v_code = '' THEN
    v_code := 'category';
  END IF;
  WHILE EXISTS (
    SELECT 1 FROM public.risk_categories rc
    WHERE lower(rc.category_code) = lower(v_code)
      AND (rc.organisation_id IS NULL OR rc.organisation_id = p_account_id)
  ) LOOP
    v_code := left(v_code, 46) || '_' || substr(md5(clock_timestamp()::text), 1, 3);
  END LOOP;

  INSERT INTO public.risk_categories (
    organisation_id, category_code, category_name, is_default, display_order, is_active, created_by, updated_by
  ) VALUES (
    p_account_id, v_code, v_name, FALSE, 500, TRUE, v_user, v_user
  )
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row);
END;
$$;

CREATE OR REPLACE FUNCTION public.add_organisation_risk_subcategory(
  p_account_id UUID,
  p_category_code TEXT,
  p_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := public.risk_catalogue_caller_id();
  v_name TEXT := btrim(COALESCE(p_name, ''));
  v_category TEXT := btrim(COALESCE(p_category_code, ''));
  v_code TEXT;
  v_row public.risk_subcategories%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'You need to be signed in to add a sub-category';
  END IF;
  IF NOT public.user_can_add_risk_catalogue(v_user, p_account_id) THEN
    RAISE EXCEPTION 'You cannot add risk sub-categories for this organisation';
  END IF;
  IF v_category = '' THEN
    RAISE EXCEPTION 'Choose a category first';
  END IF;
  IF v_name = '' OR char_length(v_name) > 100 THEN
    RAISE EXCEPTION 'Enter a sub-category name of 1 to 100 characters';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.risk_categories rc
    WHERE lower(rc.category_code) = lower(v_category)
      AND rc.is_active = TRUE
      AND (rc.organisation_id IS NULL OR rc.organisation_id = p_account_id)
  ) THEN
    RAISE EXCEPTION 'Choose a category first';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.risk_subcategories rs
    WHERE lower(rs.category_code) = lower(v_category)
      AND lower(rs.subcategory_name) = lower(v_name)
      AND (rs.organisation_id IS NULL OR rs.organisation_id = p_account_id)
  ) THEN
    RAISE EXCEPTION 'A sub-category with that name already exists';
  END IF;

  v_code := left(public.slugify_role_name(v_name), 50);
  IF v_code = '' THEN
    v_code := 'subcategory';
  END IF;
  WHILE EXISTS (
    SELECT 1 FROM public.risk_subcategories rs
    WHERE lower(rs.category_code) = lower(v_category)
      AND lower(rs.subcategory_code) = lower(v_code)
      AND (rs.organisation_id IS NULL OR rs.organisation_id = p_account_id)
  ) LOOP
    v_code := left(v_code, 46) || '_' || substr(md5(clock_timestamp()::text), 1, 3);
  END LOOP;

  INSERT INTO public.risk_subcategories (
    organisation_id, category_code, subcategory_code, subcategory_name, display_order, is_active, created_by, updated_by
  ) VALUES (
    p_account_id, v_category, v_code, v_name, 500, TRUE, v_user, v_user
  )
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_organisation_risk_category(
  p_id UUID,
  p_name TEXT,
  p_is_active BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := public.risk_catalogue_caller_id();
  v_row public.risk_categories%ROWTYPE;
  v_name TEXT := NULLIF(btrim(COALESCE(p_name, '')), '');
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'You need to be signed in to update a category';
  END IF;

  SELECT * INTO v_row FROM public.risk_categories WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Category not found';
  END IF;
  IF v_row.organisation_id IS NULL THEN
    RAISE EXCEPTION 'Built-in categories cannot be changed';
  END IF;
  IF NOT public.user_can_maintain_risk_catalogue(v_user, v_row.organisation_id) THEN
    RAISE EXCEPTION 'You cannot change risk categories for this organisation';
  END IF;

  IF v_name IS NOT NULL THEN
    IF char_length(v_name) > 100 THEN
      RAISE EXCEPTION 'Enter a category name of 1 to 100 characters';
    END IF;
    IF lower(v_name) <> lower(v_row.category_name) AND EXISTS (
      SELECT 1 FROM public.risk_categories rc
      WHERE rc.id <> v_row.id
        AND lower(rc.category_name) = lower(v_name)
        AND (rc.organisation_id IS NULL OR rc.organisation_id = v_row.organisation_id)
    ) THEN
      RAISE EXCEPTION 'A category with that name already exists';
    END IF;
    v_row.category_name := v_name;
  END IF;

  IF p_is_active IS NOT NULL THEN
    v_row.is_active := p_is_active;
  END IF;

  UPDATE public.risk_categories
  SET category_name = v_row.category_name,
      is_active = v_row.is_active,
      updated_by = v_user,
      updated_at = NOW()
  WHERE id = v_row.id
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_organisation_risk_subcategory(
  p_id UUID,
  p_name TEXT,
  p_is_active BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := public.risk_catalogue_caller_id();
  v_row public.risk_subcategories%ROWTYPE;
  v_name TEXT := NULLIF(btrim(COALESCE(p_name, '')), '');
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'You need to be signed in to update a sub-category';
  END IF;

  SELECT * INTO v_row FROM public.risk_subcategories WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sub-category not found';
  END IF;
  IF v_row.organisation_id IS NULL THEN
    RAISE EXCEPTION 'Built-in sub-categories cannot be changed';
  END IF;
  IF NOT public.user_can_maintain_risk_catalogue(v_user, v_row.organisation_id) THEN
    RAISE EXCEPTION 'You cannot change risk sub-categories for this organisation';
  END IF;

  IF v_name IS NOT NULL THEN
    IF char_length(v_name) > 100 THEN
      RAISE EXCEPTION 'Enter a sub-category name of 1 to 100 characters';
    END IF;
    IF lower(v_name) <> lower(v_row.subcategory_name) AND EXISTS (
      SELECT 1 FROM public.risk_subcategories rs
      WHERE rs.id <> v_row.id
        AND lower(rs.category_code) = lower(v_row.category_code)
        AND lower(rs.subcategory_name) = lower(v_name)
        AND (rs.organisation_id IS NULL OR rs.organisation_id = v_row.organisation_id)
    ) THEN
      RAISE EXCEPTION 'A sub-category with that name already exists';
    END IF;
    v_row.subcategory_name := v_name;
  END IF;

  IF p_is_active IS NOT NULL THEN
    v_row.is_active := p_is_active;
  END IF;

  UPDATE public.risk_subcategories
  SET subcategory_name = v_row.subcategory_name,
      is_active = v_row.is_active,
      updated_by = v_user,
      updated_at = NOW()
  WHERE id = v_row.id
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row);
END;
$$;

REVOKE ALL ON FUNCTION public.risk_catalogue_caller_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.user_can_maintain_risk_catalogue(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.user_can_add_risk_catalogue(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.add_organisation_risk_category(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.add_organisation_risk_subcategory(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_organisation_risk_category(UUID, TEXT, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_organisation_risk_subcategory(UUID, TEXT, BOOLEAN) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.risk_catalogue_caller_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_can_maintain_risk_catalogue(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_can_add_risk_catalogue(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.add_organisation_risk_category(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.add_organisation_risk_subcategory(UUID, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_organisation_risk_category(UUID, TEXT, BOOLEAN) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_organisation_risk_subcategory(UUID, TEXT, BOOLEAN) TO authenticated, service_role;

-- Reads: system rows for everyone signed in; organisation rows for people who may add.
DROP POLICY IF EXISTS policy_risk_categories_select ON public.risk_categories;
CREATE POLICY policy_risk_categories_select
  ON public.risk_categories FOR SELECT
  TO authenticated
  USING (
    (organisation_id IS NULL AND is_active = TRUE)
    OR (
      organisation_id IS NOT NULL
      AND public.user_can_add_risk_catalogue(public.risk_catalogue_caller_id(), organisation_id)
    )
  );

DROP POLICY IF EXISTS policy_risk_categories_insert ON public.risk_categories;
CREATE POLICY policy_risk_categories_insert
  ON public.risk_categories FOR INSERT
  TO authenticated
  WITH CHECK (
    organisation_id IS NOT NULL
    AND public.user_can_add_risk_catalogue(public.risk_catalogue_caller_id(), organisation_id)
  );

DROP POLICY IF EXISTS policy_risk_categories_update ON public.risk_categories;
CREATE POLICY policy_risk_categories_update
  ON public.risk_categories FOR UPDATE
  TO authenticated
  USING (
    organisation_id IS NOT NULL
    AND public.user_can_maintain_risk_catalogue(public.risk_catalogue_caller_id(), organisation_id)
  )
  WITH CHECK (
    organisation_id IS NOT NULL
    AND public.user_can_maintain_risk_catalogue(public.risk_catalogue_caller_id(), organisation_id)
  );

DROP POLICY IF EXISTS risk_subcategories_select ON public.risk_subcategories;
CREATE POLICY risk_subcategories_select
  ON public.risk_subcategories FOR SELECT
  TO authenticated
  USING (
    (organisation_id IS NULL AND is_active = TRUE)
    OR (
      organisation_id IS NOT NULL
      AND public.user_can_add_risk_catalogue(public.risk_catalogue_caller_id(), organisation_id)
    )
  );

DROP POLICY IF EXISTS risk_subcategories_insert ON public.risk_subcategories;
CREATE POLICY risk_subcategories_insert
  ON public.risk_subcategories FOR INSERT
  TO authenticated
  WITH CHECK (
    organisation_id IS NOT NULL
    AND public.user_can_add_risk_catalogue(public.risk_catalogue_caller_id(), organisation_id)
  );

DROP POLICY IF EXISTS risk_subcategories_update ON public.risk_subcategories;
CREATE POLICY risk_subcategories_update
  ON public.risk_subcategories FOR UPDATE
  TO authenticated
  USING (
    organisation_id IS NOT NULL
    AND public.user_can_maintain_risk_catalogue(public.risk_catalogue_caller_id(), organisation_id)
  )
  WITH CHECK (
    organisation_id IS NOT NULL
    AND public.user_can_maintain_risk_catalogue(public.risk_catalogue_caller_id(), organisation_id)
  );

GRANT SELECT, INSERT, UPDATE ON public.risk_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.risk_subcategories TO authenticated;

-- ── Menus: one page, two entries ────────────────────────────────────────────

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order,
  methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT gen_random_uuid(), 'pmo_risk_categories', 'Risk Categories',
       'Organisation risk categories and the sub-categories under each one',
       '/platform/pmo-admin/risk-categories', NULL, 1, 66, 'universal', 'tags', TRUE, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'pmo_risk_categories' AND COALESCE(is_deleted, FALSE) = FALSE
);

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order,
  methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT gen_random_uuid(), 'plat_pm_risk_categories', 'Risk Categories',
       'Organisation risk categories and the sub-categories under each one',
       '/platform/pmo-admin/risk-categories',
       (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_ctrl_core' AND COALESCE(is_deleted, FALSE) = FALSE),
       4, 15, 'universal', 'tags', TRUE, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_pm_risk_categories' AND COALESCE(is_deleted, FALSE) = FALSE
);

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order,
  methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT gen_random_uuid(), 'sim_pm_risk_categories', 'Risk Categories',
       'Organisation risk categories and the sub-categories under each one',
       '/simulator/pmo/risk-categories',
       (SELECT id FROM public.menu_items WHERE menu_code = 'sim_pm_ctrl_core' AND COALESCE(is_deleted, FALSE) = FALSE),
       4, 15, 'universal', 'tags', TRUE, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'sim_pm_risk_categories' AND COALESCE(is_deleted, FALSE) = FALSE
);

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), r.id, mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
CROSS JOIN public.roles r
WHERE mi.menu_code IN ('pmo_risk_categories', 'plat_pm_risk_categories')
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
  AND COALESCE(r.is_deleted, FALSE) = FALSE
  AND lower(replace(r.role_name, ' ', '_')) IN (
    'pmo_admin', 'org_admin', 'system_admin', 'super_admin', 'account_owner',
    'project_manager', 'pm_project_manager',
    'team_manager', 'team_lead', 'pm_team_manager',
    'team_member', 'pm_team_member'
  )
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), r.id, mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
CROSS JOIN public.roles r
WHERE mi.menu_code = 'sim_pm_risk_categories'
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
  AND COALESCE(r.is_deleted, FALSE) = FALSE
  AND lower(replace(r.role_name, ' ', '_')) IN (
    'simulator_admin', 'sim_pmo_admin', 'sim_project_manager',
    'sim_team_manager', 'sim_team_lead', 'sim_team_member'
  )
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

UPDATE public.database_tables
SET table_description = 'Risk categories: built-in rows plus organisation-owned names',
    updated_at = NOW()
WHERE table_name = 'risk_categories';

UPDATE public.database_tables
SET table_description = 'Risk sub-categories under a category: built-in rows plus organisation-owned names',
    updated_at = NOW()
WHERE table_name = 'risk_subcategories';
