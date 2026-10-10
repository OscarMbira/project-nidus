-- =============================================================================
-- v1208: Vendor categories lookup, and room for several contact emails and phones
-- =============================================================================
-- Create Vendor's Category field becomes a searchable list of vendor_categories.
-- Contact email and contact phone are stored as newline-joined text so a vendor
-- can have more than one of each.
-- Menu: Procurement → Vendor Categories, granted to PMO, project manager,
-- team manager, and team lead (and anyone who can already open Vendors).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.vendor_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  category_name VARCHAR(80) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_vendor_categories_name
  ON public.vendor_categories (account_id, lower(category_name))
  WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_vendor_categories_account
  ON public.vendor_categories (account_id)
  WHERE is_deleted = FALSE;

ALTER TABLE public.vendor_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS policy_vendor_categories ON public.vendor_categories;
CREATE POLICY policy_vendor_categories ON public.vendor_categories
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_categories TO authenticated;

ALTER TABLE public.vendors
  ALTER COLUMN contact_email TYPE TEXT,
  ALTER COLUMN contact_phone TYPE TEXT;

INSERT INTO public.vendor_categories (account_id, category_name, description)
SELECT a.id, v.category_name, v.description
FROM public.accounts a
CROSS JOIN (VALUES
  ('Software', 'Software products and licences'),
  ('Construction', 'Construction and civil works'),
  ('Consulting', 'Professional consulting'),
  ('Logistics', 'Transport and logistics services'),
  ('Equipment', 'Equipment supply and hire'),
  ('Facilities', 'Facilities and property services')
) AS v(category_name, description)
WHERE NOT EXISTS (
    SELECT 1 FROM public.vendor_categories c
    WHERE c.account_id = a.id
      AND lower(c.category_name) = lower(v.category_name)
      AND c.is_deleted = FALSE
  );

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES ('vendor_categories', 'Organisation lookup of vendor categories used on the vendor register', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_active = TRUE,
  updated_at = NOW();

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT
  gen_random_uuid(), 'plat_pm_proc_vendor_categories', 'Vendor Categories',
  'Categories used when recording a vendor.',
  '/platform/pm/procurement/vendor-categories',
  (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_procurement' AND COALESCE(is_deleted, FALSE) = FALSE),
  (SELECT menu_level + 1 FROM public.menu_items WHERE menu_code = 'plat_pm_procurement' AND COALESCE(is_deleted, FALSE) = FALSE),
  25, 'universal', 'tags', TRUE, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items
  WHERE menu_code = 'plat_pm_proc_vendor_categories' AND COALESCE(is_deleted, FALSE) = FALSE
);

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), r.id, mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.roles r
JOIN public.menu_items mi ON mi.menu_code = 'plat_pm_proc_vendor_categories' AND COALESCE(mi.is_deleted, FALSE) = FALSE
WHERE r.role_name IN (
  'pmo_admin', 'pmo',
  'project_manager', 'pm_project_manager',
  'team_manager', 'pm_team_manager',
  'team_lead', 'pm_team_lead'
)
AND NOT EXISTS (
  SELECT 1 FROM public.role_menu_items existing
  WHERE existing.role_id = r.id AND existing.menu_item_id = mi.id
);

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), src.role_id, dst.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.role_menu_items src
JOIN public.menu_items ref ON ref.id = src.menu_item_id AND ref.menu_code = 'plat_pm_proc_vendors'
JOIN public.menu_items dst ON dst.menu_code = 'plat_pm_proc_vendor_categories' AND COALESCE(dst.is_deleted, FALSE) = FALSE
WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();
