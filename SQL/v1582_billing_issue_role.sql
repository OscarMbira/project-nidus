-- v1353 D12. Run after v1581. Only a PMO Admin, a system admin, or the account owner may issue a client invoice.
-- Simulator practice invoices stay issuable by the learner.

CREATE OR REPLACE FUNCTION public.billing_user_can_issue(p_account UUID)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public SET row_security = off AS $$
DECLARE v_user UUID;
BEGIN
  SELECT id INTO v_user FROM public.users
   WHERE auth_user_id = auth.uid() AND COALESCE(is_deleted, FALSE) = FALSE
   LIMIT 1;
  IF v_user IS NULL THEN RETURN FALSE; END IF;
  IF EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = v_user AND ur.is_active AND COALESCE(ur.is_deleted, FALSE) = FALSE
      AND r.role_name IN ('pmo_admin', 'system_admin')
  ) THEN RETURN TRUE; END IF;
  RETURN EXISTS (SELECT 1 FROM public.accounts a WHERE a.id = p_account AND a.owner_user_id = v_user);
END;
$$;

REVOKE ALL ON FUNCTION public.billing_user_can_issue(UUID) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.issue_client_invoice(p_invoice_id UUID, p_notes TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public SET row_security = off AS $$
DECLARE v public.client_invoices%ROWTYPE; v_org TEXT; v_rate NUMERIC;
BEGIN
  IF NULLIF(btrim(COALESCE(p_notes, '')), '') IS NULL THEN RAISE EXCEPTION 'BILLING_NOTES: A justification is required'; END IF;
  SELECT * INTO v FROM public.client_invoices WHERE id = p_invoice_id;
  IF v.id IS NULL OR v.status <> 'pending_approval' THEN RAISE EXCEPTION 'BILLING_STATE: Submit the invoice for approval first'; END IF;
  IF NOT public.auth_user_can_access_project(v.project_id) THEN RAISE EXCEPTION 'BILLING_FORBIDDEN: You cannot issue this invoice'; END IF;
  IF NOT public.billing_user_can_issue(v.account_id) THEN
    RAISE EXCEPTION 'BILLING_FORBIDDEN: Only a PMO Admin or the account owner can issue an invoice';
  END IF;
  SELECT currency_code INTO v_org FROM public.organisation_regional_format_settings WHERE account_id = v.account_id;
  v_rate := public.resolve_billing_exchange_rate(v.currency, COALESCE(v_org, 'USD'), COALESCE(v.invoice_date, CURRENT_DATE), v.account_id);
  UPDATE public.client_invoices
     SET status = 'issued', approval_notes = btrim(p_notes), issued_at = NOW(),
         invoice_date = COALESCE(invoice_date, CURRENT_DATE),
         exchange_rate = CASE WHEN exchange_rate IS NOT NULL AND exchange_rate <> 1 THEN exchange_rate ELSE COALESCE(v_rate, NULLIF(exchange_rate, 0), 1) END,
         updated_at = NOW()
   WHERE id = p_invoice_id;
  RETURN p_invoice_id;
END;
$$;
