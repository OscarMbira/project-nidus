-- ============================================================================
-- v1319: Register documents — sign-off functions (Platform public + Simulator sim)
-- ============================================================================
-- PRD/plan: v1318_register_document_export_and_signoff. Requires v1318.
--
-- Every sign-off change goes through these SECURITY DEFINER functions (the signatories table is
-- read-only to clients, and the v1318 trigger rejects any other change to a locked record):
--   *_signoff_start(record, slots)        → round N, record locked, status In Review
--   *_signoff_assign(record, slot, user)  → change who fills a pending slot
--   *_signoff_sign(record, slot, file…)   → caller's turn only; all mandatory signed → Approved
--   *_signoff_decline(record, slot, why)  → caller's turn only; record stays locked
--   *_signoff_lock_optional(record, why)  → close pending optional slots (v898 behaviour)
--   *_signoff_restart(record, why)        → close the round (history kept), unlock, Draft
-- Status changes apply only when the register's workflow has that key (in_review / approved / draft).
-- Notifications are sent by the client into public.notifications, as v868 does.
-- Idempotent (CREATE OR REPLACE).
-- ============================================================================

-- ═════════════════════════════════════════════════════════════════════════════
-- PUBLIC
-- ═════════════════════════════════════════════════════════════════════════════

-- Internal: the record's register document switch and status workflow.
CREATE OR REPLACE FUNCTION public.local_register_record_document_info(p_record_id UUID)
RETURNS TABLE (is_document BOOLEAN, status_workflow JSONB)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT lr.is_document, lr.status_workflow
  FROM public.local_register_records r
  JOIN public.local_registers lr ON lr.id = r.register_id
  WHERE r.id = p_record_id;
$$;
REVOKE ALL ON FUNCTION public.local_register_record_document_info(UUID) FROM PUBLIC, anon, authenticated;

-- Internal: change a locked record (state and, when the register has that status key, status).
CREATE OR REPLACE FUNCTION public.local_register_signoff_set_state(p_record_id UUID, p_state TEXT, p_status_key TEXT, p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_workflow JSONB;
BEGIN
  SELECT i.status_workflow INTO v_workflow FROM public.local_register_record_document_info(p_record_id) i;
  PERFORM set_config('nidus.local_register_signoff', 'on', TRUE);
  UPDATE public.local_register_records
  SET signoff_state = p_state,
      status = CASE
        WHEN p_status_key IS NOT NULL AND COALESCE(v_workflow, '[]'::jsonb) @> jsonb_build_array(jsonb_build_object('key', p_status_key))
          THEN p_status_key
        ELSE status
      END,
      updated_at = NOW(),
      updated_by = COALESCE(p_user_id, updated_by)
  WHERE id = p_record_id;
  PERFORM set_config('nidus.local_register_signoff', '', TRUE);
END;
$$;
REVOKE ALL ON FUNCTION public.local_register_signoff_set_state(UUID, TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated;

-- Internal: current round number (0 = never started).
CREATE OR REPLACE FUNCTION public.local_register_signoff_round(p_record_id UUID)
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT COALESCE(MAX(signing_round), 0) FROM public.local_register_record_signatories WHERE record_id = p_record_id;
$$;
REVOKE ALL ON FUNCTION public.local_register_signoff_round(UUID) FROM PUBLIC, anon, authenticated;

-- ── Start sign-off ───────────────────────────────────────────────────────────
-- p_slots: [{ "role_label": "...", "is_mandatory": true, "assigned_user_id": "<public.users.id>" }, ...]
-- (the effective slots resolved from the Document Signatory configuration, in signing order).
CREATE OR REPLACE FUNCTION public.local_register_signoff_start(p_record_id UUID, p_slots JSONB)
RETURNS SETOF public.local_register_record_signatories
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_user_id  UUID := (SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1);
  v_is_doc   BOOLEAN;
  v_state    TEXT;
  v_round    INT;
  v_slot     JSONB;
  v_order    INT := 0;
  v_assigned UUID;
  v_label    TEXT;
  v_mand     BOOLEAN;
BEGIN
  IF v_user_id IS NULL OR NOT public.auth_user_can_access_local_register_record(p_record_id) THEN
    RAISE EXCEPTION 'You do not have access to this record.' USING ERRCODE = '42501';
  END IF;
  SELECT i.is_document INTO v_is_doc FROM public.local_register_record_document_info(p_record_id) i;
  IF NOT COALESCE(v_is_doc, FALSE) THEN
    RAISE EXCEPTION 'Sign-off is only available on document registers.';
  END IF;
  SELECT signoff_state INTO v_state FROM public.local_register_records WHERE id = p_record_id FOR UPDATE;
  IF v_state <> 'none' THEN
    RAISE EXCEPTION 'Sign-off has already started for this document.';
  END IF;
  IF p_slots IS NULL OR jsonb_typeof(p_slots) <> 'array' OR jsonb_array_length(p_slots) = 0 THEN
    RAISE EXCEPTION 'No signatories are configured for this document.';
  END IF;

  v_round := public.local_register_signoff_round(p_record_id) + 1;
  FOR v_slot IN SELECT value FROM jsonb_array_elements(p_slots) LOOP
    v_order := v_order + 1;
    v_label := btrim(COALESCE(v_slot ->> 'role_label', ''));
    v_mand := COALESCE((v_slot ->> 'is_mandatory')::boolean, TRUE);
    v_assigned := NULLIF(v_slot ->> 'assigned_user_id', '')::uuid;
    IF v_label = '' THEN
      RAISE EXCEPTION 'Signatory % has no project role.', v_order;
    END IF;
    IF v_mand AND v_assigned IS NULL THEN
      RAISE EXCEPTION 'Choose a person for "%" before starting sign-off.', v_label;
    END IF;
    IF v_assigned IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.users WHERE id = v_assigned) THEN
      RAISE EXCEPTION 'The person chosen for "%" was not found.', v_label;
    END IF;
    INSERT INTO public.local_register_record_signatories (record_id, signing_round, slot_order, role_label, is_mandatory, assigned_user_id, status, created_by)
    VALUES (p_record_id, v_round, v_order, v_label, v_mand, v_assigned, 'pending', v_user_id);
  END LOOP;

  PERFORM public.local_register_signoff_set_state(p_record_id, 'in_progress', 'in_review', v_user_id);

  RETURN QUERY SELECT * FROM public.local_register_record_signatories WHERE record_id = p_record_id AND signing_round = v_round ORDER BY slot_order;
END;
$$;
GRANT EXECUTE ON FUNCTION public.local_register_signoff_start(UUID, JSONB) TO authenticated;

-- ── Re-assign a still-pending slot ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.local_register_signoff_assign(p_record_id UUID, p_slot_order INT, p_user_id UUID)
RETURNS public.local_register_record_signatories
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_row public.local_register_record_signatories;
BEGIN
  IF NOT public.auth_user_can_access_local_register_record(p_record_id) THEN
    RAISE EXCEPTION 'You do not have access to this record.' USING ERRCODE = '42501';
  END IF;
  IF p_user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'The person chosen was not found.';
  END IF;
  UPDATE public.local_register_record_signatories
  SET assigned_user_id = p_user_id, updated_at = NOW()
  WHERE record_id = p_record_id
    AND signing_round = public.local_register_signoff_round(p_record_id)
    AND slot_order = p_slot_order
    AND status = 'pending'
    AND (p_user_id IS NOT NULL OR is_mandatory = FALSE)
  RETURNING * INTO v_row;
  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'This signatory can no longer be changed.';
  END IF;
  RETURN v_row;
END;
$$;
GRANT EXECUTE ON FUNCTION public.local_register_signoff_assign(UUID, INT, UUID) TO authenticated;

-- Internal: the caller may act on this slot (assigned to them, pending, earlier mandatory slots signed).
CREATE OR REPLACE FUNCTION public.local_register_signoff_my_turn(p_record_id UUID, p_slot_order INT)
RETURNS public.local_register_record_signatories
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_user_id UUID := (SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1);
  v_round   INT := public.local_register_signoff_round(p_record_id);
  v_row     public.local_register_record_signatories;
BEGIN
  SELECT * INTO v_row FROM public.local_register_record_signatories
  WHERE record_id = p_record_id AND signing_round = v_round AND slot_order = p_slot_order;
  IF v_row.id IS NULL OR v_row.status <> 'pending' THEN
    RAISE EXCEPTION 'This signatory slot is not open for signing.';
  END IF;
  IF v_user_id IS NULL OR v_row.assigned_user_id IS DISTINCT FROM v_user_id THEN
    RAISE EXCEPTION 'Only the person assigned to "%" can act on it.', v_row.role_label USING ERRCODE = '42501';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.local_register_record_signatories
    WHERE record_id = p_record_id AND signing_round = v_round
      AND slot_order < p_slot_order AND is_mandatory = TRUE AND status <> 'signed'
  ) THEN
    RAISE EXCEPTION 'It is not your turn yet — earlier signatories must sign first.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.local_register_record_signatories WHERE record_id = p_record_id AND signing_round = v_round AND status = 'declined') THEN
    RAISE EXCEPTION 'Sign-off was declined — it must be restarted.';
  END IF;
  RETURN v_row;
END;
$$;
REVOKE ALL ON FUNCTION public.local_register_signoff_my_turn(UUID, INT) FROM PUBLIC, anon, authenticated;

-- ── Sign (the signature image is uploaded to platform/<record_id>/<round>/<slot>/ first) ──
CREATE OR REPLACE FUNCTION public.local_register_signoff_sign(
  p_record_id UUID, p_slot_order INT, p_storage_path TEXT, p_file_name TEXT, p_mime_type TEXT, p_file_size BIGINT
)
RETURNS public.local_register_record_signatories
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_user_id UUID := (SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1);
  v_slot    public.local_register_record_signatories;
  v_row     public.local_register_record_signatories;
BEGIN
  v_slot := public.local_register_signoff_my_turn(p_record_id, p_slot_order);
  IF p_storage_path IS NULL
     OR p_storage_path NOT LIKE 'platform/' || p_record_id::text || '/' || v_slot.signing_round || '/' || p_slot_order || '/%' THEN
    RAISE EXCEPTION 'The signature image was not uploaded for this signatory.';
  END IF;
  UPDATE public.local_register_record_signatories
  SET status = 'signed',
      storage_bucket = 'local-register-signatures',
      storage_path = p_storage_path,
      file_name = p_file_name,
      mime_type = p_mime_type,
      file_size = p_file_size,
      signed_at = NOW(),
      updated_at = NOW()
  WHERE id = v_slot.id
  RETURNING * INTO v_row;

  IF NOT EXISTS (
    SELECT 1 FROM public.local_register_record_signatories
    WHERE record_id = p_record_id AND signing_round = v_slot.signing_round
      AND is_mandatory = TRUE AND status <> 'signed'
  ) THEN
    PERFORM public.local_register_signoff_set_state(p_record_id, 'complete', 'approved', v_user_id);
  END IF;
  RETURN v_row;
END;
$$;
GRANT EXECUTE ON FUNCTION public.local_register_signoff_sign(UUID, INT, TEXT, TEXT, TEXT, BIGINT) TO authenticated;

-- ── Decline (reason required; the record stays locked until sign-off is restarted) ──
CREATE OR REPLACE FUNCTION public.local_register_signoff_decline(p_record_id UUID, p_slot_order INT, p_reason TEXT)
RETURNS public.local_register_record_signatories
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_slot public.local_register_record_signatories;
  v_row  public.local_register_record_signatories;
BEGIN
  IF btrim(COALESCE(p_reason, '')) = '' THEN
    RAISE EXCEPTION 'A reason is required to decline.';
  END IF;
  v_slot := public.local_register_signoff_my_turn(p_record_id, p_slot_order);
  UPDATE public.local_register_record_signatories
  SET status = 'declined', decline_reason = btrim(p_reason), declined_at = NOW(), updated_at = NOW()
  WHERE id = v_slot.id
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;
GRANT EXECUTE ON FUNCTION public.local_register_signoff_decline(UUID, INT, TEXT) TO authenticated;

-- ── Close remaining optional slots once every mandatory slot is signed (v898 behaviour) ──
CREATE OR REPLACE FUNCTION public.local_register_signoff_lock_optional(p_record_id UUID, p_reason TEXT)
RETURNS SETOF public.local_register_record_signatories
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_user_id UUID := (SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1);
  v_round   INT := public.local_register_signoff_round(p_record_id);
BEGIN
  IF btrim(COALESCE(p_reason, '')) = '' THEN
    RAISE EXCEPTION 'A reason is required.';
  END IF;
  IF v_user_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.local_register_record_signatories
    WHERE record_id = p_record_id AND signing_round = v_round
      AND is_mandatory = TRUE AND status = 'signed' AND assigned_user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Only a mandatory signatory who has signed can close the remaining optional slots.' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.local_register_record_signatories
    WHERE record_id = p_record_id AND signing_round = v_round AND is_mandatory = TRUE AND status <> 'signed'
  ) THEN
    RAISE EXCEPTION 'Every mandatory signatory must sign first.';
  END IF;
  RETURN QUERY
  UPDATE public.local_register_record_signatories
  SET status = 'expired', locked_by = v_user_id, locked_at = NOW(), lock_reason = btrim(p_reason), updated_at = NOW()
  WHERE record_id = p_record_id AND signing_round = v_round AND status = 'pending' AND is_mandatory = FALSE
  RETURNING *;
END;
$$;
GRANT EXECUTE ON FUNCTION public.local_register_signoff_lock_optional(UUID, TEXT) TO authenticated;

-- ── Restart: close the current round (kept as history), unlock, back to Draft ──
CREATE OR REPLACE FUNCTION public.local_register_signoff_restart(p_record_id UUID, p_reason TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_user_id UUID := (SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1);
  v_state   TEXT;
BEGIN
  IF v_user_id IS NULL OR NOT public.auth_user_can_access_local_register_record(p_record_id) THEN
    RAISE EXCEPTION 'You do not have access to this record.' USING ERRCODE = '42501';
  END IF;
  IF btrim(COALESCE(p_reason, '')) = '' THEN
    RAISE EXCEPTION 'A reason is required to restart sign-off.';
  END IF;
  SELECT signoff_state INTO v_state FROM public.local_register_records WHERE id = p_record_id FOR UPDATE;
  IF v_state = 'none' THEN
    RAISE EXCEPTION 'Sign-off has not started for this document.';
  END IF;
  UPDATE public.local_register_record_signatories
  SET status = 'expired', locked_by = v_user_id, locked_at = NOW(),
      lock_reason = 'Sign-off restarted: ' || btrim(p_reason), updated_at = NOW()
  WHERE record_id = p_record_id
    AND signing_round = public.local_register_signoff_round(p_record_id)
    AND status = 'pending';
  PERFORM public.local_register_signoff_set_state(p_record_id, 'none', 'draft', v_user_id);
END;
$$;
GRANT EXECUTE ON FUNCTION public.local_register_signoff_restart(UUID, TEXT) TO authenticated;


-- ═════════════════════════════════════════════════════════════════════════════
-- SIM
-- ═════════════════════════════════════════════════════════════════════════════

-- Internal: the record's register document switch and status workflow.
CREATE OR REPLACE FUNCTION sim.local_register_record_document_info(p_record_id UUID)
RETURNS TABLE (is_document BOOLEAN, status_workflow JSONB)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = sim, public
SET row_security = off
AS $$
  SELECT COALESCE(plr.is_document, slr.is_document, FALSE), COALESCE(plr.status_workflow, slr.status_workflow)
  FROM sim.local_register_records r
  LEFT JOIN public.local_registers plr ON r.is_system_register = TRUE AND plr.id = r.register_id
  LEFT JOIN sim.local_registers slr ON r.is_system_register = FALSE AND slr.id = r.register_id
  WHERE r.id = p_record_id;
$$;
REVOKE ALL ON FUNCTION sim.local_register_record_document_info(UUID) FROM PUBLIC, anon, authenticated;

-- Internal: change a locked record (state and, when the register has that status key, status).
CREATE OR REPLACE FUNCTION sim.local_register_signoff_set_state(p_record_id UUID, p_state TEXT, p_status_key TEXT, p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sim, public
SET row_security = off
AS $$
DECLARE
  v_workflow JSONB;
BEGIN
  SELECT i.status_workflow INTO v_workflow FROM sim.local_register_record_document_info(p_record_id) i;
  PERFORM set_config('nidus.local_register_signoff', 'on', TRUE);
  UPDATE sim.local_register_records
  SET signoff_state = p_state,
      status = CASE
        WHEN p_status_key IS NOT NULL AND COALESCE(v_workflow, '[]'::jsonb) @> jsonb_build_array(jsonb_build_object('key', p_status_key))
          THEN p_status_key
        ELSE status
      END,
      updated_at = NOW(),
      updated_by = COALESCE(p_user_id, updated_by)
  WHERE id = p_record_id;
  PERFORM set_config('nidus.local_register_signoff', '', TRUE);
END;
$$;
REVOKE ALL ON FUNCTION sim.local_register_signoff_set_state(UUID, TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated;

-- Internal: current round number (0 = never started).
CREATE OR REPLACE FUNCTION sim.local_register_signoff_round(p_record_id UUID)
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = sim, public
SET row_security = off
AS $$
  SELECT COALESCE(MAX(signing_round), 0) FROM sim.local_register_record_signatories WHERE record_id = p_record_id;
$$;
REVOKE ALL ON FUNCTION sim.local_register_signoff_round(UUID) FROM PUBLIC, anon, authenticated;

-- ── Start sign-off ───────────────────────────────────────────────────────────
-- p_slots: [{ "role_label": "...", "is_mandatory": true, "assigned_user_id": "<public.users.id>" }, ...]
-- (the effective slots resolved from the Document Signatory configuration, in signing order).
CREATE OR REPLACE FUNCTION sim.local_register_signoff_start(p_record_id UUID, p_slots JSONB)
RETURNS SETOF sim.local_register_record_signatories
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sim, public
SET row_security = off
AS $$
DECLARE
  v_user_id  UUID := (SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1);
  v_is_doc   BOOLEAN;
  v_state    TEXT;
  v_round    INT;
  v_slot     JSONB;
  v_order    INT := 0;
  v_assigned UUID;
  v_label    TEXT;
  v_mand     BOOLEAN;
BEGIN
  IF v_user_id IS NULL OR NOT sim.auth_user_can_access_local_register_record(p_record_id) THEN
    RAISE EXCEPTION 'You do not have access to this record.' USING ERRCODE = '42501';
  END IF;
  SELECT i.is_document INTO v_is_doc FROM sim.local_register_record_document_info(p_record_id) i;
  IF NOT COALESCE(v_is_doc, FALSE) THEN
    RAISE EXCEPTION 'Sign-off is only available on document registers.';
  END IF;
  SELECT signoff_state INTO v_state FROM sim.local_register_records WHERE id = p_record_id FOR UPDATE;
  IF v_state <> 'none' THEN
    RAISE EXCEPTION 'Sign-off has already started for this document.';
  END IF;
  IF p_slots IS NULL OR jsonb_typeof(p_slots) <> 'array' OR jsonb_array_length(p_slots) = 0 THEN
    RAISE EXCEPTION 'No signatories are configured for this document.';
  END IF;

  v_round := sim.local_register_signoff_round(p_record_id) + 1;
  FOR v_slot IN SELECT value FROM jsonb_array_elements(p_slots) LOOP
    v_order := v_order + 1;
    v_label := btrim(COALESCE(v_slot ->> 'role_label', ''));
    v_mand := COALESCE((v_slot ->> 'is_mandatory')::boolean, TRUE);
    v_assigned := NULLIF(v_slot ->> 'assigned_user_id', '')::uuid;
    IF v_label = '' THEN
      RAISE EXCEPTION 'Signatory % has no project role.', v_order;
    END IF;
    IF v_mand AND v_assigned IS NULL THEN
      RAISE EXCEPTION 'Choose a person for "%" before starting sign-off.', v_label;
    END IF;
    IF v_assigned IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.users WHERE id = v_assigned) THEN
      RAISE EXCEPTION 'The person chosen for "%" was not found.', v_label;
    END IF;
    INSERT INTO sim.local_register_record_signatories (record_id, signing_round, slot_order, role_label, is_mandatory, assigned_user_id, status, created_by)
    VALUES (p_record_id, v_round, v_order, v_label, v_mand, v_assigned, 'pending', v_user_id);
  END LOOP;

  PERFORM sim.local_register_signoff_set_state(p_record_id, 'in_progress', 'in_review', v_user_id);

  RETURN QUERY SELECT * FROM sim.local_register_record_signatories WHERE record_id = p_record_id AND signing_round = v_round ORDER BY slot_order;
END;
$$;
GRANT EXECUTE ON FUNCTION sim.local_register_signoff_start(UUID, JSONB) TO authenticated;

-- ── Re-assign a still-pending slot ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION sim.local_register_signoff_assign(p_record_id UUID, p_slot_order INT, p_user_id UUID)
RETURNS sim.local_register_record_signatories
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sim, public
SET row_security = off
AS $$
DECLARE
  v_row sim.local_register_record_signatories;
BEGIN
  IF NOT sim.auth_user_can_access_local_register_record(p_record_id) THEN
    RAISE EXCEPTION 'You do not have access to this record.' USING ERRCODE = '42501';
  END IF;
  IF p_user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'The person chosen was not found.';
  END IF;
  UPDATE sim.local_register_record_signatories
  SET assigned_user_id = p_user_id, updated_at = NOW()
  WHERE record_id = p_record_id
    AND signing_round = sim.local_register_signoff_round(p_record_id)
    AND slot_order = p_slot_order
    AND status = 'pending'
    AND (p_user_id IS NOT NULL OR is_mandatory = FALSE)
  RETURNING * INTO v_row;
  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'This signatory can no longer be changed.';
  END IF;
  RETURN v_row;
END;
$$;
GRANT EXECUTE ON FUNCTION sim.local_register_signoff_assign(UUID, INT, UUID) TO authenticated;

-- Internal: the caller may act on this slot (assigned to them, pending, earlier mandatory slots signed).
CREATE OR REPLACE FUNCTION sim.local_register_signoff_my_turn(p_record_id UUID, p_slot_order INT)
RETURNS sim.local_register_record_signatories
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = sim, public
SET row_security = off
AS $$
DECLARE
  v_user_id UUID := (SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1);
  v_round   INT := sim.local_register_signoff_round(p_record_id);
  v_row     sim.local_register_record_signatories;
BEGIN
  SELECT * INTO v_row FROM sim.local_register_record_signatories
  WHERE record_id = p_record_id AND signing_round = v_round AND slot_order = p_slot_order;
  IF v_row.id IS NULL OR v_row.status <> 'pending' THEN
    RAISE EXCEPTION 'This signatory slot is not open for signing.';
  END IF;
  IF v_user_id IS NULL OR v_row.assigned_user_id IS DISTINCT FROM v_user_id THEN
    RAISE EXCEPTION 'Only the person assigned to "%" can act on it.', v_row.role_label USING ERRCODE = '42501';
  END IF;
  IF EXISTS (
    SELECT 1 FROM sim.local_register_record_signatories
    WHERE record_id = p_record_id AND signing_round = v_round
      AND slot_order < p_slot_order AND is_mandatory = TRUE AND status <> 'signed'
  ) THEN
    RAISE EXCEPTION 'It is not your turn yet — earlier signatories must sign first.';
  END IF;
  IF EXISTS (SELECT 1 FROM sim.local_register_record_signatories WHERE record_id = p_record_id AND signing_round = v_round AND status = 'declined') THEN
    RAISE EXCEPTION 'Sign-off was declined — it must be restarted.';
  END IF;
  RETURN v_row;
END;
$$;
REVOKE ALL ON FUNCTION sim.local_register_signoff_my_turn(UUID, INT) FROM PUBLIC, anon, authenticated;

-- ── Sign (the signature image is uploaded to sim/<record_id>/<round>/<slot>/ first) ──
CREATE OR REPLACE FUNCTION sim.local_register_signoff_sign(
  p_record_id UUID, p_slot_order INT, p_storage_path TEXT, p_file_name TEXT, p_mime_type TEXT, p_file_size BIGINT
)
RETURNS sim.local_register_record_signatories
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sim, public
SET row_security = off
AS $$
DECLARE
  v_user_id UUID := (SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1);
  v_slot    sim.local_register_record_signatories;
  v_row     sim.local_register_record_signatories;
BEGIN
  v_slot := sim.local_register_signoff_my_turn(p_record_id, p_slot_order);
  IF p_storage_path IS NULL
     OR p_storage_path NOT LIKE 'sim/' || p_record_id::text || '/' || v_slot.signing_round || '/' || p_slot_order || '/%' THEN
    RAISE EXCEPTION 'The signature image was not uploaded for this signatory.';
  END IF;
  UPDATE sim.local_register_record_signatories
  SET status = 'signed',
      storage_bucket = 'local-register-signatures',
      storage_path = p_storage_path,
      file_name = p_file_name,
      mime_type = p_mime_type,
      file_size = p_file_size,
      signed_at = NOW(),
      updated_at = NOW()
  WHERE id = v_slot.id
  RETURNING * INTO v_row;

  IF NOT EXISTS (
    SELECT 1 FROM sim.local_register_record_signatories
    WHERE record_id = p_record_id AND signing_round = v_slot.signing_round
      AND is_mandatory = TRUE AND status <> 'signed'
  ) THEN
    PERFORM sim.local_register_signoff_set_state(p_record_id, 'complete', 'approved', v_user_id);
  END IF;
  RETURN v_row;
END;
$$;
GRANT EXECUTE ON FUNCTION sim.local_register_signoff_sign(UUID, INT, TEXT, TEXT, TEXT, BIGINT) TO authenticated;

-- ── Decline (reason required; the record stays locked until sign-off is restarted) ──
CREATE OR REPLACE FUNCTION sim.local_register_signoff_decline(p_record_id UUID, p_slot_order INT, p_reason TEXT)
RETURNS sim.local_register_record_signatories
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sim, public
SET row_security = off
AS $$
DECLARE
  v_slot sim.local_register_record_signatories;
  v_row  sim.local_register_record_signatories;
BEGIN
  IF btrim(COALESCE(p_reason, '')) = '' THEN
    RAISE EXCEPTION 'A reason is required to decline.';
  END IF;
  v_slot := sim.local_register_signoff_my_turn(p_record_id, p_slot_order);
  UPDATE sim.local_register_record_signatories
  SET status = 'declined', decline_reason = btrim(p_reason), declined_at = NOW(), updated_at = NOW()
  WHERE id = v_slot.id
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;
GRANT EXECUTE ON FUNCTION sim.local_register_signoff_decline(UUID, INT, TEXT) TO authenticated;

-- ── Close remaining optional slots once every mandatory slot is signed (v898 behaviour) ──
CREATE OR REPLACE FUNCTION sim.local_register_signoff_lock_optional(p_record_id UUID, p_reason TEXT)
RETURNS SETOF sim.local_register_record_signatories
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sim, public
SET row_security = off
AS $$
DECLARE
  v_user_id UUID := (SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1);
  v_round   INT := sim.local_register_signoff_round(p_record_id);
BEGIN
  IF btrim(COALESCE(p_reason, '')) = '' THEN
    RAISE EXCEPTION 'A reason is required.';
  END IF;
  IF v_user_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM sim.local_register_record_signatories
    WHERE record_id = p_record_id AND signing_round = v_round
      AND is_mandatory = TRUE AND status = 'signed' AND assigned_user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Only a mandatory signatory who has signed can close the remaining optional slots.' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (
    SELECT 1 FROM sim.local_register_record_signatories
    WHERE record_id = p_record_id AND signing_round = v_round AND is_mandatory = TRUE AND status <> 'signed'
  ) THEN
    RAISE EXCEPTION 'Every mandatory signatory must sign first.';
  END IF;
  RETURN QUERY
  UPDATE sim.local_register_record_signatories
  SET status = 'expired', locked_by = v_user_id, locked_at = NOW(), lock_reason = btrim(p_reason), updated_at = NOW()
  WHERE record_id = p_record_id AND signing_round = v_round AND status = 'pending' AND is_mandatory = FALSE
  RETURNING *;
END;
$$;
GRANT EXECUTE ON FUNCTION sim.local_register_signoff_lock_optional(UUID, TEXT) TO authenticated;

-- ── Restart: close the current round (kept as history), unlock, back to Draft ──
CREATE OR REPLACE FUNCTION sim.local_register_signoff_restart(p_record_id UUID, p_reason TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sim, public
SET row_security = off
AS $$
DECLARE
  v_user_id UUID := (SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1);
  v_state   TEXT;
BEGIN
  IF v_user_id IS NULL OR NOT sim.auth_user_can_access_local_register_record(p_record_id) THEN
    RAISE EXCEPTION 'You do not have access to this record.' USING ERRCODE = '42501';
  END IF;
  IF btrim(COALESCE(p_reason, '')) = '' THEN
    RAISE EXCEPTION 'A reason is required to restart sign-off.';
  END IF;
  SELECT signoff_state INTO v_state FROM sim.local_register_records WHERE id = p_record_id FOR UPDATE;
  IF v_state = 'none' THEN
    RAISE EXCEPTION 'Sign-off has not started for this document.';
  END IF;
  UPDATE sim.local_register_record_signatories
  SET status = 'expired', locked_by = v_user_id, locked_at = NOW(),
      lock_reason = 'Sign-off restarted: ' || btrim(p_reason), updated_at = NOW()
  WHERE record_id = p_record_id
    AND signing_round = sim.local_register_signoff_round(p_record_id)
    AND status = 'pending';
  PERFORM sim.local_register_signoff_set_state(p_record_id, 'none', 'draft', v_user_id);
END;
$$;
GRANT EXECUTE ON FUNCTION sim.local_register_signoff_restart(UUID, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
