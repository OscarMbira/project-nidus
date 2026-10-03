-- ============================================================================
-- v1128: Inter-project dependencies — Admin ID Generation on dependency_code
-- (renamed twice: v1120 -> v1123 -> v1128, resolving two successive filename
-- collisions with unrelated concurrent work — content unchanged throughout,
-- already applied to the database under an earlier name)
-- ============================================================================
-- Blank Dependency Code on create is assigned by Admin ID Generation
-- (DEP-YYYY-###, or IPD-YYYY-### if DEP is already in use). A code the user
-- typed is left unchanged. Companion rule seed:
-- E:\project-nidus-admin\SQL\v223_inter_project_dependencies_id_generation_seed.sql
-- ============================================================================

DROP INDEX IF EXISTS public.idx_inter_project_dependencies_code_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_inter_project_dependencies_code_unique
  ON public.inter_project_dependencies (
    COALESCE(portfolio_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(programme_id, '00000000-0000-0000-0000-000000000000'::uuid),
    dependency_code
  )
  WHERE is_deleted = FALSE
    AND dependency_code IS NOT NULL
    AND btrim(dependency_code) <> '';

DROP TRIGGER IF EXISTS trg_inter_project_dependencies_admin_display_id ON public.inter_project_dependencies;
CREATE TRIGGER trg_inter_project_dependencies_admin_display_id
  AFTER INSERT ON public.inter_project_dependencies
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_apply_admin_display_id('public.inter_project_dependencies', 'dependency_code');

DO $$
DECLARE
  v_admin UUID;
  v_rule_id UUID;
  v_abbrev VARCHAR(4);
  v_ref TEXT;
  r RECORD;
BEGIN
  SELECT id INTO v_admin
  FROM admin.admin_users
  WHERE activation_status = 'active'
  ORDER BY CASE WHEN role = 'super_admin' THEN 0 ELSE 1 END, created_at
  LIMIT 1;

  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'No active admin user found. Activate an admin user, then re-run this script.';
  END IF;

  v_abbrev := 'DEP';
  IF EXISTS (
    SELECT 1
    FROM admin.id_generation_rules
    WHERE upper(table_abbreviation) = 'DEP'
      AND is_active = TRUE
      AND admin.normalize_id_generation_target_table(target_table)
          <> admin.normalize_id_generation_target_table('public.inter_project_dependencies')
  ) THEN
    v_abbrev := 'IPD';
  END IF;

  SELECT id INTO v_rule_id
  FROM admin.id_generation_rules
  WHERE admin.normalize_id_generation_target_table(target_table)
      = admin.normalize_id_generation_target_table('public.inter_project_dependencies')
  LIMIT 1;

  IF v_rule_id IS NOT NULL THEN
    PERFORM admin.update_id_generation_rule(
      v_rule_id,
      'public.inter_project_dependencies',
      v_abbrev,
      'Inter-project dependency codes',
      '-', '', 'uppercase', 'numeric', 0, 3, '', 1, TRUE, v_admin,
      'sequential', TRUE, 'YYYY', NULL
    );
  ELSE
    PERFORM admin.create_id_generation_rule(
      'public.inter_project_dependencies',
      v_abbrev,
      'Inter-project dependency codes',
      '-', '', 'uppercase', 'numeric', 0, 3, '', 1, TRUE, v_admin,
      'sequential', TRUE, 'YYYY', NULL
    );
  END IF;

  FOR r IN
    SELECT id
    FROM public.inter_project_dependencies
    WHERE COALESCE(is_deleted, FALSE) = FALSE
      AND (dependency_code IS NULL OR btrim(dependency_code) = '')
    ORDER BY created_at NULLS LAST, id
  LOOP
    v_ref := admin.generate_display_id('public.inter_project_dependencies', r.id);
    IF v_ref IS NOT NULL AND btrim(v_ref) <> '' THEN
      UPDATE public.inter_project_dependencies
      SET dependency_code = v_ref
      WHERE id = r.id;
    END IF;
  END LOOP;

  RAISE NOTICE 'v1120_inter_project_dependencies_id_generation.sql applied — abbreviation %', v_abbrev;
END $$;
