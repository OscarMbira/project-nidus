-- =============================================================================
-- v858: form_instances (+ child tables) RLS for project members
-- Root cause: v502/v503 enabled RLS on form engine tables but never added
--             authenticated policies → INSERT/SELECT return 403 (bulk upload,
--             FormNew, FormsGallery).
-- Fix: project-scoped access via public.auth_user_can_access_project /
--      sim.auth_user_can_access_practice_project (same helpers as v708/v841).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- public schema
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.form_instances TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.form_instance_values TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.form_instance_rows TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.form_version_history TO authenticated;
GRANT SELECT, INSERT ON public.form_audit_log TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.form_comments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.form_attachments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.form_approvals TO authenticated;
GRANT SELECT ON public.form_templates TO authenticated;
GRANT SELECT ON public.form_template_versions TO authenticated;

ALTER TABLE public.form_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_instance_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_instance_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_version_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_template_versions ENABLE ROW LEVEL SECURITY;

-- Templates: readable by any authenticated user (catalog); writes stay elsewhere / admin.
DROP POLICY IF EXISTS policy_form_templates_select ON public.form_templates;
CREATE POLICY policy_form_templates_select
  ON public.form_templates FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS policy_form_template_versions_select ON public.form_template_versions;
CREATE POLICY policy_form_template_versions_select
  ON public.form_template_versions FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS policy_form_instances_select ON public.form_instances;
CREATE POLICY policy_form_instances_select
  ON public.form_instances FOR SELECT TO authenticated
  USING (public.auth_user_can_access_project(project_id));

DROP POLICY IF EXISTS policy_form_instances_insert ON public.form_instances;
CREATE POLICY policy_form_instances_insert
  ON public.form_instances FOR INSERT TO authenticated
  WITH CHECK (public.auth_user_can_access_project(project_id));

DROP POLICY IF EXISTS policy_form_instances_update ON public.form_instances;
CREATE POLICY policy_form_instances_update
  ON public.form_instances FOR UPDATE TO authenticated
  USING (public.auth_user_can_access_project(project_id))
  WITH CHECK (public.auth_user_can_access_project(project_id));

DROP POLICY IF EXISTS policy_form_instances_delete ON public.form_instances;
CREATE POLICY policy_form_instances_delete
  ON public.form_instances FOR DELETE TO authenticated
  USING (public.auth_user_can_access_project(project_id));

-- Child rows: access via parent instance project
DROP POLICY IF EXISTS policy_form_instance_values_all ON public.form_instance_values;
CREATE POLICY policy_form_instance_values_all
  ON public.form_instance_values FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.form_instances fi
      WHERE fi.id = form_instance_id
        AND public.auth_user_can_access_project(fi.project_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.form_instances fi
      WHERE fi.id = form_instance_id
        AND public.auth_user_can_access_project(fi.project_id)
    )
  );

DROP POLICY IF EXISTS policy_form_instance_rows_all ON public.form_instance_rows;
CREATE POLICY policy_form_instance_rows_all
  ON public.form_instance_rows FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.form_instances fi
      WHERE fi.id = form_instance_id
        AND public.auth_user_can_access_project(fi.project_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.form_instances fi
      WHERE fi.id = form_instance_id
        AND public.auth_user_can_access_project(fi.project_id)
    )
  );

DROP POLICY IF EXISTS policy_form_version_history_all ON public.form_version_history;
CREATE POLICY policy_form_version_history_all
  ON public.form_version_history FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.form_instances fi
      WHERE fi.id = form_instance_id
        AND public.auth_user_can_access_project(fi.project_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.form_instances fi
      WHERE fi.id = form_instance_id
        AND public.auth_user_can_access_project(fi.project_id)
    )
  );

DROP POLICY IF EXISTS policy_form_audit_log_all ON public.form_audit_log;
CREATE POLICY policy_form_audit_log_all
  ON public.form_audit_log FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.form_instances fi
      WHERE fi.id = form_instance_id
        AND public.auth_user_can_access_project(fi.project_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.form_instances fi
      WHERE fi.id = form_instance_id
        AND public.auth_user_can_access_project(fi.project_id)
    )
  );

DROP POLICY IF EXISTS policy_form_comments_all ON public.form_comments;
CREATE POLICY policy_form_comments_all
  ON public.form_comments FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.form_instances fi
      WHERE fi.id = form_instance_id
        AND public.auth_user_can_access_project(fi.project_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.form_instances fi
      WHERE fi.id = form_instance_id
        AND public.auth_user_can_access_project(fi.project_id)
    )
  );

DROP POLICY IF EXISTS policy_form_attachments_all ON public.form_attachments;
CREATE POLICY policy_form_attachments_all
  ON public.form_attachments FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.form_instances fi
      WHERE fi.id = form_instance_id
        AND public.auth_user_can_access_project(fi.project_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.form_instances fi
      WHERE fi.id = form_instance_id
        AND public.auth_user_can_access_project(fi.project_id)
    )
  );

DROP POLICY IF EXISTS policy_form_approvals_all ON public.form_approvals;
CREATE POLICY policy_form_approvals_all
  ON public.form_approvals FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.form_instances fi
      WHERE fi.id = form_instance_id
        AND public.auth_user_can_access_project(fi.project_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.form_instances fi
      WHERE fi.id = form_instance_id
        AND public.auth_user_can_access_project(fi.project_id)
    )
  );

-- ---------------------------------------------------------------------------
-- sim schema (practice projects)
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.form_instances TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.form_instance_values TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.form_instance_rows TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.form_version_history TO authenticated;
GRANT SELECT, INSERT ON sim.form_audit_log TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.form_comments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.form_attachments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.form_approvals TO authenticated;
GRANT SELECT ON sim.form_templates TO authenticated;
GRANT SELECT ON sim.form_template_versions TO authenticated;

ALTER TABLE sim.form_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.form_instance_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.form_instance_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.form_version_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.form_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.form_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.form_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.form_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.form_template_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS policy_sim_form_templates_select ON sim.form_templates;
CREATE POLICY policy_sim_form_templates_select
  ON sim.form_templates FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS policy_sim_form_template_versions_select ON sim.form_template_versions;
CREATE POLICY policy_sim_form_template_versions_select
  ON sim.form_template_versions FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS policy_sim_form_instances_select ON sim.form_instances;
CREATE POLICY policy_sim_form_instances_select
  ON sim.form_instances FOR SELECT TO authenticated
  USING (sim.auth_user_can_access_practice_project(project_id));

DROP POLICY IF EXISTS policy_sim_form_instances_insert ON sim.form_instances;
CREATE POLICY policy_sim_form_instances_insert
  ON sim.form_instances FOR INSERT TO authenticated
  WITH CHECK (sim.auth_user_can_access_practice_project(project_id));

DROP POLICY IF EXISTS policy_sim_form_instances_update ON sim.form_instances;
CREATE POLICY policy_sim_form_instances_update
  ON sim.form_instances FOR UPDATE TO authenticated
  USING (sim.auth_user_can_access_practice_project(project_id))
  WITH CHECK (sim.auth_user_can_access_practice_project(project_id));

DROP POLICY IF EXISTS policy_sim_form_instances_delete ON sim.form_instances;
CREATE POLICY policy_sim_form_instances_delete
  ON sim.form_instances FOR DELETE TO authenticated
  USING (sim.auth_user_can_access_practice_project(project_id));

DROP POLICY IF EXISTS policy_sim_form_instance_values_all ON sim.form_instance_values;
CREATE POLICY policy_sim_form_instance_values_all
  ON sim.form_instance_values FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sim.form_instances fi
      WHERE fi.id = form_instance_id
        AND sim.auth_user_can_access_practice_project(fi.project_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sim.form_instances fi
      WHERE fi.id = form_instance_id
        AND sim.auth_user_can_access_practice_project(fi.project_id)
    )
  );

DROP POLICY IF EXISTS policy_sim_form_instance_rows_all ON sim.form_instance_rows;
CREATE POLICY policy_sim_form_instance_rows_all
  ON sim.form_instance_rows FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sim.form_instances fi
      WHERE fi.id = form_instance_id
        AND sim.auth_user_can_access_practice_project(fi.project_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sim.form_instances fi
      WHERE fi.id = form_instance_id
        AND sim.auth_user_can_access_practice_project(fi.project_id)
    )
  );

DROP POLICY IF EXISTS policy_sim_form_version_history_all ON sim.form_version_history;
CREATE POLICY policy_sim_form_version_history_all
  ON sim.form_version_history FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sim.form_instances fi
      WHERE fi.id = form_instance_id
        AND sim.auth_user_can_access_practice_project(fi.project_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sim.form_instances fi
      WHERE fi.id = form_instance_id
        AND sim.auth_user_can_access_practice_project(fi.project_id)
    )
  );

DROP POLICY IF EXISTS policy_sim_form_audit_log_all ON sim.form_audit_log;
CREATE POLICY policy_sim_form_audit_log_all
  ON sim.form_audit_log FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sim.form_instances fi
      WHERE fi.id = form_instance_id
        AND sim.auth_user_can_access_practice_project(fi.project_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sim.form_instances fi
      WHERE fi.id = form_instance_id
        AND sim.auth_user_can_access_practice_project(fi.project_id)
    )
  );

DROP POLICY IF EXISTS policy_sim_form_comments_all ON sim.form_comments;
CREATE POLICY policy_sim_form_comments_all
  ON sim.form_comments FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sim.form_instances fi
      WHERE fi.id = form_instance_id
        AND sim.auth_user_can_access_practice_project(fi.project_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sim.form_instances fi
      WHERE fi.id = form_instance_id
        AND sim.auth_user_can_access_practice_project(fi.project_id)
    )
  );

DROP POLICY IF EXISTS policy_sim_form_attachments_all ON sim.form_attachments;
CREATE POLICY policy_sim_form_attachments_all
  ON sim.form_attachments FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sim.form_instances fi
      WHERE fi.id = form_instance_id
        AND sim.auth_user_can_access_practice_project(fi.project_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sim.form_instances fi
      WHERE fi.id = form_instance_id
        AND sim.auth_user_can_access_practice_project(fi.project_id)
    )
  );

DROP POLICY IF EXISTS policy_sim_form_approvals_all ON sim.form_approvals;
CREATE POLICY policy_sim_form_approvals_all
  ON sim.form_approvals FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sim.form_instances fi
      WHERE fi.id = form_instance_id
        AND sim.auth_user_can_access_practice_project(fi.project_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sim.form_instances fi
      WHERE fi.id = form_instance_id
        AND sim.auth_user_can_access_practice_project(fi.project_id)
    )
  );

DO $$
BEGIN
  RAISE NOTICE 'v858_form_instances_project_member_rls.sql applied';
END $$;
