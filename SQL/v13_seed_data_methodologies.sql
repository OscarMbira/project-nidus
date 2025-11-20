-- ================================================
-- File: v13_seed_data_methodologies.sql
-- Description: Methodologies and Workflows seed data
-- Version: 1.0
-- Date: 2025-11-15
-- Author: Development Team
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Prerequisites:
-- - v01 through v09 must be run first (all tables must exist)
-- - v11_seed_data_system.sql should be run first
-- - v12_seed_data_rbac.sql should be run first

-- Purpose:
-- Creates methodology and workflow definitions:
-- 1. Methodologies (5 methodologies)
-- 2. Workflows (4+ workflows)

-- Note: This script is idempotent and can be run multiple times safely

-- ================================================
-- SECTION 1: METHODOLOGIES
-- ================================================

DO $$
BEGIN
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Seed Data: Methodologies';
    RAISE NOTICE '================================================';
END $$;

-- ------------------------------------------------
-- METHODOLOGY: Structured PM (Traditional/Waterfall)
-- ------------------------------------------------

INSERT INTO methodologies (
    methodology_code,
    methodology_name,
    methodology_description,
    methodology_category,
    methodology_icon,
    methodology_color,
    documentation_url,
    help_text,
    supports_sprints,
    supports_kanban,
    supports_gantt,
    supports_stages,
    default_config,
    is_active,
    is_default
)
VALUES (
    'structured_pm',
    'Structured PM',
    'Traditional project management methodology with defined phases and stage-gate process. Ideal for projects with clear requirements and minimal expected changes.',
    'traditional',
    'diagram-project',
    '#1E3A8A',
    'https://docs.projectnidus.com/methodologies/structured-pm',
    'Use Structured PM for projects with well-defined requirements, formal governance, and sequential phases. Best suited for construction, manufacturing, or regulated industries.',
    false,  -- supports_sprints
    false,  -- supports_kanban
    true,   -- supports_gantt
    true,   -- supports_stages
    '{
        "phases": [
            {"name": "Initiation", "sequence": 1},
            {"name": "Planning", "sequence": 2},
            {"name": "Execution", "sequence": 3},
            {"name": "Monitoring & Control", "sequence": 4},
            {"name": "Closure", "sequence": 5}
        ],
        "stage_gates": true,
        "change_control_required": true,
        "documentation_level": "comprehensive",
        "default_views": ["gantt", "timeline", "milestones"],
        "governance": {
            "approval_required": true,
            "steering_committee": true,
            "formal_sign_offs": true
        }
    }'::jsonb,
    true,
    false
)
ON CONFLICT (methodology_code) DO UPDATE SET
    methodology_name = EXCLUDED.methodology_name,
    methodology_description = EXCLUDED.methodology_description,
    default_config = EXCLUDED.default_config,
    updated_at = NOW();

-- ------------------------------------------------
-- METHODOLOGY: Scrum (Agile)
-- ------------------------------------------------

INSERT INTO methodologies (
    methodology_code,
    methodology_name,
    methodology_description,
    methodology_category,
    methodology_icon,
    methodology_color,
    documentation_url,
    help_text,
    supports_sprints,
    supports_kanban,
    supports_gantt,
    supports_stages,
    default_config,
    is_active,
    is_default
)
VALUES (
    'scrum',
    'Scrum',
    'Agile framework using time-boxed iterations (sprints) with defined roles, events, and artifacts. Emphasizes collaboration, flexibility, and iterative delivery.',
    'agile',
    'users-gear',
    '#059669',
    'https://docs.projectnidus.com/methodologies/scrum',
    'Use Scrum for software development and projects requiring frequent inspection, adaptation, and incremental delivery. Features sprints, daily standups, and retrospectives.',
    true,   -- supports_sprints
    false,  -- supports_kanban
    false,  -- supports_gantt
    false,  -- supports_stages
    '{
        "sprint_duration_weeks": 2,
        "ceremonies": [
            {"name": "Sprint Planning", "duration_hours": 4},
            {"name": "Daily Standup", "duration_minutes": 15},
            {"name": "Sprint Review", "duration_hours": 2},
            {"name": "Sprint Retrospective", "duration_hours": 1.5}
        ],
        "roles": [
            {"name": "Product Owner", "responsibilities": ["Backlog management", "Prioritization"]},
            {"name": "Scrum Master", "responsibilities": ["Facilitation", "Impediment removal"]},
            {"name": "Development Team", "responsibilities": ["Delivery", "Self-organization"]}
        ],
        "artifacts": ["Product Backlog", "Sprint Backlog", "Increment"],
        "default_views": ["sprint_board", "backlog", "burndown"],
        "story_points_enabled": true,
        "velocity_tracking": true,
        "definition_of_done_required": true
    }'::jsonb,
    true,
    true  -- Default methodology
)
ON CONFLICT (methodology_code) DO UPDATE SET
    methodology_name = EXCLUDED.methodology_name,
    methodology_description = EXCLUDED.methodology_description,
    default_config = EXCLUDED.default_config,
    updated_at = NOW();

-- ------------------------------------------------
-- METHODOLOGY: Kanban (Agile)
-- ------------------------------------------------

INSERT INTO methodologies (
    methodology_code,
    methodology_name,
    methodology_description,
    methodology_category,
    methodology_icon,
    methodology_color,
    documentation_url,
    help_text,
    supports_sprints,
    supports_kanban,
    supports_gantt,
    supports_stages,
    default_config,
    is_active,
    is_default
)
VALUES (
    'kanban',
    'Kanban',
    'Visual workflow management method focusing on continuous flow and WIP limits. Emphasizes just-in-time delivery and continuous improvement.',
    'agile',
    'trello',
    '#EA580C',
    'https://docs.projectnidus.com/methodologies/kanban',
    'Use Kanban for continuous delivery projects, support teams, or operations. Features visual boards, WIP limits, and flow metrics.',
    false,  -- supports_sprints
    true,   -- supports_kanban
    false,  -- supports_gantt
    false,  -- supports_stages
    '{
        "board_columns": [
            {"name": "Backlog", "wip_limit": null, "sequence": 1},
            {"name": "To Do", "wip_limit": 5, "sequence": 2},
            {"name": "In Progress", "wip_limit": 3, "sequence": 3},
            {"name": "Review", "wip_limit": 2, "sequence": 4},
            {"name": "Done", "wip_limit": null, "sequence": 5}
        ],
        "wip_limits_enabled": true,
        "pull_system": true,
        "metrics": ["lead_time", "cycle_time", "throughput"],
        "default_views": ["kanban_board", "cumulative_flow"],
        "card_aging_enabled": true,
        "swimlanes_enabled": true,
        "classes_of_service": ["Expedite", "Standard", "Fixed Date", "Intangible"]
    }'::jsonb,
    true,
    false
)
ON CONFLICT (methodology_code) DO UPDATE SET
    methodology_name = EXCLUDED.methodology_name,
    methodology_description = EXCLUDED.methodology_description,
    default_config = EXCLUDED.default_config,
    updated_at = NOW();

-- ------------------------------------------------
-- METHODOLOGY: Agile Hybrid (Mixed Agile)
-- ------------------------------------------------

INSERT INTO methodologies (
    methodology_code,
    methodology_name,
    methodology_description,
    methodology_category,
    methodology_icon,
    methodology_color,
    documentation_url,
    help_text,
    supports_sprints,
    supports_kanban,
    supports_gantt,
    supports_stages,
    default_config,
    is_active,
    is_default
)
VALUES (
    'agile_hybrid',
    'Agile Hybrid',
    'Flexible agile approach combining Scrum and Kanban practices. Allows teams to adapt practices based on their needs and context.',
    'hybrid',
    'puzzle-piece',
    '#7C3AED',
    'https://docs.projectnidus.com/methodologies/agile-hybrid',
    'Use Agile Hybrid when you need flexibility to combine sprint-based planning with continuous flow. Ideal for teams transitioning between methodologies.',
    true,   -- supports_sprints
    true,   -- supports_kanban
    false,  -- supports_gantt
    false,  -- supports_stages
    '{
        "sprint_duration_weeks": 2,
        "optional_sprints": true,
        "kanban_board_enabled": true,
        "wip_limits_optional": true,
        "ceremonies": [
            {"name": "Planning Session", "optional": false},
            {"name": "Daily Standup", "optional": false},
            {"name": "Review/Demo", "optional": true},
            {"name": "Retrospective", "optional": false}
        ],
        "default_views": ["sprint_board", "kanban_board", "backlog"],
        "metrics": ["velocity", "cycle_time", "lead_time"],
        "story_points_enabled": true,
        "flexibility": "high"
    }'::jsonb,
    true,
    false
)
ON CONFLICT (methodology_code) DO UPDATE SET
    methodology_name = EXCLUDED.methodology_name,
    methodology_description = EXCLUDED.methodology_description,
    default_config = EXCLUDED.default_config,
    updated_at = NOW();

-- ------------------------------------------------
-- METHODOLOGY: Hybrid PM (Traditional + Agile)
-- ------------------------------------------------

INSERT INTO methodologies (
    methodology_code,
    methodology_name,
    methodology_description,
    methodology_category,
    methodology_icon,
    methodology_color,
    documentation_url,
    help_text,
    supports_sprints,
    supports_kanban,
    supports_gantt,
    supports_stages,
    default_config,
    is_active,
    is_default
)
VALUES (
    'hybrid_pm',
    'Hybrid PM',
    'Combines traditional project management structure with agile execution practices. Provides governance and flexibility in a single framework.',
    'hybrid',
    'layer-group',
    '#DB2777',
    'https://docs.projectnidus.com/methodologies/hybrid-pm',
    'Use Hybrid PM for complex projects requiring formal governance and agile delivery. Combines waterfall planning with agile execution.',
    true,   -- supports_sprints
    true,   -- supports_kanban
    true,   -- supports_gantt
    true,   -- supports_stages
    '{
        "phases": [
            {"name": "Planning", "approach": "traditional", "sequence": 1},
            {"name": "Design", "approach": "traditional", "sequence": 2},
            {"name": "Execution", "approach": "agile", "sequence": 3},
            {"name": "Closure", "approach": "traditional", "sequence": 4}
        ],
        "agile_execution": {
            "sprint_duration_weeks": 2,
            "kanban_allowed": true,
            "ceremonies": ["planning", "standup", "review", "retrospective"]
        },
        "governance": {
            "stage_gates": true,
            "steering_committee": true,
            "agile_within_stages": true
        },
        "default_views": ["gantt", "sprint_board", "kanban_board", "milestones"],
        "metrics": ["schedule_variance", "velocity", "earned_value"],
        "best_for": ["Large enterprise projects", "Regulated industries", "Fixed budget/timeline with agile delivery"]
    }'::jsonb,
    true,
    false
)
ON CONFLICT (methodology_code) DO UPDATE SET
    methodology_name = EXCLUDED.methodology_name,
    methodology_description = EXCLUDED.methodology_description,
    default_config = EXCLUDED.default_config,
    updated_at = NOW();

DO $$
BEGIN
    RAISE NOTICE 'Methodologies created successfully';
    RAISE NOTICE '';
END $$;

-- ================================================
-- SECTION 2: WORKFLOWS
-- ================================================

DO $$
BEGIN
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Seed Data: Workflows';
    RAISE NOTICE '================================================';
END $$;

-- ------------------------------------------------
-- WORKFLOW: Standard Project Workflow (Universal)
-- ------------------------------------------------

INSERT INTO workflows (
    workflow_code,
    workflow_name,
    workflow_description,
    workflow_type,
    methodology_id,
    workflow_steps,
    require_approval,
    auto_progress,
    send_notifications,
    is_active,
    is_default
)
VALUES (
    'standard_project',
    'Standard Project Workflow',
    'Universal project workflow applicable to all methodologies',
    'project',
    NULL,  -- Universal (not methodology-specific)
    '{
        "steps": [
            {
                "step_id": 1,
                "step_name": "Draft",
                "step_description": "Project is being drafted and not yet submitted for approval",
                "is_initial": true,
                "is_final": false,
                "transitions": [
                    {"to_step_id": 2, "action": "submit_for_planning", "requires_approval": false}
                ]
            },
            {
                "step_id": 2,
                "step_name": "Planning",
                "step_description": "Project planning in progress",
                "is_initial": false,
                "is_final": false,
                "transitions": [
                    {"to_step_id": 1, "action": "return_to_draft", "requires_approval": false},
                    {"to_step_id": 3, "action": "activate_project", "requires_approval": true}
                ]
            },
            {
                "step_id": 3,
                "step_name": "Active",
                "step_description": "Project is active and work is in progress",
                "is_initial": false,
                "is_final": false,
                "transitions": [
                    {"to_step_id": 4, "action": "put_on_hold", "requires_approval": false},
                    {"to_step_id": 5, "action": "complete_project", "requires_approval": true},
                    {"to_step_id": 6, "action": "cancel_project", "requires_approval": true}
                ]
            },
            {
                "step_id": 4,
                "step_name": "On Hold",
                "step_description": "Project is temporarily paused",
                "is_initial": false,
                "is_final": false,
                "transitions": [
                    {"to_step_id": 3, "action": "resume_project", "requires_approval": false},
                    {"to_step_id": 6, "action": "cancel_project", "requires_approval": true}
                ]
            },
            {
                "step_id": 5,
                "step_name": "Completed",
                "step_description": "Project has been completed successfully",
                "is_initial": false,
                "is_final": false,
                "transitions": [
                    {"to_step_id": 7, "action": "close_project", "requires_approval": false}
                ]
            },
            {
                "step_id": 6,
                "step_name": "Cancelled",
                "step_description": "Project has been cancelled",
                "is_initial": false,
                "is_final": false,
                "transitions": [
                    {"to_step_id": 7, "action": "close_project", "requires_approval": false}
                ]
            },
            {
                "step_id": 7,
                "step_name": "Closed",
                "step_description": "Project is closed and archived",
                "is_initial": false,
                "is_final": true,
                "transitions": []
            }
        ]
    }'::jsonb,
    false,  -- require_approval (per-transition control)
    false,  -- auto_progress
    true,   -- send_notifications
    true,
    true    -- is_default
)
ON CONFLICT (workflow_code) DO UPDATE SET
    workflow_name = EXCLUDED.workflow_name,
    workflow_description = EXCLUDED.workflow_description,
    workflow_steps = EXCLUDED.workflow_steps,
    updated_at = NOW();

-- ------------------------------------------------
-- WORKFLOW: Agile Sprint Workflow (Scrum/Agile)
-- ------------------------------------------------

INSERT INTO workflows (
    workflow_code,
    workflow_name,
    workflow_description,
    workflow_type,
    methodology_id,
    workflow_steps,
    require_approval,
    auto_progress,
    send_notifications,
    is_active,
    is_default
)
SELECT
    'agile_sprint',
    'Agile Sprint Workflow',
    'Sprint lifecycle workflow for Scrum and Agile methodologies',
    'sprint',
    m.id,  -- Link to Scrum methodology
    '{
        "steps": [
            {
                "step_id": 1,
                "step_name": "Planning",
                "step_description": "Sprint planning in progress - defining sprint goals and backlog",
                "is_initial": true,
                "is_final": false,
                "duration_days": 1,
                "transitions": [
                    {"to_step_id": 2, "action": "start_sprint", "requires_approval": false}
                ]
            },
            {
                "step_id": 2,
                "step_name": "In Progress",
                "step_description": "Sprint is active - team is working on sprint backlog",
                "is_initial": false,
                "is_final": false,
                "transitions": [
                    {"to_step_id": 3, "action": "complete_sprint", "requires_approval": false},
                    {"to_step_id": 5, "action": "cancel_sprint", "requires_approval": true}
                ]
            },
            {
                "step_id": 3,
                "step_name": "Review",
                "step_description": "Sprint review/demo - showcasing completed work",
                "is_initial": false,
                "is_final": false,
                "duration_hours": 2,
                "transitions": [
                    {"to_step_id": 4, "action": "proceed_to_retrospective", "requires_approval": false}
                ]
            },
            {
                "step_id": 4,
                "step_name": "Retrospective",
                "step_description": "Sprint retrospective - team reflection and improvement",
                "is_initial": false,
                "is_final": false,
                "duration_hours": 1.5,
                "transitions": [
                    {"to_step_id": 6, "action": "close_sprint", "requires_approval": false}
                ]
            },
            {
                "step_id": 5,
                "step_name": "Cancelled",
                "step_description": "Sprint was cancelled before completion",
                "is_initial": false,
                "is_final": true,
                "transitions": []
            },
            {
                "step_id": 6,
                "step_name": "Completed",
                "step_description": "Sprint is completed and closed",
                "is_initial": false,
                "is_final": true,
                "transitions": []
            }
        ]
    }'::jsonb,
    false,
    false,
    true,
    true,
    false
FROM methodologies m
WHERE m.methodology_code = 'scrum'
ON CONFLICT (workflow_code) DO UPDATE SET
    workflow_name = EXCLUDED.workflow_name,
    workflow_description = EXCLUDED.workflow_description,
    workflow_steps = EXCLUDED.workflow_steps,
    updated_at = NOW();

-- ------------------------------------------------
-- WORKFLOW: Stage-Gate Workflow (Structured PM)
-- ------------------------------------------------

INSERT INTO workflows (
    workflow_code,
    workflow_name,
    workflow_description,
    workflow_type,
    methodology_id,
    workflow_steps,
    require_approval,
    auto_progress,
    send_notifications,
    is_active,
    is_default
)
SELECT
    'stage_gate',
    'Stage-Gate Workflow',
    'Traditional stage-gate process with approval gates between phases',
    'project',
    m.id,  -- Link to Structured PM methodology
    '{
        "steps": [
            {
                "step_id": 1,
                "step_name": "Ideation",
                "step_description": "Initial concept and idea generation",
                "is_initial": true,
                "is_final": false,
                "gate": "Gate 1: Initial Screening",
                "transitions": [
                    {"to_step_id": 2, "action": "approve_for_scoping", "requires_approval": true}
                ]
            },
            {
                "step_id": 2,
                "step_name": "Scoping",
                "step_description": "Preliminary assessment and scoping",
                "is_initial": false,
                "is_final": false,
                "gate": "Gate 2: Second Screening",
                "transitions": [
                    {"to_step_id": 3, "action": "approve_business_case", "requires_approval": true},
                    {"to_step_id": 7, "action": "reject_project", "requires_approval": true}
                ]
            },
            {
                "step_id": 3,
                "step_name": "Business Case",
                "step_description": "Detailed business case development",
                "is_initial": false,
                "is_final": false,
                "gate": "Gate 3: Go to Development",
                "transitions": [
                    {"to_step_id": 4, "action": "approve_for_development", "requires_approval": true},
                    {"to_step_id": 7, "action": "reject_project", "requires_approval": true}
                ]
            },
            {
                "step_id": 4,
                "step_name": "Development",
                "step_description": "Product/solution development",
                "is_initial": false,
                "is_final": false,
                "gate": "Gate 4: Go to Testing",
                "transitions": [
                    {"to_step_id": 5, "action": "approve_for_testing", "requires_approval": true}
                ]
            },
            {
                "step_id": 5,
                "step_name": "Testing & Validation",
                "step_description": "Testing, validation, and quality assurance",
                "is_initial": false,
                "is_final": false,
                "gate": "Gate 5: Go to Launch",
                "transitions": [
                    {"to_step_id": 6, "action": "approve_for_launch", "requires_approval": true},
                    {"to_step_id": 4, "action": "return_to_development", "requires_approval": false}
                ]
            },
            {
                "step_id": 6,
                "step_name": "Launch",
                "step_description": "Product launch and deployment",
                "is_initial": false,
                "is_final": true,
                "transitions": []
            },
            {
                "step_id": 7,
                "step_name": "Rejected",
                "step_description": "Project did not pass gate approval",
                "is_initial": false,
                "is_final": true,
                "transitions": []
            }
        ]
    }'::jsonb,
    true,   -- require_approval
    false,
    true,
    true,
    false
FROM methodologies m
WHERE m.methodology_code = 'structured_pm'
ON CONFLICT (workflow_code) DO UPDATE SET
    workflow_name = EXCLUDED.workflow_name,
    workflow_description = EXCLUDED.workflow_description,
    workflow_steps = EXCLUDED.workflow_steps,
    updated_at = NOW();

-- ------------------------------------------------
-- WORKFLOW: Approval Workflow (Universal)
-- ------------------------------------------------

INSERT INTO workflows (
    workflow_code,
    workflow_name,
    workflow_description,
    workflow_type,
    methodology_id,
    workflow_steps,
    require_approval,
    auto_progress,
    send_notifications,
    is_active,
    is_default
)
VALUES (
    'approval',
    'Approval Workflow',
    'Generic approval workflow for change requests, documents, and other approvals',
    'approval',
    NULL,  -- Universal
    '{
        "steps": [
            {
                "step_id": 1,
                "step_name": "Draft",
                "step_description": "Item is in draft state",
                "is_initial": true,
                "is_final": false,
                "transitions": [
                    {"to_step_id": 2, "action": "submit_for_review", "requires_approval": false}
                ]
            },
            {
                "step_id": 2,
                "step_name": "Submitted",
                "step_description": "Item has been submitted and awaiting review",
                "is_initial": false,
                "is_final": false,
                "transitions": [
                    {"to_step_id": 3, "action": "start_review", "requires_approval": false},
                    {"to_step_id": 1, "action": "withdraw", "requires_approval": false}
                ]
            },
            {
                "step_id": 3,
                "step_name": "Under Review",
                "step_description": "Item is being reviewed by approvers",
                "is_initial": false,
                "is_final": false,
                "transitions": [
                    {"to_step_id": 4, "action": "approve", "requires_approval": true},
                    {"to_step_id": 5, "action": "reject", "requires_approval": true},
                    {"to_step_id": 6, "action": "request_changes", "requires_approval": false}
                ]
            },
            {
                "step_id": 4,
                "step_name": "Approved",
                "step_description": "Item has been approved",
                "is_initial": false,
                "is_final": true,
                "transitions": []
            },
            {
                "step_id": 5,
                "step_name": "Rejected",
                "step_description": "Item has been rejected",
                "is_initial": false,
                "is_final": true,
                "transitions": []
            },
            {
                "step_id": 6,
                "step_name": "Changes Requested",
                "step_description": "Changes have been requested",
                "is_initial": false,
                "is_final": false,
                "transitions": [
                    {"to_step_id": 1, "action": "return_to_draft", "requires_approval": false},
                    {"to_step_id": 2, "action": "resubmit", "requires_approval": false}
                ]
            }
        ]
    }'::jsonb,
    true,
    false,
    true,
    true,
    false
)
ON CONFLICT (workflow_code) DO UPDATE SET
    workflow_name = EXCLUDED.workflow_name,
    workflow_description = EXCLUDED.workflow_description,
    workflow_steps = EXCLUDED.workflow_steps,
    updated_at = NOW();

DO $$
BEGIN
    RAISE NOTICE 'Workflows created successfully';
    RAISE NOTICE '';
END $$;

-- ================================================
-- VERIFICATION
-- ================================================

DO $$
DECLARE
    v_methodologies_count INTEGER;
    v_workflows_count INTEGER;
    v_methodology RECORD;
BEGIN
    -- Count methodologies
    SELECT COUNT(*)
    INTO v_methodologies_count
    FROM methodologies
    WHERE is_deleted = FALSE;

    -- Count workflows
    SELECT COUNT(*)
    INTO v_workflows_count
    FROM workflows
    WHERE is_deleted = FALSE;

    RAISE NOTICE '================================================';
    RAISE NOTICE 'Methodologies & Workflows Seed Data Created';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Methodologies Created: %', v_methodologies_count;
    RAISE NOTICE 'Workflows Created:     %', v_workflows_count;
    RAISE NOTICE '================================================';

    -- Display methodology summary
    RAISE NOTICE '';
    RAISE NOTICE 'METHODOLOGY SUMMARY:';
    RAISE NOTICE '----------------------------------------';

    FOR v_methodology IN
        SELECT
            methodology_name,
            methodology_category,
            CASE
                WHEN supports_sprints THEN 'Sprints, ' ELSE ''
            END ||
            CASE
                WHEN supports_kanban THEN 'Kanban, ' ELSE ''
            END ||
            CASE
                WHEN supports_gantt THEN 'Gantt, ' ELSE ''
            END ||
            CASE
                WHEN supports_stages THEN 'Stages' ELSE ''
            END AS features
        FROM methodologies
        WHERE is_deleted = FALSE
        ORDER BY
            CASE methodology_category
                WHEN 'traditional' THEN 1
                WHEN 'agile' THEN 2
                WHEN 'hybrid' THEN 3
            END,
            methodology_name
    LOOP
        RAISE NOTICE '% (%) - Supports: %',
            v_methodology.methodology_name,
            v_methodology.methodology_category,
            TRIM(TRAILING ', ' FROM v_methodology.features);
    END LOOP;

    RAISE NOTICE '================================================';
    RAISE NOTICE 'v13_seed_data_methodologies.sql completed successfully';
    RAISE NOTICE '================================================';
END $$;

-- ================================================
-- END OF FILE
-- ================================================

-- Next Steps:
-- Run v14_seed_data_menus.sql to create menu structure
