-- ============================================================================
-- v1241: Nidus brand site — public.site_products + public.site_content
-- Plan: projectplan/v1241_nidus_brand_site_plan.md (Slice 1)
--
-- The apex-domain brand site (apps/site) shows one card per product (Platform, Simulator, Planner)
-- and a little brand copy. Both come from these tables (CLAUDE.md rule 25.1), read before sign-in.
--
-- Access:
--   - anon + authenticated: SELECT active rows only.
--   - No INSERT/UPDATE/DELETE policies: rows change only through the Admin app's SECURITY DEFINER
--     RPCs (E:\project-nidus-admin\SQL\v225_site_products_admin_rpc.sql) or versioned SQL seeds.
--   - Admin is never listed here (it is internal and invite-only).
--
-- Friendly key: `slug` (rule 16.3). No Admin ID Generation rule needed (no reference column).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.site_products (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
  name          TEXT NOT NULL,
  tagline       TEXT,
  description   TEXT,
  audience      TEXT,
  landing_url   TEXT NOT NULL,
  sign_in_url   TEXT,
  sign_up_url   TEXT,
  icon_key      TEXT,
  accent_key    TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by    UUID,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by    UUID
);

COMMENT ON TABLE public.site_products IS
  'v1241: Product cards on the public Nidus brand site (apps/site). Read by anon; written only via Admin RPCs or SQL seeds.';

CREATE TABLE IF NOT EXISTS public.site_content (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_key   TEXT NOT NULL UNIQUE CHECK (content_key ~ '^[a-z0-9_.-]+$'),
  content_value TEXT NOT NULL DEFAULT '',
  description   TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by    UUID,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by    UUID
);

COMMENT ON TABLE public.site_content IS
  'v1241: Brand-level copy for the public Nidus brand site (hero heading, intro, meta tags). Key/value.';

CREATE INDEX IF NOT EXISTS idx_site_products_active_order
  ON public.site_products (is_active, sort_order);

-- updated_at maintenance (shared helper used across the schema)
DROP TRIGGER IF EXISTS trg_site_products_updated_at ON public.site_products;
CREATE TRIGGER trg_site_products_updated_at
  BEFORE UPDATE ON public.site_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_site_content_updated_at ON public.site_content;
CREATE TRIGGER trg_site_content_updated_at
  BEFORE UPDATE ON public.site_content
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS: public read of active rows only; no client writes.
ALTER TABLE public.site_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.site_products TO anon, authenticated;
GRANT SELECT ON public.site_content TO anon, authenticated;
GRANT ALL ON public.site_products TO service_role;
GRANT ALL ON public.site_content TO service_role;

DROP POLICY IF EXISTS policy_site_products_public_read ON public.site_products;
CREATE POLICY policy_site_products_public_read ON public.site_products
  FOR SELECT TO anon, authenticated
  USING (is_active = TRUE);

DROP POLICY IF EXISTS policy_site_content_public_read ON public.site_content;
CREATE POLICY policy_site_content_public_read ON public.site_content
  FOR SELECT TO anon, authenticated
  USING (is_active = TRUE);

-- Register new tables in database_tables registry
INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('site_products', 'Product cards (Platform, Simulator, Planner) on the public Nidus brand site', false, true),
  ('site_content', 'Brand-level key/value copy for the public Nidus brand site', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  RAISE NOTICE 'v1241: site_products + site_content created (anon read of active rows; writes via Admin RPC only).';
END $$;
