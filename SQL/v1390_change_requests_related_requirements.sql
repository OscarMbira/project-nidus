-- ============================================================================
-- v1390: Change requests ↔ requirements (Requirement Changes)
-- ============================================================================
-- PRD / plan v1338, Slice 8 — decision D7 (part 2).
--   * related_requirement_ids UUID[] on public.change_requests and sim.practice_change_requests
--     (pattern v1137 / v1138): the requirements a change adds, alters or removes. NULL = none.
--   * Change request form: "Related requirements" picker (shown once this column exists).
--   * Change requests list: ?filter=requirements shows only changes linked to requirements.
--   * Menu: IT → Requirements → Requirement Changes → /platform/change-requests?filter=requirements.
-- Prerequisites: v31, v1137, v1385. Idempotent.
-- ============================================================================

ALTER TABLE public.change_requests ADD COLUMN IF NOT EXISTS related_requirement_ids UUID[];
ALTER TABLE sim.practice_change_requests ADD COLUMN IF NOT EXISTS related_requirement_ids UUID[];

COMMENT ON COLUMN public.change_requests.related_requirement_ids IS
  'v1390: requirements_register ids this change adds, alters or removes (Requirement Changes).';

CREATE INDEX IF NOT EXISTS idx_change_requests_related_requirements
  ON public.change_requests USING GIN (related_requirement_ids) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_sim_practice_change_requests_related_requirements
  ON sim.practice_change_requests USING GIN (related_requirement_ids) WHERE is_deleted = FALSE;

-- ── Menu: IT → Requirements → Requirement Changes ───────────────────────────────
INSERT INTO public.menu_items (id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), 'ict_req_changes', 'Requirement Changes', 'Change requests that add, alter or remove requirements',
       '/platform/change-requests?filter=requirements',
       (SELECT id FROM public.menu_items WHERE menu_code = 'ict_cat_requirements' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
       2, 932, 'universal', 'list-checks', TRUE, TRUE, NOW(), NOW()
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label, menu_description = EXCLUDED.menu_description, route_path = EXCLUDED.route_path,
  parent_menu_id = EXCLUDED.parent_menu_id, sort_order = EXCLUDED.sort_order,
  is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

SELECT public.grant_menu_role_group('ict_req_changes');

INSERT INTO public.industry_pack_menu_items (industry_pack_id, menu_item_id)
SELECT ip.id, mi.id
FROM public.menu_items mi
JOIN public.industry_packs ip ON ip.industry_category_id = (SELECT id FROM public.industry_categories WHERE name = 'Information Technology')
WHERE mi.menu_code = 'ict_req_changes' AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (industry_pack_id, menu_item_id) DO NOTHING;

DO $$ BEGIN
  RAISE NOTICE 'v1390: related_requirement_ids added to public.change_requests and sim.practice_change_requests; Requirement Changes menu item added';
END $$;

NOTIFY pgrst, 'reload schema';
