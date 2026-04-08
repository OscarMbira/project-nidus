-- ================================================
-- File: v149_document_governance_views.sql
-- Description: Document governance database views for PMO reporting
-- Version: 1.0
-- Date: 2026-01-08
-- Author: Development Team
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Prerequisites:
-- - v146_document_governance_tables.sql must be run first
-- - v147_document_types_seed_data.sql must be run first
-- - v148_document_compliance_functions.sql must be run first

-- Purpose:
-- Creates database views for document governance reporting:
-- 1. pmo_document_compliance_view - Project-level compliance summary
-- 2. programme_document_rollup_view - Programme-level compliance aggregation
-- 3. overdue_document_approvals_view - Documents pending approval
-- 4. project_storage_usage_view - Storage usage by project
-- 5. document_audit_trail_view - Document governance audit log

-- Note: This script is idempotent and can be run multiple times safely

-- ================================================
-- VIEW 1: pmo_document_compliance_view
-- Description: Project-level document compliance summary
-- ================================================

CREATE OR REPLACE VIEW pmo_document_compliance_view AS
SELECT
    p.id AS project_id,
    p.project_name,
    p.project_code,
    pp.programme_id,
    prog.programme_name,
    COUNT(DISTINCT dt.id) FILTER (WHERE dt.is_mandatory = TRUE) AS total_mandatory_docs,
    COUNT(DISTINCT pd.id) FILTER (WHERE dt.is_mandatory = TRUE AND pd.status = 'approved') AS approved_mandatory_docs,
    COUNT(DISTINCT dt.id) FILTER (WHERE dt.is_mandatory = TRUE AND pd.id IS NULL) AS missing_mandatory_docs,
    COUNT(DISTINCT pd.id) FILTER (WHERE dt.is_mandatory = TRUE AND pd.status IN ('draft', 'submitted')) AS pending_mandatory_docs,
    COUNT(DISTINCT pd.id) FILTER (WHERE dt.is_mandatory = TRUE AND pd.status = 'rejected') AS rejected_mandatory_docs,
    COUNT(DISTINCT dt.id) FILTER (WHERE dt.is_mandatory = FALSE) AS total_optional_docs,
    COUNT(DISTINCT pd.id) FILTER (WHERE dt.is_mandatory = FALSE) AS submitted_optional_docs,
    CASE
        WHEN COUNT(DISTINCT dt.id) FILTER (WHERE dt.is_mandatory = TRUE) = 0 THEN 100.0
        ELSE ROUND(
            (COUNT(DISTINCT pd.id) FILTER (WHERE dt.is_mandatory = TRUE AND pd.status = 'approved')::DECIMAL /
             COUNT(DISTINCT dt.id) FILTER (WHERE dt.is_mandatory = TRUE)) * 100,
            2
        )
    END AS compliance_percentage,
    CASE
        WHEN COUNT(DISTINCT dt.id) FILTER (WHERE dt.is_mandatory = TRUE AND pd.id IS NULL) = 0
         AND COUNT(DISTINCT pd.id) FILTER (WHERE dt.is_mandatory = TRUE AND pd.status != 'approved') = 0
        THEN TRUE
        ELSE FALSE
    END AS is_fully_compliant,
    CASE
        WHEN COUNT(DISTINCT dt.id) FILTER (WHERE dt.is_mandatory = TRUE AND pd.id IS NULL) > 0 THEN 'RED'
        WHEN COUNT(DISTINCT pd.id) FILTER (WHERE dt.is_mandatory = TRUE AND pd.status IN ('draft', 'submitted', 'rejected')) > 0 THEN 'AMBER'
        ELSE 'GREEN'
    END AS compliance_status,
    calculate_project_storage_usage(p.id) AS storage_bytes_used,
    p.created_at AS project_created_at,
    p.updated_at AS project_updated_at
FROM projects p
LEFT JOIN programme_projects pp ON p.id = pp.project_id AND pp.is_deleted = FALSE
LEFT JOIN programmes prog ON pp.programme_id = prog.id AND prog.is_deleted = FALSE
CROSS JOIN document_types dt
LEFT JOIN project_documents pd ON p.id = pd.project_id
    AND dt.id = pd.document_type_id
    AND pd.is_deleted = FALSE
WHERE p.is_deleted = FALSE
    AND dt.is_deleted = FALSE
    AND dt.is_active = TRUE
GROUP BY p.id, p.project_name, p.project_code, pp.programme_id, prog.programme_name, p.created_at, p.updated_at;

COMMENT ON VIEW pmo_document_compliance_view IS 'Project-level document compliance summary with RED/AMBER/GREEN status indicators';

-- ================================================
-- VIEW 2: programme_document_rollup_view
-- Description: Programme-level document compliance aggregation
-- ================================================

CREATE OR REPLACE VIEW programme_document_rollup_view AS
SELECT
    prog.id AS programme_id,
    prog.programme_name,
    prog.programme_code,
    COUNT(DISTINCT p.id) AS total_projects,
    COUNT(DISTINCT p.id) FILTER (WHERE pdc.is_fully_compliant = TRUE) AS compliant_projects,
    COUNT(DISTINCT p.id) FILTER (WHERE pdc.is_fully_compliant = FALSE) AS non_compliant_projects,
    SUM(pdc.total_mandatory_docs) AS total_mandatory_docs_across_projects,
    SUM(pdc.approved_mandatory_docs) AS approved_mandatory_docs_across_projects,
    SUM(pdc.missing_mandatory_docs) AS missing_mandatory_docs_across_projects,
    SUM(pdc.pending_mandatory_docs) AS pending_mandatory_docs_across_projects,
    SUM(pdc.rejected_mandatory_docs) AS rejected_mandatory_docs_across_projects,
    CASE
        WHEN SUM(pdc.total_mandatory_docs) = 0 THEN 100.0
        ELSE ROUND(
            (SUM(pdc.approved_mandatory_docs)::DECIMAL / SUM(pdc.total_mandatory_docs)) * 100,
            2
        )
    END AS programme_compliance_percentage,
    CASE
        WHEN COUNT(DISTINCT p.id) FILTER (WHERE pdc.is_fully_compliant = TRUE) = COUNT(DISTINCT p.id) THEN TRUE
        ELSE FALSE
    END AS is_programme_compliant,
    CASE
        WHEN SUM(pdc.missing_mandatory_docs) > 0 THEN 'RED'
        WHEN SUM(pdc.pending_mandatory_docs) > 0 OR SUM(pdc.rejected_mandatory_docs) > 0 THEN 'AMBER'
        ELSE 'GREEN'
    END AS programme_compliance_status,
    calculate_programme_storage_usage(prog.id) AS total_storage_bytes_used,
    prog.created_at AS programme_created_at,
    prog.updated_at AS programme_updated_at
FROM programmes prog
LEFT JOIN programme_projects pp ON prog.id = pp.programme_id AND pp.is_deleted = FALSE
LEFT JOIN projects p ON pp.project_id = p.id AND p.is_deleted = FALSE
LEFT JOIN pmo_document_compliance_view pdc ON p.id = pdc.project_id
WHERE prog.is_deleted = FALSE
GROUP BY prog.id, prog.programme_name, prog.programme_code, prog.created_at, prog.updated_at;

COMMENT ON VIEW programme_document_rollup_view IS 'Programme-level document compliance rollup across all projects';

-- ================================================
-- VIEW 3: overdue_document_approvals_view
-- Description: Documents pending approval (submitted but not yet approved/rejected)
-- ================================================

CREATE OR REPLACE VIEW overdue_document_approvals_view AS
SELECT
    pd.id AS document_id,
    pd.project_id,
    p.project_name,
    p.project_code,
    dt.id AS document_type_id,
    dt.name AS document_type_name,
    dt.stage_code,
    dgs.stage_name,
    dt.is_mandatory,
    pd.status,
    pd.owner_user_id,
    owner.full_name AS owner_name,
    owner.email AS owner_email,
    pd.approver_user_id,
    approver.full_name AS approver_name,
    approver.email AS approver_email,
    pd.submission_date,
    EXTRACT(DAY FROM (NOW() - pd.submission_date))::INTEGER AS days_pending,
    CASE
        WHEN EXTRACT(DAY FROM (NOW() - pd.submission_date)) > 14 THEN 'CRITICAL'
        WHEN EXTRACT(DAY FROM (NOW() - pd.submission_date)) > 7 THEN 'HIGH'
        WHEN EXTRACT(DAY FROM (NOW() - pd.submission_date)) > 3 THEN 'MEDIUM'
        ELSE 'NORMAL'
    END AS urgency_level,
    pd.file_name,
    pd.file_size,
    pd.current_version,
    pd.comments,
    pd.updated_at AS last_updated
FROM project_documents pd
INNER JOIN projects p ON pd.project_id = p.id AND p.is_deleted = FALSE
INNER JOIN document_types dt ON pd.document_type_id = dt.id AND dt.is_deleted = FALSE
INNER JOIN document_governance_stages dgs ON dt.stage_code = dgs.stage_code AND dgs.is_deleted = FALSE
LEFT JOIN users owner ON pd.owner_user_id = owner.id
LEFT JOIN users approver ON pd.approver_user_id = approver.id
WHERE pd.is_deleted = FALSE
    AND pd.status = 'submitted'
    AND pd.submission_date IS NOT NULL
ORDER BY pd.submission_date ASC;

COMMENT ON VIEW overdue_document_approvals_view IS 'Documents pending approval with urgency levels based on days pending';

-- ================================================
-- VIEW 4: project_storage_usage_view
-- Description: Storage usage summary by project
-- ================================================

CREATE OR REPLACE VIEW project_storage_usage_view AS
SELECT
    p.id AS project_id,
    p.project_name,
    p.project_code,
    COUNT(DISTINCT pd.id) AS total_documents,
    COUNT(DISTINCT pd.id) FILTER (WHERE pd.storage_type = 'supabase') AS documents_in_storage,
    COUNT(DISTINCT pd.id) FILTER (WHERE pd.storage_type = 'external_link') AS documents_external,
    COUNT(DISTINCT dv.id) AS total_versions,
    COALESCE(SUM(pd.file_size), 0) AS current_files_bytes,
    COALESCE(SUM(dv.file_size), 0) AS all_versions_bytes,
    calculate_project_storage_usage(p.id) AS total_storage_bytes,
    ROUND(calculate_project_storage_usage(p.id)::DECIMAL / (1024 * 1024), 2) AS storage_mb,
    ROUND(calculate_project_storage_usage(p.id)::DECIMAL / (1024 * 1024 * 1024), 2) AS storage_gb,
    CASE
        WHEN calculate_project_storage_usage(p.id) > 524288000 THEN 'OVER_LIMIT' -- > 500MB
        WHEN calculate_project_storage_usage(p.id) > 419430400 THEN 'WARNING' -- > 400MB
        ELSE 'OK'
    END AS storage_status,
    p.created_at,
    p.updated_at
FROM projects p
LEFT JOIN project_documents pd ON p.id = pd.project_id AND pd.is_deleted = FALSE
LEFT JOIN document_versions dv ON pd.id = dv.project_document_id AND dv.is_deleted = FALSE
WHERE p.is_deleted = FALSE
GROUP BY p.id, p.project_name, p.project_code, p.created_at, p.updated_at;

COMMENT ON VIEW project_storage_usage_view IS 'Storage usage summary by project with MB/GB conversion and status indicators';

-- ================================================
-- VIEW 5: document_audit_trail_view
-- Description: Audit trail for document governance actions
-- ================================================

CREATE OR REPLACE VIEW document_audit_trail_view AS
SELECT
    at.id AS audit_id,
    at.operation AS action_type,
    at.table_name,
    at.record_id,
    pd.id AS document_id,
    pd.project_id,
    p.project_name,
    dt.name AS document_type_name,
    at.user_id,
    u.full_name AS user_name,
    u.email AS user_email,
    jsonb_build_object(
        'old_values', at.old_values,
        'new_values', at.new_values,
        'changed_fields', at.changed_fields
    ) AS changes,
    at.changed_at AS action_timestamp
FROM audit_trails at
LEFT JOIN project_documents pd ON at.record_id = pd.id
    AND at.table_name = 'project_documents'
LEFT JOIN projects p ON pd.project_id = p.id
LEFT JOIN document_types dt ON pd.document_type_id = dt.id
LEFT JOIN users u ON at.user_id = u.id
WHERE at.table_name IN ('project_documents', 'document_versions', 'document_types', 'programme_documents')
ORDER BY at.changed_at DESC;

COMMENT ON VIEW document_audit_trail_view IS 'Audit trail for all document governance actions';

-- ================================================
-- VERIFICATION
-- ================================================

DO $$
DECLARE
    v_views_count INTEGER;
BEGIN
    -- Count views created
    SELECT COUNT(*)
    INTO v_views_count
    FROM information_schema.views
    WHERE table_schema = 'public'
        AND table_name IN (
            'pmo_document_compliance_view',
            'programme_document_rollup_view',
            'overdue_document_approvals_view',
            'project_storage_usage_view',
            'document_audit_trail_view'
        );

    RAISE NOTICE '================================================';
    RAISE NOTICE 'Document Governance Views Created';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Views Created: %', v_views_count;
    RAISE NOTICE '1. pmo_document_compliance_view - Project compliance summary';
    RAISE NOTICE '2. programme_document_rollup_view - Programme compliance rollup';
    RAISE NOTICE '3. overdue_document_approvals_view - Pending approvals';
    RAISE NOTICE '4. project_storage_usage_view - Storage usage by project';
    RAISE NOTICE '5. document_audit_trail_view - Document audit trail';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'v149_document_governance_views.sql completed successfully';
    RAISE NOTICE '================================================';
END $$;

-- ================================================
-- END OF FILE
-- ================================================
