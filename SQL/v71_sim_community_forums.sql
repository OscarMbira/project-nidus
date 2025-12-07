-- ============================================================================
-- PM Simulator Community Forums
-- Version: v71
-- Description: Basic forum structure for community discussions
-- ============================================================================

-- Forum Categories
CREATE TABLE IF NOT EXISTS sim.forum_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon_url TEXT,
  sort_order INTEGER DEFAULT 0,
  post_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Forum Topics/Posts
CREATE TABLE IF NOT EXISTS sim.forum_topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES sim.forum_categories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  is_locked BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  last_reply_at TIMESTAMP WITH TIME ZONE,
  last_reply_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Forum Replies
CREATE TABLE IF NOT EXISTS sim.forum_replies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic_id UUID NOT NULL REFERENCES sim.forum_topics(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_solution BOOLEAN DEFAULT false,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_forum_topics_category ON sim.forum_topics(category_id);
CREATE INDEX IF NOT EXISTS idx_forum_topics_user ON sim.forum_topics(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_topics_created ON sim.forum_topics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_replies_topic ON sim.forum_replies(topic_id);
CREATE INDEX IF NOT EXISTS idx_forum_replies_user ON sim.forum_replies(user_id);

-- RLS Policies
ALTER TABLE sim.forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.forum_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.forum_replies ENABLE ROW LEVEL SECURITY;

-- Categories: Everyone can view
CREATE POLICY "Anyone can view forum categories"
  ON sim.forum_categories FOR SELECT
  USING (true);

-- Topics: Everyone can view, authenticated can create
CREATE POLICY "Anyone can view forum topics"
  ON sim.forum_topics FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create topics"
  ON sim.forum_topics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own topics"
  ON sim.forum_topics FOR UPDATE
  USING (auth.uid() = user_id);

-- Replies: Everyone can view, authenticated can create
CREATE POLICY "Anyone can view forum replies"
  ON sim.forum_replies FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create replies"
  ON sim.forum_replies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own replies"
  ON sim.forum_replies FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role full access
CREATE POLICY "Service role full access categories"
  ON sim.forum_categories FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access topics"
  ON sim.forum_topics FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access replies"
  ON sim.forum_replies FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Seed forum categories
INSERT INTO sim.forum_categories (name, description, sort_order) VALUES
  ('General Discussion', 'General questions and discussions about project management', 1),
  ('Scenarios', 'Discuss specific simulation scenarios and share tips', 2),
  ('Methodologies', 'Share experiences with different PM methodologies', 3),
  ('Tips & Tricks', 'Share your best practices and learn from others', 4),
  ('Feature Requests', 'Suggest new features and improvements', 5),
  ('Bug Reports', 'Report issues and bugs you encounter', 6)
ON CONFLICT DO NOTHING;

-- Register tables
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('sim.forum_categories', 'Forum category definitions', false, true),
  ('sim.forum_topics', 'Forum discussion topics/posts', false, true),
  ('sim.forum_replies', 'Forum topic replies/comments', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  updated_at = NOW();

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE 'Community forums tables created successfully';
END $$;

