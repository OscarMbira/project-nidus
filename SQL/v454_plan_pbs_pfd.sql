-- =============================================================================
-- v454_plan_pbs_pfd.sql
-- Product-Based Planning — PBS Nodes + Product Flow Diagram Edges
-- Platform: public schema
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. plan_pbs_nodes — Product Breakdown Structure tree
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.plan_pbs_nodes (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id              UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  parent_id               UUID REFERENCES public.plan_pbs_nodes(id) ON DELETE CASCADE,
  node_code               TEXT,                         -- auto-generated e.g. P1.2.3
  name                    TEXT NOT NULL,
  description             TEXT,
  product_type            TEXT NOT NULL DEFAULT 'product'
                            CHECK (product_type IN ('product','sub-product','component')),
  quality_criteria        TEXT,
  acceptance_criteria     TEXT,
  status                  TEXT NOT NULL DEFAULT 'not_started'
                            CHECK (status IN (
                              'not_started','in_progress','under_review','approved','rejected'
                            )),
  owner_id                UUID REFERENCES public.users(id) ON DELETE SET NULL,
  approval_required       BOOLEAN NOT NULL DEFAULT FALSE,
  approved_by             UUID REFERENCES public.users(id) ON DELETE SET NULL,
  approved_at             TIMESTAMPTZ,
  linked_work_package_id  UUID,  -- FK to work_packages if that table exists
  linked_milestone_id     UUID,
  sort_order              INTEGER DEFAULT 0,
  created_by              UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. plan_pfd_edges — Product Flow Diagram connections between PBS nodes
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.plan_pfd_edges (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  from_node_id      UUID NOT NULL REFERENCES public.plan_pbs_nodes(id) ON DELETE CASCADE,
  to_node_id        UUID NOT NULL REFERENCES public.plan_pbs_nodes(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL DEFAULT 'produces'
                      CHECK (relationship_type IN ('produces','requires','approves','feeds_into')),
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_pfd_edge UNIQUE (from_node_id, to_node_id, relationship_type)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Auto-generate node_code trigger (e.g. P1, P1.1, P1.1.2)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_fn_pbs_node_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_sibling_count INTEGER;
  v_parent_code   TEXT;
BEGIN
  IF NEW.node_code IS NOT NULL AND NEW.node_code != '' THEN
    RETURN NEW; -- respect manually supplied code
  END IF;

  -- Count existing siblings (same parent)
  SELECT COUNT(*) INTO v_sibling_count
  FROM public.plan_pbs_nodes
  WHERE project_id = NEW.project_id
    AND (parent_id = NEW.parent_id OR (parent_id IS NULL AND NEW.parent_id IS NULL))
    AND id != NEW.id;

  IF NEW.parent_id IS NULL THEN
    -- Root node: P1, P2, P3…
    NEW.node_code := 'P' || (v_sibling_count + 1)::TEXT;
  ELSE
    -- Child node: inherit parent code + .N
    SELECT node_code INTO v_parent_code
    FROM public.plan_pbs_nodes
    WHERE id = NEW.parent_id;

    NEW.node_code := v_parent_code || '.' || (v_sibling_count + 1)::TEXT;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pbs_node_code ON public.plan_pbs_nodes;
CREATE TRIGGER trg_pbs_node_code
  BEFORE INSERT ON public.plan_pbs_nodes
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_pbs_node_code();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. updated_at trigger
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_set_pbs_nodes_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pbs_nodes_updated_at ON public.plan_pbs_nodes;
CREATE TRIGGER trg_pbs_nodes_updated_at
  BEFORE UPDATE ON public.plan_pbs_nodes
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_pbs_nodes_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Indexes
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_pbs_nodes_project    ON public.plan_pbs_nodes(project_id);
CREATE INDEX IF NOT EXISTS idx_pbs_nodes_parent     ON public.plan_pbs_nodes(parent_id);
CREATE INDEX IF NOT EXISTS idx_pbs_nodes_status     ON public.plan_pbs_nodes(status);
CREATE INDEX IF NOT EXISTS idx_pfd_edges_project    ON public.plan_pfd_edges(project_id);
CREATE INDEX IF NOT EXISTS idx_pfd_edges_from_node  ON public.plan_pfd_edges(from_node_id);
CREATE INDEX IF NOT EXISTS idx_pfd_edges_to_node    ON public.plan_pfd_edges(to_node_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Row Level Security
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.plan_pbs_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_pfd_edges ENABLE ROW LEVEL SECURITY;

-- PBS Nodes: all project members read; PM/Team Manager/Admin edit
DROP POLICY IF EXISTS pbs_nodes_select ON public.plan_pbs_nodes;
CREATE POLICY pbs_nodes_select ON public.plan_pbs_nodes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_projects up
      WHERE up.project_id = plan_pbs_nodes.project_id
        AND up.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS pbs_nodes_insert ON public.plan_pbs_nodes;
CREATE POLICY pbs_nodes_insert ON public.plan_pbs_nodes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_projects up
      JOIN public.project_roles pr ON pr.project_id = up.project_id
      WHERE up.project_id = plan_pbs_nodes.project_id
        AND up.user_id = auth.uid()
        AND pr.role_name IN ('Project Manager','Team Manager','Team Lead','PMO Admin','System Admin')
    )
  );

DROP POLICY IF EXISTS pbs_nodes_update ON public.plan_pbs_nodes;
CREATE POLICY pbs_nodes_update ON public.plan_pbs_nodes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_projects up
      JOIN public.project_roles pr ON pr.project_id = up.project_id
      WHERE up.project_id = plan_pbs_nodes.project_id
        AND up.user_id = auth.uid()
        AND pr.role_name IN ('Project Manager','Team Manager','Team Lead','PMO Admin','System Admin')
    )
  );

DROP POLICY IF EXISTS pbs_nodes_delete ON public.plan_pbs_nodes;
CREATE POLICY pbs_nodes_delete ON public.plan_pbs_nodes
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.user_projects up
      JOIN public.project_roles pr ON pr.project_id = up.project_id
      WHERE up.project_id = plan_pbs_nodes.project_id
        AND up.user_id = auth.uid()
        AND pr.role_name IN ('Project Manager','PMO Admin','System Admin')
    )
  );

-- PFD Edges: same pattern
DROP POLICY IF EXISTS pfd_edges_select ON public.plan_pfd_edges;
CREATE POLICY pfd_edges_select ON public.plan_pfd_edges
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_projects up
      WHERE up.project_id = plan_pfd_edges.project_id
        AND up.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS pfd_edges_insert ON public.plan_pfd_edges;
CREATE POLICY pfd_edges_insert ON public.plan_pfd_edges
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_projects up
      JOIN public.project_roles pr ON pr.project_id = up.project_id
      WHERE up.project_id = plan_pfd_edges.project_id
        AND up.user_id = auth.uid()
        AND pr.role_name IN ('Project Manager','PMO Admin','System Admin')
    )
  );

DROP POLICY IF EXISTS pfd_edges_delete ON public.plan_pfd_edges;
CREATE POLICY pfd_edges_delete ON public.plan_pfd_edges
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.user_projects up
      JOIN public.project_roles pr ON pr.project_id = up.project_id
      WHERE up.project_id = plan_pfd_edges.project_id
        AND up.user_id = auth.uid()
        AND pr.role_name IN ('Project Manager','PMO Admin','System Admin')
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. DB Registry
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('plan_pbs_nodes',
   'Product Breakdown Structure nodes — hierarchical deliverable/product tree per project',
   FALSE, TRUE),
  ('plan_pfd_edges',
   'Product Flow Diagram edges — directional relationships between PBS nodes',
   FALSE, TRUE)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table   = EXCLUDED.is_system_table,
  updated_at        = NOW();
