-- ================================================
-- File: v148_document_compliance_functions.sql
-- Description: Document governance compliance check functions and triggers
-- Version: 1.0
-- Date: 2026-01-08
-- Author: Development Team
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Prerequisites:
-- - v146_document_governance_tables.sql must be run first
-- - v147_document_types_seed_data.sql must be run first
-- - stage_boundaries table must exist (v10)

-- Purpose:
-- Creates compliance check functions for document governance:
-- 1. check_project_document_compliance() - Returns missing mandatory docs for a project/stage
-- 2. check_stage_gate_document_requirements() - Validates if stage gate can be approved
-- 3. get_programme_document_compliance() - Roll up compliance across all projects in programme
-- 4. calculate_project_storage_usage() - Calculate total storage used by project
-- 5. Trigger to auto-update document status when file uploaded

-- Note: This script is idempotent and can be run multiple times safely

-- ================================================
-- FUNCTION 1: check_project_document_compliance
-- Description: Returns missing mandatory documents for a project and stage
-- ================================================

CREATE OR REPLACE FUNCTION check_project_document_compliance(
    p_project_id UUID,
    p_stage_code VARCHAR(50) DEFAULT NULL
)
RETURNS TABLE (
    document_type_id UUID,
    document_type_name VARCHAR(255),
    stage_code VARCHAR(50),
    stage_name VARCHAR(200),
    is_mandatory BOOLEAN,
    document_status VARCHAR(50),
    is_missing BOOLEAN,
    is_not_approved BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        dt.id AS document_type_id,
        dt.name AS document_type_name,
        dt.stage_code,
        dgs.stage_name,
        dt.is_mandatory,
        COALESCE(pd.status, 'not_started'::VARCHAR(50)) AS document_status,
        (pd.id IS NULL) AS is_missing,
        (pd.id IS NOT NULL AND pd.status != 'approved') AS is_not_approved
    FROM document_types dt
    INNER JOIN document_governance_stages dgs ON dt.stage_code = dgs.stage_code
    LEFT JOIN project_documents pd ON dt.id = pd.document_type_id
        AND pd.project_id = p_project_id
        AND pd.is_deleted = FALSE
    WHERE dt.is_deleted = FALSE
        AND dt.is_active = TRUE
        AND dgs.is_deleted = FALSE
        AND (p_stage_code IS NULL OR dt.stage_code = p_stage_code)
        AND dt.is_mandatory = TRUE -- Only check mandatory documents
    ORDER BY dgs.stage_order, dt.name;
END;
$$;

COMMENT ON FUNCTION check_project_document_compliance IS 'Returns missing or not-approved mandatory documents for a project (optionally filtered by stage)';

-- ================================================
-- FUNCTION 2: check_stage_gate_document_requirements
-- Description: Validates if a stage gate can be approved based on document compliance
-- ================================================

CREATE OR REPLACE FUNCTION check_stage_gate_document_requirements(
    p_stage_boundary_id UUID
)
RETURNS TABLE (
    can_approve BOOLEAN,
    blocking_reason TEXT,
    missing_documents_count INTEGER,
    unapproved_documents_count INTEGER,
    missing_documents JSONB,
    unapproved_documents JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_project_id UUID;
    v_stage_name VARCHAR(200);
    v_stage_code VARCHAR(50);
    v_missing_count INTEGER;
    v_unapproved_count INTEGER;
    v_missing_docs JSONB;
    v_unapproved_docs JSONB;
BEGIN
    -- Get project_id and stage from stage_boundary
    SELECT sb.project_id, sb.stage_name
    INTO v_project_id, v_stage_name
    FROM stage_boundaries sb
    WHERE sb.id = p_stage_boundary_id
        AND sb.is_deleted = FALSE;

    IF v_project_id IS NULL THEN
        RAISE EXCEPTION 'Stage boundary not found: %', p_stage_boundary_id;
    END IF;

    -- Map stage_name to stage_code (approximate matching)
    -- This may need adjustment based on actual stage_boundaries.stage_name values
    SELECT dgs.stage_code INTO v_stage_code
    FROM document_governance_stages dgs
    WHERE dgs.is_deleted = FALSE
        AND (
            LOWER(v_stage_name) LIKE '%' || LOWER(dgs.stage_name) || '%'
            OR LOWER(dgs.stage_name) LIKE '%' || LOWER(v_stage_name) || '%'
        )
    LIMIT 1;

    -- If no stage match, return can_approve = TRUE (no document requirements)
    IF v_stage_code IS NULL THEN
        RETURN QUERY SELECT
            TRUE::BOOLEAN,
            NULL::TEXT,
            0::INTEGER,
            0::INTEGER,
            NULL::JSONB,
            NULL::JSONB;
        RETURN;
    END IF;

    -- Get missing mandatory documents
    SELECT
        COUNT(*),
        COALESCE(jsonb_agg(
            jsonb_build_object(
                'document_type_id', document_type_id,
                'document_type_name', document_type_name,
                'stage_name', stage_name
            )
        ), '[]'::JSONB)
    INTO v_missing_count, v_missing_docs
    FROM check_project_document_compliance(v_project_id, v_stage_code)
    WHERE is_missing = TRUE;

    -- Get unapproved mandatory documents
    SELECT
        COUNT(*),
        COALESCE(jsonb_agg(
            jsonb_build_object(
                'document_type_id', document_type_id,
                'document_type_name', document_type_name,
                'stage_name', stage_name,
                'current_status', document_status
            )
        ), '[]'::JSONB)
    INTO v_unapproved_count, v_unapproved_docs
    FROM check_project_document_compliance(v_project_id, v_stage_code)
    WHERE is_not_approved = TRUE;

    -- Determine if gate can be approved
    RETURN QUERY SELECT
        (v_missing_count = 0 AND v_unapproved_count = 0)::BOOLEAN AS can_approve,
        CASE
            WHEN v_missing_count > 0 AND v_unapproved_count > 0 THEN
                FORMAT('%s missing mandatory documents and %s unapproved mandatory documents', v_missing_count, v_unapproved_count)
            WHEN v_missing_count > 0 THEN
                FORMAT('%s missing mandatory documents', v_missing_count)
            WHEN v_unapproved_count > 0 THEN
                FORMAT('%s unapproved mandatory documents', v_unapproved_count)
            ELSE NULL
        END AS blocking_reason,
        v_missing_count AS missing_documents_count,
        v_unapproved_count AS unapproved_documents_count,
        v_missing_docs AS missing_documents,
        v_unapproved_docs AS unapproved_documents;
END;
$$;

COMMENT ON FUNCTION check_stage_gate_document_requirements IS 'Validates if a stage gate can be approved based on mandatory document compliance';

-- ================================================
-- FUNCTION 3: get_programme_document_compliance
-- Description: Roll up document compliance across all projects in a programme
-- ================================================

CREATE OR REPLACE FUNCTION get_programme_document_compliance(
    p_programme_id UUID
)
RETURNS TABLE (
    project_id UUID,
    project_name VARCHAR(255),
    total_mandatory_docs INTEGER,
    missing_mandatory_docs INTEGER,
    unapproved_mandatory_docs INTEGER,
    approved_mandatory_docs INTEGER,
    compliance_percentage DECIMAL(5,2),
    is_compliant BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH project_compliance AS (
        SELECT
            p.id AS project_id,
            p.project_name,
            COUNT(DISTINCT dt.id) AS total_mandatory_docs,
            COUNT(DISTINCT CASE WHEN pd.id IS NULL THEN dt.id END) AS missing_mandatory_docs,
            COUNT(DISTINCT CASE WHEN pd.id IS NOT NULL AND pd.status != 'approved' THEN dt.id END) AS unapproved_mandatory_docs,
            COUNT(DISTINCT CASE WHEN pd.status = 'approved' THEN dt.id END) AS approved_mandatory_docs
        FROM projects p
        INNER JOIN programme_projects pp ON p.id = pp.project_id
        CROSS JOIN document_types dt
        LEFT JOIN project_documents pd ON dt.id = pd.document_type_id
            AND pd.project_id = p.id
            AND pd.is_deleted = FALSE
        WHERE pp.programme_id = p_programme_id
            AND p.is_deleted = FALSE
            AND pp.is_deleted = FALSE
            AND dt.is_mandatory = TRUE
            AND dt.is_deleted = FALSE
            AND dt.is_active = TRUE
        GROUP BY p.id, p.project_name
    )
    SELECT
        pc.project_id,
        pc.project_name,
        pc.total_mandatory_docs,
        pc.missing_mandatory_docs,
        pc.unapproved_mandatory_docs,
        pc.approved_mandatory_docs,
        CASE
            WHEN pc.total_mandatory_docs = 0 THEN 100.0
            ELSE ROUND((pc.approved_mandatory_docs::DECIMAL / pc.total_mandatory_docs) * 100, 2)
        END AS compliance_percentage,
        (pc.missing_mandatory_docs = 0 AND pc.unapproved_mandatory_docs = 0) AS is_compliant
    FROM project_compliance pc
    ORDER BY pc.project_name;
END;
$$;

COMMENT ON FUNCTION get_programme_document_compliance IS 'Returns document compliance rollup for all projects in a programme';

-- ================================================
-- FUNCTION 4: calculate_project_storage_usage
-- Description: Calculate total storage used by a project (in bytes)
-- ================================================

CREATE OR REPLACE FUNCTION calculate_project_storage_usage(
    p_project_id UUID
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_bytes BIGINT;
BEGIN
    -- Sum all file sizes from project_documents and document_versions
    SELECT
        COALESCE(SUM(file_size), 0)
    INTO v_total_bytes
    FROM (
        -- Current documents
        SELECT file_size
        FROM project_documents
        WHERE project_id = p_project_id
            AND is_deleted = FALSE
            AND storage_type = 'supabase'
            AND file_size IS NOT NULL

        UNION ALL

        -- All versions
        SELECT dv.file_size
        FROM document_versions dv
        INNER JOIN project_documents pd ON dv.project_document_id = pd.id
        WHERE pd.project_id = p_project_id
            AND dv.is_deleted = FALSE
            AND pd.is_deleted = FALSE
            AND dv.file_size IS NOT NULL
    ) AS all_files;

    RETURN v_total_bytes;
END;
$$;

COMMENT ON FUNCTION calculate_project_storage_usage IS 'Calculates total storage used by a project in bytes (includes all versions)';

-- ================================================
-- FUNCTION 5: calculate_programme_storage_usage
-- Description: Calculate total storage used by a programme (in bytes)
-- ================================================

CREATE OR REPLACE FUNCTION calculate_programme_storage_usage(
    p_programme_id UUID
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_bytes BIGINT;
BEGIN
    -- Sum storage usage for all projects in programme
    SELECT
        COALESCE(SUM(calculate_project_storage_usage(p.id)), 0)
    INTO v_total_bytes
    FROM projects p
    INNER JOIN programme_projects pp ON p.id = pp.project_id
    WHERE pp.programme_id = p_programme_id
        AND p.is_deleted = FALSE
        AND pp.is_deleted = FALSE;

    RETURN v_total_bytes;
END;
$$;

COMMENT ON FUNCTION calculate_programme_storage_usage IS 'Calculates total storage used by all projects in a programme in bytes';

-- ================================================
-- TRIGGER FUNCTION: Auto-update document status on file upload
-- Description: When a file is uploaded, auto-change status from 'not_started' to 'draft'
-- ================================================

CREATE OR REPLACE FUNCTION trg_project_documents_auto_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- If file is being uploaded and status is 'not_started', change to 'draft'
    IF NEW.file_path IS NOT NULL AND NEW.file_path != '' THEN
        IF NEW.status = 'not_started' OR OLD.status = 'not_started' THEN
            NEW.status := 'draft';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trg_project_documents_auto_status_update ON project_documents;
CREATE TRIGGER trg_project_documents_auto_status_update
    BEFORE INSERT OR UPDATE OF file_path ON project_documents
    FOR EACH ROW
    EXECUTE FUNCTION trg_project_documents_auto_status();

COMMENT ON FUNCTION trg_project_documents_auto_status IS 'Auto-updates document status to draft when file is uploaded';

-- ================================================
-- TRIGGER FUNCTION: Update current_version when new version added
-- Description: When a new version is created, update parent document's current_version
-- ================================================

CREATE OR REPLACE FUNCTION trg_document_versions_update_current()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Mark all other versions as not current
    UPDATE document_versions
    SET is_current = FALSE
    WHERE project_document_id = NEW.project_document_id
        AND id != NEW.id
        AND is_deleted = FALSE;

    -- Mark new version as current
    NEW.is_current := TRUE;

    -- Update parent document's current_version
    UPDATE project_documents
    SET
        current_version = NEW.version_number,
        file_path = NEW.file_path,
        file_name = NEW.file_name,
        file_size = NEW.file_size,
        file_type = NEW.file_type,
        file_extension = NEW.file_extension,
        updated_at = NOW()
    WHERE id = NEW.project_document_id;

    RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trg_document_versions_update_current_trigger ON document_versions;
CREATE TRIGGER trg_document_versions_update_current_trigger
    BEFORE INSERT ON document_versions
    FOR EACH ROW
    EXECUTE FUNCTION trg_document_versions_update_current();

COMMENT ON FUNCTION trg_document_versions_update_current IS 'Updates parent document with current version information when new version is uploaded';

-- ================================================
-- VERIFICATION
-- ================================================

DO $$
BEGIN
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Document Governance Compliance Functions Created';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Functions Created:';
    RAISE NOTICE '1. check_project_document_compliance() - Check project document compliance';
    RAISE NOTICE '2. check_stage_gate_document_requirements() - Validate stage gate approval';
    RAISE NOTICE '3. get_programme_document_compliance() - Programme-level rollup';
    RAISE NOTICE '4. calculate_project_storage_usage() - Project storage usage';
    RAISE NOTICE '5. calculate_programme_storage_usage() - Programme storage usage';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Triggers Created:';
    RAISE NOTICE '1. trg_project_documents_auto_status - Auto-update status on file upload';
    RAISE NOTICE '2. trg_document_versions_update_current - Update current version';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'v148_document_compliance_functions.sql completed successfully';
    RAISE NOTICE '================================================';
END $$;

-- ================================================
-- END OF FILE
-- ================================================
