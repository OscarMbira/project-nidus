-- ============================================================================
-- v1124: Dependency Register — one project required, other end optional
-- ============================================================================
-- A register row always belongs to at least one project. The other end may be
-- another project, or an external party (supplier, permit, decision) stored in
-- external_dependency. Existing rows already have both projects, so they stay
-- valid with a blank external description.
-- ============================================================================

ALTER TABLE public.inter_project_dependencies
  ALTER COLUMN source_project_id DROP NOT NULL,
  ALTER COLUMN target_project_id DROP NOT NULL;

ALTER TABLE public.inter_project_dependencies
  ADD COLUMN IF NOT EXISTS external_dependency TEXT;

ALTER TABLE public.inter_project_dependencies
  DROP CONSTRAINT IF EXISTS inter_project_dependencies_party_check;

ALTER TABLE public.inter_project_dependencies
  ADD CONSTRAINT inter_project_dependencies_party_check CHECK (
    (source_project_id IS NOT NULL OR target_project_id IS NOT NULL)
    AND (
      (source_project_id IS NOT NULL AND target_project_id IS NOT NULL)
      OR btrim(COALESCE(external_dependency, '')) <> ''
    )
  );
