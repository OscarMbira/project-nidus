-- v1353 gap close. Run after v1577–v1580. Do not re-run those files.
-- Simulator locks, queued milestone billing, invoice-date exchange rates, credit clears sim expenses.

CREATE TABLE IF NOT EXISTS public.currency_exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID,
  from_currency TEXT NOT NULL,
  to_currency TEXT NOT NULL,
  effective_date DATE NOT NULL,
  rate NUMERIC(18, 6) NOT NULL CHECK (rate > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (account_id, from_currency, to_currency, effective_date)
);
CREATE TABLE IF NOT EXISTS sim.currency_exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  from_currency TEXT NOT NULL,
  to_currency TEXT NOT NULL,
  effective_date DATE NOT NULL,
  rate NUMERIC(18, 6) NOT NULL CHECK (rate > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, from_currency, to_currency, effective_date)
);

ALTER TABLE public.currency_exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.currency_exchange_rates ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.currency_exchange_rates, sim.currency_exchange_rates TO authenticated;
GRANT ALL ON public.currency_exchange_rates, sim.currency_exchange_rates TO service_role;

DROP POLICY IF EXISTS currency_exchange_rates_all ON public.currency_exchange_rates;
CREATE POLICY currency_exchange_rates_all ON public.currency_exchange_rates FOR ALL TO authenticated
  USING (account_id IS NULL OR public.user_has_access_to_account(account_id))
  WITH CHECK (account_id IS NULL OR public.user_has_access_to_account(account_id));
DROP POLICY IF EXISTS currency_exchange_rates_all ON sim.currency_exchange_rates;
CREATE POLICY currency_exchange_rates_all ON sim.currency_exchange_rates FOR ALL TO authenticated
  USING (user_id IS NULL OR user_id = auth.uid())
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.resolve_billing_exchange_rate(p_from TEXT, p_to TEXT, p_on DATE, p_account UUID)
RETURNS NUMERIC LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public SET row_security = off AS $$
DECLARE v NUMERIC;
BEGIN
  IF upper(COALESCE(p_from, 'USD')) = upper(COALESCE(p_to, p_from, 'USD')) THEN RETURN 1; END IF;
  SELECT rate INTO v FROM public.currency_exchange_rates
   WHERE from_currency = upper(p_from) AND to_currency = upper(p_to) AND effective_date <= COALESCE(p_on, CURRENT_DATE)
     AND (account_id IS NULL OR account_id = p_account)
   ORDER BY effective_date DESC LIMIT 1;
  RETURN v;
END;
$$;

CREATE OR REPLACE FUNCTION sim.resolve_billing_exchange_rate(p_from TEXT, p_to TEXT, p_on DATE, p_user UUID)
RETURNS NUMERIC LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = sim, public SET row_security = off AS $$
DECLARE v NUMERIC;
BEGIN
  IF upper(COALESCE(p_from, 'USD')) = upper(COALESCE(p_to, p_from, 'USD')) THEN RETURN 1; END IF;
  SELECT rate INTO v FROM sim.currency_exchange_rates
   WHERE from_currency = upper(p_from) AND to_currency = upper(p_to) AND effective_date <= COALESCE(p_on, CURRENT_DATE)
     AND (user_id IS NULL OR user_id = p_user)
   ORDER BY effective_date DESC LIMIT 1;
  RETURN v;
END;
$$;
GRANT EXECUTE ON FUNCTION public.resolve_billing_exchange_rate(TEXT, TEXT, DATE, UUID), sim.resolve_billing_exchange_rate(TEXT, TEXT, DATE, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.issue_client_invoice(p_invoice_id UUID, p_notes TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public SET row_security = off AS $$
DECLARE v public.client_invoices%ROWTYPE; v_org TEXT; v_rate NUMERIC;
BEGIN
  IF NULLIF(btrim(COALESCE(p_notes, '')), '') IS NULL THEN RAISE EXCEPTION 'BILLING_NOTES: A justification is required'; END IF;
  SELECT * INTO v FROM public.client_invoices WHERE id = p_invoice_id;
  IF v.id IS NULL OR v.status <> 'pending_approval' THEN RAISE EXCEPTION 'BILLING_STATE: Submit the invoice for approval first'; END IF;
  IF NOT public.auth_user_can_access_project(v.project_id) THEN RAISE EXCEPTION 'BILLING_FORBIDDEN: You cannot issue this invoice'; END IF;
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

CREATE OR REPLACE FUNCTION sim.issue_client_invoice(p_invoice_id UUID, p_notes TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = sim, public SET row_security = off AS $$
DECLARE v sim.client_invoices%ROWTYPE; v_rate NUMERIC;
BEGIN
  IF NULLIF(btrim(COALESCE(p_notes, '')), '') IS NULL THEN RAISE EXCEPTION 'BILLING_NOTES: A justification is required'; END IF;
  SELECT * INTO v FROM sim.client_invoices WHERE id = p_invoice_id;
  IF v.id IS NULL OR v.status <> 'pending_approval' THEN RAISE EXCEPTION 'BILLING_STATE: Submit the invoice for approval first'; END IF;
  IF NOT sim.qra_can_access(v.project_id) THEN RAISE EXCEPTION 'BILLING_FORBIDDEN: You cannot issue this invoice'; END IF;
  v_rate := sim.resolve_billing_exchange_rate(v.currency, 'USD', COALESCE(v.invoice_date, CURRENT_DATE), v.user_id);
  UPDATE sim.client_invoices SET status = 'issued', approval_notes = btrim(p_notes), issued_at = NOW(),
    invoice_date = COALESCE(invoice_date, CURRENT_DATE),
    exchange_rate = CASE WHEN exchange_rate IS NOT NULL AND exchange_rate <> 1 THEN exchange_rate ELSE COALESCE(v_rate, NULLIF(exchange_rate, 0), 1) END,
    updated_at = NOW()
  WHERE id = p_invoice_id;
  RETURN p_invoice_id;
END;
$$;

CREATE OR REPLACE FUNCTION sim.billing_lock_timesheet()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_status TEXT;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.client_invoice_line_id IS NULL AND OLD.client_invoice_line_id IS NOT NULL THEN RETURN NEW; END IF;
  IF OLD.client_invoice_line_id IS NULL THEN RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END; END IF;
  SELECT i.status INTO v_status FROM sim.client_invoice_lines l JOIN sim.client_invoices i ON i.id = l.invoice_id WHERE l.id = OLD.client_invoice_line_id;
  IF v_status IN ('issued', 'part_paid', 'paid') THEN
    RAISE EXCEPTION 'BILLING_LOCKED: This time is on an issued invoice. Raise a credit note to change it.';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;
DROP TRIGGER IF EXISTS trg_billing_lock_timesheet ON sim.timesheet_entries;
CREATE TRIGGER trg_billing_lock_timesheet BEFORE UPDATE OR DELETE ON sim.timesheet_entries
  FOR EACH ROW EXECUTE FUNCTION sim.billing_lock_timesheet();

CREATE OR REPLACE FUNCTION sim.billing_lock_expense_item()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_status TEXT; v_line UUID;
BEGIN
  v_line := OLD.client_invoice_line_id;
  IF TG_OP = 'UPDATE' AND NEW.client_invoice_line_id IS NULL AND v_line IS NOT NULL THEN RETURN NEW; END IF;
  IF v_line IS NULL THEN RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END; END IF;
  SELECT i.status INTO v_status FROM sim.client_invoice_lines l JOIN sim.client_invoices i ON i.id = l.invoice_id WHERE l.id = v_line;
  IF v_status IN ('issued', 'part_paid', 'paid') THEN
    RAISE EXCEPTION 'BILLING_LOCKED: This expense is on an issued invoice. Raise a credit note to change it.';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;
DROP TRIGGER IF EXISTS trg_billing_lock_expense_item ON sim.project_expense_claim_items;
CREATE TRIGGER trg_billing_lock_expense_item BEFORE UPDATE OR DELETE ON sim.project_expense_claim_items
  FOR EACH ROW EXECUTE FUNCTION sim.billing_lock_expense_item();

CREATE OR REPLACE FUNCTION sim.credit_client_invoice(p_invoice_id UUID, p_line_ids UUID[], p_reason TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = sim, public SET row_security = off AS $$
DECLARE v sim.client_invoices%ROWTYPE; v_id UUID; v_line sim.client_invoice_lines%ROWTYPE; v_net NUMERIC := 0; v_tax NUMERIC := 0;
BEGIN
  IF NULLIF(btrim(COALESCE(p_reason, '')), '') IS NULL THEN RAISE EXCEPTION 'BILLING_NOTES: A credit note needs a reason'; END IF;
  SELECT * INTO v FROM sim.client_invoices WHERE id = p_invoice_id;
  IF v.status NOT IN ('issued', 'part_paid', 'paid') THEN RAISE EXCEPTION 'BILLING_STATE: Credit an issued invoice'; END IF;
  IF NOT sim.qra_can_access(v.project_id) THEN RAISE EXCEPTION 'BILLING_FORBIDDEN: You cannot credit this invoice'; END IF;
  INSERT INTO sim.client_credit_notes (invoice_id, reason) VALUES (p_invoice_id, btrim(p_reason)) RETURNING id INTO v_id;
  FOR v_line IN SELECT * FROM sim.client_invoice_lines WHERE invoice_id = p_invoice_id AND id = ANY(p_line_ids) AND NOT voided LOOP
    INSERT INTO sim.client_credit_note_lines (credit_note_id, invoice_line_id, amount, tax_amount) VALUES (v_id, v_line.id, v_line.amount, v_line.tax_amount);
    UPDATE sim.client_invoice_lines SET voided = TRUE WHERE id = v_line.id;
    UPDATE sim.timesheet_entries SET client_invoice_line_id = NULL WHERE client_invoice_line_id = v_line.id;
    UPDATE sim.project_expense_claim_items SET client_invoice_line_id = NULL WHERE client_invoice_line_id = v_line.id;
    v_net := v_net + v_line.amount; v_tax := v_tax + v_line.tax_amount;
  END LOOP;
  UPDATE sim.client_credit_notes SET net_amount = v_net, tax_amount = v_tax WHERE id = v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.billing_on_milestone_achieved()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public SET row_security = off AS $$
BEGIN
  IF NEW.status = 'achieved' AND OLD.status IS DISTINCT FROM 'achieved' THEN
    PERFORM public.enqueue_background_job('billing.schedule_due', jsonb_build_object('milestone_id', NEW.id), NOW(), 'milestone:' || NEW.id::text, NULL);
  END IF;
  RETURN NEW;
END;
$$;

SELECT public.background_job_register(
  p_code => 'billing.schedule_due',
  p_name => 'Billing schedule due',
  p_kind => 'handler',
  p_description => 'Queues due dated and completed-milestone billing lines onto a draft client invoice.',
  p_owner_system => 'platform',
  p_sql_function => NULL,
  p_cron => '15 6 * * *',
  p_time_basis => 'organisation'
);

INSERT INTO public.field_help (help_key, title, purpose, examples, format_notes, extra_notes, module_code) VALUES
  ('public.currency_exchange_rates.from_currency', 'From currency', 'The currency on the invoice.', '- GBP', NULL, NULL, 'billing'),
  ('public.currency_exchange_rates.to_currency', 'To currency', 'The organisation currency the reports use.', '- USD', NULL, NULL, 'billing'),
  ('public.currency_exchange_rates.effective_date', 'Effective date', 'The first day this rate applies. A draft uses the latest rate on or before the invoice date.', '- {example_date}', 'Dates show as {date_format}.', NULL, 'billing'),
  ('public.currency_exchange_rates.rate', 'Rate', 'How many organisation-currency units one invoice-currency unit is worth.', '- 1.25', NULL, NULL, 'billing'),
  ('public.client_invoice_lines.description', 'Description', 'What this invoice line is for. A manual line is extra work that was not on a timesheet or expense.', '- Extra workshop', NULL, NULL, 'billing'),
  ('public.rate_cards.client_id', 'Client', 'Leave this for an organisation card. Set it when these rates apply to one client only.', '- Example Freight Ltd', NULL, NULL, 'billing'),
  ('public.rate_cards.project_id', 'Project', 'Set this when these rates apply to one project only. A project card beats a client card.', '- Example Freight Ltd rollout', NULL, NULL, 'billing')
ON CONFLICT (help_key, form_key, locale) DO UPDATE SET
  title = EXCLUDED.title, purpose = EXCLUDED.purpose, examples = EXCLUDED.examples,
  format_notes = EXCLUDED.format_notes, module_code = EXCLUDED.module_code, is_active = TRUE, updated_at = NOW();

INSERT INTO public.field_help_aliases (alias_key, help_key) VALUES
  ('sim.currency_exchange_rates.from_currency', 'public.currency_exchange_rates.from_currency'),
  ('sim.currency_exchange_rates.to_currency', 'public.currency_exchange_rates.to_currency'),
  ('sim.currency_exchange_rates.effective_date', 'public.currency_exchange_rates.effective_date'),
  ('sim.currency_exchange_rates.rate', 'public.currency_exchange_rates.rate'),
  ('sim.timesheet_work_categories.billable_default', 'public.timesheet_work_categories.billable_default'),
  ('sim.expense_categories.rechargeable_default', 'public.expense_categories.rechargeable_default'),
  ('sim.client_invoice_lines.description', 'public.client_invoice_lines.description'),
  ('sim.rate_cards.client_id', 'public.rate_cards.client_id'),
  ('sim.rate_cards.project_id', 'public.rate_cards.project_id')
ON CONFLICT (alias_key) DO UPDATE SET help_key = EXCLUDED.help_key;

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
SELECT 'currency_exchange_rates', 'Invoice-date exchange rates for client billing', FALSE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.database_tables WHERE table_name = 'currency_exchange_rates');
INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
SELECT 'sim.currency_exchange_rates', 'Simulator invoice-date exchange rates', FALSE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.database_tables WHERE table_name = 'sim.currency_exchange_rates');
