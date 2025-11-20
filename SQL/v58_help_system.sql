-- =====================================================================================
-- Phase 9: Polish & Optimization Module
-- Version: v58
-- Feature: Help System Database Schema
-- Description: Tables for help articles, categories, feedback, guided tours
-- Author: Development Team
-- Date: 2025-01-XX
-- =====================================================================================

-- Prerequisites:
-- - v01 through v57 must be run first
-- - v01_extensions_and_functions.sql must be run first (uuid_generate_v4, audit triggers)
-- - v03_user_access_tables.sql must be run first (users table must exist)

-- =====================================================================================
-- TABLE 1: help_articles
-- Description: Help articles and documentation
-- Category: config
-- =====================================================================================

CREATE TABLE IF NOT EXISTS help_articles (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Article Information
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    slug VARCHAR(255) UNIQUE NOT NULL,

    -- Categorization
    category_id UUID,
    tags TEXT[],
    role VARCHAR(50), -- admin, project_manager, team_lead, team_member
    methodology VARCHAR(50), -- structured_pm, scrum, kanban, all

    -- Visibility
    featured BOOLEAN DEFAULT FALSE,
    is_published BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,

    -- Metrics
    view_count INTEGER DEFAULT 0,
    helpful_count INTEGER DEFAULT 0,
    not_helpful_count INTEGER DEFAULT 0,

    -- SEO
    meta_title VARCHAR(255),
    meta_description TEXT,
    keywords TEXT[],

    -- Ordering
    sort_order INTEGER DEFAULT 0,

    -- Standard Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX idx_help_articles_slug ON help_articles(slug) WHERE is_deleted = FALSE;
CREATE INDEX idx_help_articles_category_id ON help_articles(category_id);
CREATE INDEX idx_help_articles_role ON help_articles(role) WHERE is_deleted = FALSE;
CREATE INDEX idx_help_articles_methodology ON help_articles(methodology) WHERE is_deleted = FALSE;
CREATE INDEX idx_help_articles_featured ON help_articles(featured) WHERE is_published = TRUE AND is_deleted = FALSE;
CREATE INDEX idx_help_articles_is_published ON help_articles(is_published) WHERE is_deleted = FALSE;
CREATE INDEX idx_help_articles_tags ON help_articles USING GIN(tags) WHERE is_deleted = FALSE;

-- Comments
COMMENT ON TABLE help_articles IS 'Help articles and documentation content';
COMMENT ON COLUMN help_articles.slug IS 'URL-friendly identifier for the article';
COMMENT ON COLUMN help_articles.role IS 'Target role: admin, project_manager, team_lead, team_member';
COMMENT ON COLUMN help_articles.methodology IS 'Target methodology: structured_pm, scrum, kanban, all';

-- =====================================================================================
-- TABLE 2: help_categories
-- Description: Help article categories with hierarchy
-- Category: config
-- =====================================================================================

CREATE TABLE IF NOT EXISTS help_categories (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Category Information
    category_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    slug VARCHAR(100) UNIQUE NOT NULL,
    icon VARCHAR(50),
    color VARCHAR(7),

    -- Hierarchy
    parent_category_id UUID REFERENCES help_categories(id),

    -- Ordering
    sort_order INTEGER DEFAULT 0,

    -- Visibility
    is_active BOOLEAN DEFAULT TRUE,

    -- Standard Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX idx_help_categories_slug ON help_categories(slug) WHERE is_deleted = FALSE;
CREATE INDEX idx_help_categories_parent_id ON help_categories(parent_category_id);
CREATE INDEX idx_help_categories_sort_order ON help_categories(sort_order) WHERE is_deleted = FALSE;

-- Foreign Key (after table creation)
ALTER TABLE help_articles ADD CONSTRAINT fk_help_articles_category_id 
    FOREIGN KEY (category_id) REFERENCES help_categories(id);

-- Comments
COMMENT ON TABLE help_categories IS 'Help article categories with hierarchical support';

-- =====================================================================================
-- TABLE 3: help_article_views
-- Description: Track help article views
-- Category: analytics
-- =====================================================================================

CREATE TABLE IF NOT EXISTS help_article_views (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    article_id UUID NOT NULL REFERENCES help_articles(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),

    -- View Information
    viewed_at TIMESTAMP DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),

    -- Standard Audit Fields (limited - no updated/deleted)
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_help_article_views_article_id ON help_article_views(article_id);
CREATE INDEX idx_help_article_views_user_id ON help_article_views(user_id);
CREATE INDEX idx_help_article_views_viewed_at ON help_article_views(viewed_at DESC);

-- Comments
COMMENT ON TABLE help_article_views IS 'Track help article views for analytics';

-- =====================================================================================
-- TABLE 4: help_feedback
-- Description: Help article feedback from users
-- Category: feedback
-- =====================================================================================

CREATE TABLE IF NOT EXISTS help_feedback (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    article_id UUID NOT NULL REFERENCES help_articles(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),

    -- Feedback Information
    feedback_type VARCHAR(50) NOT NULL, -- helpful, not_helpful, comment
    feedback_text TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),

    -- Standard Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX idx_help_feedback_article_id ON help_feedback(article_id);
CREATE INDEX idx_help_feedback_user_id ON help_feedback(user_id);
CREATE INDEX idx_help_feedback_type ON help_feedback(feedback_type) WHERE is_deleted = FALSE;
CREATE INDEX idx_help_feedback_created_at ON help_feedback(created_at DESC) WHERE is_deleted = FALSE;

-- Comments
COMMENT ON TABLE help_feedback IS 'User feedback on help articles';

-- =====================================================================================
-- TABLE 5: guided_tours
-- Description: Guided tour definitions
-- Category: config
-- =====================================================================================

CREATE TABLE IF NOT EXISTS guided_tours (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Tour Information
    tour_name VARCHAR(255) NOT NULL,
    tour_key VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,

    -- Tour Configuration
    steps JSONB NOT NULL, -- Array of tour steps with target selectors, content, positioning
    target_role VARCHAR(50), -- admin, project_manager, team_lead, team_member, all
    target_page VARCHAR(255), -- Route path where tour should be available
    trigger_type VARCHAR(50) DEFAULT 'manual', -- manual, automatic, on_first_visit

    -- Visibility
    is_active BOOLEAN DEFAULT TRUE,

    -- Standard Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX idx_guided_tours_tour_key ON guided_tours(tour_key) WHERE is_deleted = FALSE;
CREATE INDEX idx_guided_tours_target_role ON guided_tours(target_role) WHERE is_deleted = FALSE;
CREATE INDEX idx_guided_tours_target_page ON guided_tours(target_page) WHERE is_deleted = FALSE;
CREATE INDEX idx_guided_tours_is_active ON guided_tours(is_active) WHERE is_deleted = FALSE;

-- Comments
COMMENT ON TABLE guided_tours IS 'Guided tour definitions for user onboarding and feature discovery';
COMMENT ON COLUMN guided_tours.steps IS 'JSONB array of tour steps: [{selector, title, content, position, ...}]';
COMMENT ON COLUMN guided_tours.trigger_type IS 'manual: user-triggered, automatic: shows automatically, on_first_visit: shows once on first visit';

-- =====================================================================================
-- TABLE 6: user_tour_completions
-- Description: Track user tour completions
-- Category: analytics
-- =====================================================================================

CREATE TABLE IF NOT EXISTS user_tour_completions (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tour_id UUID NOT NULL REFERENCES guided_tours(id) ON DELETE CASCADE,

    -- Completion Information
    completed_at TIMESTAMP DEFAULT NOW(),
    completion_time_seconds INTEGER, -- Time taken to complete tour
    skipped BOOLEAN DEFAULT FALSE,
    steps_completed INTEGER DEFAULT 0,

    -- Standard Audit Fields (limited)
    created_at TIMESTAMP DEFAULT NOW(),

    -- Unique constraint (one completion per user per tour)
    CONSTRAINT uq_user_tour_completions_user_tour UNIQUE(user_id, tour_id)
);

-- Indexes
CREATE INDEX idx_user_tour_completions_user_id ON user_tour_completions(user_id);
CREATE INDEX idx_user_tour_completions_tour_id ON user_tour_completions(tour_id);
CREATE INDEX idx_user_tour_completions_completed_at ON user_tour_completions(completed_at DESC);

-- Comments
COMMENT ON TABLE user_tour_completions IS 'Track user tour completions for analytics and avoiding duplicate displays';

-- =====================================================================================
-- TABLE 7: user_feedback
-- Description: General user feedback (not specific to help articles)
-- Category: feedback
-- =====================================================================================

CREATE TABLE IF NOT EXISTS user_feedback (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    user_id UUID REFERENCES users(id),

    -- Feedback Information
    feedback_type VARCHAR(50) NOT NULL, -- bug_report, feature_request, general_feedback, rating
    feedback_text TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    page_url TEXT,
    user_agent TEXT,
    browser_info JSONB,

    -- Status
    status VARCHAR(50) DEFAULT 'new', -- new, reviewing, acknowledged, resolved, closed
    assigned_to UUID REFERENCES users(id),
    resolution_notes TEXT,

    -- Standard Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX idx_user_feedback_user_id ON user_feedback(user_id);
CREATE INDEX idx_user_feedback_type ON user_feedback(feedback_type) WHERE is_deleted = FALSE;
CREATE INDEX idx_user_feedback_status ON user_feedback(status) WHERE is_deleted = FALSE;
CREATE INDEX idx_user_feedback_created_at ON user_feedback(created_at DESC) WHERE is_deleted = FALSE;

-- Comments
COMMENT ON TABLE user_feedback IS 'General user feedback, bug reports, and feature requests';

-- =====================================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================================

-- Enable RLS
ALTER TABLE help_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_article_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE guided_tours ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tour_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

-- help_articles: All authenticated users can view published articles, only admins can create/edit
CREATE POLICY help_articles_select ON help_articles
    FOR SELECT
    USING (
        (is_published = TRUE AND is_deleted = FALSE) OR
        (auth.uid() = created_by) OR
        EXISTS (SELECT 1 FROM user_roles ur 
                JOIN roles r ON ur.role_id = r.id 
                WHERE ur.user_id = auth.uid() AND r.role_name = 'system_admin' AND ur.is_active = TRUE)
    );

CREATE POLICY help_articles_insert ON help_articles
    FOR INSERT
    WITH CHECK (
        EXISTS (SELECT 1 FROM user_roles ur 
                JOIN roles r ON ur.role_id = r.id 
                WHERE ur.user_id = auth.uid() AND r.role_name = 'system_admin' AND ur.is_active = TRUE)
    );

CREATE POLICY help_articles_update ON help_articles
    FOR UPDATE
    USING (
        (auth.uid() = created_by) OR
        EXISTS (SELECT 1 FROM user_roles ur 
                JOIN roles r ON ur.role_id = r.id 
                WHERE ur.user_id = auth.uid() AND r.role_name = 'system_admin' AND ur.is_active = TRUE)
    );

CREATE POLICY help_articles_delete ON help_articles
    FOR DELETE
    USING (
        EXISTS (SELECT 1 FROM user_roles ur 
                JOIN roles r ON ur.role_id = r.id 
                WHERE ur.user_id = auth.uid() AND r.role_name = 'system_admin' AND ur.is_active = TRUE)
    );

-- help_categories: All authenticated users can view, only admins can create/edit
CREATE POLICY help_categories_select ON help_categories
    FOR SELECT
    USING (is_deleted = FALSE);

CREATE POLICY help_categories_insert ON help_categories
    FOR INSERT
    WITH CHECK (
        EXISTS (SELECT 1 FROM user_roles ur 
                JOIN roles r ON ur.role_id = r.id 
                WHERE ur.user_id = auth.uid() AND r.role_name = 'system_admin' AND ur.is_active = TRUE)
    );

CREATE POLICY help_categories_update ON help_categories
    FOR UPDATE
    USING (
        EXISTS (SELECT 1 FROM user_roles ur 
                JOIN roles r ON ur.role_id = r.id 
                WHERE ur.user_id = auth.uid() AND r.role_name = 'system_admin' AND ur.is_active = TRUE)
    );

CREATE POLICY help_categories_delete ON help_categories
    FOR DELETE
    USING (
        EXISTS (SELECT 1 FROM user_roles ur 
                JOIN roles r ON ur.role_id = r.id 
                WHERE ur.user_id = auth.uid() AND r.role_name = 'system_admin' AND ur.is_active = TRUE)
    );

-- help_article_views: All authenticated users can insert their own views
CREATE POLICY help_article_views_insert ON help_article_views
    FOR INSERT
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY help_article_views_select ON help_article_views
    FOR SELECT
    USING (
        (auth.uid() = user_id) OR
        EXISTS (SELECT 1 FROM user_roles ur 
                JOIN roles r ON ur.role_id = r.id 
                WHERE ur.user_id = auth.uid() AND r.role_name = 'system_admin' AND ur.is_active = TRUE)
    );

-- help_feedback: Users can create their own feedback, admins can view all
CREATE POLICY help_feedback_select ON help_feedback
    FOR SELECT
    USING (
        (auth.uid() = user_id) OR
        EXISTS (SELECT 1 FROM user_roles ur 
                JOIN roles r ON ur.role_id = r.id 
                WHERE ur.user_id = auth.uid() AND r.role_name = 'system_admin' AND ur.is_active = TRUE)
    );

CREATE POLICY help_feedback_insert ON help_feedback
    FOR INSERT
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY help_feedback_update ON help_feedback
    FOR UPDATE
    USING (
        (auth.uid() = user_id) OR
        EXISTS (SELECT 1 FROM user_roles ur 
                JOIN roles r ON ur.role_id = r.id 
                WHERE ur.user_id = auth.uid() AND r.role_name = 'system_admin' AND ur.is_active = TRUE)
    );

-- guided_tours: All authenticated users can view active tours, only admins can create/edit
CREATE POLICY guided_tours_select ON guided_tours
    FOR SELECT
    USING (is_active = TRUE AND is_deleted = FALSE);

CREATE POLICY guided_tours_insert ON guided_tours
    FOR INSERT
    WITH CHECK (
        EXISTS (SELECT 1 FROM user_roles ur 
                JOIN roles r ON ur.role_id = r.id 
                WHERE ur.user_id = auth.uid() AND r.role_name = 'system_admin' AND ur.is_active = TRUE)
    );

CREATE POLICY guided_tours_update ON guided_tours
    FOR UPDATE
    USING (
        EXISTS (SELECT 1 FROM user_roles ur 
                JOIN roles r ON ur.role_id = r.id 
                WHERE ur.user_id = auth.uid() AND r.role_name = 'system_admin' AND ur.is_active = TRUE)
    );

CREATE POLICY guided_tours_delete ON guided_tours
    FOR DELETE
    USING (
        EXISTS (SELECT 1 FROM user_roles ur 
                JOIN roles r ON ur.role_id = r.id 
                WHERE ur.user_id = auth.uid() AND r.role_name = 'system_admin' AND ur.is_active = TRUE)
    );

-- user_tour_completions: Users can view and insert their own completions, admins can view all
CREATE POLICY user_tour_completions_select ON user_tour_completions
    FOR SELECT
    USING (
        (auth.uid() = user_id) OR
        EXISTS (SELECT 1 FROM user_roles ur 
                JOIN roles r ON ur.role_id = r.id 
                WHERE ur.user_id = auth.uid() AND r.role_name = 'system_admin' AND ur.is_active = TRUE)
    );

CREATE POLICY user_tour_completions_insert ON user_tour_completions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- user_feedback: Users can create and view their own feedback, admins can view all
CREATE POLICY user_feedback_select ON user_feedback
    FOR SELECT
    USING (
        (auth.uid() = user_id) OR
        EXISTS (SELECT 1 FROM user_roles ur 
                JOIN roles r ON ur.role_id = r.id 
                WHERE ur.user_id = auth.uid() AND r.role_name = 'system_admin' AND ur.is_active = TRUE)
    );

CREATE POLICY user_feedback_insert ON user_feedback
    FOR INSERT
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY user_feedback_update ON user_feedback
    FOR UPDATE
    USING (
        (auth.uid() = user_id AND status = 'new') OR
        EXISTS (SELECT 1 FROM user_roles ur 
                JOIN roles r ON ur.role_id = r.id 
                WHERE ur.user_id = auth.uid() AND r.role_name = 'system_admin' AND ur.is_active = TRUE)
    );

-- =====================================================================================
-- REGISTER TABLES
-- =====================================================================================

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES 
    ('help_articles', 'Help articles and documentation content', false, true, 'config'),
    ('help_categories', 'Help article categories with hierarchical support', false, true, 'config'),
    ('help_article_views', 'Track help article views for analytics', false, true, 'analytics'),
    ('help_feedback', 'User feedback on help articles', false, true, 'feedback'),
    ('guided_tours', 'Guided tour definitions for user onboarding', false, true, 'config'),
    ('user_tour_completions', 'Track user tour completions for analytics', false, true, 'analytics'),
    ('user_feedback', 'General user feedback, bug reports, and feature requests', false, true, 'feedback')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- =====================================================================================
-- SEED DATA: Initial Help Categories
-- =====================================================================================

-- Getting Started
INSERT INTO help_categories (category_name, description, slug, icon, color, sort_order)
VALUES ('Getting Started', 'Getting started guides and tutorials', 'getting-started', 'book-open', '#3B82F6', 1)
ON CONFLICT (category_name) DO NOTHING;

-- Projects
INSERT INTO help_categories (category_name, description, slug, icon, color, sort_order)
VALUES ('Projects', 'Project management guides', 'projects', 'folder', '#10B981', 2)
ON CONFLICT (category_name) DO NOTHING;

-- Tasks
INSERT INTO help_categories (category_name, description, slug, icon, color, sort_order)
VALUES ('Tasks', 'Task management guides', 'tasks', 'check-square', '#F59E0B', 3)
ON CONFLICT (category_name) DO NOTHING;

-- Methodologies
INSERT INTO help_categories (category_name, description, slug, icon, color, sort_order)
VALUES ('Methodologies', 'Methodology-specific guides', 'methodologies', 'layers', '#8B5CF6', 4)
ON CONFLICT (category_name) DO NOTHING;

-- Reporting
INSERT INTO help_categories (category_name, description, slug, icon, color, sort_order)
VALUES ('Reporting', 'Reporting and analytics guides', 'reporting', 'bar-chart', '#EC4899', 5)
ON CONFLICT (category_name) DO NOTHING;

-- Integrations
INSERT INTO help_categories (category_name, description, slug, icon, color, sort_order)
VALUES ('Integrations', 'Integration setup guides', 'integrations', 'plug', '#06B6D4', 6)
ON CONFLICT (category_name) DO NOTHING;

-- API
INSERT INTO help_categories (category_name, description, slug, icon, color, sort_order)
VALUES ('API', 'API usage guides', 'api', 'code', '#6366F1', 7)
ON CONFLICT (category_name) DO NOTHING;

-- Administration
INSERT INTO help_categories (category_name, description, slug, icon, color, sort_order)
VALUES ('Administration', 'Administration and configuration guides', 'administration', 'settings', '#64748B', 8)
ON CONFLICT (category_name) DO NOTHING;

-- Troubleshooting
INSERT INTO help_categories (category_name, description, slug, icon, color, sort_order)
VALUES ('Troubleshooting', 'Common issues and solutions', 'troubleshooting', 'help-circle', '#F97316', 9)
ON CONFLICT (category_name) DO NOTHING;

-- =====================================================================================
-- COMPLETION NOTICE
-- =====================================================================================

DO $$
BEGIN
    RAISE NOTICE 'v58_help_system.sql completed successfully';
    RAISE NOTICE 'Help system tables created: help_articles, help_categories, help_article_views, help_feedback, guided_tours, user_tour_completions, user_feedback';
    RAISE NOTICE 'RLS policies enabled for all help system tables';
    RAISE NOTICE 'Initial help categories seeded';
END $$;

