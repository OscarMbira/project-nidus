-- =============================================================================
-- v937: Local Register Engine — add account_id/project_id for record-lifecycle compatibility
-- =============================================================================
-- public.submit_for_authorisation() (SQL/v654) dynamically queries
-- `SELECT account_id, project_id FROM public.%I WHERE id = $1` against WHATEVER table_name is
-- passed to it — a hard, load-bearing convention every Category A/B lifecycle table must
-- satisfy. local_register_records has neither column (it uses record_portfolio_id/
-- record_programme_id/record_project_id instead, v932), so calling submitForAuthorisation on it
-- would fail with "column account_id does not exist" before this fix.
--
-- account_id is populated from the creating user's own resolved account at insert time (not
-- looked up via the scope entity) — portfolios/programmes have no account_id column of their
-- own to look up (confirmed: grepped their schema files, found none; only projects.account_id
-- exists directly), so this is the simpler and more robust source of truth, uniform across all
-- 4 scope levels. project_id is simply record_project_id (NULL for non-project scope — the
-- lifecycle SQL already falls back to account-level authorisers when project_id IS NULL, see
-- submit_for_authorisation's WHERE clause).
--
-- Prerequisites: v931_local_register_engine_schema.sql, v932_local_registers_system_scope_fix.sql
-- =============================================================================

ALTER TABLE public.local_register_records
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id),
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id);

COMMENT ON COLUMN public.local_register_records.account_id IS
  'v937: required by submit_for_authorisation()''s dynamic account_id/project_id lookup — set '
  'from the creating user''s own resolved account at insert time, not derived from the scope '
  'entity (portfolios/programmes carry no account_id of their own to derive it from).';
COMMENT ON COLUMN public.local_register_records.project_id IS
  'v937: mirrors record_project_id when the register is project-scoped, NULL otherwise. Exists '
  'because submit_for_authorisation() expects a literal project_id column on every lifecycle '
  'table; NULL correctly falls back to account-level authorisers per that function''s own logic.';

CREATE INDEX IF NOT EXISTS idx_local_register_records_account_id ON public.local_register_records(account_id);
CREATE INDEX IF NOT EXISTS idx_local_register_records_lifecycle_project_id ON public.local_register_records(project_id) WHERE project_id IS NOT NULL;

DO $$ BEGIN
  RAISE NOTICE 'v937_local_register_records_account_project_columns.sql applied successfully';
END $$;
