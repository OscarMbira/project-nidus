-- =============================================================================
-- v821: Fix create_issue_register_for_project — references a non-existent
-- projects.organisation_id column (real column is projects.account_id)
-- Found while testing the PM Dashboard's Issue Register Quick Action (v817/v820)
-- — Postgres error 42703 "column organisation_id does not exist", surfaced now
-- that project-scoped navigation to this page actually works.
--
-- SQL/v174_issue_register_tables.sql:753-756 fetches v_organisation_id from
-- projects, but that value is never actually used anywhere else in the
-- function (not passed to generate_issue_register_reference(), not inserted
-- into issue_registers — that table has no organisation_id column at all,
-- confirmed via its own CREATE TABLE, same file lines 33-63). Dead code that
-- happens to reference a column that was never valid — the fix is simply to
-- remove it, not to correct the column name to account_id, since nothing
-- downstream needs the value.
--
-- Compare SQL/v305.3_fix_create_risk_register_null_author.sql — the equivalent
-- create_risk_register_for_project function has no such reference; this bug is
-- isolated to the issue-register function, not a wider pattern.
-- =============================================================================

CREATE OR REPLACE FUNCTION create_issue_register_for_project(p_project_id UUID, p_user_id UUID)
RETURNS UUID AS $$
DECLARE
    v_register_id UUID;
    v_reference VARCHAR(50);
BEGIN
    v_reference := generate_issue_register_reference();

    INSERT INTO issue_registers (
        project_id,
        register_reference,
        version_number,
        created_by,
        updated_by
    ) VALUES (
        p_project_id,
        v_reference,
        '1.0',
        p_user_id,
        p_user_id
    ) RETURNING id INTO v_register_id;

    RETURN v_register_id;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  RAISE NOTICE 'v821_fix_create_issue_register_organisation_id.sql applied';
END $$;
