-- v1353 database checks. Run after v1582. The transaction is rolled back.
-- These checks raise if an issued invoice can be edited, deleted, or billed twice.

BEGIN;

DO $$
DECLARE
  v_project UUID;
  v_client UUID;
  v_invoice UUID;
  v_line UUID;
  v_entry UUID;
  v_source UUID := gen_random_uuid();
  v_msg TEXT;
  v_open BOOLEAN;
BEGIN
  SELECT id INTO v_project FROM public.projects WHERE COALESCE(is_deleted, FALSE) = FALSE LIMIT 1;
  IF v_project IS NULL THEN
    RAISE NOTICE 'SKIP v1583 — no project';
    RETURN;
  END IF;

  INSERT INTO public.clients (name) VALUES ('Example Billing Check') RETURNING id INTO v_client;
  INSERT INTO public.client_invoices (client_id, project_id, status, net_amount)
  VALUES (v_client, v_project, 'issued', 10) RETURNING id INTO v_invoice;

  v_open := FALSE; v_msg := NULL;
  BEGIN
    UPDATE public.client_invoices SET net_amount = 11 WHERE id = v_invoice;
    v_open := TRUE;
  EXCEPTION WHEN OTHERS THEN
    v_msg := SQLERRM;
  END;
  IF v_open OR v_msg NOT LIKE '%BILLING_IMMUTABLE%' THEN
    RAISE EXCEPTION 'v1583 issued invoice was edited: %', COALESCE(v_msg, 'no error');
  END IF;

  v_open := FALSE; v_msg := NULL;
  BEGIN
    UPDATE public.client_invoices SET status = 'draft' WHERE id = v_invoice;
    v_open := TRUE;
  EXCEPTION WHEN OTHERS THEN
    v_msg := SQLERRM;
  END;
  IF v_open OR v_msg NOT LIKE '%BILLING_IMMUTABLE%' THEN
    RAISE EXCEPTION 'v1583 issued invoice status was rolled back: %', COALESCE(v_msg, 'no error');
  END IF;

  v_open := FALSE; v_msg := NULL;
  BEGIN
    DELETE FROM public.client_invoices WHERE id = v_invoice;
    v_open := TRUE;
  EXCEPTION WHEN OTHERS THEN
    v_msg := SQLERRM;
  END;
  IF v_open OR v_msg NOT LIKE '%BILLING_IMMUTABLE%' THEN
    RAISE EXCEPTION 'v1583 issued invoice was deleted: %', COALESCE(v_msg, 'no error');
  END IF;

  INSERT INTO public.client_invoice_lines (invoice_id, source, source_id, description)
  VALUES (v_invoice, 'manual', v_source, 'First') RETURNING id INTO v_line;
  v_open := FALSE;
  BEGIN
    INSERT INTO public.client_invoice_lines (invoice_id, source, source_id, description)
    VALUES (v_invoice, 'manual', v_source, 'Again');
    v_open := TRUE;
  EXCEPTION WHEN unique_violation THEN
    v_open := FALSE;
  END;
  IF v_open THEN
    RAISE EXCEPTION 'v1583 the same source was invoiced twice';
  END IF;

  SELECT id INTO v_entry FROM public.timesheet_entries
   WHERE project_id = v_project AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1;
  IF v_entry IS NOT NULL THEN
    UPDATE public.timesheet_entries SET client_invoice_line_id = v_line WHERE id = v_entry;
    v_open := FALSE; v_msg := NULL;
    BEGIN
      UPDATE public.timesheet_entries SET hours_worked = hours_worked WHERE id = v_entry;
      v_open := TRUE;
    EXCEPTION WHEN OTHERS THEN
      v_msg := SQLERRM;
    END;
    IF v_open OR v_msg NOT LIKE '%BILLING_LOCKED%' THEN
      RAISE EXCEPTION 'v1583 invoiced time was changed: %', COALESCE(v_msg, 'no error');
    END IF;
    UPDATE public.timesheet_entries SET client_invoice_line_id = NULL WHERE id = v_entry;
  END IF;

  IF auth.uid() IS NULL AND public.billing_user_can_issue(NULL) IS DISTINCT FROM FALSE THEN
    RAISE EXCEPTION 'v1583 a signed-out user was allowed to issue';
  END IF;

  RAISE NOTICE 'v1583 checks finished';
END $$;

ROLLBACK;
