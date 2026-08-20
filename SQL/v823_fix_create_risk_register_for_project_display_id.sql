-- =============================================================================
-- v823: Fix create_risk_register_for_project() — broken by v756b ID Generation migration
-- Bug: v756b (ID Generation Migration) dropped generate_risk_register_reference(),
--      replacing it with an AFTER INSERT trigger (trg_risk_registers_admin_display_id)
--      that populates register_reference via admin.generate_display_id(). However,
--      create_risk_register_for_project() (v172) was never updated and still calls
--      the now-dropped generate_risk_register_reference(), so EVERY new risk
--      register creation (via the app's "Add Risk"/createRiskRegister flow, and
--      via this RPC) fails with: function generate_risk_register_reference() does
--      not exist.
-- Fix: insert with register_reference = '' (satisfies NOT NULL/UNIQUE) and let the
--      existing trg_risk_registers_admin_display_id AFTER INSERT trigger populate
--      the real display ID, matching the pattern already used by issues/lessons.
-- Prerequisites: v172_risk_register_enhancement.sql, v756b_id_generation_migration_public.sql
-- =============================================================================

CREATE OR REPLACE FUNCTION create_risk_register_for_project(p_project_id UUID, p_user_id UUID)
RETURNS UUID AS $$
DECLARE
    v_register_id UUID;
BEGIN
    SELECT id INTO v_register_id
    FROM risk_registers
    WHERE project_id = p_project_id
      AND is_deleted = FALSE;

    IF v_register_id IS NOT NULL THEN
        RETURN v_register_id;
    END IF;

    -- register_reference left blank here; trg_risk_registers_admin_display_id
    -- (AFTER INSERT) fills it via admin.generate_display_id().
    INSERT INTO risk_registers (
        project_id,
        register_reference,
        created_by,
        is_active
    )
    VALUES (
        p_project_id,
        '',
        p_user_id,
        TRUE
    )
    RETURNING id INTO v_register_id;

    RETURN v_register_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_risk_register_for_project(UUID, UUID) IS 'Creates risk register when project is initiated (register_reference populated by admin display-ID trigger, v823)';
