-- =============================================================================
-- v1158: Fix Resource Directory sidebar link routing to the wrong page
-- =============================================================================
-- Bug: the authenticated in-app Resource Directory (Resources.jsx, nested under
-- the /platform/* splat route in platformRoutes.jsx) and the public marketing
-- "Resources" page (ResourcesPage, a top-level static route in publicRoutes.jsx)
-- were BOTH registered at the exact same URL: /platform/resources.
--
-- React Router v6 always resolves an exact-match static route (two static
-- segments: "platform" + "resources") over a splat route ("platform/*" + one
-- static segment), regardless of declaration order. So every sidebar menu item
-- pointing at /platform/resources was silently landing on the logged-out
-- marketing page instead of the real Resource Directory list.
--
-- Fix (code side, same change): platformRoutes.jsx now registers the real
-- Resources.jsx list at the non-colliding path "resources/directory"
-- (-> /platform/resources/directory), matching the existing sibling pattern
-- (resources/capacity, resources/conflicts, resources/plan, etc). This
-- migration repoints every menu_items row that was seeded against the old,
-- colliding /platform/resources path so the sidebar/reports/marketing links
-- resolve to the real page again.
--
-- Rows fixed (all originally seeded pointing at /platform/resources):
--   plat_people_resource_dir  (v681_menu_revamp_platform_hierarchy.sql)
--   plat_pm_resource_dir      (v681_menu_revamp_platform_hierarchy.sql)
--   plat_xf_resources_hub     (v681_menu_revamp_platform_hierarchy.sql)
--   pm_resource_list          (v568_pm_menu_items_seed.sql)
--   plat_pm_rep_resource      (v1055_reports_taxonomy_expansion.sql)
--   mkt_reuse_resources       (v958_mkt_marketing_categories_and_registers_seed.sql)
--
-- NOT touched: the public marketing routes themselves (/resources,
-- /platform/resources, /simulator/resources -> ResourcesPage) and any
-- menu_items row that legitimately targets the public marketing site.
-- =============================================================================

UPDATE public.menu_items
SET route_path = '/platform/resources/directory',
    updated_at = NOW()
WHERE menu_code IN (
  'plat_people_resource_dir',
  'plat_pm_resource_dir',
  'plat_xf_resources_hub',
  'pm_resource_list',
  'plat_pm_rep_resource',
  'mkt_reuse_resources'
)
AND route_path = '/platform/resources'
AND COALESCE(is_deleted, FALSE) = FALSE;
