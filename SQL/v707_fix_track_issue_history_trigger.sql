-- =============================================================================
-- v707: Fix track_issue_history trigger – NULL changed_by_user_id
-- Root cause: COALESCE(NEW.updated_by, NEW.created_by) returns NULL when
-- trigger_set_created_fields() runs first and sets created_by = auth.uid() = NULL
-- (service-role context has no JWT). The NOT NULL constraint on
-- issue_history.changed_by_user_id then fails.
-- Fix: extend the COALESCE fallback chain to include raised_by_id,
-- reported_by_user_id, and owner_id – all of which are set by callers.
-- =============================================================================

CREATE OR REPLACE FUNCTION track_issue_history()
RETURNS TRIGGER AS $$
DECLARE
    v_change_type      VARCHAR(50);
    v_description      TEXT;
    v_changed_by       UUID;
BEGIN
    -- Determine change type
    IF TG_OP = 'INSERT' THEN
        v_change_type := 'created';
        v_description := 'Issue created';
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            v_change_type := 'status_changed';
            v_description := 'Status changed from ' || COALESCE(OLD.status, 'N/A') || ' to ' || COALESCE(NEW.status, 'N/A');
        ELSIF OLD.assigned_to_user_id IS DISTINCT FROM NEW.assigned_to_user_id THEN
            v_change_type := 'assigned';
            v_description := 'Issue assigned';
        ELSIF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
            v_change_type := 'resolved';
            v_description := 'Issue resolved';
        ELSIF NEW.status = 'closed' AND OLD.status != 'closed' THEN
            v_change_type := 'closed';
            v_description := 'Issue closed';
        ELSIF NEW.status = 'reopened' AND OLD.status != 'reopened' THEN
            v_change_type := 'reopened';
            v_description := 'Issue reopened';
        ELSE
            v_change_type := 'updated';
            v_description := 'Issue updated';
        END IF;
    END IF;

    -- Resolve who made the change.
    -- Falls back through all available user references so seed scripts and
    -- service-role inserts (where auth.uid() = NULL) never produce a NULL here.
    v_changed_by := COALESCE(
        NEW.updated_by,
        NEW.created_by,
        NEW.raised_by_id,
        NEW.reported_by_user_id,
        NEW.owner_id,
        NEW.assigned_to_user_id,
        NEW.author_id
    );

    -- Skip history record if no user reference is available at all
    IF v_changed_by IS NULL THEN
        RETURN NEW;
    END IF;

    INSERT INTO issue_history (
        issue_id,
        changed_by_user_id,
        change_type,
        field_name,
        old_value,
        new_value,
        change_description,
        changed_at,
        created_by
    ) VALUES (
        NEW.id,
        v_changed_by,
        v_change_type,
        NULL,
        NULL,
        NULL,
        v_description,
        NOW(),
        v_changed_by
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION track_issue_history() IS
  'v707 fix: extends changed_by_user_id fallback chain to include raised_by_id, '
  'reported_by_user_id, owner_id and author_id so service-role seed inserts '
  'never produce a NULL constraint violation.';
