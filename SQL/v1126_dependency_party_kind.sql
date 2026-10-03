-- ============================================================================
-- v1126: Flag dependency parties as internal or external, and rename the menu
-- ============================================================================
-- Safe after v1125. Adds party_kind, replaces the add function so the flag is
-- required, and renames the sidebar item from External Dependencies to
-- Dependency Parties.
-- ============================================================================

ALTER TABLE public.external_dependency_items
  ADD COLUMN IF NOT EXISTS party_kind TEXT;

UPDATE public.external_dependency_items
SET party_kind = 'external'
WHERE party_kind IS NULL OR btrim(party_kind) = '';

ALTER TABLE public.external_dependency_items
  ALTER COLUMN party_kind SET DEFAULT 'external';

ALTER TABLE public.external_dependency_items
  ALTER COLUMN party_kind SET NOT NULL;

ALTER TABLE public.external_dependency_items
  DROP CONSTRAINT IF EXISTS external_dependency_items_party_kind_check;

ALTER TABLE public.external_dependency_items
  ADD CONSTRAINT external_dependency_items_party_kind_check
  CHECK (party_kind IN ('internal', 'external'));

DROP FUNCTION IF EXISTS public.add_external_dependency_item(UUID, TEXT);

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

GRANT EXECUTE ON FUNCTION public.add_external_dependency_item(UUID, TEXT, TEXT) TO authenticated, service_role;

UPDATE public.menu_items
SET menu_label = 'Dependency Parties',
    menu_description = 'Organisation list of internal and external parties that are not a project in Nidus',
    route_path = '/platform/dependency-parties',
    updated_at = NOW()
WHERE menu_code = 'plat_pm_external_dependencies'
  AND COALESCE(is_deleted, FALSE) = FALSE;

UPDATE public.database_tables
SET table_description = 'Organisation catalogue of internal and external dependency parties used by the Dependency Register',
    updated_at = NOW()
WHERE table_name = 'external_dependency_items';
