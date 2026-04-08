-- =============================================
-- v253: Fix Constraint Categories RLS Policy
-- Version: v253
-- Date: 2026-01-26
-- Description: Fixes RLS policy for constraint_categories table to allow all authenticated users to read
-- =============================================

-- Grant permissions (if not already granted)
GRANT SELECT ON constraint_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON mandate_constraints TO authenticated;

-- Drop existing policies
DROP POLICY IF EXISTS "constraint_categories_select_policy" ON constraint_categories;
DROP POLICY IF EXISTS "constraint_categories_insert_policy" ON constraint_categories;
DROP POLICY IF EXISTS "constraint_categories_update_policy" ON constraint_categories;
DROP POLICY IF EXISTS "constraint_categories_delete_policy" ON constraint_categories;

-- Recreate SELECT policy - Allow all authenticated users to read constraint categories
-- This is a lookup table, so all authenticated users should be able to read it
CREATE POLICY "constraint_categories_select_policy" ON constraint_categories
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Only admins can modify constraint categories
CREATE POLICY "constraint_categories_insert_policy" ON constraint_categories
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      JOIN users u ON ur.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
      AND r.role_name IN ('System Admin', 'PMO Admin', 'pmo_admin', 'system_admin')
      AND ur.is_active = TRUE
      AND ur.is_deleted = FALSE
    )
  );

CREATE POLICY "constraint_categories_update_policy" ON constraint_categories
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      JOIN users u ON ur.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
      AND r.role_name IN ('System Admin', 'PMO Admin', 'pmo_admin', 'system_admin')
      AND ur.is_active = TRUE
      AND ur.is_deleted = FALSE
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      JOIN users u ON ur.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
      AND r.role_name IN ('System Admin', 'PMO Admin', 'pmo_admin', 'system_admin')
      AND ur.is_active = TRUE
      AND ur.is_deleted = FALSE
    )
  );

CREATE POLICY "constraint_categories_delete_policy" ON constraint_categories
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      JOIN users u ON ur.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
      AND r.role_name IN ('System Admin', 'PMO Admin', 'pmo_admin', 'system_admin')
      AND ur.is_active = TRUE
      AND ur.is_deleted = FALSE
    )
  );

-- Also fix mandate_constraints RLS policies to ensure they work correctly
DROP POLICY IF EXISTS "mandate_constraints_select_policy" ON mandate_constraints;
DROP POLICY IF EXISTS "mandate_constraints_insert_policy" ON mandate_constraints;
DROP POLICY IF EXISTS "mandate_constraints_update_policy" ON mandate_constraints;
DROP POLICY IF EXISTS "mandate_constraints_delete_policy" ON mandate_constraints;

-- SELECT: Users can view constraints for mandates they have access to
CREATE POLICY "mandate_constraints_select_policy" ON mandate_constraints
  FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM project_mandates pm
      WHERE pm.id = mandate_constraints.mandate_id
      AND pm.is_deleted = false
      AND (
        -- PMO Admins can see all mandates
        EXISTS (
          SELECT 1 FROM user_roles ur
          JOIN roles r ON ur.role_id = r.id
          JOIN users u ON ur.user_id = u.id
          WHERE u.auth_user_id = auth.uid()
          AND r.role_name IN ('pmo_admin', 'System Admin', 'PMO Admin', 'system_admin')
          AND ur.is_active = TRUE
          AND ur.is_deleted = FALSE
        )
        -- Or mandate creator
        OR pm.created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        -- Or if mandate is linked to a project, check project membership
        OR (
          pm.project_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM user_projects up
            JOIN users u ON up.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
            AND up.project_id = pm.project_id
            AND up.is_deleted = FALSE
          )
        )
      )
    )
  );

-- INSERT: Users can add constraints to mandates they can access
CREATE POLICY "mandate_constraints_insert_policy" ON mandate_constraints
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_mandates pm
      WHERE pm.id = mandate_constraints.mandate_id
      AND pm.is_deleted = false
      AND (
        -- PMO Admins can add to any mandate
        EXISTS (
          SELECT 1 FROM user_roles ur
          JOIN roles r ON ur.role_id = r.id
          JOIN users u ON ur.user_id = u.id
          WHERE u.auth_user_id = auth.uid()
          AND r.role_name IN ('pmo_admin', 'System Admin', 'PMO Admin', 'system_admin')
          AND ur.is_active = TRUE
          AND ur.is_deleted = FALSE
        )
        -- Or mandate creator (if draft)
        OR (
          pm.created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
          AND pm.document_status = 'draft'
        )
      )
    )
  );

-- UPDATE: Users can update constraints for mandates they can access
CREATE POLICY "mandate_constraints_update_policy" ON mandate_constraints
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_mandates pm
      WHERE pm.id = mandate_constraints.mandate_id
      AND pm.is_deleted = false
      AND (
        -- PMO Admins can update any mandate
        EXISTS (
          SELECT 1 FROM user_roles ur
          JOIN roles r ON ur.role_id = r.id
          JOIN users u ON ur.user_id = u.id
          WHERE u.auth_user_id = auth.uid()
          AND r.role_name IN ('pmo_admin', 'System Admin', 'PMO Admin', 'system_admin')
          AND ur.is_active = TRUE
          AND ur.is_deleted = FALSE
        )
        -- Or mandate creator (if draft)
        OR (
          pm.created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
          AND pm.document_status = 'draft'
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_mandates pm
      WHERE pm.id = mandate_constraints.mandate_id
      AND pm.is_deleted = false
      AND (
        -- PMO Admins can update any mandate
        EXISTS (
          SELECT 1 FROM user_roles ur
          JOIN roles r ON ur.role_id = r.id
          JOIN users u ON ur.user_id = u.id
          WHERE u.auth_user_id = auth.uid()
          AND r.role_name IN ('pmo_admin', 'System Admin', 'PMO Admin', 'system_admin')
          AND ur.is_active = TRUE
          AND ur.is_deleted = FALSE
        )
        -- Or mandate creator (if draft)
        OR (
          pm.created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
          AND pm.document_status = 'draft'
        )
      )
    )
  );

-- DELETE: Users can delete constraints for mandates they can access
CREATE POLICY "mandate_constraints_delete_policy" ON mandate_constraints
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_mandates pm
      WHERE pm.id = mandate_constraints.mandate_id
      AND pm.is_deleted = false
      AND (
        -- PMO Admins can delete from any mandate
        EXISTS (
          SELECT 1 FROM user_roles ur
          JOIN roles r ON ur.role_id = r.id
          JOIN users u ON ur.user_id = u.id
          WHERE u.auth_user_id = auth.uid()
          AND r.role_name IN ('pmo_admin', 'System Admin', 'PMO Admin', 'system_admin')
          AND ur.is_active = TRUE
          AND ur.is_deleted = FALSE
        )
        -- Or mandate creator (if draft)
        OR (
          pm.created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
          AND pm.document_status = 'draft'
        )
      )
    )
  );

COMMENT ON POLICY "constraint_categories_select_policy" ON constraint_categories IS 'Allows all authenticated users to read active constraint categories (lookup table)';
COMMENT ON POLICY "mandate_constraints_select_policy" ON mandate_constraints IS 'Allows users to view constraints for mandates they have access to';
