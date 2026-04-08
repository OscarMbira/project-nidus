-- ============================================================================
-- v304.6: Allow stakeholders without a project (create first, assign later)
-- Description: Makes project_id nullable so stakeholders can be created
--              independently and attached to projects later.
-- Run after: v35 (stakeholders table).
-- ============================================================================

ALTER TABLE public.stakeholders
  ALTER COLUMN project_id DROP NOT NULL;

COMMENT ON COLUMN public.stakeholders.project_id IS 'Optional: project this stakeholder is assigned to; NULL = independent, can be assigned later.';
