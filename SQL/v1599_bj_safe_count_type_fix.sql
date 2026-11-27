-- =============================================================================
-- v1599 — v1352 fix: bj_safe_count / bj_safe_json always read one result type
-- =============================================================================
-- Both helpers run stored SQL text and read the answer from a RECORD field (rec.n / rec.j). PL/pgSQL
-- remembers that field’s type from the first call in a session, so when one check returns integer
-- (e.g. SELECT 3) and the next returns bigint (count(*)), the second call fails with a type mismatch.
-- The exception handler then returned NULL, so the check was silently reported as "skipped" (found by
-- the v1598 T7 test). The answer is now cast to one type every time: bigint for counts, jsonb for JSON.
-- Replaces the definitions from v1563 (same signatures and return types). Run, then run v1598 again.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.bj_safe_count(p_sql TEXT, p_id UUID, p_date DATE)
RETURNS INTEGER
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, sim SET row_security = off
AS $$
DECLARE
  v   BIGINT;
  rec RECORD;
BEGIN
  FOR rec IN EXECUTE 'SELECT ((' || p_sql || '))::BIGINT AS n' USING p_id, p_date LOOP
    v := rec.n;
  END LOOP;
  RETURN LEAST(v, 2147483647)::INTEGER;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.bj_safe_json(p_sql TEXT, p_id UUID, p_date DATE)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, sim SET row_security = off
AS $$
DECLARE
  v   JSONB;
  rec RECORD;
BEGIN
  FOR rec IN EXECUTE 'SELECT ((' || p_sql || '))::JSONB AS j' USING p_id, p_date LOOP
    v := rec.j;
  END LOOP;
  RETURN v;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

-- Check: an integer answer followed by a bigint answer in the same session both come back.
DO $$
BEGIN
  ASSERT public.bj_safe_count('SELECT 3', NULL, CURRENT_DATE) = 3, 'v1599 integer answer';
  ASSERT public.bj_safe_count('SELECT count(*) FROM public.accounts WHERE FALSE', NULL, CURRENT_DATE) = 0, 'v1599 bigint answer after an integer one';
  ASSERT public.bj_safe_json('SELECT ''{"a": 1}''::json', NULL, CURRENT_DATE) ->> 'a' = '1', 'v1599 json answer';
  ASSERT public.bj_safe_json('SELECT ''{"b": 2}''::jsonb', NULL, CURRENT_DATE) ->> 'b' = '2', 'v1599 jsonb answer after a json one';
  RAISE NOTICE 'v1599: bj_safe_count and bj_safe_json return mixed types correctly';
END $$;
