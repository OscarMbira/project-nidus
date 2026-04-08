-- ============================================================================
-- Risk Register Enhancement - Unified Risk Management Module
-- Version: v172
-- Description: Enhances existing risks table and adds comprehensive Risk Register structure
-- Date: 2026-01-19
-- ============================================================================
--
-- Purpose:
-- Merges the existing risks table (from v26_risk_management.sql) with the new
-- comprehensive Risk Register plan to create a unified module with pre/post
-- response assessments, proximity tracking, cause-event-effect structure,
-- and configurable scales.
--
-- Strategy:
-- 1. Keep existing risks table but enhance it with new fields
-- 2. Add risk_registers header table (one per project)
-- 3. Link risks to risk_registers
-- 4. Add supporting tables (responses, reviews, links, comments, attachments, scales)
-- 5. Migrate existing data to new structure
--
-- Prerequisites:
-- - v26_risk_management.sql must be run first (risks table exists)
-- - v01 through v07 must be run first (core tables and trigger functions)
-- - v84_accounts_and_extensions.sql must be run (accounts table)
-- - projects table must exist
-- - users table must exist
-- - accounts table must exist
--
-- ============================================================================
-- SECTION 1: CREATE RISK_REGISTERS HEADER TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS risk_registers (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship (One register per project)
    project_id UUID UNIQUE NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Register Identification
    register_reference VARCHAR(50) UNIQUE NOT NULL, -- e.g., RR-2026-001
    document_ref VARCHAR(100), -- External document reference
    version_number VARCHAR(20) DEFAULT '1.0',
    programme_id UUID REFERENCES programmes(id) ON DELETE SET NULL,

    -- Risk Management Configuration
    risk_tolerance_statement TEXT, -- Project's risk appetite
    probability_scale JSONB, -- Defined probability scale (e.g., 1-5)
    impact_scale JSONB, -- Defined impact scale (e.g., 1-5)
    risk_matrix_config JSONB, -- Risk matrix configuration

    -- Review Management
    review_frequency VARCHAR(50), -- How often to review
    last_review_date DATE,
    next_review_date DATE,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_risk_registers_project_id ON risk_registers(project_id);
CREATE INDEX IF NOT EXISTS idx_risk_registers_register_reference ON risk_registers(register_reference);
CREATE INDEX IF NOT EXISTS idx_risk_registers_is_active ON risk_registers(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_risk_registers_is_deleted ON risk_registers(is_deleted) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_risk_registers_before_insert ON risk_registers;
CREATE TRIGGER trg_risk_registers_before_insert
    BEFORE INSERT ON risk_registers
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_risk_registers_before_update ON risk_registers;
CREATE TRIGGER trg_risk_registers_before_update
    BEFORE UPDATE ON risk_registers
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE risk_registers IS 'Risk Register header - one register per project for comprehensive risk management';
COMMENT ON COLUMN risk_registers.register_reference IS 'Unique reference number (e.g., RR-2026-001)';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('risk_registers', 'Risk Register header - one register per project for comprehensive risk management', false, true, 'risks')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- SECTION 2: ENHANCE EXISTING risks TABLE
-- ============================================================================

-- Add new columns to existing risks table
DO $$
BEGIN
    -- Add risk_register_id to link to risk_registers
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'risks' AND column_name = 'risk_register_id'
    ) THEN
        ALTER TABLE risks ADD COLUMN risk_register_id UUID REFERENCES risk_registers(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_risks_risk_register_id ON risks(risk_register_id);
    END IF;

    -- Add risk_number for sequential numbering
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'risks' AND column_name = 'risk_number'
    ) THEN
        ALTER TABLE risks ADD COLUMN risk_number INTEGER;
    END IF;

    -- Add risk_identifier (map from risk_code)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'risks' AND column_name = 'risk_identifier'
    ) THEN
        ALTER TABLE risks ADD COLUMN risk_identifier VARCHAR(50);
        UPDATE risks SET risk_identifier = risk_code WHERE risk_identifier IS NULL AND risk_code IS NOT NULL;
    END IF;

    -- Add cause-event-effect structure
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'risks' AND column_name = 'cause_description'
    ) THEN
        ALTER TABLE risks ADD COLUMN cause_description TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'risks' AND column_name = 'event_description'
    ) THEN
        ALTER TABLE risks ADD COLUMN event_description TEXT;
        -- Map from risk_description if exists
        UPDATE risks SET event_description = risk_description WHERE event_description IS NULL AND risk_description IS NOT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'risks' AND column_name = 'effect_description'
    ) THEN
        ALTER TABLE risks ADD COLUMN effect_description TEXT;
        -- Map from impact_description if exists
        UPDATE risks SET effect_description = impact_description WHERE effect_description IS NULL AND impact_description IS NOT NULL;
    END IF;

    -- Add pre-response assessment fields (map from existing probability/impact)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'risks' AND column_name = 'pre_probability'
    ) THEN
        ALTER TABLE risks ADD COLUMN pre_probability INTEGER;
        UPDATE risks SET pre_probability = probability WHERE pre_probability IS NULL;
        ALTER TABLE risks ALTER COLUMN pre_probability SET DEFAULT 3;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'risks' AND column_name = 'pre_impact'
    ) THEN
        ALTER TABLE risks ADD COLUMN pre_impact INTEGER;
        UPDATE risks SET pre_impact = impact WHERE pre_impact IS NULL;
        ALTER TABLE risks ALTER COLUMN pre_impact SET DEFAULT 3;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'risks' AND column_name = 'pre_probability_rationale'
    ) THEN
        ALTER TABLE risks ADD COLUMN pre_probability_rationale TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'risks' AND column_name = 'pre_impact_rationale'
    ) THEN
        ALTER TABLE risks ADD COLUMN pre_impact_rationale TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'risks' AND column_name = 'pre_expected_value'
    ) THEN
        ALTER TABLE risks ADD COLUMN pre_expected_value DECIMAL(5,2) GENERATED ALWAYS AS (pre_probability * pre_impact) STORED;
        CREATE INDEX IF NOT EXISTS idx_risks_pre_expected_value ON risks(pre_expected_value);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'risks' AND column_name = 'pre_risk_score'
    ) THEN
        ALTER TABLE risks ADD COLUMN pre_risk_score VARCHAR(20) GENERATED ALWAYS AS (
            CASE 
                WHEN (pre_probability * pre_impact) >= 20 THEN 'very_high'
                WHEN (pre_probability * pre_impact) >= 12 THEN 'high'
                WHEN (pre_probability * pre_impact) >= 6 THEN 'medium'
                WHEN (pre_probability * pre_impact) >= 3 THEN 'low'
                ELSE 'very_low'
            END
        ) STORED;
        CREATE INDEX IF NOT EXISTS idx_risks_pre_risk_score ON risks(pre_risk_score);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'risks' AND column_name = 'pre_cost_impact'
    ) THEN
        ALTER TABLE risks ADD COLUMN pre_cost_impact DECIMAL(15,2);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'risks' AND column_name = 'pre_schedule_impact_days'
    ) THEN
        ALTER TABLE risks ADD COLUMN pre_schedule_impact_days INTEGER;
    END IF;

    -- Add post-response assessment fields
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'risks' AND column_name = 'post_probability'
    ) THEN
        ALTER TABLE risks ADD COLUMN post_probability INTEGER;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'risks' AND column_name = 'post_impact'
    ) THEN
        ALTER TABLE risks ADD COLUMN post_impact INTEGER;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'risks' AND column_name = 'post_probability_rationale'
    ) THEN
        ALTER TABLE risks ADD COLUMN post_probability_rationale TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'risks' AND column_name = 'post_impact_rationale'
    ) THEN
        ALTER TABLE risks ADD COLUMN post_impact_rationale TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'risks' AND column_name = 'post_expected_value'
    ) THEN
        ALTER TABLE risks ADD COLUMN post_expected_value DECIMAL(5,2) GENERATED ALWAYS AS (
            CASE 
                WHEN post_probability IS NOT NULL AND post_impact IS NOT NULL 
                THEN post_probability * post_impact 
                ELSE NULL 
            END
        ) STORED;
        CREATE INDEX IF NOT EXISTS idx_risks_post_expected_value ON risks(post_expected_value);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'risks' AND column_name = 'post_risk_score'
    ) THEN
        ALTER TABLE risks ADD COLUMN post_risk_score VARCHAR(20) GENERATED ALWAYS AS (
            CASE 
                WHEN post_probability IS NOT NULL AND post_impact IS NOT NULL THEN
                    CASE 
                        WHEN (post_probability * post_impact) >= 20 THEN 'very_high'
                        WHEN (post_probability * post_impact) >= 12 THEN 'high'
                        WHEN (post_probability * post_impact) >= 6 THEN 'medium'
                        WHEN (post_probability * post_impact) >= 3 THEN 'low'
                        ELSE 'very_low'
                    END
                ELSE NULL
            END
        ) STORED;
        CREATE INDEX IF NOT EXISTS idx_risks_post_risk_score ON risks(post_risk_score);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'risks' AND column_name = 'post_cost_impact'
    ) THEN
        ALTER TABLE risks ADD COLUMN post_cost_impact DECIMAL(15,2);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'risks' AND column_name = 'post_schedule_impact_days'
    ) THEN
        ALTER TABLE risks ADD COLUMN post_schedule_impact_days INTEGER;
    END IF;

    -- Add proximity tracking
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'risks' AND column_name = 'proximity'
    ) THEN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'risk_proximity_enum') THEN
            EXECUTE 'CREATE TYPE risk_proximity_enum AS ENUM (''imminent'', ''within_stage'', ''within_project'', ''beyond_project'')';
        END IF;
        ALTER TABLE risks ADD COLUMN proximity risk_proximity_enum;
        CREATE INDEX IF NOT EXISTS idx_risks_proximity ON risks(proximity);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'risks' AND column_name = 'proximity_date'
    ) THEN
        ALTER TABLE risks ADD COLUMN proximity_date DATE;
        CREATE INDEX IF NOT EXISTS idx_risks_proximity_date ON risks(proximity_date) WHERE proximity_date IS NOT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'risks' AND column_name = 'proximity_notes'
    ) THEN
        ALTER TABLE risks ADD COLUMN proximity_notes TEXT;
    END IF;

    -- Add response category enum
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'risks' AND column_name = 'response_category'
    ) THEN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'risk_response_category_enum') THEN
            EXECUTE 'CREATE TYPE risk_response_category_enum AS ENUM (''avoid'', ''reduce'', ''fallback'', ''transfer'', ''accept'', ''share'', ''exploit'', ''enhance'', ''reject'')';
        END IF;
        -- Map from existing response_strategy
        ALTER TABLE risks ADD COLUMN response_category risk_response_category_enum;
        UPDATE risks SET response_category = CASE
            WHEN response_strategy = 'avoid' THEN 'avoid'::risk_response_category_enum
            WHEN response_strategy = 'transfer' THEN 'transfer'::risk_response_category_enum
            WHEN response_strategy = 'mitigate' THEN 'reduce'::risk_response_category_enum
            WHEN response_strategy = 'accept' THEN 'accept'::risk_response_category_enum
            WHEN response_strategy = 'exploit' THEN 'exploit'::risk_response_category_enum
            ELSE NULL
        END;
        CREATE INDEX IF NOT EXISTS idx_risks_response_category ON risks(response_category);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'risks' AND column_name = 'contingency_plan'
    ) THEN
        ALTER TABLE risks ADD COLUMN contingency_plan TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'risks' AND column_name = 'trigger_conditions'
    ) THEN
        ALTER TABLE risks ADD COLUMN trigger_conditions TEXT;
    END IF;

    -- Add ownership fields (map from existing)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'risks' AND column_name = 'date_registered'
    ) THEN
        ALTER TABLE risks ADD COLUMN date_registered DATE;
        UPDATE risks SET date_registered = identified_date WHERE date_registered IS NULL;
        ALTER TABLE risks ALTER COLUMN date_registered SET DEFAULT CURRENT_DATE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'risks' AND column_name = 'risk_author_id'
    ) THEN
        ALTER TABLE risks ADD COLUMN risk_author_id UUID REFERENCES users(id) ON DELETE SET NULL;
        UPDATE risks SET risk_author_id = identified_by_user_id WHERE risk_author_id IS NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'risks' AND column_name = 'risk_author_name'
    ) THEN
        ALTER TABLE risks ADD COLUMN risk_author_name VARCHAR(200);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'risks' AND column_name = 'risk_owner_id'
    ) THEN
        ALTER TABLE risks ADD COLUMN risk_owner_id UUID REFERENCES users(id) ON DELETE SET NULL;
        UPDATE risks SET risk_owner_id = risk_owner_user_id WHERE risk_owner_id IS NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'risks' AND column_name = 'risk_owner_name'
    ) THEN
        ALTER TABLE risks ADD COLUMN risk_owner_name VARCHAR(200);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'risks' AND column_name = 'risk_actionee_id'
    ) THEN
        ALTER TABLE risks ADD COLUMN risk_actionee_id UUID REFERENCES users(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'risks' AND column_name = 'risk_actionee_name'
    ) THEN
        ALTER TABLE risks ADD COLUMN risk_actionee_name VARCHAR(200);
    END IF;

    -- Add status enum (map from existing status)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'risks' AND column_name = 'status_enum'
    ) THEN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'risk_status_enum') THEN
            EXECUTE 'CREATE TYPE risk_status_enum AS ENUM (''identified'', ''assessing'', ''responding'', ''monitoring'', ''occurred'', ''closed'', ''expired'')';
        END IF;
        ALTER TABLE risks ADD COLUMN status_enum risk_status_enum;
        UPDATE risks SET status_enum = CASE
            WHEN status = 'identified' THEN 'identified'::risk_status_enum
            WHEN status = 'assessed' THEN 'assessing'::risk_status_enum
            WHEN status = 'mitigated' THEN 'responding'::risk_status_enum
            WHEN status = 'monitored' THEN 'monitoring'::risk_status_enum
            WHEN status = 'realized' THEN 'occurred'::risk_status_enum
            WHEN status = 'closed' THEN 'closed'::risk_status_enum
            ELSE 'identified'::risk_status_enum
        END;
        CREATE INDEX IF NOT EXISTS idx_risks_status_enum ON risks(status_enum);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'risks' AND column_name = 'closure_reason'
    ) THEN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'risk_closure_reason_enum') THEN
            EXECUTE 'CREATE TYPE risk_closure_reason_enum AS ENUM (''mitigated'', ''occurred'', ''expired'', ''transferred'', ''accepted'')';
        END IF;
        ALTER TABLE risks ADD COLUMN closure_reason risk_closure_reason_enum;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'risks' AND column_name = 'closure_notes'
    ) THEN
        ALTER TABLE risks ADD COLUMN closure_notes TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'risks' AND column_name = 'closure_date'
    ) THEN
        ALTER TABLE risks ADD COLUMN closure_date DATE;
        UPDATE risks SET closure_date = closed_date WHERE closure_date IS NULL;
    END IF;

    -- Add product linkage
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'risks' AND column_name = 'related_product_id'
    ) THEN
        ALTER TABLE risks ADD COLUMN related_product_id UUID;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'risks' AND column_name = 'related_product_name'
    ) THEN
        ALTER TABLE risks ADD COLUMN related_product_name VARCHAR(200);
    END IF;

    -- Add issue escalation linkage
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'risks' AND column_name = 'escalated_from_issue_id'
    ) THEN
        ALTER TABLE risks ADD COLUMN escalated_from_issue_id UUID;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'risks' AND column_name = 'escalated_to_issue_id'
    ) THEN
        ALTER TABLE risks ADD COLUMN escalated_to_issue_id UUID;
    END IF;

    -- Add sub_category
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'risks' AND column_name = 'sub_category'
    ) THEN
        ALTER TABLE risks ADD COLUMN sub_category VARCHAR(100);
    END IF;

    -- Ensure risk_identifier is unique if not already
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_risk_identifier'
    ) THEN
        ALTER TABLE risks ADD CONSTRAINT unique_risk_identifier UNIQUE (risk_identifier);
    END IF;

    -- Add full-text search index
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'idx_risks_search'
    ) THEN
        CREATE INDEX idx_risks_search ON risks USING GIN(
            to_tsvector('english', 
                COALESCE(risk_title, '') || ' ' || 
                COALESCE(risk_description, '') || ' ' || 
                COALESCE(cause_description, '') || ' ' || 
                COALESCE(event_description, '') || ' ' || 
                COALESCE(effect_description, '')
            )
        );
    END IF;
END $$;

-- ============================================================================
-- SECTION 3: CREATE SUPPORTING TABLES
-- ============================================================================

-- ============================================================================
-- TABLE: risk_responses (Response Actions for Risks)
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'risk_response_action_type_enum') THEN
        EXECUTE 'CREATE TYPE risk_response_action_type_enum AS ENUM (''preventive'', ''corrective'', ''contingency'', ''fallback'')';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'risk_response_status_enum') THEN
        EXECUTE 'CREATE TYPE risk_response_status_enum AS ENUM (''planned'', ''in_progress'', ''completed'', ''cancelled'')';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'risk_response_effectiveness_enum') THEN
        EXECUTE 'CREATE TYPE risk_response_effectiveness_enum AS ENUM (''not_assessed'', ''ineffective'', ''partially_effective'', ''effective'', ''highly_effective'')';
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS risk_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
    response_number INTEGER NOT NULL,
    action_description TEXT NOT NULL,
    action_type risk_response_action_type_enum NOT NULL DEFAULT 'preventive',
    assigned_to_id UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_to_name VARCHAR(200),
    target_date DATE,
    estimated_cost DECIMAL(15,2),
    actual_cost DECIMAL(15,2),
    status risk_response_status_enum NOT NULL DEFAULT 'planned',
    completion_date DATE,
    completion_notes TEXT,
    effectiveness_rating risk_response_effectiveness_enum,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT unique_risk_response_number UNIQUE (risk_id, response_number)
);

CREATE INDEX IF NOT EXISTS idx_risk_responses_risk_id ON risk_responses(risk_id);
CREATE INDEX IF NOT EXISTS idx_risk_responses_assigned_to_id ON risk_responses(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_risk_responses_status ON risk_responses(status);
CREATE INDEX IF NOT EXISTS idx_risk_responses_target_date ON risk_responses(target_date) WHERE target_date IS NOT NULL;

DROP TRIGGER IF EXISTS trg_risk_responses_before_insert ON risk_responses;
CREATE TRIGGER trg_risk_responses_before_insert
    BEFORE INSERT ON risk_responses
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_risk_responses_before_update ON risk_responses;
CREATE TRIGGER trg_risk_responses_before_update
    BEFORE UPDATE ON risk_responses
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('risk_responses', 'Response actions for risks', false, true, 'risks')
ON CONFLICT (table_name) DO UPDATE SET updated_at = NOW();

-- ============================================================================
-- TABLE: risk_categories (Configurable Risk Categories)
-- ============================================================================

CREATE TABLE IF NOT EXISTS risk_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organisation_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    category_code VARCHAR(50) NOT NULL,
    category_name VARCHAR(100) NOT NULL,
    category_description TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_categories_organisation_id ON risk_categories(organisation_id);
CREATE INDEX IF NOT EXISTS idx_risk_categories_is_active ON risk_categories(is_active) WHERE is_active = TRUE;

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('risk_categories', 'Configurable risk categories by organization', false, true, 'risks')
ON CONFLICT (table_name) DO UPDATE SET updated_at = NOW();

-- ============================================================================
-- TABLE: risk_probability_scales (Configurable Probability Scales)
-- ============================================================================

CREATE TABLE IF NOT EXISTS risk_probability_scales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organisation_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    scale_value INTEGER NOT NULL CHECK (scale_value >= 1 AND scale_value <= 5),
    scale_label VARCHAR(50) NOT NULL,
    percentage_range_min INTEGER,
    percentage_range_max INTEGER,
    description TEXT,
    color_code VARCHAR(7),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_org_probability_scale UNIQUE (organisation_id, scale_value)
);

CREATE INDEX IF NOT EXISTS idx_risk_probability_scales_organisation_id ON risk_probability_scales(organisation_id);
CREATE INDEX IF NOT EXISTS idx_risk_probability_scales_is_active ON risk_probability_scales(is_active) WHERE is_active = TRUE;

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('risk_probability_scales', 'Configurable probability scales by organization', false, true, 'risks')
ON CONFLICT (table_name) DO UPDATE SET updated_at = NOW();

-- ============================================================================
-- TABLE: risk_impact_scales (Configurable Impact Scales)
-- ============================================================================

CREATE TABLE IF NOT EXISTS risk_impact_scales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organisation_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    scale_value INTEGER NOT NULL CHECK (scale_value >= 1 AND scale_value <= 5),
    scale_label VARCHAR(50) NOT NULL,
    cost_range_min DECIMAL(15,2),
    cost_range_max DECIMAL(15,2),
    schedule_range_min_days INTEGER,
    schedule_range_max_days INTEGER,
    quality_impact_description TEXT,
    description TEXT,
    color_code VARCHAR(7),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_org_impact_scale UNIQUE (organisation_id, scale_value)
);

CREATE INDEX IF NOT EXISTS idx_risk_impact_scales_organisation_id ON risk_impact_scales(organisation_id);
CREATE INDEX IF NOT EXISTS idx_risk_impact_scales_is_active ON risk_impact_scales(is_active) WHERE is_active = TRUE;

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('risk_impact_scales', 'Configurable impact scales by organization', false, true, 'risks')
ON CONFLICT (table_name) DO UPDATE SET updated_at = NOW();

-- ============================================================================
-- TABLE: risk_matrix_thresholds (Risk Matrix Configuration)
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'risk_level_enum') THEN
        EXECUTE 'CREATE TYPE risk_level_enum AS ENUM (''very_low'', ''low'', ''medium'', ''high'', ''very_high'')';
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS risk_matrix_thresholds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organisation_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    min_score DECIMAL(5,2) NOT NULL,
    max_score DECIMAL(5,2) NOT NULL,
    risk_level risk_level_enum NOT NULL,
    risk_level_label VARCHAR(50) NOT NULL,
    color_code VARCHAR(7) NOT NULL,
    required_action TEXT,
    escalation_required BOOLEAN DEFAULT FALSE,
    review_frequency_days INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_matrix_thresholds_organisation_id ON risk_matrix_thresholds(organisation_id);
CREATE INDEX IF NOT EXISTS idx_risk_matrix_thresholds_is_active ON risk_matrix_thresholds(is_active) WHERE is_active = TRUE;

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('risk_matrix_thresholds', 'Risk matrix configuration by organization', false, true, 'risks')
ON CONFLICT (table_name) DO UPDATE SET updated_at = NOW();

-- ============================================================================
-- TABLE: risk_comments (Discussion on Risks)
-- ============================================================================

CREATE TABLE IF NOT EXISTS risk_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    commented_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_risk_comments_risk_id ON risk_comments(risk_id);
CREATE INDEX IF NOT EXISTS idx_risk_comments_commented_by ON risk_comments(commented_by);
CREATE INDEX IF NOT EXISTS idx_risk_comments_created_at ON risk_comments(created_at DESC);

DROP TRIGGER IF EXISTS trg_risk_comments_before_insert ON risk_comments;
CREATE TRIGGER trg_risk_comments_before_insert
    BEFORE INSERT ON risk_comments
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_risk_comments_before_update ON risk_comments;
CREATE TRIGGER trg_risk_comments_before_update
    BEFORE UPDATE ON risk_comments
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('risk_comments', 'Discussion comments on risks', false, true, 'risks')
ON CONFLICT (table_name) DO UPDATE SET updated_at = NOW();

-- ============================================================================
-- TABLE: risk_attachments (Supporting Documents)
-- ============================================================================

CREATE TABLE IF NOT EXISTS risk_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(100),
    file_size INTEGER,
    description TEXT,
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_risk_attachments_risk_id ON risk_attachments(risk_id);
CREATE INDEX IF NOT EXISTS idx_risk_attachments_uploaded_by ON risk_attachments(uploaded_by);

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('risk_attachments', 'Supporting documents/files attached to risks', false, true, 'risks')
ON CONFLICT (table_name) DO UPDATE SET updated_at = NOW();

-- ============================================================================
-- TABLE: risk_reviews (Periodic Risk Reviews)
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'risk_review_type_enum') THEN
        EXECUTE 'CREATE TYPE risk_review_type_enum AS ENUM (''scheduled'', ''stage_gate'', ''ad_hoc'', ''escalation'')';
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS risk_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    risk_register_id UUID NOT NULL REFERENCES risk_registers(id) ON DELETE CASCADE,
    review_date DATE NOT NULL DEFAULT CURRENT_DATE,
    review_type risk_review_type_enum NOT NULL DEFAULT 'scheduled',
    reviewed_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    participants TEXT[],
    risks_reviewed_count INTEGER DEFAULT 0,
    new_risks_identified INTEGER DEFAULT 0,
    risks_closed INTEGER DEFAULT 0,
    key_findings TEXT,
    actions_arising TEXT,
    next_review_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_reviews_register_id ON risk_reviews(risk_register_id);
CREATE INDEX IF NOT EXISTS idx_risk_reviews_review_date ON risk_reviews(review_date DESC);
CREATE INDEX IF NOT EXISTS idx_risk_reviews_reviewed_by ON risk_reviews(reviewed_by);

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('risk_reviews', 'Periodic risk review records', false, true, 'risks')
ON CONFLICT (table_name) DO UPDATE SET updated_at = NOW();

-- ============================================================================
-- TABLE: risk_links (Risk Interdependencies)
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'risk_link_type_enum') THEN
        EXECUTE 'CREATE TYPE risk_link_type_enum AS ENUM (''causes'', ''caused_by'', ''related_to'', ''duplicate_of'', ''supersedes'')';
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS risk_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
    target_risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
    link_type risk_link_type_enum NOT NULL,
    link_description TEXT,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT no_self_link CHECK (source_risk_id != target_risk_id)
);

CREATE INDEX IF NOT EXISTS idx_risk_links_source_risk_id ON risk_links(source_risk_id);
CREATE INDEX IF NOT EXISTS idx_risk_links_target_risk_id ON risk_links(target_risk_id);
CREATE INDEX IF NOT EXISTS idx_risk_links_link_type ON risk_links(link_type);

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('risk_links', 'Risk interdependencies and relationships', false, true, 'risks')
ON CONFLICT (table_name) DO UPDATE SET updated_at = NOW();

-- ============================================================================
-- SECTION 4: FUNCTIONS
-- ============================================================================

-- ============================================================================
-- FUNCTION: generate_risk_register_reference()
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_risk_register_reference()
RETURNS VARCHAR AS $$
DECLARE
    v_year INTEGER;
    v_sequence INTEGER;
    v_reference VARCHAR(50);
BEGIN
    v_year := EXTRACT(YEAR FROM CURRENT_DATE);
    SELECT COALESCE(MAX(CAST(SUBSTRING(register_reference FROM 8) AS INTEGER)), 0) + 1
    INTO v_sequence
    FROM risk_registers
    WHERE register_reference LIKE 'RR-' || v_year || '-%';
    v_reference := 'RR-' || v_year || '-' || LPAD(v_sequence::TEXT, 3, '0');
    RETURN v_reference;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_risk_register_reference() IS 'Generates unique risk register reference number (RR-YYYY-NNN)';

-- ============================================================================
-- FUNCTION: generate_risk_identifier(p_risk_register_id UUID)
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_risk_identifier(p_risk_register_id UUID)
RETURNS VARCHAR AS $$
DECLARE
    v_year INTEGER;
    v_sequence INTEGER;
    v_reference VARCHAR(50);
BEGIN
    v_year := EXTRACT(YEAR FROM CURRENT_DATE);
    SELECT COALESCE(MAX(CAST(SUBSTRING(risk_identifier FROM 6) AS INTEGER)), 0) + 1
    INTO v_sequence
    FROM risks
    WHERE risk_register_id = p_risk_register_id
      AND risk_identifier LIKE 'R-' || v_year || '-%'
      AND is_deleted = FALSE;
    v_reference := 'R-' || v_year || '-' || LPAD(v_sequence::TEXT, 3, '0');
    RETURN v_reference;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_risk_identifier(UUID) IS 'Generates unique risk identifier (R-YYYY-NNN)';

-- ============================================================================
-- FUNCTION: generate_risk_number(p_risk_register_id UUID)
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_risk_number(p_risk_register_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_next_number INTEGER;
BEGIN
    SELECT COALESCE(MAX(risk_number), 0) + 1
    INTO v_next_number
    FROM risks
    WHERE risk_register_id = p_risk_register_id
      AND is_deleted = FALSE;
    RETURN v_next_number;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_risk_number(UUID) IS 'Generates sequential risk number within a risk register';

-- ============================================================================
-- FUNCTION: create_risk_register_for_project(p_project_id UUID, p_user_id UUID)
-- ============================================================================

CREATE OR REPLACE FUNCTION create_risk_register_for_project(p_project_id UUID, p_user_id UUID)
RETURNS UUID AS $$
DECLARE
    v_register_id UUID;
    v_reference VARCHAR(50);
BEGIN
    SELECT id INTO v_register_id
    FROM risk_registers
    WHERE project_id = p_project_id
      AND is_deleted = FALSE;

    IF v_register_id IS NOT NULL THEN
        RETURN v_register_id;
    END IF;

    v_reference := generate_risk_register_reference();

    INSERT INTO risk_registers (
        project_id,
        register_reference,
        created_by,
        is_active
    )
    VALUES (
        p_project_id,
        v_reference,
        p_user_id,
        TRUE
    )
    RETURNING id INTO v_register_id;

    RETURN v_register_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_risk_register_for_project(UUID, UUID) IS 'Creates risk register when project is initiated';

-- ============================================================================
-- FUNCTION: calculate_risk_score(p_probability INTEGER, p_impact INTEGER)
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_risk_score(p_probability INTEGER, p_impact INTEGER)
RETURNS TABLE (
    expected_value DECIMAL,
    risk_level VARCHAR,
    color_code VARCHAR
) AS $$
DECLARE
    v_expected_value DECIMAL;
    v_risk_level VARCHAR;
    v_color_code VARCHAR;
BEGIN
    v_expected_value := p_probability * p_impact;

    SELECT 
        risk_level_label,
        color_code
    INTO v_risk_level, v_color_code
    FROM risk_matrix_thresholds
    WHERE min_score <= v_expected_value
      AND max_score >= v_expected_value
      AND is_active = TRUE
    ORDER BY min_score DESC
    LIMIT 1;

    IF v_risk_level IS NULL THEN
        -- Default calculation if no thresholds configured
        v_risk_level := CASE 
            WHEN v_expected_value >= 20 THEN 'very_high'
            WHEN v_expected_value >= 12 THEN 'high'
            WHEN v_expected_value >= 6 THEN 'medium'
            WHEN v_expected_value >= 3 THEN 'low'
            ELSE 'very_low'
        END;
        v_color_code := CASE 
            WHEN v_expected_value >= 20 THEN '#DC2626' -- Red
            WHEN v_expected_value >= 12 THEN '#F97316' -- Orange
            WHEN v_expected_value >= 6 THEN '#EAB308' -- Yellow
            WHEN v_expected_value >= 3 THEN '#84CC16' -- Light Green
            ELSE '#22C55E' -- Green
        END;
    END IF;

    RETURN QUERY SELECT v_expected_value, v_risk_level, v_color_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION calculate_risk_score(INTEGER, INTEGER) IS 'Calculates risk score and level from probability and impact';

-- ============================================================================
-- FUNCTION: get_risk_matrix(p_risk_register_id UUID)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_risk_matrix(p_risk_register_id UUID)
RETURNS TABLE (
    probability INTEGER,
    impact INTEGER,
    risk_count INTEGER,
    risks JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        r.pre_probability as probability,
        r.pre_impact as impact,
        COUNT(*)::INTEGER as risk_count,
        jsonb_agg(
            jsonb_build_object(
                'id', r.id,
                'identifier', r.risk_identifier,
                'title', r.risk_title,
                'type', r.risk_type,
                'score', r.pre_expected_value
            )
        ) as risks
    FROM risks r
    WHERE r.risk_register_id = p_risk_register_id
      AND r.is_deleted = FALSE
      AND r.status_enum NOT IN ('closed', 'expired')
    GROUP BY r.pre_probability, r.pre_impact
    ORDER BY r.pre_probability DESC, r.pre_impact DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_risk_matrix(UUID) IS 'Returns risk matrix with all risks positioned';

-- ============================================================================
-- FUNCTION: get_top_risks(p_project_id UUID, p_limit INTEGER)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_top_risks(p_project_id UUID, p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
    risk_id UUID,
    risk_identifier VARCHAR,
    title VARCHAR,
    risk_score VARCHAR,
    expected_value DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        r.id as risk_id,
        r.risk_identifier,
        r.risk_title as title,
        r.pre_risk_score as risk_score,
        r.pre_expected_value as expected_value
    FROM risks r
    JOIN risk_registers rr ON r.risk_register_id = rr.id
    WHERE rr.project_id = p_project_id
      AND r.is_deleted = FALSE
      AND rr.is_deleted = FALSE
      AND r.status_enum NOT IN ('closed', 'expired')
    ORDER BY r.pre_expected_value DESC, r.pre_probability DESC, r.pre_impact DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_top_risks(UUID, INTEGER) IS 'Returns top risks by expected value';

-- ============================================================================
-- FUNCTION: get_risks_by_proximity(p_project_id UUID)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_risks_by_proximity(p_project_id UUID)
RETURNS TABLE (
    proximity VARCHAR,
    risk_count INTEGER,
    risks JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        r.proximity::VARCHAR as proximity,
        COUNT(*)::INTEGER as risk_count,
        jsonb_agg(
            jsonb_build_object(
                'id', r.id,
                'identifier', r.risk_identifier,
                'title', r.risk_title,
                'expected_value', r.pre_expected_value,
                'proximity_date', r.proximity_date
            )
        ) as risks
    FROM risks r
    JOIN risk_registers rr ON r.risk_register_id = rr.id
    WHERE rr.project_id = p_project_id
      AND r.is_deleted = FALSE
      AND rr.is_deleted = FALSE
      AND r.status_enum NOT IN ('closed', 'expired')
      AND r.proximity IS NOT NULL
    GROUP BY r.proximity
    ORDER BY 
        CASE r.proximity
            WHEN 'imminent' THEN 1
            WHEN 'within_stage' THEN 2
            WHEN 'within_project' THEN 3
            WHEN 'beyond_project' THEN 4
        END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_risks_by_proximity(UUID) IS 'Returns risks grouped by proximity';

-- ============================================================================
-- FUNCTION: get_risk_summary(p_project_id UUID)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_risk_summary(p_project_id UUID)
RETURNS TABLE (
    total_risks INTEGER,
    active_risks INTEGER,
    threats_count INTEGER,
    opportunities_count INTEGER,
    high_risks INTEGER,
    medium_risks INTEGER,
    low_risks INTEGER,
    overdue_responses INTEGER,
    risks_by_category JSONB
) AS $$
DECLARE
    v_register_id UUID;
BEGIN
    SELECT id INTO v_register_id
    FROM risk_registers
    WHERE project_id = p_project_id
      AND is_deleted = FALSE;

    IF v_register_id IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        COUNT(*)::INTEGER as total_risks,
        COUNT(*) FILTER (WHERE r.status_enum NOT IN ('closed', 'expired'))::INTEGER as active_risks,
        COUNT(*) FILTER (WHERE r.risk_type = 'threat')::INTEGER as threats_count,
        COUNT(*) FILTER (WHERE r.risk_type = 'opportunity')::INTEGER as opportunities_count,
        COUNT(*) FILTER (WHERE r.pre_risk_score IN ('high', 'very_high'))::INTEGER as high_risks,
        COUNT(*) FILTER (WHERE r.pre_risk_score = 'medium')::INTEGER as medium_risks,
        COUNT(*) FILTER (WHERE r.pre_risk_score IN ('low', 'very_low'))::INTEGER as low_risks,
        (
            SELECT COUNT(*)::INTEGER
            FROM risk_responses rr
            WHERE rr.risk_id IN (SELECT id FROM risks WHERE risk_register_id = v_register_id)
              AND rr.status IN ('planned', 'in_progress')
              AND rr.target_date < CURRENT_DATE
        ) as overdue_responses,
        jsonb_object_agg(
            COALESCE(r.risk_category, 'uncategorized')::TEXT,
            COUNT(*)::INTEGER
        ) as risks_by_category
    FROM risks r
    WHERE r.risk_register_id = v_register_id
      AND r.is_deleted = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_risk_summary(UUID) IS 'Returns summary statistics for a project''s risk register';

-- ============================================================================
-- FUNCTION: escalate_risk_to_issue(p_risk_id UUID, p_user_id UUID)
-- ============================================================================

CREATE OR REPLACE FUNCTION escalate_risk_to_issue(p_risk_id UUID, p_user_id UUID)
RETURNS UUID AS $$
DECLARE
    v_risk RECORD;
    v_issue_id UUID;
BEGIN
    SELECT * INTO v_risk
    FROM risks
    WHERE id = p_risk_id
      AND is_deleted = FALSE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Risk not found';
    END IF;

    -- Create issue from risk
    INSERT INTO issues (
        project_id,
        issue_title,
        issue_description,
        issue_category,
        priority,
        status,
        identified_by_user_id,
        assigned_to_user_id,
        created_by
    )
    VALUES (
        v_risk.project_id,
        'Risk Materialized: ' || v_risk.risk_title,
        'This issue was escalated from risk: ' || COALESCE(v_risk.risk_identifier, '') || E'\n\n' || 
        'Risk Description: ' || COALESCE(v_risk.risk_description, '') || E'\n\n' ||
        'Effect: ' || COALESCE(v_risk.effect_description, ''),
        v_risk.risk_category,
        CASE 
            WHEN v_risk.pre_risk_score IN ('high', 'very_high') THEN 'high'
            WHEN v_risk.pre_risk_score = 'medium' THEN 'medium'
            ELSE 'low'
        END,
        'open',
        v_risk.risk_author_id,
        v_risk.risk_owner_id,
        p_user_id
    )
    RETURNING id INTO v_issue_id;

    -- Update risk
    UPDATE risks
    SET 
        escalated_to_issue_id = v_issue_id,
        status_enum = 'occurred'::risk_status_enum,
        status = 'realized',
        updated_at = NOW(),
        updated_by = p_user_id
    WHERE id = p_risk_id;

    RETURN v_issue_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION escalate_risk_to_issue(UUID, UUID) IS 'Converts a materialized risk to an issue';

-- ============================================================================
-- FUNCTION: create_risk_from_issue(p_issue_id UUID, p_user_id UUID)
-- ============================================================================

CREATE OR REPLACE FUNCTION create_risk_from_issue(p_issue_id UUID, p_user_id UUID)
RETURNS UUID AS $$
DECLARE
    v_issue RECORD;
    v_register_id UUID;
    v_risk_id UUID;
BEGIN
    SELECT * INTO v_issue
    FROM issues
    WHERE id = p_issue_id
      AND is_deleted = FALSE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Issue not found';
    END IF;

    -- Get or create risk register
    SELECT create_risk_register_for_project(v_issue.project_id, p_user_id) INTO v_register_id;

    -- Create risk from issue
    INSERT INTO risks (
        project_id,
        risk_register_id,
        risk_title,
        risk_description,
        risk_type,
        risk_category,
        cause_description,
        event_description,
        effect_description,
        pre_probability,
        pre_impact,
        risk_author_id,
        risk_owner_id,
        escalated_from_issue_id,
        created_by
    )
    VALUES (
        v_issue.project_id,
        v_register_id,
        'Potential Recurrence: ' || v_issue.issue_title,
        'This risk was created from issue: ' || COALESCE(v_issue.issue_code, '') || E'\n\n' ||
        'Issue Description: ' || COALESCE(v_issue.issue_description, ''),
        'threat',
        v_issue.issue_category,
        'Previous occurrence of: ' || v_issue.issue_title,
        'The issue may recur',
        v_issue.impact_description,
        3, -- Default probability
        3, -- Default impact
        p_user_id,
        v_issue.assigned_to_user_id,
        p_issue_id,
        p_user_id
    )
    RETURNING id INTO v_risk_id;

    RETURN v_risk_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_risk_from_issue(UUID, UUID) IS 'Creates a risk from an issue (for tracking potential recurrence)';

-- ============================================================================
-- FUNCTION: migrate_existing_risks_to_register()
-- ============================================================================
-- Migrates existing risks to link with risk_registers
-- ============================================================================

CREATE OR REPLACE FUNCTION migrate_existing_risks_to_register()
RETURNS VOID AS $$
DECLARE
    v_project RECORD;
    v_register_id UUID;
    v_user_id UUID;
BEGIN
    -- For each project with risks, create a risk_register if it doesn't exist
    FOR v_project IN
        SELECT DISTINCT project_id, created_by
        FROM risks
        WHERE risk_register_id IS NULL
          AND is_deleted = FALSE
    LOOP
        -- Get or create risk_register
        SELECT id INTO v_register_id
        FROM risk_registers
        WHERE project_id = v_project.project_id
          AND is_deleted = FALSE;

        IF v_register_id IS NULL THEN
            v_user_id := COALESCE(v_project.created_by, (SELECT id FROM users LIMIT 1));
            SELECT create_risk_register_for_project(v_project.project_id, v_user_id) INTO v_register_id;
        END IF;

        -- Link existing risks to the register
        UPDATE risks
        SET risk_register_id = v_register_id,
            risk_number = (
                SELECT COALESCE(MAX(risk_number), 0) + ROW_NUMBER() OVER (ORDER BY identified_date, created_at)
                FROM risks r2
                WHERE r2.project_id = risks.project_id
                  AND r2.risk_register_id = v_register_id
                  AND r2.id <= risks.id
            )
        WHERE project_id = v_project.project_id
          AND risk_register_id IS NULL
          AND is_deleted = FALSE;

        -- Generate risk identifiers if missing
        UPDATE risks
        SET risk_identifier = generate_risk_identifier(v_register_id)
        WHERE risk_identifier IS NULL
          AND risk_register_id = v_register_id
          AND is_deleted = FALSE;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION migrate_existing_risks_to_register() IS 'Migrates existing risks records to link with risk_registers';

-- ============================================================================
-- SECTION 5: TRIGGERS
-- ============================================================================

-- Auto-generate register_reference
CREATE OR REPLACE FUNCTION trg_risk_registers_generate_reference()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.register_reference IS NULL OR NEW.register_reference = '' THEN
        NEW.register_reference := generate_risk_register_reference();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_risk_registers_before_insert_reference ON risk_registers;
CREATE TRIGGER trg_risk_registers_before_insert_reference
    BEFORE INSERT ON risk_registers
    FOR EACH ROW
    WHEN (NEW.register_reference IS NULL OR NEW.register_reference = '')
    EXECUTE FUNCTION trg_risk_registers_generate_reference();

-- Auto-generate risk_identifier
CREATE OR REPLACE FUNCTION trg_risks_generate_identifier()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.risk_identifier IS NULL OR NEW.risk_identifier = '') AND NEW.risk_register_id IS NOT NULL THEN
        NEW.risk_identifier := generate_risk_identifier(NEW.risk_register_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_risks_before_insert_identifier ON risks;
CREATE TRIGGER trg_risks_before_insert_identifier
    BEFORE INSERT ON risks
    FOR EACH ROW
    WHEN ((NEW.risk_identifier IS NULL OR NEW.risk_identifier = '') AND NEW.risk_register_id IS NOT NULL)
    EXECUTE FUNCTION trg_risks_generate_identifier();

-- Auto-generate risk_number
CREATE OR REPLACE FUNCTION trg_risks_generate_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.risk_number IS NULL AND NEW.risk_register_id IS NOT NULL THEN
        NEW.risk_number := generate_risk_number(NEW.risk_register_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_risks_before_insert_number ON risks;
CREATE TRIGGER trg_risks_before_insert_number
    BEFORE INSERT ON risks
    FOR EACH ROW
    WHEN (NEW.risk_number IS NULL AND NEW.risk_register_id IS NOT NULL)
    EXECUTE FUNCTION trg_risks_generate_number();

-- Auto-create risk register when project is initiated
CREATE OR REPLACE FUNCTION trg_projects_create_risk_register()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
BEGIN
    SELECT created_by INTO v_user_id
    FROM projects
    WHERE id = NEW.id;
    PERFORM create_risk_register_for_project(NEW.id, COALESCE(v_user_id, NEW.created_by));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_projects_after_insert_risk_register ON projects;
CREATE TRIGGER trg_projects_after_insert_risk_register
    AFTER INSERT ON projects
    FOR EACH ROW
    EXECUTE FUNCTION trg_projects_create_risk_register();

-- ============================================================================
-- SECTION 6: MIGRATE EXISTING DATA
-- ============================================================================

-- Run migration to link existing risks to registers
SELECT migrate_existing_risks_to_register();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
    tables_count INTEGER;
    functions_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO tables_count
    FROM database_tables
    WHERE table_name IN (
        'risk_registers',
        'risks',
        'risk_responses',
        'risk_assessments',
        'risk_categories',
        'risk_probability_scales',
        'risk_impact_scales',
        'risk_matrix_thresholds',
        'risk_comments',
        'risk_attachments',
        'risk_reviews',
        'risk_links'
    );

    SELECT COUNT(*) INTO functions_count
    FROM pg_proc
    WHERE proname IN (
        'generate_risk_register_reference',
        'generate_risk_identifier',
        'generate_risk_number',
        'create_risk_register_for_project',
        'calculate_risk_score',
        'get_risk_matrix',
        'get_top_risks',
        'get_risks_by_proximity',
        'get_risk_summary',
        'escalate_risk_to_issue',
        'create_risk_from_issue',
        'migrate_existing_risks_to_register'
    );

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Risk Register Enhancement Complete';
    RAISE NOTICE 'Tables: %', tables_count;
    RAISE NOTICE 'Functions: %', functions_count;
    RAISE NOTICE '========================================';
END $$;
