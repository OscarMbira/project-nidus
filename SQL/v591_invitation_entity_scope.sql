-- =============================================================================
-- v591_invitation_entity_scope.sql
-- Extend project_invitations for portfolio/programme scope (entity_type discriminator)
-- Prerequisites: v85, v36 (portfolios), v37 (programmes)
-- PostgreSQL 15+ (Supabase)
-- =============================================================================

ALTER TABLE public.project_invitations
  ADD COLUMN IF NOT EXISTS entity_type VARCHAR(20) NOT NULL DEFAULT 'project'
    CONSTRAINT chk_project_invitations_entity_type
    CHECK (entity_type IN ('project', 'portfolio', 'programme')),
  ADD COLUMN IF NOT EXISTS portfolio_id UUID REFERENCES public.portfolios(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS programme_id UUID REFERENCES public.programmes(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.project_invitations.entity_type IS
  'Invitation target: project, portfolio, or programme';
COMMENT ON COLUMN public.project_invitations.portfolio_id IS
  'Set when entity_type = portfolio';
COMMENT ON COLUMN public.project_invitations.programme_id IS
  'Set when entity_type = programme';

-- Backfill legacy rows
UPDATE public.project_invitations
SET entity_type = 'project'
WHERE entity_type IS NULL OR entity_type = '';

ALTER TABLE public.project_invitations
  ALTER COLUMN project_id DROP NOT NULL;

ALTER TABLE public.project_invitations
  DROP CONSTRAINT IF EXISTS chk_invitation_entity_set;

ALTER TABLE public.project_invitations
  ADD CONSTRAINT chk_invitation_entity_set CHECK (
    (entity_type = 'project'
      AND project_id IS NOT NULL
      AND portfolio_id IS NULL
      AND programme_id IS NULL)
    OR (entity_type = 'portfolio'
      AND portfolio_id IS NOT NULL
      AND project_id IS NULL
      AND programme_id IS NULL)
    OR (entity_type = 'programme'
      AND programme_id IS NOT NULL
      AND project_id IS NULL
      AND portfolio_id IS NULL)
  );

CREATE INDEX IF NOT EXISTS idx_project_invitations_entity_type
  ON public.project_invitations (entity_type)
  WHERE COALESCE(is_deleted, FALSE) = FALSE;

CREATE INDEX IF NOT EXISTS idx_project_invitations_portfolio_id
  ON public.project_invitations (portfolio_id)
  WHERE portfolio_id IS NOT NULL AND COALESCE(is_deleted, FALSE) = FALSE;

CREATE INDEX IF NOT EXISTS idx_project_invitations_programme_id
  ON public.project_invitations (programme_id)
  WHERE programme_id IS NOT NULL AND COALESCE(is_deleted, FALSE) = FALSE;

DO $$
BEGIN
  RAISE NOTICE 'v591_invitation_entity_scope.sql applied';
END $$;
