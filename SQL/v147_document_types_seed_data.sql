-- ================================================
-- File: v147_document_types_seed_data.sql
-- Description: Seed data for document governance stages and document types
-- Version: 1.0
-- Date: 2026-01-08
-- Author: Development Team
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Prerequisites:
-- - v146_document_governance_tables.sql must be run first

-- Purpose:
-- Populates document governance with:
-- 1. 7 project lifecycle stages
-- 2. 37 document types (24 mandatory + 13 optional) across all stages

-- Note: This script is idempotent and can be run multiple times safely

-- ================================================
-- SECTION 1: SEED DOCUMENT GOVERNANCE STAGES
-- ================================================

INSERT INTO document_governance_stages (stage_code, stage_name, stage_description, stage_order, is_active)
VALUES
    ('pre_project', 'Pre-Project / Concept', 'Initial project concept and feasibility assessment phase', 1, true),
    ('initiation', 'Initiation', 'Formal project initiation and setup phase', 2, true),
    ('planning', 'Planning', 'Detailed project planning phase', 3, true),
    ('delivery', 'Delivery / Execution', 'Project execution and delivery phase', 4, true),
    ('stage_boundary', 'Stage Boundary', 'End-of-stage review and approval (recurring)', 5, true),
    ('closure', 'Closure', 'Project closure and handover phase', 6, true),
    ('post_project', 'Post-Project / Benefits Realisation', 'Post-project benefits tracking and realisation', 7, true)
ON CONFLICT (stage_code) DO UPDATE SET
    stage_name = EXCLUDED.stage_name,
    stage_description = EXCLUDED.stage_description,
    stage_order = EXCLUDED.stage_order,
    updated_at = NOW();

-- ================================================
-- SECTION 2: SEED DOCUMENT TYPES
-- ================================================

-- ================================================
-- Stage 1: Pre-Project / Concept (4 mandatory + 3 optional)
-- ================================================

-- Mandatory Documents
INSERT INTO document_types (name, stage_code, is_mandatory, description, category, expected_format)
VALUES
    (
        'Request for Proposal (RFP)',
        'pre_project',
        true,
        'Formal request for proposal document outlining project requirements and scope',
        'governance',
        'PDF, DOCX'
    ),
    (
        'Project Mandate',
        'pre_project',
        true,
        'High-level project mandate authorizing initial project exploration',
        'governance',
        'PDF, DOCX'
    ),
    (
        'Business Case',
        'pre_project',
        true,
        'Initial business case justifying project investment and expected benefits',
        'governance',
        'PDF, DOCX, XLSX'
    ),
    (
        'Funding / Investment Approval',
        'pre_project',
        true,
        'Formal funding approval document from sponsors or board',
        'governance',
        'PDF, DOCX'
    )
ON CONFLICT DO NOTHING;

-- Optional Documents
INSERT INTO document_types (name, stage_code, is_mandatory, description, category, expected_format)
VALUES
    (
        'Feasibility Study',
        'pre_project',
        false,
        'Detailed feasibility study assessing project viability',
        'planning',
        'PDF, DOCX'
    ),
    (
        'Market Assessment',
        'pre_project',
        false,
        'Market research and assessment for the proposed project',
        'planning',
        'PDF, DOCX, XLSX'
    ),
    (
        'Options Analysis',
        'pre_project',
        false,
        'Analysis of different project approach options',
        'planning',
        'PDF, DOCX, XLSX'
    )
ON CONFLICT DO NOTHING;

-- ================================================
-- Stage 2: Initiation (4 mandatory + 2 optional)
-- ================================================

-- Mandatory Documents
INSERT INTO document_types (name, stage_code, is_mandatory, description, category, expected_format)
VALUES
    (
        'Project Initiation Document (PID)',
        'initiation',
        true,
        'Comprehensive project initiation document defining project scope, objectives, and approach',
        'governance',
        'PDF, DOCX'
    ),
    (
        'Benefits Management Approach',
        'initiation',
        true,
        'Document defining how project benefits will be identified, measured, and realized',
        'benefits',
        'PDF, DOCX'
    ),
    (
        'Risk Management Strategy',
        'initiation',
        true,
        'Strategy for identifying, assessing, and managing project risks',
        'risk',
        'PDF, DOCX'
    ),
    (
        'Stakeholder Register',
        'initiation',
        true,
        'Register of all project stakeholders with engagement strategies',
        'governance',
        'PDF, DOCX, XLSX'
    )
ON CONFLICT DO NOTHING;

-- Optional Documents
INSERT INTO document_types (name, stage_code, is_mandatory, description, category, expected_format)
VALUES
    (
        'Communication Management Strategy',
        'initiation',
        false,
        'Strategy for project communications and stakeholder engagement',
        'governance',
        'PDF, DOCX'
    ),
    (
        'Quality Management Strategy',
        'initiation',
        false,
        'Strategy for ensuring project quality standards and acceptance criteria',
        'quality',
        'PDF, DOCX'
    )
ON CONFLICT DO NOTHING;

-- ================================================
-- Stage 3: Planning (4 mandatory + 2 optional)
-- ================================================

-- Mandatory Documents
INSERT INTO document_types (name, stage_code, is_mandatory, description, category, expected_format)
VALUES
    (
        'Stage Plan',
        'planning',
        true,
        'Detailed plan for the current project stage',
        'planning',
        'PDF, DOCX, XLSX'
    ),
    (
        'Integrated Project Plan',
        'planning',
        true,
        'Comprehensive project plan integrating all planning elements',
        'planning',
        'PDF, DOCX, XLSX'
    ),
    (
        'Resource Plan',
        'planning',
        true,
        'Detailed resource allocation and management plan',
        'planning',
        'PDF, DOCX, XLSX'
    ),
    (
        'Cost / Budget Plan',
        'planning',
        true,
        'Detailed project budget and cost management plan',
        'planning',
        'PDF, XLSX'
    )
ON CONFLICT DO NOTHING;

-- Optional Documents
INSERT INTO document_types (name, stage_code, is_mandatory, description, category, expected_format)
VALUES
    (
        'Procurement Plan',
        'planning',
        false,
        'Plan for procuring external goods and services',
        'planning',
        'PDF, DOCX, XLSX'
    ),
    (
        'Dependency Map',
        'planning',
        false,
        'Visual map of project dependencies and interdependencies',
        'planning',
        'PDF, PNG, XLSX'
    )
ON CONFLICT DO NOTHING;

-- ================================================
-- Stage 4: Delivery / Execution (3 mandatory + 3 optional)
-- ================================================

-- Mandatory Documents
INSERT INTO document_types (name, stage_code, is_mandatory, description, category, expected_format)
VALUES
    (
        'Highlight Reports (recurring)',
        'delivery',
        true,
        'Regular progress reports (weekly/monthly) during delivery phase',
        'delivery',
        'PDF, DOCX'
    ),
    (
        'Risk Register',
        'delivery',
        true,
        'Active risk register tracking all project risks and mitigations',
        'risk',
        'PDF, DOCX, XLSX'
    ),
    (
        'Issue Register',
        'delivery',
        true,
        'Active issue register tracking all project issues and resolutions',
        'delivery',
        'PDF, DOCX, XLSX'
    )
ON CONFLICT DO NOTHING;

-- Optional Documents
INSERT INTO document_types (name, stage_code, is_mandatory, description, category, expected_format)
VALUES
    (
        'Change Requests',
        'delivery',
        false,
        'Formal change request documents for scope changes',
        'delivery',
        'PDF, DOCX'
    ),
    (
        'Quality Review Records',
        'delivery',
        false,
        'Records of quality reviews and inspections',
        'quality',
        'PDF, DOCX, XLSX'
    ),
    (
        'Work Package Definitions',
        'delivery',
        false,
        'Detailed work package specifications and acceptance criteria',
        'delivery',
        'PDF, DOCX'
    )
ON CONFLICT DO NOTHING;

-- ================================================
-- Stage 5: Stage Boundary (3 mandatory + 1 optional)
-- ================================================

-- Mandatory Documents
INSERT INTO document_types (name, stage_code, is_mandatory, description, category, expected_format)
VALUES
    (
        'End Stage Report',
        'stage_boundary',
        true,
        'Report summarizing stage performance and achievements',
        'governance',
        'PDF, DOCX'
    ),
    (
        'Updated Business Case',
        'stage_boundary',
        true,
        'Business case updated with current forecasts and actuals',
        'governance',
        'PDF, DOCX, XLSX'
    ),
    (
        'Updated Risk Register',
        'stage_boundary',
        true,
        'Risk register updated for next stage planning',
        'risk',
        'PDF, DOCX, XLSX'
    )
ON CONFLICT DO NOTHING;

-- Optional Documents
INSERT INTO document_types (name, stage_code, is_mandatory, description, category, expected_format)
VALUES
    (
        'Lessons Learned (interim)',
        'stage_boundary',
        false,
        'Interim lessons learned captured at stage end',
        'governance',
        'PDF, DOCX'
    )
ON CONFLICT DO NOTHING;

-- ================================================
-- Stage 6: Closure (4 mandatory + 1 optional)
-- ================================================

-- Mandatory Documents
INSERT INTO document_types (name, stage_code, is_mandatory, description, category, expected_format)
VALUES
    (
        'End Project Report',
        'closure',
        true,
        'Final project report summarizing overall performance and outcomes',
        'governance',
        'PDF, DOCX'
    ),
    (
        'Lessons Learned Report',
        'closure',
        true,
        'Comprehensive lessons learned report for organizational knowledge',
        'governance',
        'PDF, DOCX'
    ),
    (
        'Product Acceptance Records',
        'closure',
        true,
        'Formal acceptance records for all project deliverables',
        'closure',
        'PDF, DOCX'
    ),
    (
        'Benefits Review Plan',
        'closure',
        true,
        'Plan for post-project benefits review and measurement',
        'benefits',
        'PDF, DOCX'
    )
ON CONFLICT DO NOTHING;

-- Optional Documents
INSERT INTO document_types (name, stage_code, is_mandatory, description, category, expected_format)
VALUES
    (
        'Closure Approval Memo',
        'closure',
        false,
        'Formal closure approval memo from sponsors',
        'governance',
        'PDF, DOCX'
    )
ON CONFLICT DO NOTHING;

-- ================================================
-- Stage 7: Post-Project / Benefits Realisation (2 mandatory + 1 optional)
-- ================================================

-- Mandatory Documents
INSERT INTO document_types (name, stage_code, is_mandatory, description, category, expected_format)
VALUES
    (
        'Benefits Realisation Evidence',
        'post_project',
        true,
        'Evidence demonstrating actual benefits realized from project',
        'benefits',
        'PDF, DOCX, XLSX'
    ),
    (
        'Benefits Review Reports',
        'post_project',
        true,
        'Regular reports reviewing benefits realization progress',
        'benefits',
        'PDF, DOCX, XLSX'
    )
ON CONFLICT DO NOTHING;

-- Optional Documents
INSERT INTO document_types (name, stage_code, is_mandatory, description, category, expected_format)
VALUES
    (
        'Post-Implementation Review',
        'post_project',
        false,
        'Comprehensive review of project implementation and outcomes',
        'governance',
        'PDF, DOCX'
    )
ON CONFLICT DO NOTHING;

-- ================================================
-- VERIFICATION
-- ================================================

DO $$
DECLARE
    v_stages_count INTEGER;
    v_document_types_count INTEGER;
    v_mandatory_count INTEGER;
    v_optional_count INTEGER;
BEGIN
    -- Count stages
    SELECT COUNT(*) INTO v_stages_count
    FROM document_governance_stages
    WHERE is_deleted = FALSE;

    -- Count all document types
    SELECT COUNT(*) INTO v_document_types_count
    FROM document_types
    WHERE is_deleted = FALSE;

    -- Count mandatory documents
    SELECT COUNT(*) INTO v_mandatory_count
    FROM document_types
    WHERE is_deleted = FALSE AND is_mandatory = TRUE;

    -- Count optional documents
    SELECT COUNT(*) INTO v_optional_count
    FROM document_types
    WHERE is_deleted = FALSE AND is_mandatory = FALSE;

    RAISE NOTICE '================================================';
    RAISE NOTICE 'Document Governance Seed Data Loaded';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Stages Created: %', v_stages_count;
    RAISE NOTICE 'Total Document Types: %', v_document_types_count;
    RAISE NOTICE 'Mandatory Document Types: %', v_mandatory_count;
    RAISE NOTICE 'Optional Document Types: %', v_optional_count;
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Breakdown by Stage:';
    RAISE NOTICE '- Pre-Project/Concept: 4 mandatory + 3 optional';
    RAISE NOTICE '- Initiation: 4 mandatory + 2 optional';
    RAISE NOTICE '- Planning: 4 mandatory + 2 optional';
    RAISE NOTICE '- Delivery: 3 mandatory + 3 optional';
    RAISE NOTICE '- Stage Boundary: 3 mandatory + 1 optional';
    RAISE NOTICE '- Closure: 4 mandatory + 1 optional';
    RAISE NOTICE '- Post-Project: 2 mandatory + 1 optional';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'v147_document_types_seed_data.sql completed successfully';
    RAISE NOTICE '================================================';
END $$;

-- ================================================
-- END OF FILE
-- ================================================
