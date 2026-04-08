-- ============================================================
-- v325: Organisation Branding – system-wide base font size
-- Adds base_font_size to organisation_branding for Typography tab.
-- Values: small (14px) | medium (16px) | large (18px) | x-large (20px)
-- ============================================================

ALTER TABLE public.organisation_branding
  ADD COLUMN IF NOT EXISTS base_font_size VARCHAR(20) DEFAULT 'medium'
  CHECK (base_font_size IN ('small', 'medium', 'large', 'x-large'));

COMMENT ON COLUMN public.organisation_branding.base_font_size IS 'System-wide base font size: small (14px), medium (16px), large (18px), x-large (20px). Applied to :root so rem units scale.';
