-- ============================================================
-- v311: Organisation Branding Table
-- Creates the organisation_branding table for per-account
-- corporate branding configuration (colours, logos, fonts).
-- Accessible to pmo_admin and super_admin roles only.
-- ============================================================

-- Create the main branding config table
CREATE TABLE IF NOT EXISTS public.organisation_branding (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id           UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,

  -- Identity
  app_display_name     VARCHAR(100),       -- Custom name shown in header, e.g. "Acme PMO"
  app_tagline          VARCHAR(200),       -- Subtitle shown under logo

  -- Logos & Images (URLs stored; files in Supabase Storage bucket)
  primary_logo_url     TEXT,              -- Main header logo (240×60px recommended)
  sidebar_logo_url     TEXT,              -- Compact sidebar logo (48×48px recommended)
  favicon_url          TEXT,              -- Browser tab favicon (32×32px)
  login_banner_url     TEXT,              -- Login / landing page hero image
  email_logo_url       TEXT,              -- Logo used in system-generated emails
  report_cover_url     TEXT,              -- Cover image used in exported reports / PDFs

  -- Colour Palette (hex strings, 7 chars incl. #)
  primary_color        VARCHAR(7),        -- Primary highlight colour  default #3B82F6
  secondary_color      VARCHAR(7),        -- Secondary colour          default #1E40AF
  accent_color         VARCHAR(7),        -- Accent / alert colour     default #F59E0B
  header_bg_color      VARCHAR(7),        -- Header background          default #1F2937
  sidebar_bg_color     VARCHAR(7),        -- Sidebar background         default #111827
  sidebar_active_color VARCHAR(7),        -- Active sidebar item        default #3B82F6
  sidebar_text_color   VARCHAR(7),        -- Sidebar text               default #F9FAFB
  button_color         VARCHAR(7),        -- Primary button colour      default #3B82F6
  link_color           VARCHAR(7),        -- Link colour                default #60A5FA

  -- Typography
  font_family          VARCHAR(50) DEFAULT 'inter',  -- inter | roboto | open-sans | lato | poppins | nunito | source-sans | system

  -- Metadata
  is_active            BOOLEAN NOT NULL DEFAULT true,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by           UUID REFERENCES auth.users(id),
  updated_by           UUID REFERENCES auth.users(id),
  is_deleted           BOOLEAN NOT NULL DEFAULT false,
  deleted_at           TIMESTAMPTZ,
  deleted_by           UUID REFERENCES auth.users(id),

  CONSTRAINT organisation_branding_account_id_unique UNIQUE (account_id)
);

-- Migrate existing brand_color data from accounts table
UPDATE public.organisation_branding ob
SET primary_color = a.brand_color
FROM public.accounts a
WHERE ob.account_id = a.id
  AND a.brand_color IS NOT NULL
  AND ob.primary_color IS NULL;

-- Auto-update updated_at on modification
CREATE OR REPLACE FUNCTION public.set_organisation_branding_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_organisation_branding_updated_at ON public.organisation_branding;
CREATE TRIGGER trg_organisation_branding_updated_at
  BEFORE UPDATE ON public.organisation_branding
  FOR EACH ROW EXECUTE FUNCTION public.set_organisation_branding_updated_at();

-- ──────────────────────────────────────────
-- Row Level Security
-- ──────────────────────────────────────────
ALTER TABLE public.organisation_branding ENABLE ROW LEVEL SECURITY;

-- SELECT: any authenticated user in the same account can read branding
-- (logos/colours must be visible to all users, not just admins)
CREATE POLICY "organisation_branding_select_own_account"
  ON public.organisation_branding FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      -- Account owner
      EXISTS (
        SELECT 1 FROM public.accounts a
        JOIN public.users u ON u.id = a.owner_user_id
        WHERE a.id = account_id
          AND u.auth_user_id = auth.uid()
          AND (a.is_deleted = false OR a.is_deleted IS NULL)
      )
      OR
      -- Account member via project roles
      EXISTS (
        SELECT 1 FROM public.projects p
        JOIN public.user_roles ur ON ur.project_id = p.id
        JOIN public.users u ON u.id = ur.user_id
        WHERE p.account_id = account_id
          AND u.auth_user_id = auth.uid()
          AND (p.is_deleted = false OR p.is_deleted IS NULL)
          AND (ur.is_deleted = false OR ur.is_deleted IS NULL)
          AND ur.is_active = true
      )
    )
  );

-- INSERT: pmo_admin or super_admin only
CREATE POLICY "organisation_branding_insert_admin"
  ON public.organisation_branding FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND r.role_name IN ('pmo_admin', 'super_admin', 'org_admin')
        AND (ur.is_deleted = false OR ur.is_deleted IS NULL)
    )
  );

-- UPDATE: pmo_admin or super_admin only
CREATE POLICY "organisation_branding_update_admin"
  ON public.organisation_branding FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND r.role_name IN ('pmo_admin', 'super_admin', 'org_admin')
        AND (ur.is_deleted = false OR ur.is_deleted IS NULL)
    )
  );

-- DELETE: super_admin only (soft-delete preferred; hard-delete is exceptional)
CREATE POLICY "organisation_branding_delete_superadmin"
  ON public.organisation_branding FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND r.role_name = 'super_admin'
        AND (ur.is_deleted = false OR ur.is_deleted IS NULL)
    )
  );

-- ──────────────────────────────────────────
-- Register in database_tables registry
-- ──────────────────────────────────────────
INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES (
  'organisation_branding',
  'Per-account corporate branding configuration: logos, colour palette, typography, and identity settings',
  false,
  true
)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  updated_at = NOW();
