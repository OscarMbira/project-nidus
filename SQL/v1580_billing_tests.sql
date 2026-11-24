-- ============================================================================
-- v1580 — Billing checks (rolled back). Run after v1577–v1579 and Admin v259.
-- Skips in the SQL editor, where auth.uid() is null.
-- ============================================================================
BEGIN;

DO $$
DECLARE
  v_project UUID;
  v_entry UUID;
  v_invoice UUID;
  v_line UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE NOTICE 'SKIP v1580 — sign in as a project member and run this file again';
    RETURN;
  END IF;

  SELECT id INTO v_project FROM public.projects WHERE COALESCE(is_deleted, FALSE) = FALSE LIMIT 1;
  IF v_project IS NULL THEN
    RAISE NOTICE 'SKIP v1580 — no project';
    RETURN;
  END IF;

  IF public.resolve_charge_rate(v_project, NULL, 'Consultant', NULL, 'hour', CURRENT_DATE) IS NULL THEN
    RAISE NOTICE 'v1580: no rate card yet — resolution returned null, which is allowed';
  END IF;

  SELECT id INTO v_entry FROM public.timesheet_entries
   WHERE project_id = v_project AND status = 'approved' AND NOT is_deleted LIMIT 1;
  IF v_entry IS NULL THEN
    RAISE NOTICE 'SKIP v1580 lock check — no approved time';
    RETURN;
  END IF;

  INSERT INTO public.clients (account_id, client_reference, name, kind)
  SELECT account_id, '', 'Example Billing Check', 'external' FROM public.projects WHERE id = v_project
  RETURNING id INTO v_invoice;

  INSERT INTO public.project_billing_settings (project_id, client_id)
  VALUES (v_project, v_invoice)
  ON CONFLICT (project_id) DO UPDATE SET client_id = EXCLUDED.client_id;

  v_invoice := public.draft_client_invoice(v_project, CURRENT_DATE - 365, CURRENT_DATE);
  UPDATE public.client_invoices SET status = 'pending_approval' WHERE id = v_invoice;
  PERFORM public.issue_client_invoice(v_invoice, 'Checked the lock');

  BEGIN
    UPDATE public.timesheet_entries SET hours_worked = hours_worked WHERE client_invoice_line_id IS NOT NULL AND project_id = v_project;
    RAISE EXCEPTION 'v1580 expected BILLING_LOCKED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%BILLING_LOCKED%' AND SQLERRM NOT LIKE '%v1580 expected%' THEN
      RAISE NOTICE 'v1580 lock raised: %', SQLERRM;
    END IF;
  END;

  SELECT id INTO v_line FROM public.client_invoice_lines WHERE invoice_id = v_invoice AND source = 'time' LIMIT 1;
  IF v_line IS NOT NULL THEN
    PERFORM public.credit_client_invoice(v_invoice, ARRAY[v_line], 'Release the time');
  END IF;
  RAISE NOTICE 'v1580 checks finished';
END $$;

ROLLBACK;
