-- =============================================================================
-- v790: System-wide risk category options for Global Templates / pickers
-- (Renumbered from duplicate v789 to avoid collision with
--  v789_issue_register_screen_and_sim_parity.sql)
-- Enables Admin (and any authenticated user) to list standard categories from
-- public.risk_categories without requiring org project membership.
-- Prerequisites: v172_risk_register_enhancement.sql, v173_risk_register_rls_policies.sql
-- =============================================================================

-- Allow organisation_id NULL = system catalog row (shared pick-list)
ALTER TABLE public.risk_categories
  ALTER COLUMN organisation_id DROP NOT NULL;

COMMENT ON COLUMN public.risk_categories.organisation_id IS
  'Owning account; NULL = system-wide default category available to all pickers.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_risk_categories_system_code
  ON public.risk_categories (lower(category_code))
  WHERE organisation_id IS NULL;

-- Readable system defaults for every authenticated user (Admin Global Templates, etc.)
DROP POLICY IF EXISTS policy_risk_categories_select ON public.risk_categories;
CREATE POLICY policy_risk_categories_select
    ON public.risk_categories FOR SELECT
    TO authenticated
    USING (
        is_active = TRUE
        AND (
            organisation_id IS NULL
            OR EXISTS (
                SELECT 1 FROM public.projects p
                JOIN public.user_projects up ON p.id = up.project_id
                JOIN public.users u ON up.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND p.account_id = risk_categories.organisation_id
                  AND up.is_deleted = FALSE
            )
        )
    );

-- Idempotent system catalog seed (codes align with Platform EnhancedRiskForm)
INSERT INTO public.risk_categories (
  organisation_id, category_code, category_name, category_description,
  is_default, display_order, is_active
)
SELECT NULL, v.code, v.name, v.description, TRUE, v.ord, TRUE
FROM (
  VALUES
    ('schedule', 'Schedule', 'Time / schedule related risk', 10),
    ('cost', 'Cost', 'Budget / cost related risk', 20),
    ('quality', 'Quality', 'Quality related risk', 30),
    ('scope', 'Scope', 'Scope related risk', 40),
    ('resource', 'Resource', 'People / capacity related risk', 50),
    ('technical', 'Technical', 'Technical / delivery risk', 60),
    ('legal', 'Legal', 'Legal related risk', 70),
    ('regulatory', 'Regulatory', 'Regulatory / compliance risk', 80),
    ('commercial', 'Commercial', 'Commercial / contractual risk', 90),
    ('operational', 'Operational', 'Operational risk', 100),
    ('strategic', 'Strategic', 'Strategic risk', 110),
    ('external', 'External', 'External / environmental risk', 120),
    ('organizational', 'Organizational', 'Organisational / internal risk', 130),
    ('organisational', 'Organisational', 'Organisational / internal risk (UK spelling)', 131),
    ('business', 'Business', 'Business risk', 140),
    ('other', 'Other', 'Other / uncategorised risk', 999)
) AS v(code, name, description, ord)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.risk_categories rc
  WHERE rc.organisation_id IS NULL
    AND lower(rc.category_code) = lower(v.code)
);

CREATE OR REPLACE FUNCTION public.list_risk_category_options()
RETURNS TABLE (
  category_code TEXT,
  category_name TEXT,
  category_description TEXT,
  display_order INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Prefer system catalog; if none, fall back to distinct active org rows
  SELECT
    rc.category_code::text,
    rc.category_name::text,
    rc.category_description::text,
    COALESCE(rc.display_order, 0)::integer
  FROM public.risk_categories rc
  WHERE rc.is_active = TRUE
    AND rc.organisation_id IS NULL
  ORDER BY COALESCE(rc.display_order, 0), rc.category_name;
$$;

REVOKE ALL ON FUNCTION public.list_risk_category_options() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_risk_category_options() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_risk_category_options() TO service_role;

COMMENT ON FUNCTION public.list_risk_category_options() IS
  'System risk category pick-list for Global Templates and forms (SECURITY DEFINER).';
