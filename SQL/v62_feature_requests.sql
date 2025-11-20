-- ================================================
-- File: v62_feature_requests.sql
-- Description: Feature requests system for Phase 10
-- Version: 1.0
-- Date: 2025-01-XX
-- Author: Development Team
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Purpose:
-- Creates feature requests system for Phase 10 Launch & Support module
-- Allows users to request new features and vote on ideas

-- ================================================
-- TABLE: feature_requests
-- Description: Feature request submissions
-- Category: support
-- ================================================

CREATE TABLE IF NOT EXISTS feature_requests (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Feature Request Information
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    
    -- Classification
    category VARCHAR(50) DEFAULT 'feature',  -- 'feature', 'enhancement', 'integration', 'ui', 'performance', 'other'
    priority VARCHAR(20) DEFAULT 'medium',  -- 'low', 'medium', 'high', 'critical'
    status VARCHAR(20) NOT NULL DEFAULT 'under_review',  -- 'under_review', 'approved', 'in_progress', 'completed', 'declined'
    
    -- User Information
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    
    -- Voting
    vote_count INTEGER DEFAULT 0,
    upvote_count INTEGER DEFAULT 0,
    downvote_count INTEGER DEFAULT 0,
    
    -- Implementation
    implementation_notes TEXT,
    estimated_effort VARCHAR(50),  -- 'small', 'medium', 'large', 'xlarge'
    estimated_completion_date DATE,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Related Items
    related_feature_id UUID REFERENCES feature_requests(id) ON DELETE SET NULL,
    
    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

-- ================================================
-- TABLE: feature_request_votes
-- Description: User votes on feature requests
-- Category: support
-- ================================================

CREATE TABLE IF NOT EXISTS feature_request_votes (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    feature_request_id UUID NOT NULL REFERENCES feature_requests(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Vote Information
    vote_type VARCHAR(10) NOT NULL,  -- 'upvote', 'downvote'
    
    -- Unique constraint: one vote per user per feature request
    UNIQUE(feature_request_id, user_id),
    
    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_feature_requests_user_id ON feature_requests(user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_feature_requests_status ON feature_requests(status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_feature_requests_category ON feature_requests(category) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_feature_requests_vote_count ON feature_requests(vote_count DESC) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_feature_requests_created_at ON feature_requests(created_at DESC) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_feature_requests_status_vote ON feature_requests(status, vote_count DESC) WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_feature_request_votes_feature_request_id ON feature_request_votes(feature_request_id);
CREATE INDEX IF NOT EXISTS idx_feature_request_votes_user_id ON feature_request_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_request_votes_vote_type ON feature_request_votes(vote_type);

-- Triggers
DROP TRIGGER IF EXISTS trg_feature_requests_before_insert ON feature_requests;
CREATE TRIGGER trg_feature_requests_before_insert
    BEFORE INSERT ON feature_requests
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_feature_requests_before_update ON feature_requests;
CREATE TRIGGER trg_feature_requests_before_update
    BEFORE UPDATE ON feature_requests
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

DROP TRIGGER IF EXISTS trg_feature_request_votes_before_insert ON feature_request_votes;
CREATE TRIGGER trg_feature_request_votes_before_insert
    BEFORE INSERT ON feature_request_votes
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_feature_request_votes_before_update ON feature_request_votes;
CREATE TRIGGER trg_feature_request_votes_before_update
    BEFORE UPDATE ON feature_request_votes
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Function to update vote count
CREATE OR REPLACE FUNCTION update_feature_request_vote_count(request_id UUID)
RETURNS void AS $$
DECLARE
    v_upvotes INTEGER;
    v_downvotes INTEGER;
    v_total INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_upvotes
    FROM feature_request_votes
    WHERE feature_request_id = request_id AND vote_type = 'upvote';
    
    SELECT COUNT(*) INTO v_downvotes
    FROM feature_request_votes
    WHERE feature_request_id = request_id AND vote_type = 'downvote';
    
    v_total := v_upvotes - v_downvotes;
    
    UPDATE feature_requests
    SET 
        vote_count = v_total,
        upvote_count = v_upvotes,
        downvote_count = v_downvotes,
        updated_at = NOW()
    WHERE id = request_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update vote count when votes change
CREATE OR REPLACE FUNCTION trigger_update_feature_request_vote_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        PERFORM update_feature_request_vote_count(NEW.feature_request_id);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM update_feature_request_vote_count(OLD.feature_request_id);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_feature_request_votes_after_change ON feature_request_votes;
CREATE TRIGGER trg_feature_request_votes_after_change
    AFTER INSERT OR UPDATE OR DELETE ON feature_request_votes
    FOR EACH ROW EXECUTE FUNCTION trigger_update_feature_request_vote_count();

-- RLS Policies
ALTER TABLE feature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_request_votes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all feature requests
CREATE POLICY "Users can view feature requests"
    ON feature_requests FOR SELECT
    USING (is_deleted = FALSE);

-- Policy: Authenticated users can create feature requests
CREATE POLICY "Users can create feature requests"
    ON feature_requests FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL AND
        user_id = auth.uid()
    );

-- Policy: Users can update their own feature requests
CREATE POLICY "Users can update their feature requests"
    ON feature_requests FOR UPDATE
    USING (
        is_deleted = FALSE AND
        (
            user_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                WHERE ur.user_id = auth.uid()
                AND ur.is_active = TRUE
                AND ur.is_deleted = FALSE
                AND r.role_name = 'system_admin'
            )
        )
    );

-- Policy: Only admins can delete feature requests
CREATE POLICY "Only admins can delete feature requests"
    ON feature_requests FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND ur.is_active = TRUE
            AND ur.is_deleted = FALSE
            AND r.role_name = 'system_admin'
        )
    );

-- Policy: Users can view votes
CREATE POLICY "Users can view votes"
    ON feature_request_votes FOR SELECT
    USING (TRUE);

-- Policy: Authenticated users can vote
CREATE POLICY "Users can vote"
    ON feature_request_votes FOR ALL
    USING (
        auth.uid() IS NOT NULL AND
        (
            user_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                WHERE ur.user_id = auth.uid()
                AND ur.is_active = TRUE
                AND ur.is_deleted = FALSE
                AND r.role_name = 'system_admin'
            )
        )
    )
    WITH CHECK (
        auth.uid() IS NOT NULL AND
        user_id = auth.uid()
    );

-- Comments
COMMENT ON TABLE feature_requests IS 'Feature request submissions for Phase 10';
COMMENT ON TABLE feature_request_votes IS 'User votes on feature requests';
COMMENT ON COLUMN feature_requests.status IS 'Status: under_review, approved, in_progress, completed, declined';
COMMENT ON COLUMN feature_requests.category IS 'Category: feature, enhancement, integration, ui, performance, other';
COMMENT ON COLUMN feature_request_votes.vote_type IS 'Vote type: upvote, downvote';

-- Register tables
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES 
    ('feature_requests', 'Feature request submissions for Phase 10', false, true, 'support'),
    ('feature_request_votes', 'User votes on feature requests', false, true, 'support')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

