-- ============================================================================
-- v304.4: Stakeholders list RPC (bypasses RLS so register always loads)
-- Description: SECURITY DEFINER function so the Stakeholder Register list
--              returns data regardless of RLS. Run after v35 and v304.3.
-- ============================================================================

-- Drop if exists so we can recreate (e.g. after adding params)
DROP FUNCTION IF EXISTS public.get_stakeholders_list(uuid, int, text, text, text);

CREATE OR REPLACE FUNCTION public.get_stakeholders_list(
  p_project_id uuid DEFAULT NULL,
  p_limit int DEFAULT 50,
  p_stakeholder_type text DEFAULT NULL,
  p_stakeholder_status text DEFAULT NULL,
  p_search text DEFAULT NULL
)
RETURNS SETOF public.stakeholders
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.stakeholders
  WHERE is_deleted = false
    AND (p_project_id IS NULL OR project_id = p_project_id)
    AND (p_stakeholder_type IS NULL OR p_stakeholder_type = '' OR stakeholder_type = p_stakeholder_type)
    AND (p_stakeholder_status IS NULL OR p_stakeholder_status = '' OR stakeholder_status = p_stakeholder_status)
    AND (
      p_search IS NULL OR p_search = ''
      OR stakeholder_name ILIKE '%' || p_search || '%'
      OR stakeholder_reference ILIKE '%' || p_search || '%'
      OR stakeholder_organization ILIKE '%' || p_search || '%'
    )
  ORDER BY stakeholder_name ASC
  LIMIT COALESCE(NULLIF(p_limit, 0), 500);
$$;

COMMENT ON FUNCTION public.get_stakeholders_list(uuid, int, text, text, text) IS
  'Returns stakeholder rows for the register list; runs with definer rights so list loads regardless of RLS.';

GRANT EXECUTE ON FUNCTION public.get_stakeholders_list(uuid, int, text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_stakeholders_list(uuid, int, text, text, text) TO authenticated;
